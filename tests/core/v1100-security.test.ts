/**
 * v1.10.0 — security & routing (PR-2). Servers listen on an ephemeral port (0),
 * never in the 5454–5470 bridge range, so live bridges are not touched.
 */

import { request as httpRequest } from "http";
import type { AddressInfo } from "net";
import { WebSocket } from "ws";
import { PluginBridgeServer, isAllowedOrigin } from "../../src/core/plugin-bridge-server";
import { PluginBridgeConnector, isNotSentError, isSentButLostError } from "../../src/core/plugin-bridge-connector";
import { looksMutating } from "../../src/core/mutation-detect";
import { resolveFigmaRestUrl, isRetryableMethod } from "../../src/core/rest-url";

type AnyServer = Record<string, any>;

/** Start the bridge's real HTTP+WS stack on an ephemeral port (bypasses port scanning). */
async function startOnEphemeralPort(): Promise<{ bridge: PluginBridgeServer; port: number }> {
	const bridge = new PluginBridgeServer(5454);
	const b = bridge as unknown as AnyServer;
	const http = b.createBridgeHttpServer();
	await new Promise<void>((r) => http.listen(0, "127.0.0.1", r));
	const port = (http.address() as AddressInfo).port;
	b.setupBridgeOnServer(http, port, "127.0.0.1");
	return { bridge, port };
}

function post(port: number, path: string, headers: Record<string, string> = {}): Promise<number> {
	return new Promise((resolve, reject) => {
		const req = httpRequest({ hostname: "127.0.0.1", port, path, method: "POST", headers }, (res) => {
			res.resume();
			resolve(res.statusCode ?? 0);
		});
		req.on("error", reject);
		req.end();
	});
}

function wsConnect(port: number, origin?: string): Promise<WebSocket> {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(`ws://127.0.0.1:${port}`, origin ? { origin } : {});
		ws.once("open", () => resolve(ws));
		ws.once("error", reject);
		ws.once("unexpected-response", (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
	});
}

const waitFor = async (cond: () => boolean, ms = 2000) => {
	const end = Date.now() + ms;
	while (!cond() && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
};

describe("origin allowlist", () => {
	it("allows the Figma plugin ('null'), non-browser clients and figma.com", () => {
		expect(isAllowedOrigin("null")).toBe(true);
		expect(isAllowedOrigin(undefined)).toBe(true);
		expect(isAllowedOrigin("https://www.figma.com")).toBe(true);
	});
	it("rejects regular web pages and look-alike hosts", () => {
		expect(isAllowedOrigin("https://evil.example")).toBe(false);
		expect(isAllowedOrigin("http://localhost:3000")).toBe(false);
		expect(isAllowedOrigin("https://figma.com.evil.example")).toBe(false);
	});
});

describe("bridge HTTP/WS hardening (ephemeral port)", () => {
	let bridge: PluginBridgeServer;
	let port: number;
	beforeEach(async () => ({ bridge, port } = await startOnEphemeralPort()));
	afterEach(() => bridge.stop());

	it("/shutdown from a browser (Origin header) is rejected and the bridge keeps running", async () => {
		expect(await post(port, "/shutdown", { Origin: "https://evil.example" })).toBe(403);
		expect(await post(port, "/shutdown", { Origin: "null" })).toBe(403);
		expect(bridge.isListening()).toBe(true);
	});

	it("/status no longer sends a wildcard CORS header and reports idleSeconds", async () => {
		const res = await fetch(`http://127.0.0.1:${port}/status`);
		expect(res.headers.get("access-control-allow-origin")).toBeNull();
		const body = (await res.json()) as Record<string, unknown>;
		expect(typeof body.idleSeconds).toBe("number");
	});

	it("WebSocket from a web page origin is refused; the plugin's 'null' origin connects", async () => {
		await expect(wsConnect(port, "https://evil.example")).rejects.toThrow(/403|401/);
		const ws = await wsConnect(port, "null");
		ws.close();
	});

	it("a response from a different client cannot resolve someone else's request", async () => {
		const plugin = await wsConnect(port, "null");
		const intruder = await wsConnect(port, "null");
		plugin.send(JSON.stringify({ type: "ready", fileKey: "FILE_A", fileName: "A" }));
		intruder.send(JSON.stringify({ type: "ready", fileKey: "FILE_B", fileName: "B" }));
		await waitFor(() => bridge.listConnectedFiles().filter((f) => f.fileKey).length === 2);

		plugin.on("message", (d) => {
			const m = JSON.parse(String(d));
			if (m.id) {
				// the intruder races a forged answer, then the real plugin answers
				intruder.send(JSON.stringify({ id: m.id, result: "forged" }));
				setTimeout(() => plugin.send(JSON.stringify({ id: m.id, result: "real" })), 50);
			}
		});
		await expect(bridge.request("ping", {}, "FILE_A")).resolves.toBe("real");
		plugin.close();
		intruder.close();
	});

	it("token messages are ignored before the ready handshake", async () => {
		const ws = await wsConnect(port);
		ws.send(JSON.stringify({ type: "setToken", token: "figd_attacker" }));
		await new Promise((r) => setTimeout(r, 100));
		expect(bridge.getFigmaRestToken()).toBeNull();
		ws.close();
	});

	it("stop() is idempotent and leaves nothing listening", () => {
		bridge.stop();
		bridge.stop();
		expect(bridge.isListening()).toBe(false);
	});
});

describe("routing (strict fileKey, ambiguous writes)", () => {
	function withClients(files: Array<string | null>): PluginBridgeServer {
		const bridge = new PluginBridgeServer(5454);
		const clients = (bridge as unknown as AnyServer).clients as Map<string, unknown>;
		files.forEach((fileKey, i) =>
			clients.set(`c${i}`, {
				ws: { readyState: 1, send: () => {} },
				clientId: `c${i}`,
				fileKey,
				fileName: fileKey ? `File ${fileKey}` : null,
				pluginVersion: "1.9.16",
				alive: true,
				missedHeartbeats: 0,
				connectedAt: 1000 + i,
			}),
		);
		return bridge;
	}

	it("an unknown fileKey no longer falls back to another file", () => {
		const b = withClients(["A", "B"]) as unknown as AnyServer;
		expect(b.resolveClient("MISSING")).toBeUndefined();
		expect(b.resolveClient("A").fileKey).toBe("A");
	});

	it("untargeted writes are ambiguous only when several files are connected", () => {
		expect(withClients(["A"]).getAmbiguousTargetError()).toBeNull();
		expect(withClients(["A", null]).getAmbiguousTargetError()).toBeNull(); // handshake in progress
		const msg = withClients(["A", "B"]).getAmbiguousTargetError();
		expect(msg).toMatch(/fileKey: A/);
		expect(msg).toMatch(/fileKey: B/);
	});

	it("FMCP_REQUIRE_TARGET=0 turns the rule off", () => {
		process.env.FMCP_REQUIRE_TARGET = "0";
		try {
			expect(withClients(["A", "B"]).getAmbiguousTargetError()).toBeNull();
		} finally {
			delete process.env.FMCP_REQUIRE_TARGET;
		}
	});
});

describe("figma_execute is never re-sent after delivery", () => {
	const connector = (errors: string[]) => {
		let calls = 0;
		const bridge = {
			request: async () => {
				const e = errors[calls++];
				if (e) throw new Error(e);
				return { success: true };
			},
		};
		return { conn: new PluginBridgeConnector(bridge as never), calls: () => calls };
	};

	it("retries once when the request never reached a plugin", async () => {
		const { conn, calls } = connector(["F-MCP ATezer Bridge plugin not connected. Open Figma…"]);
		await expect(conn.executeCodeViaUI("return 1")).resolves.toEqual({ success: true });
		expect(calls()).toBe(2);
	}, 10000);

	it.each([
		"Plugin bridge request 'executeCodeViaUI' failed: WebSocket closed",
		"Plugin bridge request 'executeCodeViaUI' failed: Heartbeat timeout",
		"Plugin bridge request 'executeCodeViaUI' failed: Replaced by new connection for same file",
	])("does not retry after '%s'", async (err) => {
		const { conn, calls } = connector([err]);
		await expect(conn.executeCodeViaUI("figma.createFrame()")).rejects.toThrow(/EXECUTION_STATE_UNKNOWN/);
		expect(calls()).toBe(1);
	});

	it("classifies errors", () => {
		expect(isNotSentError("Failed to send request 'x': boom")).toBe(true);
		expect(isNotSentError("Plugin bridge request 'x' failed: WebSocket closed")).toBe(false);
		expect(isSentButLostError("Plugin bridge request 'x' failed: WebSocket closed")).toBe(true);
	});
});

describe("looksMutating", () => {
	it.each([
		"const f = figma.createFrame(); return f.id;",
		"node.name = 'Card'",
		"frame.fills = [paint]",
		"await node.setBoundVariable('paddingTop', v)",
		"await figma.importComponentByKeyAsync(key)",
		"n.remove()",
		"await figma.variables.createVariable('x', c, 'COLOR')",
		"variable.setValueForMode(modeId, 1)",
	])("mutating: %s", (code) => expect(looksMutating(code)).toBe(true));

	it.each([
		"return figma.currentPage.children.map(c => ({ id: c.id, name: c.name }));",
		"const out = {}; out.total = 3; return out;",
		"// node.name = 'x'\nreturn figma.root.name;",
		"return 'frame.fills = []';",
		"const n = await figma.getNodeByIdAsync(id); return n && n.type === 'FRAME';",
	])("read-only: %s", (code) => expect(looksMutating(code)).toBe(false));
});

describe("figma_rest_api URL guard", () => {
	it("builds api.figma.com URLs from paths", () => {
		expect(resolveFigmaRestUrl("/v1/files/abc")).toBe("https://api.figma.com/v1/files/abc");
		expect(resolveFigmaRestUrl("v1/me")).toBe("https://api.figma.com/v1/me");
		expect(resolveFigmaRestUrl("https://api.figma.com/v1/me")).toBe("https://api.figma.com/v1/me");
	});
	it.each([
		"https://evil.example/steal",
		"http://api.figma.com/v1/me",
		"https://api.figma.com.evil.example/v1",
		"https://user@api.figma.com/v1/me",
		"javascript:alert(1)",
	])("rejects %s", (u) => expect(() => resolveFigmaRestUrl(u)).toThrow());
	it("only retries idempotent methods", () => {
		expect(isRetryableMethod(undefined)).toBe(true);
		expect(isRetryableMethod("GET")).toBe(true);
		expect(isRetryableMethod("POST")).toBe(false);
		expect(isRetryableMethod("DELETE")).toBe(false);
	});
});
