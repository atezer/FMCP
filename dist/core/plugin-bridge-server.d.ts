/**
 * Plugin Bridge WebSocket Server
 *
 * Listens for connections from the F-MCP ATezer Bridge plugin (no CDP needed).
 * Supports MULTIPLE simultaneous plugin connections (e.g. Figma Desktop + FigJam browser).
 * Each connected plugin identifies itself with a fileKey; requests are routed accordingly.
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
    start(): void;
    /** Try preferred first, then scan forward to MAX, then wrap MIN..preferred-1. */
    private buildPortCandidateList;
    private attemptListen;
    private generateClientId;
    private findClientByFileKey;
    private getDefaultClient;
    private resolveClient;
    private removeClient;
    private tryListenOne;
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