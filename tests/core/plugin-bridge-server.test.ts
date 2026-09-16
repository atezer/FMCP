import { createServer, get as httpGet, request as httpRequest } from "node:http";
import { PluginBridgeServer } from "../../src/core/plugin-bridge-server";

const MIN_PORT = 5454;
const MAX_PORT = 5470;

/** Pick a port in the FMCP range that nothing is bound to right now. */
async function freePortInRange(): Promise<number> {
	for (let p = MAX_PORT; p >= MIN_PORT; p--) {
		const ok = await new Promise<boolean>((resolve) => {
			const s = createServer();
			s.once("error", () => resolve(false));
			s.listen(p, "127.0.0.1", () => s.close(() => resolve(true)));
		});
		if (ok) return p;
	}
	throw new Error("no free port in range");
}

function getJson(port: number, path: string): Promise<{ status: number; body: any }> {
	return new Promise((resolve, reject) => {
		httpGet({ hostname: "127.0.0.1", port, path }, (res) => {
			let body = "";
			res.on("data", (c) => { body += c; });
			res.on("end", () => { try { resolve({ status: res.statusCode ?? 0, body: JSON.parse(body) }); } catch { resolve({ status: res.statusCode ?? 0, body }); } });
		}).on("error", reject);
	});
}

function post(port: number, path: string, headers: Record<string, string> = {}): Promise<number> {
	return new Promise((resolve, reject) => {
		const req = httpRequest({ hostname: "127.0.0.1", port, path, method: "POST", headers }, (res) => { res.resume(); res.on("end", () => resolve(res.statusCode ?? 0)); });
		req.on("error", reject);
		req.end();
	});
}

async function waitListening(bridge: PluginBridgeServer, ms = 5000): Promise<void> {
	const deadline = Date.now() + ms;
	while (Date.now() < deadline) {
		if (bridge.isListening()) return;
		await new Promise((r) => setTimeout(r, 50));
	}
	throw new Error(`bridge did not start: ${bridge.getStartError()}`);
}

describe("PluginBridgeServer v1.9.15 lifecycle endpoints", () => {
	let bridge: PluginBridgeServer;
	let port: number;
	let shutdownRequested = 0;

	beforeAll(async () => {
		port = await freePortInRange();
		bridge = new PluginBridgeServer(port, {
			installPath: "/tmp/fmcp-test-install",
			standalone: true,
			onShutdownRequested: () => { shutdownRequested++; },
		});
		bridge.start();
		await waitListening(bridge);
	});

	afterAll(() => { try { bridge.stop(); } catch { /* ignore */ } });

	it("GET /status exposes pid, installPath, standalone, mcpClient and files", async () => {
		const { status, body } = await getJson(bridge.getPort(), "/status");
		expect(status).toBe(200);
		expect(body.pid).toBe(process.pid);
		expect(body.installPath).toBe("/tmp/fmcp-test-install");
		expect(body.standalone).toBe(true);
		expect(typeof body.mcpClient).toBe("string");
		expect(body.clients).toBe(0);
		expect(Array.isArray(body.files)).toBe(true);
		expect(body.port).toBe(bridge.getPort());
		expect(body.preferredPort).toBe(port);
	});

	it("POST /shutdown with an Origin header is rejected (CSRF guard) and does not stop the bridge", async () => {
		const code = await post(bridge.getPort(), "/shutdown", { Origin: "https://evil.example" });
		expect(code).toBe(403);
		expect(bridge.isListening()).toBe(true);
		expect(shutdownRequested).toBe(0);
	});

	it("POST /shutdown without Origin stops the bridge and notifies the host process", async () => {
		const code = await post(bridge.getPort(), "/shutdown");
		expect(code).toBe(200);
		await new Promise((r) => setTimeout(r, 900));
		expect(bridge.isListening()).toBe(false);
		expect(shutdownRequested).toBe(1);
	});
});
