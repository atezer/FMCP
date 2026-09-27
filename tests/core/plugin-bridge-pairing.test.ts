/**
 * Pairing at the bridge: only a plugin that presents the pairing code in its "ready" handshake becomes a
 * client. Each bridge here listens on an ephemeral port and never probes siblings, so the tests never touch
 * a real bridge running on 5454–5470.
 */
import { request as httpRequest } from "http";
import type { AddressInfo } from "net";
import { WebSocket, type RawData } from "ws";
import { PluginBridgeServer } from "../../src/core/plugin-bridge-server";

const SECRET = "test_Pairing-Code_0123456789abcd";

// The bridge announces itself on stderr; keep the test output readable.
beforeAll(() => { jest.spyOn(console, "error").mockImplementation(() => {}); });
afterAll(() => { jest.restoreAllMocks(); });

type Bridge = PluginBridgeServer & Record<string, any>;

async function startBridge(options: { requirePairing?: boolean; pairingTimeoutMs?: number } = {}): Promise<{ bridge: Bridge; port: number }> {
	const bridge = new PluginBridgeServer(5454, {
		pairingSecret: SECRET,
		requirePairing: options.requirePairing ?? true,
		pairingTimeoutMs: options.pairingTimeoutMs,
	}) as Bridge;
	bridge.probeSiblingBridges = async () => [];
	const server = bridge.createBridgeHttpServer();
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const port = (server.address() as AddressInfo).port;
	bridge.setupBridgeOnServer(server, port, "127.0.0.1");
	return { bridge, port };
}

function connect(port: number, origin?: string): Promise<WebSocket> {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(`ws://127.0.0.1:${port}`, origin === undefined ? {} : { origin });
		ws.once("open", () => resolve(ws));
		ws.once("unexpected-response", (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
		ws.once("error", reject);
	});
}

function nextMessage(ws: WebSocket, predicate: (m: any) => boolean = () => true, ms = 3000): Promise<any> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => { ws.off("message", onMessage); reject(new Error("no message")); }, ms);
		function onMessage(data: RawData) {
			const msg = JSON.parse(data.toString());
			if (msg.type === "ping" || !predicate(msg)) return;
			clearTimeout(timer);
			ws.off("message", onMessage);
			resolve(msg);
		}
		ws.on("message", onMessage);
	});
}

function closed(ws: WebSocket): Promise<{ code: number; reason: string }> {
	return new Promise((resolve) => ws.once("close", (code, reason) => resolve({ code, reason: reason.toString() })));
}

async function pair(port: number, fileKey: string, origin = "null"): Promise<WebSocket> {
	const ws = await connect(port, origin);
	const welcome = nextMessage(ws, (m) => m.type === "welcome");
	ws.send(JSON.stringify({ type: "ready", fileKey, fileName: fileKey, pluginVersion: "test", pairing: SECRET }));
	await welcome;
	return ws;
}

function http(port: number, method: string, path: string, headers: Record<string, string> = {}): Promise<{ status: number; headers: Record<string, unknown>; body: string }> {
	return new Promise((resolve, reject) => {
		const req = httpRequest({ hostname: "127.0.0.1", port, method, path, headers }, (res) => {
			let body = "";
			res.on("data", (c) => { body += c; });
			res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
		});
		req.on("error", reject);
		req.end();
	});
}

describe("plugin bridge pairing", () => {
	let bridge: Bridge;
	let port: number;
	const sockets: WebSocket[] = [];
	const track = (ws: WebSocket) => { sockets.push(ws); return ws; };

	beforeEach(async () => { ({ bridge, port } = await startBridge({ pairingTimeoutMs: 400 })); });
	afterEach(() => {
		for (const ws of sockets.splice(0)) { try { ws.terminate(); } catch { /* ignore */ } }
		bridge.stop();
	});

	it("welcomes and registers a plugin that presents the code", async () => {
		track(await pair(port, "file-a"));
		expect(bridge.listConnectedFiles().map((f) => f.fileKey)).toEqual(["file-a"]);
		expect(bridge.pairingStatus()).toEqual({ required: true, lastRefusal: null });
	});

	it("refuses a plugin without the code, never registers it, and says why when asked", async () => {
		const ws = track(await connect(port, "null"));
		const refusal = nextMessage(ws);
		const done = closed(ws);
		ws.send(JSON.stringify({ type: "ready", fileKey: "file-a", pluginVersion: "1.9.14" }));
		expect(await refusal).toMatchObject({ type: "error", code: "pairing-required" });
		expect(await done).toEqual({ code: 4401, reason: "pairing-required" });
		expect(bridge.listConnectedFiles()).toEqual([]);
		expect(bridge.pairingStatus().lastRefusal).toMatchObject({ code: "pairing-required", pluginVersion: "1.9.14" });
		await expect(bridge.request("getDocumentStructure", {})).rejects.toThrow(/not connected.*refused: it sent no pairing code/);
	});

	it("refuses a wrong code as a mismatch", async () => {
		const ws = track(await connect(port, "null"));
		const refusal = nextMessage(ws);
		ws.send(JSON.stringify({ type: "ready", pairing: "x".repeat(32) }));
		expect(await refusal).toMatchObject({ type: "error", code: "pairing-mismatch" });
		expect(bridge.pairingHint()).toMatch(/does not match this bridge/);
	});

	it("forgets the refusal once a plugin pairs", async () => {
		const ws = track(await connect(port, "null"));
		const done = closed(ws);
		ws.send(JSON.stringify({ type: "ready" }));
		await done;
		track(await pair(port, "file-a"));
		expect(bridge.pairingStatus().lastRefusal).toBeNull();
		expect(bridge.pairingHint()).toBe("");
	});

	it("closes a connection that does not pair in time", async () => {
		const ws = track(await connect(port, "null"));
		expect(await closed(ws)).toEqual({ code: 4401, reason: "pairing-required" });
	});

	it("ignores everything an unpaired connection sends: no token, no forged answers, no routing", async () => {
		const plugin = track(await pair(port, "file-a"));
		const intruder = track(await connect(port, "null"));
		intruder.send(JSON.stringify({ type: "setToken", token: "figd_intruder" }));
		const asked = nextMessage(plugin, (m) => typeof m.id === "string");
		const answer = bridge.request<string>("getDocumentStructure", {});
		const req = await asked; // the paired plugin gets the request, not the newer intruder
		intruder.send(JSON.stringify({ id: req.id, result: "forged" }));
		plugin.send(JSON.stringify({ id: req.id, result: "real" }));
		await expect(answer).resolves.toBe("real");
		expect(bridge.getFigmaRestToken()).toBeNull();
	});

	it("accepts an answer only from the plugin the request was sent to", async () => {
		const a = track(await pair(port, "file-a"));
		const b = track(await pair(port, "file-b"));
		const asked = nextMessage(a, (m) => typeof m.id === "string");
		const answer = bridge.request<string>("getDocumentStructure", {}, "file-a");
		const req = await asked;
		b.send(JSON.stringify({ id: req.id, result: "from-b" }));
		a.send(JSON.stringify({ id: req.id, result: "from-a" }));
		await expect(answer).resolves.toBe("from-a");
	});

	it("lets a paired plugin set the REST token", async () => {
		const plugin = track(await pair(port, "file-a"));
		plugin.send(JSON.stringify({ type: "setToken", token: "figd_plugin" }));
		await new Promise((r) => setTimeout(r, 100));
		expect(bridge.getFigmaRestToken()).not.toBeNull();
	});

	it("refuses a WebSocket upgrade from a foreign web origin, allows Figma's", async () => {
		await expect(connect(port, "https://evil.example")).rejects.toThrow(/HTTP 401/);
		track(await pair(port, "file-a", "https://www.figma.com"));
		track(await pair(port, "file-b", "null"));
		expect(bridge.listConnectedFiles()).toHaveLength(2);
	});

	it("does not let a web page read the bridge over HTTP", async () => {
		const status = await http(port, "GET", "/status", { Origin: "https://evil.example" });
		expect(status.status).toBe(200);
		expect(status.headers["access-control-allow-origin"]).toBeUndefined();
		const marker = await http(port, "GET", "/");
		expect(marker.headers["access-control-allow-origin"]).toBeUndefined();
	});

	it("refuses /shutdown without the code, and from any page even with it", async () => {
		expect((await http(port, "POST", "/shutdown")).status).toBe(403);
		expect((await http(port, "POST", "/shutdown", { "X-FMCP-Pairing": "x".repeat(32) })).status).toBe(403);
		expect((await http(port, "POST", "/shutdown", { "X-FMCP-Pairing": SECRET, Origin: "null" })).status).toBe(403);
		expect(bridge.isListening()).toBe(true);
		// Another bridge instance on the same machine (Node, no Origin, same pairing file) may take the port over.
		expect((await http(port, "POST", "/shutdown", { "X-FMCP-Pairing": SECRET })).status).toBe(200);
		await new Promise((r) => setTimeout(r, 700));
		expect(bridge.isListening()).toBe(false);
	});
});

describe("plugin bridge with FMCP_PAIRING=off", () => {
	it("accepts a plugin without the code, as before pairing existed", async () => {
		const { bridge, port } = await startBridge({ requirePairing: false });
		try {
			const ws = await connect(port, "null");
			const welcome = nextMessage(ws, (m) => m.type === "welcome");
			ws.send(JSON.stringify({ type: "ready", fileKey: "file-a" }));
			await welcome;
			expect(bridge.listConnectedFiles().map((f) => f.fileKey)).toEqual(["file-a"]);
			expect(bridge.pairingStatus().required).toBe(false);
			ws.terminate();
		} finally {
			bridge.stop();
		}
	});
});
