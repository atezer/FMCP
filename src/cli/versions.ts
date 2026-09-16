/**
 * fmcp CLI — version consistency across the repo's manifests. Dependency-free.
 *
 * FMCP ships one version string in seven places; when they drift, `figma_get_status`
 * reports a bogus "plugin version mismatch" and marketplaces show stale numbers.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface VersionSource {
	/** Repo-relative path. */
	file: string;
	/** Extracted version or null when the file is missing / unparsable. */
	version: string | null;
	/** True for files that must match; false for informational ones (e.g. dist). */
	required: boolean;
	note?: string;
}

function readJsonVersion(path: string): string | null {
	try {
		const data = JSON.parse(readFileSync(path, "utf8")) as { version?: unknown };
		return typeof data.version === "string" ? data.version : null;
	} catch { return null; }
}

function readRegexVersion(path: string, re: RegExp): string | null {
	try {
		const m = readFileSync(path, "utf8").match(re);
		return m ? m[1] : null;
	} catch { return null; }
}

/** Collect versions from all known places under `root`. Missing optional files are skipped. */
export function collectVersions(root: string): VersionSource[] {
	const out: VersionSource[] = [];
	const push = (file: string, version: string | null, required: boolean, note?: string) => {
		out.push({ file, version, required, ...(note ? { note } : {}) });
	};

	push("package.json", readJsonVersion(join(root, "package.json")), true);
	push("src/core/version.ts", readRegexVersion(join(root, "src", "core", "version.ts"), /FMCP_VERSION\s*=\s*"([^"]+)"/), true);

	const distVersion = join(root, "dist", "core", "version.js");
	if (existsSync(distVersion)) {
		push("dist/core/version.js", readRegexVersion(distVersion, /FMCP_VERSION\s*=\s*"([^"]+)"/), false, "build çıktısı; farklıysa `npm run build`");
	}

	push(".claude-plugin/plugin.json", readJsonVersion(join(root, ".claude-plugin", "plugin.json")), true);
	push(".cursor-plugin/plugin.json", readJsonVersion(join(root, ".cursor-plugin", "plugin.json")), true);

	const mcpb = join(root, "manifest.json");
	if (existsSync(mcpb)) push("manifest.json", readJsonVersion(mcpb), true, "MCPB manifest");

	push("f-mcp-plugin/ui.html", readRegexVersion(join(root, "f-mcp-plugin", "ui.html"), /FMCP_PLUGIN_VERSION\s*=\s*'([^']+)'/), true, "plugin; farklıysa Figma'da plugin'i yeniden import edin");

	return out;
}

export interface VersionReport {
	ok: boolean;
	/** package.json version (the source of truth). */
	expected: string | null;
	mismatches: VersionSource[];
	missing: VersionSource[];
}

export function checkVersions(sources: VersionSource[]): VersionReport {
	const pkg = sources.find((s) => s.file === "package.json");
	const expected = pkg?.version ?? null;
	const missing = sources.filter((s) => s.required && s.version === null);
	const mismatches = expected === null
		? []
		: sources.filter((s) => s.version !== null && s.version !== expected);
	return { ok: expected !== null && missing.length === 0 && mismatches.filter((m) => m.required).length === 0, expected, mismatches, missing };
}
