/**
 * Enterprise audit log — tool invocations and connection events for compliance.
 * Optional: enable via FIGMA_MCP_AUDIT_LOG_PATH (file path) or config local.auditLogPath.
 * Format: one JSON object per line (NDJSON) for easy parsing and retention.
 */
export interface AuditEntry {
    ts: string;
    event: "tool" | "plugin_connect" | "plugin_disconnect" | "error" | "cache_hit" | "cache_miss" | "cache_stale";
    method?: string;
    success?: boolean;
    error?: string;
    durationMs?: number;
    libraryName?: string;
    cacheRoot?: string;
}
/**
 * Log an audit entry. No-op if path not set or write fails.
 */
export declare function auditLog(path: string | undefined, entry: Omit<AuditEntry, "ts">): void;
/**
 * Log a tool invocation (call from bridge after request completes).
 */
export declare function auditTool(path: string | undefined, method: string, success: boolean, error?: string, durationMs?: number): void;
/**
 * Log plugin connection / disconnection.
 */
export declare function auditPlugin(path: string | undefined, event: "plugin_connect" | "plugin_disconnect"): void;
/**
 * Log a DS cache hit/miss/stale event from the cache reader.
 */
export declare function auditCache(path: string | undefined, event: "cache_hit" | "cache_miss" | "cache_stale", method: string, libraryName?: string, cacheRoot?: string): void;
/**
 * Flush and close the audit log stream. Call on graceful shutdown.
 */
export declare function closeAuditLog(): void;
//# sourceMappingURL=audit-log.d.ts.map