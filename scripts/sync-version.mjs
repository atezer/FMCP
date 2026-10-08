#!/usr/bin/env node
/**
 * Keep every version stamp and tool/skill/command count in sync with package.json.
 *
 *   node scripts/sync-version.mjs          # rewrite stamps
 *   node scripts/sync-version.mjs --check  # CI: exit 1 and list drift, change nothing
 *
 * Source of truth: package.json "version"; counts are computed from the code
 * (registerTool calls), skills/<name>/SKILL.md and commands/*.md.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const check = process.argv.includes("--check");
const read = (p) => readFileSync(join(root, p), "utf8");

const version = JSON.parse(read("package.json")).version;
const tools = new Set(read("src/local-plugin-only.ts").match(/registerTool\(\s*"figma_[a-z_]+"/g)).size;
const skills = readdirSync(join(root, "skills"), { withFileTypes: true }).filter(
	(d) => d.isDirectory() && existsSync(join(root, "skills", d.name, "SKILL.md")),
).length;
const commands = readdirSync(join(root, "commands")).filter((f) => f.endsWith(".md")).length;

/** [file, regex (one capture = the value), expected value] */
const rules = [
	["src/core/version.ts", /FMCP_VERSION = "([^"]+)"/, version],
	["f-mcp-plugin/code.js", /FMCP_PLUGIN_VERSION = '([^']+)'/, version],
	["f-mcp-plugin/ui.html", /FMCP_PLUGIN_VERSION = '([^']+)'/, version],
	["package-lock.json", /^\{\s*"name": "[^"]+",\s*"version": "([^"]+)"/, version],
	["package-lock.json", /"packages": \{\s*"": \{\s*"name": "[^"]+",\s*"version": "([^"]+)"/, version],
	["manifest.json", /"version": "([^"]+)"/, version],
	["manifest.json", /"description": "(\d+) MCP tools/, String(tools)],
	[".claude-plugin/plugin.json", /"version": "([^"]+)"/, version],
	[".claude-plugin/plugin.json", /(\d+) MCP aracı/, String(tools)],
	[".claude-plugin/plugin.json", /(\d+) uzman skill/, String(skills)],
	[".claude-plugin/plugin.json", /(\d+) komut/, String(commands)],
	[".cursor-plugin/plugin.json", /"version": "([^"]+)"/, version],
	["KURULUM.md", /`version` \(ör\. \*\*([^*]+)\*\*\)/, version],
	["KURULUM.md", /\*\*Sürüm:\*\* ([0-9.]+)/, version],
	["docs/TOOLS.md", /`dist\/local-plugin-only\.js` \((\d+) araç\)/, String(tools)],
];

const drift = [];
const files = new Map();
for (const [file, re, expected] of rules) {
	const text = files.get(file) ?? read(file);
	const m = re.exec(text);
	if (!m) {
		drift.push(`${file}: pattern not found ${re}`);
		continue;
	}
	if (m[1] !== expected) {
		drift.push(`${file}: "${m[1]}" → "${expected}"`);
		const start = m.index + m[0].indexOf(m[1]);
		files.set(file, text.slice(0, start) + expected + text.slice(start + m[1].length));
	} else {
		files.set(file, text);
	}
}

console.log(`version ${version} · ${tools} tools · ${skills} skills · ${commands} commands`);
if (drift.length === 0) {
	console.log("All stamps in sync.");
	process.exit(0);
}
for (const d of drift) console.log(`  ${d}`);
if (check) {
	console.error(`\n${drift.length} stamp(s) out of sync. Run: node scripts/sync-version.mjs`);
	process.exit(1);
}
if (drift.some((d) => d.includes("pattern not found"))) {
	console.error("\nSome patterns were not found; fix them by hand.");
	process.exit(1);
}
for (const [file, text] of files) writeFileSync(join(root, file), text);
console.log(`\nUpdated ${drift.length} stamp(s).`);
