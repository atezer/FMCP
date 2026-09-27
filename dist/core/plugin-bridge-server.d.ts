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
export type PairingRefusalCode = "pairing-required" | "pairing-mismatch";
export interface PairingStatus {
    /** False only under FMCP_PAIRING=off. */
    required: boolean;
    /** The last refused handshake within the last 10 minutes, if no plugin has paired since. */
    lastRefusal: {
        code: PairingRefusalCode;
        secondsAgo: number;
        pluginVersion: string | null;
    } | null;
}
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
    pluginVersion: string | null;
    alive: boolean;
    missedHeartbeats: number;
    connectedAt: number;
}
export interface ConnectedFileInfo {
    clientId: string;
    fileKey: string | null;
    fileName: string | null;
    pluginVersion: string | null;
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
    /** v1.9.1+ Sibling bridge discovery state — cached list of active fmcp ports. */
    private knownSiblings;
    private siblingProbeInterval;
    /** Figma REST API token (in-memory only, never written to disk). */
    private figmaRestToken;
    /** AI client name detected from parent process (Claude, Cursor, etc.) */
    private clientName;
    /** User/config preferred port (before clamp and fallback). */
    private readonly preferredPort;
    /**
     * Pairing secret (src/core/pairing.ts). A plugin must present it in its "ready" handshake before it
     * is registered, receives a request or may set the REST token; /shutdown requires it too. Never logged.
     */
    private readonly pairingSecret;
    /** False only under FMCP_PAIRING=off (pairing.ts): plugins are then accepted without the code, as before pairing. */
    private readonly requirePairing;
    /** The last handshake refused for pairing (cleared when a plugin pairs). Feeds pairingStatus()/pairingHint(). */
    private lastPairingRefusal;
    /** How long a connection may stay unpaired before it is closed (PAIRING_TIMEOUT_MS; shorter in tests). */
    private readonly pairingTimeoutMs;
    constructor(port: number, options?: {
        auditLogPath?: string;
        pairingSecret?: string;
        requirePairing?: boolean;
        pairingTimeoutMs?: number;
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
     * v1.9.1+ Probe all sibling bridges in range (5454-5470) and return active fmcp ports.
     * Parallel probe, ~2-3s worst case. Errors are swallowed (silent — port inactive).
     * Node.js network errors stay in server stdout, NEVER leak to plugin browser DevTools.
     */
    private probeSiblingBridges;
    /**
     * v1.9.1+ Broadcast activeBridges update to all connected plugin clients.
     * Used when periodic probe detects a new sibling (or one disappears).
     */
    private broadcastSiblingUpdate;
    /**
     * Send a POST /shutdown to an old F-MCP bridge. Calls onAccepted if the bridge
     * responds with 200, or onRefused otherwise. On error/timeout, assumes the bridge
     * may have already exited and calls onAccepted.
     */
    private sendShutdownRequest;
    /**
     * Create an HTTP server with /shutdown, /status, and default F-MCP marker endpoints.
     * None of them sends CORS headers: only other bridge instances (Node, no Origin) call them, and a
     * web page must not be able to read the bridge's state. /shutdown needs the pairing secret and
     * refuses any request that carries an Origin (every cross-site browser POST does).
     */
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
     * Send a request to a plugin and wait for the response.
     * If fileKey is specified, routes to the client serving that file.
     * Otherwise routes to the most recently connected client.
     */
    request<T = unknown>(method: string, params?: Record<string, unknown>, fileKey?: string): Promise<T>;
    isConnected(fileKey?: string): boolean;
    /** Pairing state for status tools: whether pairing is required and the last refused handshake (if recent). */
    pairingStatus(): PairingStatus;
    /**
     * Appended to "plugin not connected" errors: when the plugin DID try to connect but was refused for
     * pairing, say so — otherwise the caller (an agent, a pipeline script) only sees "not connected" and
     * looks for the fault in Figma. Empty when there is nothing to add.
     */
    pairingHint(): string;
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