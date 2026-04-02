/**
 * Plugin Bridge WebSocket Server
 *
 * Listens on a FIXED port for connections from the F-MCP ATezer Bridge plugin
 * (no CDP needed). Supports MULTIPLE simultaneous plugin connections
 * (e.g. Figma Desktop + FigJam browser + Figma browser — all on one port).
 * Each connected plugin identifies itself with a fileKey; requests are routed accordingly.
 *
 * Port strategy: no auto-scanning. If the configured port is busy, the server
 * probes it to distinguish a live F-MCP instance from a stale/dead process.
 * Stale ports get one automatic retry after a short delay.
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
export declare class PluginBridgeServer {
    private wss;
    private httpServer;
    private clients;
    private pending;
    private requestTimeoutMs;
    private heartbeatTimer;
    private auditLogPath;
    private clientIdCounter;
    /** User/config preferred port (before clamp and fallback). */
    private readonly preferredPort;
    constructor(port: number, options?: {
        auditLogPath?: string;
    });
    private port;
    /** Last error message when bridge could not bind (port conflict, etc.) */
    private startError;
    start(): void;
    /** Get last startup error (null if running fine). */
    getStartError(): string | null;
    /** Stop current WebSocket server (if any) and restart on a new port. Returns when binding resolves or fails. */
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
    stop(): void;
}
//# sourceMappingURL=plugin-bridge-server.d.ts.map