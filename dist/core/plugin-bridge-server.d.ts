/**
 * Plugin Bridge WebSocket Server
 *
 * Listens on a FIXED port for connections from the F-MCP ATezer Bridge plugin
 * (no CDP needed). Supports MULTIPLE simultaneous plugin connections
 * (e.g. Figma Desktop + FigJam browser + Figma browser — all on one port).
 * Each connected plugin identifies itself with a fileKey; requests are routed accordingly.
 *
 * Port strategy: smart auto-increment with coexistence.
 * - If the preferred port (default 5454) is occupied by a HEALTHY F-MCP bridge
 *   (active clients), the server skips to the next port (5455, 5456, …).
 * - If the port is occupied by a STALE F-MCP bridge (0 clients, uptime ≥ 30s),
 *   the server sends a /shutdown request and takes over.
 * - If the port is occupied by a non-F-MCP service or unresponsive process,
 *   the server skips to the next port.
 * - The Figma plugin scans all ports 5454–5470 automatically.
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
    /** Async listen attempt — resolves when port binds successfully or all ports exhausted. */
    private tryListenAsync;
    /** Internal resolve callback for async listen flow. */
    private _listenResolve;
    /** Currently listening port (or preferred port if not yet listening). */
    getPort(): number;
    /** User/config preferred port before auto-increment fallback. */
    getPreferredPort(): number;
    /** Whether WebSocket server is actively listening. */
    isListening(): boolean;
    private generateClientId;
    private findClientByFileKey;
    private getDefaultClient;
    private resolveClient;
    /**
     * Wait for a client to become ready (fileKey populated via "ready" message).
     * Polls at 200ms intervals. Used to handle the race between plugin connection
     * and the first incoming MCP request.
     */
    waitForClient(fileKey?: string, timeoutMs?: number): Promise<ClientInfo | undefined>;
    private removeClient;
    /**
     * Probe a port via HTTP to determine if a live F-MCP bridge is already
     * running or if the port is held by a stale/dead process.
     * Returns "fmcp" | "other" | "dead".
     */
    private probePort;
    /**
     * Probe a live F-MCP bridge's /status endpoint to get its health info.
     * Returns { clients, uptime } or { -1, -1 } if the endpoint is unavailable
     * (e.g. older bridge version without /status).
     */
    private probeStatus;
    /**
     * Send a POST /shutdown to an old F-MCP bridge. Calls onAccepted if the bridge
     * responds with 200, or onRefused otherwise. On error/timeout, assumes the bridge
     * may have already exited and calls onAccepted.
     */
    private sendShutdownRequest;
    /**
     * Send a POST /shutdown to an old F-MCP bridge on the given port,
     * wait for it to exit, then retry binding to the same port.
     * @deprecated Legacy method — kept for backward compatibility. New code uses sendShutdownRequest + tryListenWithAutoIncrement.
     */
    private requestShutdownAndRetry;
    /** Create an HTTP server with /shutdown, /status, and default F-MCP marker endpoints. */
    private createBridgeHttpServer;
    /**
     * Set up WebSocket server, heartbeat, client handling on a successfully bound HTTP server.
     * Called from both tryListenFixed and tryListenWithAutoIncrement on bind success.
     */
    private setupBridgeOnServer;
    /**
     * Try to bind starting from `port`, auto-incrementing through the valid range.
     * - Healthy F-MCP bridges (active clients) are skipped.
     * - Stale F-MCP bridges (0 clients, uptime ≥ 30s) are taken over.
     * - Freshly started bridges (0 clients, uptime < 30s) are skipped.
     * - Unknown/old-version bridges and non-F-MCP services are skipped.
     *
     * `_listenResolve` is called exactly once: on success or when all ports are exhausted.
     */
    private tryListenWithAutoIncrement;
    /**
     * @deprecated Legacy method — new startup uses tryListenWithAutoIncrement().
     * Kept for backward compatibility with requestShutdownAndRetry retry path.
     */
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