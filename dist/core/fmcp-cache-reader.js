/**
 * FMCP DS Cache Reader (v3.1+)
 *
 * Server-side reader for the user-local DS cache at
 *   ~/.claude/data/fcm-ds/active.md
 *   ~/.claude/data/fcm-ds/<file-key>/{tokens,components,_meta}.md
 *
 * Surfaces three async resolvers consumed by the new MCP tools:
 *   - resolveActiveDs()
 *   - getLibraryComponents(libraryName, filter?)
 *   - getLibraryTokens(libraryName, filter?)
 *
 * Eliminates the round-trip through the Figma plugin / REST API for cache
 * hits and bypasses the fmcp-filesystem MCP allowedDirectories restriction
 * (Claude no longer needs FS access — the server reads on its behalf).
 */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
const CACHE_ROOT_OVERRIDE_ENV = "FMCP_CACHE_ROOT";
const STALE_AFTER_DAYS = 7;
/** Resolve the cache root directory. Tests/CI may override via env. */
function cacheRoot() {
    const override = process.env[CACHE_ROOT_OVERRIDE_ENV];
    if (override && override.length > 0)
        return override;
    return join(homedir(), ".claude", "data", "fcm-ds");
}
async function readFileSafe(path) {
    try {
        return await readFile(path, "utf8");
    }
    catch {
        return null;
    }
}
function matchLine(text, regex) {
    const m = text.match(regex);
    return m ? m[1].trim() : null;
}
/**
 * Parse active.md (single-library v1 schema). Tolerates surrounding whitespace
 * and code-fenced cache root, e.g. `~/.claude/data/fcm-ds/<key>/`.
 */
function parseActiveMd(text, baseDir) {
    const libraryName = matchLine(text, /^\*\*Library Name:\*\*\s*(.+)$/m);
    const fileKey = matchLine(text, /^\*\*File Key:\*\*\s*(.+)$/m);
    const cacheRootRaw = matchLine(text, /^\*\*Cache Root:\*\*\s*`?([^`\n]+?)`?\s*$/m);
    let cacheRootPath = null;
    if (cacheRootRaw) {
        if (cacheRootRaw.startsWith("~/")) {
            cacheRootPath = join(homedir(), cacheRootRaw.slice(2));
        }
        else if (cacheRootRaw.startsWith("/")) {
            cacheRootPath = cacheRootRaw;
        }
        else {
            // Relative path → resolve against the base directory containing active.md.
            cacheRootPath = join(baseDir, cacheRootRaw);
        }
    }
    return { libraryName, fileKey, cacheRootPath };
}
/** Parse `_meta.md` for the most recent successful sync timestamp. */
function parseMetaSync(text) {
    return matchLine(text, /\*\*Son başarılı sync:\*\*\s*([^\s]+)/);
}
function classifyFreshness(lastSyncIso) {
    if (!lastSyncIso)
        return "stale";
    const ts = Date.parse(lastSyncIso);
    if (Number.isNaN(ts))
        return "stale";
    const ageDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return ageDays > STALE_AFTER_DAYS ? "stale" : "fresh";
}
export async function resolveActiveDs() {
    const root = cacheRoot();
    const activeMd = await readFileSafe(join(root, "active.md"));
    if (!activeMd) {
        return {
            libraryName: null,
            fileKey: null,
            cacheRoot: null,
            status: "missing",
            lastSync: null,
            source: "fmcp_cache",
            notes: `active.md not found under ${root}`,
        };
    }
    const { libraryName, fileKey, cacheRootPath } = parseActiveMd(activeMd, root);
    if (!libraryName || !fileKey || !cacheRootPath) {
        return {
            libraryName,
            fileKey,
            cacheRoot: cacheRootPath,
            status: "missing",
            lastSync: null,
            source: "fmcp_cache",
            notes: "active.md is missing required fields (Library Name / File Key / Cache Root)",
        };
    }
    const metaMd = await readFileSafe(join(cacheRootPath, "_meta.md"));
    const lastSync = metaMd ? parseMetaSync(metaMd) : null;
    const status = metaMd ? classifyFreshness(lastSync) : "missing";
    return {
        libraryName,
        fileKey,
        cacheRoot: cacheRootPath,
        status,
        lastSync,
        source: "fmcp_cache",
    };
}
/** Split a markdown table row into trimmed cells, dropping the leading/trailing pipes. */
function splitRow(line) {
    return line
        .replace(/^\s*\|/, "")
        .replace(/\|\s*$/, "")
        .split("|")
        .map((c) => c.trim());
}
/** Strip surrounding backticks from a markdown inline code span. */
function stripCode(value) {
    const m = value.match(/^`?([^`]*)`?$/);
    return (m ? m[1] : value).trim();
}
/** Detect a markdown alignment row, e.g. `|---|---|`. */
function isSeparatorRow(line) {
    return /^\s*\|?\s*:?-{2,}/.test(line) && line.includes("|");
}
/** Slice a markdown document into heading-led sections (H1..H6). */
function sliceSections(text) {
    const lines = text.split(/\r?\n/);
    const sections = [];
    let current = null;
    for (const line of lines) {
        const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
        if (m) {
            if (current)
                sections.push(current);
            current = { heading: m[2], level: m[1].length, lines: [] };
        }
        else if (current) {
            current.lines.push(line);
        }
    }
    if (current)
        sections.push(current);
    return sections;
}
/**
 * Components.md is a hybrid: top-level UI components live under `### N. Name`
 * headings followed by `- **componentKey:** \`<key>\`` bullets. Icons sit in a
 * single `| Icon | componentKey | Props | Usage |` table. The "Eksik" table
 * lists components that have no key yet — skipped.
 */
export async function getLibraryComponents(libraryName, filter) {
    const ctx = await resolveActiveDs();
    if (!ctx.cacheRoot || ctx.libraryName !== libraryName)
        return [];
    const text = await readFileSafe(join(ctx.cacheRoot, "components.md"));
    if (!text)
        return [];
    const items = [];
    const sections = sliceSections(text);
    for (const section of sections) {
        const heading = section.heading;
        const isHeadingBulletSection = /^\d+\./.test(heading) || section.level === 3;
        const isIconTableSection = /^Icon Components/i.test(heading);
        const isEksikSection = /^Eksik/i.test(heading);
        if (isEksikSection)
            continue;
        if (isHeadingBulletSection) {
            const nameMatch = heading.match(/^\d+\.\s*(.+)$/);
            const name = nameMatch ? nameMatch[1].trim() : heading.trim();
            const keyLine = section.lines.find((l) => /^-\s*\*\*componentKey:\*\*/.test(l));
            if (!keyLine)
                continue;
            const keyMatch = keyLine.match(/`([^`]+)`/);
            if (!keyMatch)
                continue;
            const role = section.lines
                .find((l) => /^-\s*\*\*Kullan(ı|i)m:\*\*/.test(l))
                ?.replace(/^-\s*\*\*Kullan(ı|i)m:\*\*\s*/, "")
                .trim() ?? null;
            // Phase G: optional per-component library attribution. When missing
            // falls back to the active library (legacy cache format compat).
            const sourceLibrary = section.lines
                .find((l) => /^-\s*\*\*sourceLibrary:\*\*/.test(l))
                ?.replace(/^-\s*\*\*sourceLibrary:\*\*\s*/, "")
                .trim() ?? null;
            items.push({
                name,
                key: keyMatch[1],
                role,
                source: ctx.libraryName,
                sourceLibrary: sourceLibrary ?? ctx.libraryName,
            });
            continue;
        }
        if (isIconTableSection) {
            const tableLines = section.lines.filter((l) => l.trim().startsWith("|"));
            if (tableLines.length < 2)
                continue;
            const header = splitRow(tableLines[0]).map((h) => h.toLowerCase());
            const keyIdx = header.findIndex((h) => h.includes("key"));
            const nameIdx = header.findIndex((h) => h === "icon" || h.includes("name"));
            const sourceLibraryIdx = header.findIndex((h) => h === "sourcelibrary" || h === "source library" || h === "library");
            if (keyIdx < 0 || nameIdx < 0)
                continue;
            for (let i = 1; i < tableLines.length; i++) {
                const row = tableLines[i];
                if (isSeparatorRow(row))
                    continue;
                const cells = splitRow(row);
                const key = stripCode(cells[keyIdx] ?? "");
                const name = cells[nameIdx] ?? "";
                if (!key || !name)
                    continue;
                const sourceLibrary = sourceLibraryIdx >= 0 ? (cells[sourceLibraryIdx] || "").trim() || null : null;
                items.push({
                    name,
                    key,
                    role: "icon",
                    source: ctx.libraryName,
                    sourceLibrary: sourceLibrary ?? ctx.libraryName,
                });
            }
        }
    }
    const out = filter ? filterByName(items, filter) : items;
    return out;
}
/**
 * Tokens.md hosts multiple `## <Type> Tokens` tables, each with a 2- or 3-column
 * shape ending in `variableKey`. The section heading carries the type
 * (Spacing, Radius, Surface Backgrounds, Component Backgrounds...).
 * The "Collection Info" table is metadata, not bindable tokens — skipped.
 */
export async function getLibraryTokens(libraryName, filter) {
    const ctx = await resolveActiveDs();
    if (!ctx.cacheRoot || ctx.libraryName !== libraryName)
        return [];
    const text = await readFileSafe(join(ctx.cacheRoot, "tokens.md"));
    if (!text)
        return [];
    const items = [];
    const sections = sliceSections(text);
    for (const section of sections) {
        const heading = section.heading.trim();
        if (/^Collection Info$/i.test(heading))
            continue;
        if (/^Mode Apply/i.test(heading))
            continue;
        if (/^Text Styles/i.test(heading))
            continue;
        if (/^Kullan/i.test(heading))
            continue;
        const tableLines = section.lines.filter((l) => l.trim().startsWith("|"));
        if (tableLines.length < 2)
            continue;
        const header = splitRow(tableLines[0]).map((h) => h.toLowerCase());
        const keyIdx = header.findIndex((h) => h.includes("variablekey") || h === "key");
        if (keyIdx < 0)
            continue;
        const tokenIdx = header.findIndex((h) => h === "token");
        const roleIdx = header.findIndex((h) => h === "role");
        const type = inferTokenType(heading);
        for (let i = 1; i < tableLines.length; i++) {
            const row = tableLines[i];
            if (isSeparatorRow(row))
                continue;
            const cells = splitRow(row);
            const key = stripCode(cells[keyIdx] ?? "");
            if (!key)
                continue;
            let name;
            if (tokenIdx >= 0 && cells[tokenIdx]) {
                name = cells[tokenIdx];
                if (roleIdx >= 0 && cells[roleIdx])
                    name = `${cells[roleIdx]} — ${name}`;
            }
            else {
                name = cells[0] ?? "";
            }
            if (!name)
                continue;
            items.push({ name, key, type, collection: heading });
        }
    }
    return filter ? filterByName(items, filter) : items;
}
function inferTokenType(heading) {
    const lower = heading.toLowerCase();
    if (lower.includes("spacing"))
        return "spacing";
    if (lower.includes("radius"))
        return "radius";
    if (lower.includes("surface"))
        return "color";
    if (lower.includes("background"))
        return "color";
    if (lower.includes("color"))
        return "color";
    if (lower.includes("typography") || lower.includes("text"))
        return "typography";
    return "other";
}
function filterByName(items, filter) {
    const needle = filter.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(needle));
}
//# sourceMappingURL=fmcp-cache-reader.js.map