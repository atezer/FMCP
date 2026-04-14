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
import { WebSocketServer } from "ws";
import { createServer, get as httpGet, request as httpRequest } from "http";
import { execSync } from "child_process";
import { logger } from "./logger.js";
import { auditTool, auditPlugin } from "./audit-log.js";
import { FMCP_VERSION } from "./version.js";
const HEARTBEAT_INTERVAL_MS = 3000;
const MIN_PORT = 5454;
const MAX_PORT = 5470;
const STALE_PORT_RETRY_DELAY_MS = 1500;
const SHUTDOWN_TAKEOVER_DELAY_MS = 2000;
/** Bridges with 0 clients AND uptime below this are considered freshly started, not stale. */
const FRESH_BRIDGE_UPTIME_THRESHOLD_S = 30;
export class PluginBridgeServer {
    constructor(port, options) {
        this.wss = null;
        this.httpServer = null;
        this.clients = new Map();
        this.pending = new Map();
        this.requestTimeoutMs = 120000;
        this.heartbeatTimer = null;
        this.clientIdCounter = 0;
        /** Figma REST API token (in-memory only, never written to disk). */
        this.figmaRestToken = null;
        /** Last error message when bridge could not bind (port conflict, etc.) */
        this.startError = null;
        /** Internal resolve callback for async listen flow. */
        this._listenResolve = null;
        const clamped = Math.max(MIN_PORT, Math.min(MAX_PORT, port));
        this.preferredPort = clamped;
        this.port = clamped;
        this.auditLogPath = options?.auditLogPath;
        this.clientName = this.detectClientNameSync();
    }
    /** Detect AI client name from env vars (instant, no I/O). */
    detectClientNameSync() {
        if (process.env.FIGMA_MCP_CLIENT_NAME)
            return process.env.FIGMA_MCP_CLIENT_NAME;
        if (process.env.CLAUDECODE === "1")
            return "Claude Code";
        if (process.env.CURSOR_TRACE_ID)
            return "Cursor";
        return "MCP";
    }
    /** Async detection via process tree walk — updates clientName in background. */
    detectClientNameAsync() {
        if (this.clientName !== "MCP")
            return; // Already detected via env
        try {
            let pid = process.ppid;
            for (let i = 0; i < 5 && pid > 1; i++) {
                const line = execSync(`ps -p ${pid} -o ppid=,comm=`, { timeout: 1000 }).toString().trim();
                const comm = line.replace(/^\s*\d+\s+/, "");
                const ppidMatch = line.match(/^\s*(\d+)/);
                if (/[Cc]ursor/i.test(comm)) {
                    this.clientName = "Cursor";
                    return;
                }
                if (/[Cc]laude/i.test(comm)) {
                    this.clientName = "Claude";
                    return;
                }
                if (/[Ww]indsurf/i.test(comm)) {
                    this.clientName = "Windsurf";
                    return;
                }
                pid = ppidMatch ? parseInt(ppidMatch[1], 10) : 0;
            }
        }
        catch { /* ignore */ }
    }
    start() {
        if (this.wss) {
            logger.debug({ port: this.port }, "Plugin bridge server already running");
            return;
        }
        this.startError = null;
        this.detectClientNameAsync();
        this.tryListenWithAutoIncrement(this.preferredPort);
    }
    /** Get last startup error (null if running fine). */
    getStartError() {
        return this.startError;
    }
    /** Stop current WebSocket server (if any) and restart on a new port. Returns when binding resolves or fails. Token is preserved across restart. */
    async restart(newPort) {
        const clamped = Math.max(MIN_PORT, Math.min(MAX_PORT, newPort));
        const savedToken = this.figmaRestToken; // Preserve token across restart
        this.stop();
        this.figmaRestToken = savedToken; // Restore after stop()
        this.startError = null;
        return this.tryListenAsync(clamped);
    }
    /** Async listen attempt — resolves when port binds successfully or all ports exhausted. */
    tryListenAsync(port) {
        return new Promise((resolve) => {
            // 30s timeout covers worst case: 17 ports × ~2s probe each
            const TIMEOUT_MS = 30000;
            const timer = setTimeout(() => {
                this._listenResolve = null;
                resolve({ success: false, port, error: this.startError || `Port bind timeout (${TIMEOUT_MS}ms)` });
            }, TIMEOUT_MS);
            // Store callback so tryListenWithAutoIncrement/setupBridgeOnServer can notify us
            this._listenResolve = (success) => {
                clearTimeout(timer);
                if (success) {
                    resolve({ success: true, port: this.port });
                }
                else {
                    resolve({ success: false, port, error: this.startError || "Port bind failed" });
                }
            };
            this.tryListenWithAutoIncrement(port);
        });
    }
    /** Currently listening port (or preferred port if not yet listening). */
    getPort() {
        return this.port;
    }
    /** User/config preferred port before auto-increment fallback. */
    getPreferredPort() {
        return this.preferredPort;
    }
    /** Whether WebSocket server is actively listening. */
    isListening() {
        return this.wss !== null;
    }
    generateClientId() {
        return `client_${Date.now()}_${++this.clientIdCounter}`;
    }
    findClientByFileKey(fileKey) {
        for (const client of this.clients.values()) {
            if (client.fileKey === fileKey && client.ws.readyState === 1) {
                return client;
            }
        }
        return undefined;
    }
    getDefaultClient() {
        let latest;
        for (const client of this.clients.values()) {
            if (client.ws.readyState !== 1)
                continue;
            if (!latest || client.connectedAt > latest.connectedAt) {
                latest = client;
            }
        }
        return latest;
    }
    resolveClient(fileKey) {
        if (fileKey) {
            return this.findClientByFileKey(fileKey) ?? this.getDefaultClient();
        }
        return this.getDefaultClient();
    }
    /**
     * Wait for a client to become ready (fileKey populated via "ready" message).
     * Polls at 200ms intervals. Used to handle the race between plugin connection
     * and the first incoming MCP request.
     */
    async waitForClient(fileKey, timeoutMs = 2000) {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const client = this.resolveClient(fileKey);
            if (client && client.ws.readyState === 1) {
                if (!fileKey || client.fileKey === fileKey)
                    return client;
            }
            await new Promise(r => setTimeout(r, 200));
        }
        return this.resolveClient(fileKey);
    }
    removeClient(clientId, reason) {
        const info = this.clients.get(clientId);
        if (!info)
            return;
        this.clients.delete(clientId);
        this.rejectPendingForClient(clientId, reason);
        auditPlugin(this.auditLogPath, "plugin_disconnect");
        logger.info({ clientId, fileKey: info.fileKey, fileName: info.fileName }, "Plugin bridge: client disconnected (%s)", reason);
    }
    /**
     * Probe a port via HTTP to determine if a live F-MCP bridge is already
     * running or if the port is held by a stale/dead process.
     * Returns "fmcp" | "other" | "dead".
     */
    probePort(port, host) {
        return new Promise((resolve) => {
            const req = httpGet({ hostname: host, port, path: "/", timeout: 2000 }, (res) => {
                let body = "";
                res.on("data", (chunk) => { body += chunk; });
                res.on("end", () => {
                    resolve(body.includes("F-MCP") ? "fmcp" : "other");
                });
            });
            req.on("error", () => resolve("dead"));
            req.on("timeout", () => { req.destroy(); resolve("dead"); });
        });
    }
    /**
     * Probe a live F-MCP bridge's /status endpoint to get its health info.
     * Returns { clients, uptime } or { -1, -1 } if the endpoint is unavailable
     * (e.g. older bridge version without /status).
     */
    probeStatus(port, host) {
        return new Promise((resolve) => {
            const req = httpGet({ hostname: host, port, path: "/status", timeout: 1000 }, (res) => {
                let body = "";
                res.on("data", (chunk) => { body += chunk; });
                res.on("end", () => {
                    try {
                        const data = JSON.parse(body);
                        resolve({
                            clients: typeof data.clients === "number" ? data.clients : -1,
                            uptime: typeof data.uptime === "number" ? data.uptime : -1,
                        });
                    }
                    catch {
                        resolve({ clients: -1, uptime: -1 });
                    }
                });
            });
            req.on("error", () => resolve({ clients: -1, uptime: -1 }));
            req.on("timeout", () => { req.destroy(); resolve({ clients: -1, uptime: -1 }); });
        });
    }
    /**
     * Send a POST /shutdown to an old F-MCP bridge. Calls onAccepted if the bridge
     * responds with 200, or onRefused otherwise. On error/timeout, assumes the bridge
     * may have already exited and calls onAccepted.
     */
    sendShutdownRequest(port, host, onAccepted, onRefused) {
        console.error(`   Sending shutdown request to old F-MCP bridge on port ${port}…\n`);
        const req = httpRequest({ hostname: host, port, path: "/shutdown", method: "POST", timeout: 3000 }, (res) => {
            let body = "";
            res.on("data", (chunk) => { body += chunk; });
            res.on("end", () => {
                if (res.statusCode === 200) {
                    console.error(`   Old bridge accepted shutdown. Retaking port ${port} in ${SHUTDOWN_TAKEOVER_DELAY_MS}ms…\n`);
                    onAccepted();
                }
                else {
                    console.error(`\n⚠️  Old bridge refused shutdown (status ${res.statusCode}). Trying next port…\n`);
                    logger.warn({ port, statusCode: res.statusCode }, "Old bridge refused shutdown");
                    onRefused();
                }
            });
        });
        req.on("error", () => {
            // Old bridge unreachable — might have already exited
            console.error(`   Old bridge unreachable after shutdown request. Retrying port ${port}…\n`);
            onAccepted();
        });
        req.on("timeout", () => {
            req.destroy();
            console.error(`   Shutdown request timed out. Retrying port ${port}…\n`);
            onAccepted();
        });
        req.end();
    }
    /**
     * Send a POST /shutdown to an old F-MCP bridge on the given port,
     * wait for it to exit, then retry binding to the same port.
     * @deprecated Legacy method — kept for backward compatibility. New code uses sendShutdownRequest + tryListenWithAutoIncrement.
     */
    requestShutdownAndRetry(port, host) {
        console.error(`   Sending shutdown request to old F-MCP bridge on port ${port}…\n`);
        const req = httpRequest({ hostname: host, port, path: "/shutdown", method: "POST", timeout: 3000 }, (res) => {
            let body = "";
            res.on("data", (chunk) => { body += chunk; });
            res.on("end", () => {
                if (res.statusCode === 200) {
                    console.error(`   Old bridge accepted shutdown. Retaking port ${port} in ${SHUTDOWN_TAKEOVER_DELAY_MS}ms…\n`);
                    setTimeout(() => this.tryListenFixed(port, true), SHUTDOWN_TAKEOVER_DELAY_MS);
                }
                else {
                    const msg = `Old bridge refused shutdown (status ${res.statusCode}). ` +
                        `Use figma_set_port to switch to a different port (${MIN_PORT}–${MAX_PORT}), ` +
                        `or free the port: lsof -i :${port}`;
                    this.startError = msg;
                    console.error(`\n⚠️  ${msg}\n`);
                    logger.warn({ port }, msg);
                    this._listenResolve?.(false);
                    this._listenResolve = null;
                }
            });
        });
        req.on("error", () => {
            // Old bridge unreachable — might have already exited, retry anyway
            console.error(`   Old bridge unreachable after shutdown request. Retrying port ${port}…\n`);
            setTimeout(() => this.tryListenFixed(port, true), SHUTDOWN_TAKEOVER_DELAY_MS);
        });
        req.on("timeout", () => {
            req.destroy();
            console.error(`   Shutdown request timed out. Retrying port ${port}…\n`);
            setTimeout(() => this.tryListenFixed(port, true), SHUTDOWN_TAKEOVER_DELAY_MS);
        });
        req.end();
    }
    // ──────────────────────────────────────────────────────────────────────
    // HTTP server factory (shared between tryListenFixed and tryListenWithAutoIncrement)
    // ──────────────────────────────────────────────────────────────────────
    /** Create an HTTP server with /shutdown, /status, and default F-MCP marker endpoints. */
    createBridgeHttpServer() {
        return createServer((req, res) => {
            // Graceful shutdown endpoint: a new bridge instance requests this old one to exit
            if (req.method === "POST" && req.url === "/shutdown") {
                res.writeHead(200, { "Content-Type": "text/plain" });
                res.end("shutting down\n");
                logger.info("Received /shutdown request from new bridge instance — stopping gracefully");
                console.error("\n⚠️  Received shutdown request from new F-MCP bridge instance. Stopping…\n");
                setTimeout(() => this.stop(), 500);
                return;
            }
            // Health check endpoint — used by new instances to decide coexistence vs takeover
            if (req.method === "GET" && req.url === "/status") {
                const body = JSON.stringify({
                    clients: this.connectedClientCount(),
                    uptime: Math.round(process.uptime()),
                    version: FMCP_VERSION,
                });
                res.writeHead(200, {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                });
                res.end(body);
                return;
            }
            // Default F-MCP marker (used by probePort to detect F-MCP bridges)
            res.writeHead(200, {
                "Content-Type": "text/plain",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS, POST",
            });
            res.end("F-MCP ATezer Bridge (connect via WebSocket)\n");
        });
    }
    /**
     * Set up WebSocket server, heartbeat, client handling on a successfully bound HTTP server.
     * Called from both tryListenFixed and tryListenWithAutoIncrement on bind success.
     */
    setupBridgeOnServer(server, port, bindHost) {
        this.port = port;
        process.env.FIGMA_PLUGIN_BRIDGE_PORT = String(port);
        process.env.FIGMA_MCP_BRIDGE_PORT = String(port);
        console.error(`F-MCP bridge listening on ws://${bindHost}:${port}\n`);
        this.httpServer = server;
        this.wss = new WebSocketServer({ server });
        this.wss.on("connection", (ws) => {
            const clientId = this.generateClientId();
            const clientInfo = {
                ws,
                clientId,
                fileKey: null,
                fileName: null,
                alive: true,
                missedHeartbeats: 0,
                connectedAt: Date.now(),
            };
            this.clients.set(clientId, clientInfo);
            logger.info({ port: this.port, clientId, totalClients: this.clients.size }, "Plugin bridge: new plugin connected");
            auditPlugin(this.auditLogPath, "plugin_connect");
            ws.on("message", (data) => {
                clientInfo.alive = true;
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === "ready") {
                        const incomingFileKey = msg.fileKey || null;
                        const incomingFileName = msg.fileName || null;
                        if (incomingFileKey) {
                            const existing = this.findClientByFileKey(incomingFileKey);
                            if (existing && existing.clientId !== clientId) {
                                logger.info({ oldClientId: existing.clientId, newClientId: clientId, fileKey: incomingFileKey }, "Plugin bridge: replacing existing client for same fileKey");
                                this.removeClient(existing.clientId, "Replaced by new connection for same file");
                                try {
                                    existing.ws.close();
                                }
                                catch { /* ignore */ }
                            }
                        }
                        clientInfo.fileKey = incomingFileKey;
                        clientInfo.fileName = incomingFileName;
                        logger.info({ clientId, fileKey: incomingFileKey, fileName: incomingFileName }, "Plugin bridge: client registered (fileKey=%s, fileName=%s)", incomingFileKey, incomingFileName);
                        ws.send(JSON.stringify({
                            type: "welcome",
                            bridgeVersion: FMCP_VERSION,
                            port: this.port,
                            clientId,
                            multiClient: true,
                            clientName: this.clientName,
                        }));
                        return;
                    }
                    if (msg.type === "pong" || msg.type === "keepalive") {
                        return;
                    }
                    if (msg.type === "setToken" && typeof msg.token === "string") {
                        const token = msg.token;
                        if (token) {
                            this.setFigmaRestToken(token);
                            logger.info({ clientId }, "Plugin bridge: REST API token set via plugin UI");
                        }
                        return;
                    }
                    if (msg.type === "clearToken") {
                        this.clearFigmaRestToken();
                        logger.info({ clientId }, "Plugin bridge: REST API token cleared via plugin UI");
                        return;
                    }
                    if (msg.id && this.pending.has(msg.id)) {
                        const p = this.pending.get(msg.id);
                        this.pending.delete(msg.id);
                        clearTimeout(p.timeout);
                        const durationMs = Date.now() - p.startTime;
                        if (msg.error) {
                            auditTool(this.auditLogPath, p.method, false, msg.error, durationMs);
                            p.reject(new Error(msg.error));
                        }
                        else {
                            if (msg.result === undefined) {
                                logger.warn({ method: p.method, msgId: msg.id }, "Plugin bridge: response has no result and no error");
                            }
                            auditTool(this.auditLogPath, p.method, true, undefined, durationMs);
                            p.resolve(msg.result);
                        }
                    }
                }
                catch (err) {
                    logger.warn({ err }, "Plugin bridge: invalid message from plugin");
                }
            });
            ws.on("close", () => {
                this.removeClient(clientId, "WebSocket closed");
            });
            ws.on("error", (err) => {
                logger.warn({ err, clientId }, "Plugin bridge: client error");
            });
        });
        logger.info({ port: this.port, host: bindHost }, "Plugin bridge server listening (ws://%s:%s) — multi-client enabled", bindHost, this.port);
        // Notify async restart() / tryListenAsync() that binding succeeded
        this._listenResolve?.(true);
        this._listenResolve = null;
        const heartbeat = () => {
            for (const [cId, info] of this.clients) {
                if (info.ws.readyState !== 1) {
                    this.removeClient(cId, "WebSocket not open");
                    continue;
                }
                if (!info.alive) {
                    info.missedHeartbeats++;
                    if (info.missedHeartbeats >= 3) {
                        logger.warn({ clientId: cId, fileKey: info.fileKey }, "Plugin bridge: client not responding to heartbeat, terminating");
                        try {
                            info.ws.terminate();
                        }
                        catch { /* ignore */ }
                        this.removeClient(cId, "Heartbeat timeout");
                        continue;
                    }
                }
                else {
                    info.missedHeartbeats = 0;
                    info.alive = false;
                }
                try {
                    info.ws.send(JSON.stringify({ type: "ping" }));
                }
                catch { /* ignore */ }
            }
            this.heartbeatTimer = setTimeout(heartbeat, HEARTBEAT_INTERVAL_MS);
        };
        this.heartbeatTimer = setTimeout(heartbeat, HEARTBEAT_INTERVAL_MS);
    }
    // ──────────────────────────────────────────────────────────────────────
    // Smart auto-increment port binding (primary startup path)
    // ──────────────────────────────────────────────────────────────────────
    /**
     * Try to bind starting from `port`, auto-incrementing through the valid range.
     * - Healthy F-MCP bridges (active clients) are skipped.
     * - Stale F-MCP bridges (0 clients, uptime ≥ 30s) are taken over.
     * - Freshly started bridges (0 clients, uptime < 30s) are skipped.
     * - Unknown/old-version bridges and non-F-MCP services are skipped.
     *
     * `_listenResolve` is called exactly once: on success or when all ports are exhausted.
     */
    tryListenWithAutoIncrement(port) {
        if (port > MAX_PORT) {
            const msg = `All ports ${MIN_PORT}–${MAX_PORT} are in use. Cannot start bridge. Free a port or restart a stale instance.`;
            this.startError = msg;
            console.error(`\n⚠️  ${msg}\n`);
            logger.error(msg);
            this._listenResolve?.(false);
            this._listenResolve = null;
            return;
        }
        const bindHost = process.env.FIGMA_BRIDGE_HOST || "127.0.0.1";
        const server = this.createBridgeHttpServer();
        server.on("error", (err) => {
            if (err.code === "EADDRINUSE") {
                server.close();
                const probeHost = bindHost === "0.0.0.0" ? "127.0.0.1" : bindHost;
                this.probePort(port, probeHost).then(async (status) => {
                    if (status === "fmcp") {
                        // F-MCP bridge detected — check health
                        const { clients, uptime } = await this.probeStatus(port, probeHost);
                        if (clients > 0) {
                            // HEALTHY bridge with active clients — coexist, skip to next port
                            logger.info({ port, clients }, "Port %d: healthy F-MCP bridge (%d clients), skipping to next port", port, clients);
                            console.error(`   Port ${port}: healthy bridge (${clients} client(s)), trying ${port + 1}…\n`);
                            this.tryListenWithAutoIncrement(port + 1);
                        }
                        else if (clients === 0 && uptime >= 0 && uptime < FRESH_BRIDGE_UPTIME_THRESHOLD_S) {
                            // FRESHLY STARTED bridge (no clients yet, uptime < 30s) — skip, don't takeover
                            logger.info({ port, uptime }, "Port %d: freshly started F-MCP bridge (uptime %ds), skipping to next port", port, uptime);
                            console.error(`   Port ${port}: freshly started bridge (${uptime}s uptime), trying ${port + 1}…\n`);
                            this.tryListenWithAutoIncrement(port + 1);
                        }
                        else if (clients === 0 && uptime >= FRESH_BRIDGE_UPTIME_THRESHOLD_S) {
                            // STALE bridge (0 clients, uptime ≥ 30s) — takeover
                            logger.info({ port, uptime }, "Port %d: stale F-MCP bridge (0 clients, %ds uptime), requesting shutdown", port, uptime);
                            console.error(`\n⚠️  Port ${port}: stale bridge (0 clients, ${uptime}s uptime). Requesting shutdown…\n`);
                            this.sendShutdownRequest(port, probeHost, () => {
                                // Shutdown accepted — retry same port after delay
                                setTimeout(() => {
                                    const retryServer = this.createBridgeHttpServer();
                                    retryServer.on("error", (retryErr) => {
                                        if (retryErr.code === "EADDRINUSE") {
                                            retryServer.close();
                                            // Takeover failed — move to next port
                                            logger.warn({ port }, "Port %d still busy after takeover, trying next", port);
                                            this.tryListenWithAutoIncrement(port + 1);
                                            return;
                                        }
                                        logger.error({ err: retryErr }, "Plugin bridge server error");
                                    });
                                    retryServer.listen(port, bindHost, () => {
                                        this.setupBridgeOnServer(retryServer, port, bindHost);
                                    });
                                }, SHUTDOWN_TAKEOVER_DELAY_MS);
                            }, () => {
                                // Shutdown refused — move to next port
                                this.tryListenWithAutoIncrement(port + 1);
                            });
                        }
                        else {
                            // Unknown health (old bridge version without /status, or probe failed)
                            // Safe choice: skip, don't kill
                            logger.info({ port, clients, uptime }, "Port %d: F-MCP bridge with unknown health (clients=%d, uptime=%d), skipping", port, clients, uptime);
                            console.error(`   Port ${port}: F-MCP bridge (unknown health), trying ${port + 1}…\n`);
                            this.tryListenWithAutoIncrement(port + 1);
                        }
                    }
                    else if (status === "dead") {
                        // Port held by stale/unresponsive process — retry after delay
                        console.error(`\n⚠️  Port ${port} is busy but not responding. Retrying in ${STALE_PORT_RETRY_DELAY_MS}ms…\n`);
                        setTimeout(() => {
                            const retryServer = this.createBridgeHttpServer();
                            retryServer.on("error", (retryErr) => {
                                if (retryErr.code === "EADDRINUSE") {
                                    retryServer.close();
                                    // Still busy — move to next port
                                    this.tryListenWithAutoIncrement(port + 1);
                                    return;
                                }
                                logger.error({ err: retryErr }, "Plugin bridge server error");
                            });
                            retryServer.listen(port, bindHost, () => {
                                this.setupBridgeOnServer(retryServer, port, bindHost);
                            });
                        }, STALE_PORT_RETRY_DELAY_MS);
                    }
                    else {
                        // Non-F-MCP service — skip to next port
                        logger.info({ port }, "Port %d occupied by non-F-MCP service, skipping", port);
                        console.error(`   Port ${port}: non-F-MCP service, trying ${port + 1}…\n`);
                        this.tryListenWithAutoIncrement(port + 1);
                    }
                }).catch(() => {
                    // Probe failed — skip to next port
                    this.tryListenWithAutoIncrement(port + 1);
                });
                return;
            }
            logger.error({ err }, "Plugin bridge server error");
        });
        server.listen(port, bindHost, () => {
            this.setupBridgeOnServer(server, port, bindHost);
        });
    }
    // ──────────────────────────────────────────────────────────────────────
    // Legacy fixed-port binding (kept for backward compatibility)
    // ──────────────────────────────────────────────────────────────────────
    /**
     * @deprecated Legacy method — new startup uses tryListenWithAutoIncrement().
     * Kept for backward compatibility with requestShutdownAndRetry retry path.
     */
    tryListenFixed(port, isRetry) {
        const server = this.createBridgeHttpServer();
        const bindHost = process.env.FIGMA_BRIDGE_HOST || "127.0.0.1";
        server.on("error", (err) => {
            if (err.code === "EADDRINUSE") {
                server.close();
                if (isRetry) {
                    const msg = `Port ${port} is still busy after takeover attempt. ` +
                        `Use figma_set_port to try a different port (${MIN_PORT}–${MAX_PORT}), ` +
                        `or free the port: lsof -i :${port}`;
                    this.startError = msg;
                    console.error(`\n⚠️  ${msg}\n`);
                    logger.warn({ port }, msg);
                    this._listenResolve?.(false);
                    this._listenResolve = null;
                    return;
                }
                const probeHost = bindHost === "0.0.0.0" ? "127.0.0.1" : bindHost;
                this.probePort(port, probeHost).then((status) => {
                    if (status === "fmcp") {
                        console.error(`\n⚠️  Port ${port} is in use by another F-MCP bridge. Requesting graceful shutdown…\n`);
                        logger.info({ port }, "Requesting graceful shutdown of old F-MCP bridge");
                        this.requestShutdownAndRetry(port, probeHost);
                    }
                    else if (status === "dead") {
                        console.error(`\n⚠️  Port ${port} is busy but not responding (stale process).\n` +
                            `   Retrying in ${STALE_PORT_RETRY_DELAY_MS}ms…\n`);
                        setTimeout(() => this.tryListenFixed(port, true), STALE_PORT_RETRY_DELAY_MS);
                    }
                    else {
                        const msg = `Port ${port} is in use by a different service (not F-MCP). ` +
                            `Use figma_set_port to switch to a different port (${MIN_PORT}–${MAX_PORT}).`;
                        this.startError = msg;
                        console.error(`\n⚠️  ${msg}\n`);
                        logger.warn({ port }, msg);
                        this._listenResolve?.(false);
                        this._listenResolve = null;
                    }
                }).catch((probeErr) => {
                    const msg = `Port probe failed: ${probeErr instanceof Error ? probeErr.message : String(probeErr)}`;
                    this.startError = msg;
                    logger.error({ err: probeErr, port }, msg);
                    this._listenResolve?.(false);
                    this._listenResolve = null;
                });
                return;
            }
            logger.error({ err }, "Plugin bridge server error");
        });
        server.listen(port, bindHost, () => {
            this.setupBridgeOnServer(server, port, bindHost);
        });
    }
    /**
     * Send a request to a plugin and wait for the response.
     * If fileKey is specified, routes to the client serving that file.
     * Otherwise routes to the most recently connected client.
     */
    async request(method, params, fileKey) {
        let client = this.resolveClient(fileKey);
        // If no client found, wait briefly for plugin "ready" (race condition: plugin connected but fileKey not yet set)
        if (!client || client.ws.readyState !== 1) {
            client = await this.waitForClient(fileKey, 2000);
        }
        if (!client || client.ws.readyState !== 1) {
            if (fileKey) {
                const available = this.listConnectedFiles();
                const fileList = available.length > 0
                    ? ` Connected files: ${available.map(f => `${f.fileName || "?"} (${f.fileKey || "?"})`).join(", ")}`
                    : "";
                throw new Error(`No plugin connected for fileKey "${fileKey}".${fileList} ` +
                    "Open the target file in Figma and run the F-MCP ATezer Bridge plugin.");
            }
            throw new Error("F-MCP ATezer Bridge plugin not connected. Open Figma, run the F-MCP ATezer Bridge plugin, and ensure it shows 'Bridge active' (no debug port needed).");
        }
        const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const req = { id, method, params };
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const timeout = setTimeout(() => {
                if (this.pending.delete(id)) {
                    auditTool(this.auditLogPath, method, false, "timeout", Date.now() - startTime);
                    reject(new Error(`Plugin bridge request '${method}' timed out after ${this.requestTimeoutMs}ms`));
                }
            }, this.requestTimeoutMs);
            this.pending.set(id, {
                resolve: resolve,
                reject,
                timeout,
                method,
                startTime,
                clientId: client.clientId,
            });
            try {
                client.ws.send(JSON.stringify(req));
            }
            catch (err) {
                this.pending.delete(id);
                clearTimeout(timeout);
                auditTool(this.auditLogPath, method, false, "send_failed", Date.now() - startTime);
                reject(new Error(`Failed to send request '${method}': ${err instanceof Error ? err.message : String(err)}`));
            }
        });
    }
    isConnected(fileKey) {
        if (fileKey) {
            const client = this.findClientByFileKey(fileKey);
            return !!client && client.ws.readyState === 1;
        }
        for (const client of this.clients.values()) {
            if (client.ws.readyState === 1)
                return true;
        }
        return false;
    }
    listConnectedFiles() {
        const result = [];
        for (const client of this.clients.values()) {
            if (client.ws.readyState === 1) {
                result.push({
                    clientId: client.clientId,
                    fileKey: client.fileKey,
                    fileName: client.fileName,
                    connectedAt: client.connectedAt,
                });
            }
        }
        return result.sort((a, b) => b.connectedAt - a.connectedAt);
    }
    connectedClientCount() {
        let count = 0;
        for (const client of this.clients.values()) {
            if (client.ws.readyState === 1)
                count++;
        }
        return count;
    }
    rejectPendingForClient(clientId, reason) {
        for (const [id, p] of this.pending) {
            if (p.clientId === clientId) {
                clearTimeout(p.timeout);
                const durationMs = Date.now() - p.startTime;
                auditTool(this.auditLogPath, p.method, false, reason, durationMs);
                p.reject(new Error(`Plugin bridge request '${p.method}' failed: ${reason}`));
                this.pending.delete(id);
            }
        }
    }
    rejectAllPending(reason) {
        for (const [id, p] of this.pending) {
            clearTimeout(p.timeout);
            const durationMs = Date.now() - p.startTime;
            auditTool(this.auditLogPath, p.method, false, reason, durationMs);
            p.reject(new Error(`Plugin bridge request '${p.method}' failed: ${reason}`));
        }
        this.pending.clear();
    }
    // ---- Figma REST API token management (in-memory only) ----
    setFigmaRestToken(token) {
        this.figmaRestToken = { token, setAt: Date.now() };
        logger.info("Figma REST API token set (in-memory)");
        // Broadcast to all connected plugins
        for (const client of this.clients.values()) {
            if (client.ws.readyState === 1) {
                try {
                    client.ws.send(JSON.stringify({ type: "tokenStatus", hasToken: true }));
                }
                catch { /* ignore */ }
            }
        }
    }
    clearFigmaRestToken() {
        this.figmaRestToken = null;
        logger.info("Figma REST API token cleared");
        for (const client of this.clients.values()) {
            if (client.ws.readyState === 1) {
                try {
                    client.ws.send(JSON.stringify({ type: "tokenStatus", hasToken: false }));
                }
                catch { /* ignore */ }
            }
        }
    }
    getFigmaRestToken() {
        return this.figmaRestToken;
    }
    updateRateLimit(remaining, limit, resetAt) {
        if (this.figmaRestToken) {
            this.figmaRestToken.rateLimit = { remaining, limit, resetAt };
            // Broadcast updated rate limit to all connected plugins
            for (const client of this.clients.values()) {
                if (client.ws.readyState === 1) {
                    try {
                        client.ws.send(JSON.stringify({ type: "tokenStatus", hasToken: true, rateLimit: { remaining, limit, resetAt } }));
                    }
                    catch { /* ignore */ }
                }
            }
        }
    }
    stop() {
        if (this.heartbeatTimer) {
            clearTimeout(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        this.rejectAllPending("Plugin bridge server stopped");
        for (const client of this.clients.values()) {
            try {
                client.ws.close();
            }
            catch { /* ignore */ }
        }
        this.clients.clear();
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
        }
        logger.info("Plugin bridge server stopped");
    }
}
//# sourceMappingURL=plugin-bridge-server.js.map