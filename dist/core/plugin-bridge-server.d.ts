/**
 * Plugin Bridge WebSocket Server
 *
 * Listens on a FIXED port for connections from the F-MCP ATezer Bridge plugin
 * (no CDP needed). Supports MULTIPLE simultaneous plugin connections
 * (e.g. Figma Desktop + FigJam browser + Figma browser — all on one port).
 * Each connected plugin identifies itself with a fileKey; requests are routed accordingly.
 *
 * Port strategy: graceful takeover. If the configured port is busy with another
 * F-MCP instance, the server sends a /shutdown request to the old bridge and
 * retries after it exits. Stale ports get one automatic retry after a short delay.
 */
import { type WebSocket } from "ws";
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
export interface ClientInfo {
    ws: WebSocket;
    clientId: string;
    fileKey: string | null;
    fileName: string | null;
    alive: boolean;
    missedHeartbeats: number;
    connectedAt: number;
}
export interface ConnectedFileInfo {
    clientId: string;
    fileKey: string | null;
    fileName: string | null;
    connectedAt: number;
}
export interface FigmaRestTokenInfo {
    token: string;
    setAt: number;
    rateLimit?: {
        remaining: number;
        limit: number;
        resetAt: number;
    };
}
export declare class PluginBridgeServer {
    private wss;
    private httpServer;
    private clients;
    private pending;
    private requestTimeoutMs;
    private heartbeatTimer;
    private auditLogPath;
    private clientIdCounter;
    /** Figma REST API token (in-memory only, never written to disk). */
    private figmaRestToken;
    /** AI client name detected from parent process (Claude, Cursor, etc.) */
    private clientName;
    /** User/config preferred port (before clamp and fallback). */
    private readonly preferredPort;
    constructor(port: number, options?: {
        auditLogPath?: string;
    });
    /** Detect AI client name from env vars (instant, no I/O). */
    private detectClientNameSync;
    /** Async detection via process tree walk — updates clientName in background. */
    private detectClientNameAsync;
    private port;
    /** Last error message when bridge could not bind (port conflict, etc.) */
    private startError;
    start(): void;
    /** Get last startup error (null if running fine). */
    getStartError(): string | null;
    /** Stop current WebSocket server (if any) and restart on a new port. Returns when binding resolves or fails. Token is preserved across restart. */
    restart(newPort: number): Promise<{
        success: boolean;
        port: number;
        error?: string;
    }>;
    /** Async listen attempt — resolves when port binds successfully or fails. */
    private tryListenAsync;
    /** Internal resolve callback for async listen flow. */
    private _listenResolve;
    /** Currently listening port (or preferred port if not yet listening). */
    getPort(): number;
    /** Whether WebSocket server is actively listening. */
    isListening(): boolean;
    private generateClientId;
    private findClientByFileKey;
    private getDefaultClient;
    private resolveClient;
    private removeClient;
    /**
     * Probe a port via HTTP to determine if a live F-MCP bridge is already
     * running or if the port is held by a stale/dead process.
     * Returns "fmcp" | "other" | "dead".
     */
    private probePort;
    /**
     * Send a POST /shutdown to an old F-MCP bridge on the given port,
     * wait for it to exit, then retry binding to the same port.
     */
    private requestShutdownAndRetry;
    private tryListenFixed;
    /**
     * Send a request to a plugin and wait for the response.
     * If fileKey is specified, routes to the client serving that file.
     * Otherwise routes to the most recently connected client.
     */
    request<T = unknown>(method: string, params?: Record<string, unknown>, fileKey?: string): Promise<T>;
    isConnected(fileKey?: string): boolean;
    listConnectedFiles(): ConnectedFileInfo[];
    connectedClientCount(): number;
    private rejectPendingForClient;
    private rejectAllPending;
    setFigmaRestToken(token: string): void;
    clearFigmaRestToken(): void;
    getFigmaRestToken(): FigmaRestTokenInfo | null;
    updateRateLimit(remaining: number, limit: number, resetAt: number): void;
    stop(): void;
}
//# sourceMappingURL=plugin-bridge-server.d.ts.map