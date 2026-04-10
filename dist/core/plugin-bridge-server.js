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
import { WebSocketServer } from "ws";
import { createServer, get as httpGet, request as httpRequest } from "http";
import { execSync } from "child_process";
import { logger } from "./logger.js";
import { auditTool, auditPlugin } from "./audit-log.js";
const HEARTBEAT_INTERVAL_MS = 3000;
const MIN_PORT = 5454;
const MAX_PORT = 5470;
const STALE_PORT_RETRY_DELAY_MS = 1500;
const SHUTDOWN_TAKEOVER_DELAY_MS = 2000;
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
        this.clientName = this.detectClientName();
    }
    /** Detect AI client name by env vars and process tree. */
    detectClientName() {
        // 1. Explicit env var (highest priority)
        if (process.env.FIGMA_MCP_CLIENT_NAME)
            return process.env.FIGMA_MCP_CLIENT_NAME;
        // 2. Claude Code env detection
        if (process.env.CLAUDECODE === "1")
            return "Claude Code";
        // 3. Cursor env detection
        if (process.env.CURSOR_TRACE_ID || process.env.VSCODE_PID) {
            if (process.env.CURSOR_TRACE_ID)
                return "Cursor";
        }
        // 4. Walk up process tree (max 5 levels)
        try {
            let pid = process.ppid;
            for (let i = 0; i < 5 && pid > 1; i++) {
                const line = execSync(`ps -p ${pid} -o ppid=,comm=`, { timeout: 1000 }).toString().trim();
                const comm = line.replace(/^\s*\d+\s+/, "");
                const ppidMatch = line.match(/^\s*(\d+)/);
                if (/[Cc]ursor/i.test(comm))
                    return "Cursor";
                if (/[Cc]laude/i.test(comm))
                    return "Claude";
                if (/[Ww]indsurf/i.test(comm))
                    return "Windsurf";
                pid = ppidMatch ? parseInt(ppidMatch[1], 10) : 0;
            }
        }
        catch { /* ignore */ }
        return "MCP";
    }
    start() {
        if (this.wss) {
            logger.debug({ port: this.port }, "Plugin bridge server already running");
            return;
        }
        this.startError = null;
        this.tryListenFixed(this.preferredPort, false);
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
    /** Async listen attempt — resolves when port binds successfully or fails. */
    tryListenAsync(port) {
        return new Promise((resolve) => {
            const TIMEOUT_MS = 5000;
            const timer = setTimeout(() => {
                this._listenResolve = null;
                resolve({ success: false, port, error: this.startError || `Port ${port} bind timeout (${TIMEOUT_MS}ms)` });
            }, TIMEOUT_MS);
            // Store original callback so tryListenFixed can notify us
            this._listenResolve = (success) => {
                clearTimeout(timer);
                if (success) {
                    resolve({ success: true, port: this.port });
                }
                else {
                    resolve({ success: false, port, error: this.startError || "Port bind failed" });
                }
            };
            this.tryListenFixed(port, false);
        });
    }
    /** Currently listening port (or preferred port if not yet listening). */
    getPort() {
        return this.port;
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
     * Send a POST /shutdown to an old F-MCP bridge on the given port,
     * wait for it to exit, then retry binding to the same port.
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
    tryListenFixed(port, isRetry) {
        const server = createServer((req, res) => {
            // Graceful shutdown endpoint: a new bridge instance requests this old one to exit
            if (req.method === "POST" && req.url === "/shutdown") {
                res.writeHead(200, { "Content-Type": "text/plain" });
                res.end("shutting down\n");
                logger.info("Received /shutdown request from new bridge instance — stopping gracefully");
                console.error("\n⚠️  Received shutdown request from new F-MCP bridge instance. Stopping…\n");
                // Defer stop to let the response flush
                setTimeout(() => this.stop(), 500);
                return;
            }
            res.writeHead(200, {
                "Content-Type": "text/plain",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS, POST",
            });
            res.end("F-MCP ATezer Bridge (connect via WebSocket)\n");
        });
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
                                bridgeVersion: "1.7.24",
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
            // Notify async restart() that binding succeeded
            this._listenResolve?.(true);
            this._listenResolve = null;
            this.heartbeatTimer = setInterval(() => {
                for (const [clientId, info] of this.clients) {
                    if (info.ws.readyState !== 1) {
                        this.removeClient(clientId, "WebSocket not open");
                        continue;
                    }
                    if (!info.alive) {
                        info.missedHeartbeats++;
                        if (info.missedHeartbeats >= 3) {
                            logger.warn({ clientId, fileKey: info.fileKey }, "Plugin bridge: client not responding to heartbeat, terminating");
                            try {
                                info.ws.terminate();
                            }
                            catch { /* ignore */ }
                            this.removeClient(clientId, "Heartbeat timeout");
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
            }, HEARTBEAT_INTERVAL_MS);
        });
    }
    /**
     * Send a request to a plugin and wait for the response.
     * If fileKey is specified, routes to the client serving that file.
     * Otherwise routes to the most recently connected client.
     */
    async request(method, params, fileKey) {
        const client = this.resolveClient(fileKey);
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
            clearInterval(this.heartbeatTimer);
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