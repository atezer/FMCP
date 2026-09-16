/**
 * fmcp CLI — bridge/port probing and process helpers. Dependency-free.
 */
import { execFileSync } from "node:child_process";
import { get as httpGet, request as httpRequest } from "node:http";
export const MIN_PORT = 5454;
export const MAX_PORT = 5470;
export const HOST = "127.0.0.1";
/** GET / on a port: "fmcp" (marker found), "other" (something else answers), "none" (refused), "dead" (no answer). */
export function probePort(port, host = HOST, timeoutMs = 1500) {
    return new Promise((resolve) => {
        const req = httpGet({ hostname: host, port, path: "/", timeout: timeoutMs }, (res) => {
            let body = "";
            res.on("data", (c) => { body += c; });
            res.on("end", () => resolve(body.includes("F-MCP") ? "fmcp" : "other"));
        });
        req.on("error", (err) => {
            resolve(err.code === "ECONNREFUSED" ? "none" : "dead");
        });
        req.on("timeout", () => { req.destroy(); resolve("dead"); });
    });
}
export function fetchStatus(port, host = HOST, timeoutMs = 1500) {
    return new Promise((resolve) => {
        const req = httpGet({ hostname: host, port, path: "/status", timeout: timeoutMs }, (res) => {
            let body = "";
            res.on("data", (c) => { body += c; });
            res.on("end", () => {
                try {
                    const data = JSON.parse(body);
                    resolve(typeof data.clients === "number" ? data : null);
                }
                catch {
                    resolve(null);
                }
            });
        });
        req.on("error", () => resolve(null));
        req.on("timeout", () => { req.destroy(); resolve(null); });
    });
}
/** POST /shutdown. Resolves true if the bridge accepted (200) or is already gone. */
export function requestShutdown(port, host = HOST, timeoutMs = 3000) {
    return new Promise((resolve) => {
        const req = httpRequest({ hostname: host, port, path: "/shutdown", method: "POST", timeout: timeoutMs }, (res) => {
            res.resume();
            res.on("end", () => resolve(res.statusCode === 200));
        });
        req.on("error", () => resolve(true));
        req.on("timeout", () => { req.destroy(); resolve(false); });
        req.end();
    });
}
/** PID listening on a TCP port, via lsof (darwin/linux) or netstat (win32). null if unknown. */
export function listeningPid(port, platform = process.platform) {
    try {
        if (platform === "win32") {
            const out = execFileSync("netstat", ["-ano", "-p", "tcp"], { encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"] });
            for (const line of out.split(/\r?\n/)) {
                if (line.includes(`:${port} `) && /LISTENING/i.test(line)) {
                    const pid = parseInt(line.trim().split(/\s+/).pop() || "", 10);
                    if (pid > 0)
                        return pid;
                }
            }
            return null;
        }
        const out = execFileSync("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"], { encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"] });
        const pid = parseInt(out.trim().split(/\s+/)[0] || "", 10);
        return pid > 0 ? pid : null;
    }
    catch {
        return null;
    }
}
/** Full command line of a PID (ps). null if unknown. */
export function processCommand(pid, platform = process.platform) {
    try {
        if (platform === "win32") {
            const out = execFileSync("wmic", ["process", "where", `ProcessId=${pid}`, "get", "CommandLine", "/value"], { encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"] });
            const m = out.match(/CommandLine=(.*)/);
            return m ? m[1].trim() : null;
        }
        const out = execFileSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"] });
        return out.trim() || null;
    }
    catch {
        return null;
    }
}
/** Recognise FMCP bridge processes in `ps` output: executable must be node/npm/npx so shells or editors whose
 * command line merely mentions the script (e.g. `bash -c "... fmcp.js serve"`) are not flagged. Exported for tests. */
export const FMCP_PROCESS_RE = /^(?:\S*\/)?(?:node(?:js)?(?:\d+)?(?:\.exe)?|npm|npx)\s+.*?(?:local-plugin-only\.js|figma-mcp-bridge-plugin|@atezer\/figma-mcp-bridge|fmcp\.js\s+serve)/;
/** All FMCP-looking processes on this machine: [{pid, command}]. Best effort; [] on Windows or failure. */
export function listFmcpProcesses(platform = process.platform, selfPid = process.pid) {
    if (platform === "win32")
        return [];
    try {
        const out = execFileSync("ps", ["-axo", "pid=,command="], { encoding: "utf8", timeout: 3000, stdio: ["ignore", "pipe", "ignore"] });
        const result = [];
        for (const line of out.split("\n")) {
            const m = line.match(/^\s*(\d+)\s+(.*)$/);
            if (!m)
                continue;
            const pid = parseInt(m[1], 10);
            const command = m[2];
            if (pid === selfPid)
                continue;
            if (FMCP_PROCESS_RE.test(command))
                result.push({ pid, command });
        }
        return result;
    }
    catch {
        return [];
    }
}
export function isProcessAlive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
}
export function killPid(pid, signal = "SIGTERM") {
    try {
        process.kill(pid, signal);
        return true;
    }
    catch {
        return false;
    }
}
/** Probe every port in range in parallel; returns only ports where something answers or holds the port. */
export async function scanBridges(opts = {}) {
    const platform = opts.platform ?? process.platform;
    const withPids = opts.withPids ?? true;
    const ports = [];
    for (let p = MIN_PORT; p <= MAX_PORT; p++)
        ports.push(p);
    const infos = await Promise.all(ports.map(async (port) => {
        const kind = await probePort(port);
        if (kind === "none")
            return null;
        const status = kind === "fmcp" ? await fetchStatus(port) : null;
        let pid = status?.pid ?? null;
        let command = null;
        if (withPids) {
            if (pid === null)
                pid = listeningPid(port, platform);
            if (pid !== null)
                command = processCommand(pid, platform);
        }
        return { port, kind, status, pid, command };
    }));
    return infos.filter((i) => i !== null);
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Wait until /status answers on `port` (or give up after timeoutMs). */
export async function waitForBridge(port, timeoutMs = 5000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const s = await fetchStatus(port, HOST, 500);
        if (s)
            return s;
        await sleep(200);
    }
    return null;
}
//# sourceMappingURL=probe.js.map