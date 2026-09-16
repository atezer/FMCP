import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkVersions, collectVersions } from "../../src/cli/versions";

function scaffold(versions: { pkg: string; ts: string; claude: string; cursor: string; ui: string; mcpb?: string; dist?: string }): string {
	const root = mkdtempSync(join(tmpdir(), "fmcp-ver-"));
	mkdirSync(join(root, "src", "core"), { recursive: true });
	mkdirSync(join(root, ".claude-plugin"));
	mkdirSync(join(root, ".cursor-plugin"));
	mkdirSync(join(root, "f-mcp-plugin"));
	writeFileSync(join(root, "package.json"), JSON.stringify({ name: "x", version: versions.pkg }));
	writeFileSync(join(root, "src", "core", "version.ts"), `export const FMCP_VERSION = "${versions.ts}";\n`);
	writeFileSync(join(root, ".claude-plugin", "plugin.json"), JSON.stringify({ version: versions.claude }));
	writeFileSync(join(root, ".cursor-plugin", "plugin.json"), JSON.stringify({ version: versions.cursor }));
	writeFileSync(join(root, "f-mcp-plugin", "ui.html"), `<script>var FMCP_PLUGIN_VERSION = '${versions.ui}';</script>`);
	if (versions.mcpb) writeFileSync(join(root, "manifest.json"), JSON.stringify({ version: versions.mcpb }));
	if (versions.dist) {
		mkdirSync(join(root, "dist", "core"), { recursive: true });
		writeFileSync(join(root, "dist", "core", "version.js"), `export const FMCP_VERSION = "${versions.dist}";\n`);
	}
	return root;
}

describe("cli/versions", () => {
	const roots: string[] = [];
	afterAll(() => { for (const r of roots) rmSync(r, { recursive: true, force: true }); });

	it("reports consistent when every required source matches package.json", () => {
		const root = scaffold({ pkg: "1.9.15", ts: "1.9.15", claude: "1.9.15", cursor: "1.9.15", ui: "1.9.15", mcpb: "1.9.15" });
		roots.push(root);
		const report = checkVersions(collectVersions(root));
		expect(report.ok).toBe(true);
		expect(report.expected).toBe("1.9.15");
		expect(report.mismatches).toHaveLength(0);
	});

	it("flags drifted manifests (the 1.7.28 / 46-tool case)", () => {
		const root = scaffold({ pkg: "1.9.14", ts: "1.9.14", claude: "1.7.28", cursor: "1.7.28", ui: "1.9.14", mcpb: "1.1.2" });
		roots.push(root);
		const report = checkVersions(collectVersions(root));
		expect(report.ok).toBe(false);
		expect(report.mismatches.map((m) => m.file).sort()).toEqual([".claude-plugin/plugin.json", ".cursor-plugin/plugin.json", "manifest.json"]);
	});

	it("treats a stale dist as non-required (warn, not fail)", () => {
		const root = scaffold({ pkg: "1.9.15", ts: "1.9.15", claude: "1.9.15", cursor: "1.9.15", ui: "1.9.15", dist: "1.9.14" });
		roots.push(root);
		const report = checkVersions(collectVersions(root));
		expect(report.ok).toBe(true);
		expect(report.mismatches).toHaveLength(1);
		expect(report.mismatches[0].file).toBe("dist/core/version.js");
		expect(report.mismatches[0].required).toBe(false);
	});

	it("reports missing required files", () => {
		const root = mkdtempSync(join(tmpdir(), "fmcp-ver-empty-"));
		roots.push(root);
		writeFileSync(join(root, "package.json"), JSON.stringify({ version: "1.0.0" }));
		const report = checkVersions(collectVersions(root));
		expect(report.ok).toBe(false);
		expect(report.missing.length).toBeGreaterThan(0);
	});
});
