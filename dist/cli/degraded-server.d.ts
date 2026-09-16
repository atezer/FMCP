/**
 * fmcp CLI — degraded MCP server. Dependency-free (no MCP SDK, no ws, no pino).
 *
 * Used when the full bridge cannot run: cloud/remote sessions (the Figma plugin lives on the
 * user's computer and can never reach this process) or a checkout without node_modules.
 * Instead of "Connection closed" the AI client gets a working server with a single tool,
 * `figma_get_status`, that explains the situation and how to fix it.
 *
 * Protocol: MCP over stdio, newline-delimited JSON-RPC 2.0.
 */
export interface DegradedInfo {
    version: string;
    reason: string;
    installRoot: string;
}
type JsonRpcId = string | number | null;
interface JsonRpcRequest {
    jsonrpc: "2.0";
    id?: JsonRpcId;
    method: string;
    params?: Record<string, unknown>;
}
interface JsonRpcResponse {
    jsonrpc: "2.0";
    id: JsonRpcId;
    result?: unknown;
    error?: {
        code: number;
        message: string;
    };
}
export declare const DEGRADED_TOOL_NAME = "figma_get_status";
export declare function degradedStatusPayload(info: DegradedInfo): Record<string, unknown>;
/** Pure request handler — returns a response, or null for notifications. Exported for tests. */
export declare function handleDegradedMessage(msg: JsonRpcRequest, info: DegradedInfo): JsonRpcResponse | null;
/** Run the degraded server over stdio until stdin closes. */
export declare function runDegradedServer(info: DegradedInfo): Promise<void>;
export {};
//# sourceMappingURL=degraded-server.d.ts.map