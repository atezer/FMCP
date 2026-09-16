import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isFmcpEntry, judgeEntry, readFmcpEntries } from "../../src/cli/configs";

describe("cli/configs", () => {
	let root: string;
	beforeAll(() => {
		root = mkdtempSync(join(tmpdir(), "fmcp-cfg-"));
		mkdirSync(join(root, "dist", "cli"), { recursive: true });
		writeFileSync(join(root, "dist", "cli", "fmcp.js"), "// stub");
		writeFileSync(join(root, "dist", "local-plugin-only.js"), "// stub");
	});
	afterAll(() => rmSync(root, { recursive: true, force: true }));

	it("recognises FMCP entries by name or by launched script", () => {
		expect(isFmcpEntry({ name: "figma-mcp-bridge", args: [] })).toBe(true);
		expect(isFmcpEntry({ name: "design", command: "node", args: ["/x/dist/local-plugin-only.js"] })).toBe(true);
		expect(isFmcpEntry({ name: "github", command: "npx", args: ["@modelcontextprotocol/server-github"] })).toBe(false);
	});

	it("reads only FMCP servers from a config file", () => {
		const file = join(root, ".mcp.json");
		writeFileSync(file, JSON.stringify({ mcpServers: {
			"figma-mcp-bridge": { command: "node", args: ["dist/cli/fmcp.js", "serve"] },
			other: { command: "npx", args: ["-y", "something"] },
		} }));
		const entries = readFmcpEntries(file);
		expect(entries).toHaveLength(1);
		expect(entries[0].name).toBe("figma-mcp-bridge");
	});

	it("fails an absolute path from another machine", () => {
		const v = judgeEntry({ file: join(root, ".mcp.json"), name: "figma-mcp-bridge", command: "node", args: ["/Users/someone/FCM/dist/local-plugin-only.js"], env: {} }, root);
		expect(v.level).toBe("fail");
		expect(v.detail).toContain("başka bir makinenin yolu");
		if (v.level === "fail") expect(v.fix).toContain("fmcp.js");
	});

	it("accepts a relative path that exists next to the config", () => {
		const v = judgeEntry({ file: join(root, ".mcp.json"), name: "figma-mcp-bridge", command: "node", args: ["dist/cli/fmcp.js", "serve"], env: {} }, root);
		expect(v.level).toBe("ok");
	});

	it("accepts npx and ${VAR} placeholders without touching the filesystem", () => {
		expect(judgeEntry({ file: "/nowhere/.mcp.json", name: "figma-mcp-bridge", command: "npx", args: ["-y", "@atezer/figma-mcp-bridge@latest", "figma-mcp-bridge-plugin"], env: {} }, root).level).toBe("ok");
		expect(judgeEntry({ file: "/nowhere/.mcp.json", name: "figma-mcp-bridge", command: "node", args: ["${CLAUDE_PLUGIN_ROOT}/dist/cli/fmcp.js", "serve"], env: {} }, root).level).toBe("ok");
	});

	it("warns when the script belongs to a different install", () => {
		const other = mkdtempSync(join(tmpdir(), "fmcp-other-"));
		mkdirSync(join(other, "dist"), { recursive: true });
		writeFileSync(join(other, "dist", "local-plugin-only.js"), "// stub");
		const v = judgeEntry({ file: join(root, ".mcp.json"), name: "figma-mcp-bridge", command: "node", args: [join(other, "dist", "local-plugin-only.js")], env: {} }, root);
		expect(v.level).toBe("warn");
		rmSync(other, { recursive: true, force: true });
	});

	it("warns on the stale fmcp-plugin-host.js entry point used by old templates", () => {
		writeFileSync(join(root, "dist", "fmcp-plugin-host.js"), "// stub");
		const v = judgeEntry({ file: join(root, ".mcp.json"), name: "figma-mcp-bridge", command: "node", args: ["dist/fmcp-plugin-host.js"], env: {} }, root);
		expect(v.level).toBe("warn");
	});
});
