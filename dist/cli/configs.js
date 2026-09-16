/**
 * fmcp CLI — MCP client config inspection (.mcp.json, Claude Desktop, Cursor). Dependency-free.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
/** Does this entry look like FMCP? Match on name or on the script it launches. */
export function isFmcpEntry(entry) {
    if (/figma-mcp-bridge|fmcp/i.test(entry.name))
        return true;
    const joined = [entry.command ?? "", ...entry.args].join(" ");
    return /local-plugin-only\.js|figma-mcp-bridge|fmcp\.js|fmcp-plugin-host\.js/.test(joined);
}
/** Parse a config file and return FMCP-looking server entries. Throws on invalid JSON. */
export function readFmcpEntries(file) {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    const servers = raw.mcpServers && typeof raw.mcpServers === "object" ? raw.mcpServers : {};
    const out = [];
    for (const [name, value] of Object.entries(servers)) {
        if (!value || typeof value !== "object")
            continue;
        const v = value;
        const entry = {
            file,
            name,
            command: typeof v.command === "string" ? v.command : undefined,
            args: Array.isArray(v.args) ? v.args.filter((a) => typeof a === "string") : [],
            url: typeof v.url === "string" ? v.url : undefined,
            env: v.env && typeof v.env === "object" ? Object.fromEntries(Object.entries(v.env).filter(([, x]) => typeof x === "string")) : {},
        };
        if (isFmcpEntry(entry))
            out.push(entry);
    }
    return out;
}
/**
 * Judge whether an entry will actually start on this machine.
 * `installRoot` is where the current dist/ lives; used to spot second installs.
 */
export function judgeEntry(entry, installRoot, opts = {}) {
    const fileExists = opts.fileExists ?? existsSync;
    if (entry.url) {
        return { level: "ok", detail: `uzak sunucu: ${entry.url}` };
    }
    if (!entry.command) {
        return { level: "fail", detail: "command alanı yok", fix: `"command": "node", "args": ["<kurulum>/dist/cli/fmcp.js", "serve"]` };
    }
    if (/^npx$/i.test(entry.command)) {
        return { level: "ok", detail: `npx ile npm paketi (${entry.args.join(" ")})` };
    }
    // Find the script argument (first arg ending with .js)
    const script = entry.args.find((a) => /\.js$/.test(a));
    if (!script) {
        return { level: "warn", detail: `komut: ${entry.command} ${entry.args.join(" ")} (script bulunamadı)`, fix: "args içinde dist/cli/fmcp.js veya dist/local-plugin-only.js olmalı" };
    }
    // ${VAR} placeholders: cannot verify statically
    if (/\$\{|%[A-Z_]+%|\$[A-Z_]/.test(script)) {
        return { level: "ok", detail: `ortam değişkenli yol: ${script} (çalışma anında çözülür)` };
    }
    const resolved = isAbsolute(script) ? script : resolve(dirname(entry.file), script);
    if (!fileExists(resolved)) {
        const looksLikeOtherMachine = /^\/Users\/|^\/home\/|^[A-Za-z]:\\/.test(script) && !script.startsWith(installRoot);
        return {
            level: "fail",
            detail: `script yok: ${resolved}` + (looksLikeOtherMachine ? " (başka bir makinenin yolu)" : ""),
            fix: `yolu bu makineye göre düzeltin: ${resolve(installRoot, "dist", "cli", "fmcp.js")} serve`,
        };
    }
    if (/fmcp-plugin-host\.js$/.test(script)) {
        return { level: "warn", detail: `eski giriş noktası: ${script}`, fix: `dist/cli/fmcp.js serve kullanın` };
    }
    const thisInstall = resolve(installRoot);
    if (!resolved.startsWith(thisInstall)) {
        return {
            level: "warn",
            detail: `farklı bir kurulumu gösteriyor: ${resolved}`,
            fix: `iki kurulum çakışabilir; tek kurulum kullanın (bu: ${thisInstall})`,
        };
    }
    return { level: "ok", detail: `${entry.command} ${entry.args.join(" ")}` };
}
//# sourceMappingURL=configs.js.map