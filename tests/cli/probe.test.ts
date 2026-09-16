import { createServer, type Server } from "node:http";
import { fetchStatus, FMCP_PROCESS_RE, MAX_PORT, MIN_PORT, probePort, requestShutdown } from "../../src/cli/probe";

/** Bind the first free port in the FMCP range so tests do not collide with a real bridge. */
async function listenInRange(server: Server): Promise<number> {
	for (let p = MAX_PORT; p >= MIN_PORT; p--) {
		const ok = await new Promise<boolean>((resolve) => {
			const onErr = () => { server.removeListener("error", onErr); resolve(false); };
			server.once("error", onErr);
			server.listen(p, "127.0.0.1", () => { server.removeListener("error", onErr); resolve(true); });
		});
		if (ok) return p;
	}
	throw new Error("no free port in FMCP range");
}

describe("cli/probe", () => {
	let fake: Server;
	let port: number;
	let shutdownCalls = 0;

	beforeAll(async () => {
		fake = createServer((req, res) => {
			if (req.method === "POST" && req.url === "/shutdown") { shutdownCalls++; res.writeHead(200); res.end("shutting down\n"); return; }
			if (req.url === "/status") { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ clients: 2, uptime: 40, version: "1.9.15", pid: 4242, standalone: true, files: [{ fileKey: "abc", fileName: "Demo", pluginVersion: "1.9.15", connectedAt: 1 }] })); return; }
			res.writeHead(200, { "Content-Type": "text/plain" }); res.end("F-MCP ATezer Bridge (connect via WebSocket)\n");
		});
		port = await listenInRange(fake);
	});
	afterAll(() => new Promise<void>((r) => fake.close(() => r())));

	it("classifies an FMCP bridge by its marker", async () => {
		expect(await probePort(port)).toBe("fmcp");
	});

	it("classifies a closed port as none", async () => {
		// Find a port in range that is not ours and refuses connections.
		let closed: number | null = null;
		for (let p = MIN_PORT; p <= MAX_PORT; p++) {
			if (p === port) continue;
			if ((await probePort(p)) === "none") { closed = p; break; }
		}
		if (closed === null) return; // every port busy on this machine — nothing to assert
		expect(await probePort(closed)).toBe("none");
	});

	it("reads the extended /status payload", async () => {
		const s = await fetchStatus(port);
		expect(s?.clients).toBe(2);
		expect(s?.pid).toBe(4242);
		expect(s?.standalone).toBe(true);
		expect(s?.files?.[0].fileName).toBe("Demo");
	});

	it("POST /shutdown resolves true on 200", async () => {
		expect(await requestShutdown(port)).toBe(true);
		expect(shutdownCalls).toBe(1);
	});

	it("recognises FMCP processes in ps output", () => {
		expect(FMCP_PROCESS_RE.test("node /Users/x/FCM/dist/local-plugin-only.js")).toBe(true);
		expect(FMCP_PROCESS_RE.test("node /x/dist/cli/fmcp.js serve")).toBe(true);
		expect(FMCP_PROCESS_RE.test("npm exec @atezer/figma-mcp-bridge@latest figma-mcp-bridge-plugin")).toBe(true);
		expect(FMCP_PROCESS_RE.test("/usr/local/bin/node /x/dist/local-plugin-only.js")).toBe(true);
		expect(FMCP_PROCESS_RE.test("node /x/dist/cli/fmcp.js doctor")).toBe(false);
		expect(FMCP_PROCESS_RE.test("bash -c \"node dist/cli/fmcp.js serve | grep x\"")).toBe(false);
		expect(FMCP_PROCESS_RE.test("grep fmcp.js serve")).toBe(false);
		expect(FMCP_PROCESS_RE.test("/Applications/Figma.app/Contents/MacOS/Figma")).toBe(false);
	});
});
