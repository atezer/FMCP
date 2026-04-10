/**
 * Type definitions for F-MCP ATezer (Figma MCP Bridge)
 */
/**
 * Server configuration
 */
export interface ServerConfig {
    mode: 'local';
    local?: LocalModeConfig;
}
/**
 * Local mode configuration
 */
export interface LocalModeConfig {
    /** Plugin bridge WebSocket server port (default: 5454) */
    pluginBridgePort?: number;
    /** Optional audit log file path (enterprise); one JSON object per line (NDJSON) */
    auditLogPath?: string;
}
//# sourceMappingURL=index.d.ts.map