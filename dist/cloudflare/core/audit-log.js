/**
 * Enterprise audit log — tool invocations and connection events for compliance.
 * Optional: enable via FIGMA_MCP_AUDIT_LOG_PATH (file path) or config local.auditLogPath.
 * Format: one JSON object per line (NDJSON) for easy parsing and retention.
 */
import { createWriteStream } from "fs";
import { appendFileSync } from "fs";
const noop = () => { };
let stream = null;
function getStream(path) {
    if (stream)
        return stream;
    try {
        stream = createWriteStream(path, { flags: "a" });
        stream.on("error", () => {
            stream = null;
        });
        return stream;
    }
    catch {
        return null;
    }
}
function writeLine(path, line) {
    const s = getStream(path);
    if (s && s.writable) {
        s.write(line + "\n");
        return;
    }
    try {
        appendFileSync(path, line + "\n");
    }
    catch {
        // ignore
    }
}
/**
 * Log an audit entry. No-op if path not set or write fails.
 */
export function auditLog(path, entry) {
    if (!path || path === "")
        return;
    const full = { ...entry, ts: new Date().toISOString() };
    try {
        writeLine(path, JSON.stringify(full));
    }
    catch {
        noop();
    }
}
/**
 * Log a tool invocation (call from bridge after request completes).
 */
export function auditTool(path, method, success, error, durationMs) {
    auditLog(path, { event: "tool", method, success, error, durationMs });
}
/**
 * Log plugin connection / disconnection.
 */
export function auditPlugin(path, event) {
    auditLog(path, { event });
}
