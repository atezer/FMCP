/**
 * fmcp CLI — path helpers. Dependency-free (node builtins only) so the CLI and the
 * degraded status server run even when node_modules is missing (e.g. cloud sessions).
 */
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
/** Install root = directory that contains dist/. `moduleUrl` is import.meta.url of a file in dist/cli/. */
export function installRootFrom(moduleUrl) {
    return resolve(dirname(fileURLToPath(moduleUrl)), "..", "..");
}
/** ~/.fmcp — CLI state (pidfile, logs). Screenshots already live here (v1.9.5+). */
export function fmcpHome(home = homedir()) {
    return join(home, ".fmcp");
}
export function pidFilePath(home = homedir()) {
    return join(fmcpHome(home), "bridge.pid");
}
export function logFilePath(home = homedir()) {
    return join(fmcpHome(home), "bridge.log");
}
/** Claude Desktop config location per platform (null if platform unknown). */
export function claudeDesktopConfigPath(platform = process.platform, home = homedir(), env = process.env) {
    if (platform === "darwin") {
        return join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
    }
    if (platform === "win32") {
        const appData = env.APPDATA || join(home, "AppData", "Roaming");
        return join(appData, "Claude", "claude_desktop_config.json");
    }
    if (platform === "linux") {
        const xdg = env.XDG_CONFIG_HOME || join(home, ".config");
        return join(xdg, "Claude", "claude_desktop_config.json");
    }
    return null;
}
/** Cursor global MCP config. */
export function cursorGlobalConfigPath(home = homedir()) {
    return join(home, ".cursor", "mcp.json");
}
/** Candidate MCP config files for a given project dir + user home. Only existing files are returned. */
export function candidateMcpConfigs(projectDir, opts = {}) {
    const platform = opts.platform ?? process.platform;
    const home = opts.home ?? homedir();
    const env = opts.env ?? process.env;
    const all = [
        { label: "Claude Code (.mcp.json)", file: join(projectDir, ".mcp.json") },
        { label: "Cursor (proje .cursor/mcp.json)", file: join(projectDir, ".cursor", "mcp.json") },
        { label: "Cursor (kullanıcı ~/.cursor/mcp.json)", file: cursorGlobalConfigPath(home) },
        { label: "Claude Desktop", file: claudeDesktopConfigPath(platform, home, env) },
    ];
    return all.filter((c) => !!c.file && existsSync(c.file));
}
/**
 * Cloud / remote session detection. In these environments the Figma plugin runs on the
 * user's own computer and can never reach this process, so the full bridge is pointless.
 */
export function isCloudEnv(env = process.env) {
    if (env.FMCP_FORCE_DEGRADED === "1")
        return { cloud: true, reason: "FMCP_FORCE_DEGRADED=1" };
    if (env.CLAUDE_CODE_REMOTE)
        return { cloud: true, reason: "CLAUDE_CODE_REMOTE" };
    if (env.CODESPACES === "true")
        return { cloud: true, reason: "GitHub Codespaces" };
    if (env.GITPOD_WORKSPACE_ID)
        return { cloud: true, reason: "Gitpod" };
    return { cloud: false, reason: null };
}
//# sourceMappingURL=paths.js.map