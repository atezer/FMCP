/**
 * Plugin Bridge WebSocket Server
 *
 * Listens for connections from the F-MCP ATezer Bridge plugin (no CDP needed).
 * When the plugin connects, MCP tools can send JSON-RPC style requests and get
 * responses (variables, execute, component, etc.).
 */
export interface BridgeRequest {
    id: string;
    method: string;
    params?: Record<string, unknown>;
}
export interface BridgeResponse {
    id: string;
    result?: unknown;
    error?: string;
}
export declare class PluginBridgeServer {
    private wss;
    private httpServer;
    private client;
    private pending;
    private requestTimeoutMs;
    private pingTimer;
    private auditLogPath;
    constructor(port: number, options?: {
        auditLogPath?: string;
    });
    private port;
    /**
     * Start the WebSocket server. Tries ports 5454–5470 if the preferred port is in use (multi-instance). Idempotent.
     */
    start(): void;
    private tryListen;
    /**
     * Send a request to the plugin and wait for the response.
     */
    request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
    isConnected(): boolean;
    stop(): void;
}
//# sourceMappingURL=plugin-bridge-server.d.ts.map