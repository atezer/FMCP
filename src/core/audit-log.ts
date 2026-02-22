/**
 * Enterprise audit log — tool invocations and connection events for compliance.
 * Optional: enable via FIGMA_MCP_AUDIT_LOG_PATH (file path) or config local.auditLogPath.
 * Format: one JSON object per line (NDJSON) for easy parsing and retention.
 */

import { createWriteStream, type WriteStream } from "fs";
import { appendFileSync } from "fs";

const noop = () => {};

export interface AuditEntry {
	ts: string; // ISO timestamp
	event: "tool" | "plugin_connect" | "plugin_disconnect" | "error";
	method?: string;
	success?: boolean;
	error?: string;
	durationMs?: number;
}

let stream: WriteStream | null = null;

function getStream(path: string): WriteStream | null {
	if (stream) return stream;
	try {
		stream = createWriteStream(path, { flags: "a" });
		stream.on("error", () => {
			stream = null;
		});
		return stream;
	} catch {
		return null;
	}
}

function writeLine(path: string, line: string): void {
	const s = getStream(path);
	if (s && s.writable) {
		s.write(line + "\n");
		return;
	}
	try {
		appendFileSync(path, line + "\n");
	} catch {
		// ignore
	}
}

/**
 * Log an audit entry. No-op if path not set or write fails.
 */
export function auditLog(path: string | undefined, entry: Omit<AuditEntry, "ts">): void {
	if (!path || path === "") return;
	const full: AuditEntry = { ...entry, ts: new Date().toISOString() };
	try {
		writeLine(path, JSON.stringify(full));
	} catch {
		noop();
	}
}

/**
 * Log a tool invocation (call from bridge after request completes).
 */
export function auditTool(
	path: string | undefined,
	method: string,
	success: boolean,
	error?: string,
	durationMs?: number
): void {
	auditLog(path, { event: "tool", method, success, error, durationMs });
}

/**
 * Log plugin connection / disconnection.
 */
export function auditPlugin(path: string | undefined, event: "plugin_connect" | "plugin_disconnect"): void {
	auditLog(path, { event });
}
