#!/usr/bin/env node
/**
 * F-MCP Cursor skill dosyalarında geçen figma_* MCP araç adlarını,
 * repodaki kaynakta registerTool ile tanımlanan araçlarla karşılaştırır.
 *
 * Kaynak (union — plugin-only + local + figma-tools):
 *   src/local-plugin-only.ts, src/local.ts, src/core/figma-tools.ts
 *
 * Hedef: .cursor/skills/f-mcp/ altındaki tüm .md dosyaları
 *
 * Çıkış kodu: 0 = uyumlu, 1 = skill'de bilinmeyen araç var
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const SOURCE_FILES = [
	join(ROOT, "src/local-plugin-only.ts"),
];

const SKILLS_DIR = join(ROOT, ".cursor/skills/f-mcp");

const REGISTER_RE = /registerTool\(\s*["'](figma_[a-z0-9_]+)["']/g;
/** Skill/markdown içindeki araç adları: `figma_foo` veya figma_foo( */
const SKILL_TOOL_RE = /\b(figma_[a-z][a-z0-9_]*)\b/g;

/** Skill adları / yanlış pozitifler (figma_ ile başlamaz ama eşleşmeyi bozmasın) */
const IGNORE_TOOLS = new Set([
	// yok — tüm figma_* eşleşmeleri araç sayılır
]);

function collectRegisteredTools() {
	const set = new Set();
	for (const file of SOURCE_FILES) {
		let text;
		try {
			text = readFileSync(file, "utf8");
		} catch {
			console.error(`Kaynak okunamadı: ${file}`);
			process.exit(2);
		}
		let m;
		REGISTER_RE.lastIndex = 0;
		while ((m = REGISTER_RE.exec(text)) !== null) {
			set.add(m[1]);
		}
	}
	return set;
}

function walkMarkdownFiles(dir, acc = []) {
	for (const name of readdirSync(dir)) {
		if (name === "node_modules") continue;
		const p = join(dir, name);
		const st = statSync(p);
		if (st.isDirectory()) walkMarkdownFiles(p, acc);
		else if (name.endsWith(".md")) acc.push(p);
	}
	return acc;
}

function collectSkillToolRefs(files) {
	const byFile = new Map();
	const all = new Set();
	for (const file of files) {
		const text = readFileSync(file, "utf8");
		const found = new Set();
		let m;
		SKILL_TOOL_RE.lastIndex = 0;
		while ((m = SKILL_TOOL_RE.exec(text)) !== null) {
			const name = m[1];
			if (IGNORE_TOOLS.has(name)) continue;
			found.add(name);
			all.add(name);
		}
		if (found.size) byFile.set(file, found);
	}
	return { byFile, all };
}

function main() {
	const registered = collectRegisteredTools();
	const mdFiles = walkMarkdownFiles(SKILLS_DIR);
	const { byFile, all } = collectSkillToolRefs(mdFiles);

	const unknown = [...all].filter((t) => !registered.has(t)).sort();
	const onlyInSource = [...registered].filter((t) => !all.has(t)).sort();

	console.log(`Kaynak MCP araçları (union): ${registered.size} adet`);
	console.log(`Skill dosyalarında geçen figma_*: ${all.size} benzersiz ad\n`);

	if (unknown.length) {
		console.error("Skill metinlerinde kaynakta OLMAYAN araç adları:\n");
		for (const t of unknown) {
			console.error(`  - ${t}`);
			for (const [file, set] of byFile) {
				if (set.has(t)) {
					console.error(`      ${file.replace(ROOT + "/", "")}`);
				}
			}
		}
		console.error("\nÇözüm: src/ içinde registerTool adını doğrula veya skill metnini güncelle.");
		process.exit(1);
	}

	console.log("Tüm skill araç referansları kaynakla uyumlu.\n");
	if (process.env.VERBOSE === "1") {
		console.log("(VERBOSE) Skill'de hiç geçmeyen kayıtlı araçlar (bilgi):\n");
		for (const t of onlyInSource.slice(0, 40)) {
			console.log(`  - ${t}`);
		}
		if (onlyInSource.length > 40) {
			console.log(`  ... ve ${onlyInSource.length - 40} tane daha`);
		}
	}
}

main();
