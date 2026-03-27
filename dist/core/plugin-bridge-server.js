/**
 * Plugin Bridge WebSocket Server
 *
 * Listens for connections from the F-MCP ATezer Bridge plugin (no CDP needed).
 * Supports MULTIPLE simultaneous plugin connections (e.g. Figma Desktop + FigJam browser).
 * Each connected plugin identifies itself with a fileKey; requests are routed accordingly.
 */
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { logger } from "./logger.js";
import { auditTool, auditPlugin } from "./audit-log.js";
const HEARTBEAT_INTERVAL_MS = 3000;
const MIN_PORT = 5454;
const MAX_PORT = 5470;
export class PluginBridgeServer {
    constructor(port, options) {
        this.wss = null;
        this.httpServer = null;
        this.clients = new Map();
        this.pending = new Map();
        this.requestTimeoutMs = 120000;
        this.heartbeatTimer = null;
        this.clientIdCounter = 0;
        const clamped = Math.max(MIN_PORT, Math.min(MAX_PORT, port));
        this.preferredPort = clamped;
        this.port = clamped;
        this.auditLogPath = options?.auditLogPath;
    }
    start() {
        if (this.wss) {
            logger.debug({ port: this.port }, "Plugin bridge server already running");
            return;
        }
        const candidates = this.buildPortCandidateList(this.preferredPort);
        this.attemptListen(candidates, 0);
    }
    /** Try preferred first, then scan forward to MAX, then wrap MIN..preferred-1. */
    buildPortCandidateList(preferred) {
        const p0 = Math.max(MIN_PORT, Math.min(MAX_PORT, preferred));
        const list = [];
        for (let p = p0; p <= MAX_PORT; p++)
            list.push(p);
        for (let p = MIN_PORT; p < p0; p++)
            list.push(p);
        return list;
    }
    attemptListen(candidatePorts, index) {
        if (index >= candidatePorts.length) {
            console.error(`\n❌ No free port in range ${MIN_PORT}-${MAX_PORT} (all in use).\n` +
                `   Free a port or set FIGMA_PLUGIN_BRIDGE_PORT to a free value in this range.\n` +
                `   ⚠️  Avoid running multiple MCP bridge instances when one is enough.\n`);
            process.exit(1);
            return;
        }
        const port = candidatePorts[index];
        this.tryListenOne(port, candidatePorts, index);
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
    tryListenOne(port, candidatePorts, index) {
        const server = createServer((_req, res) => {
            res.writeHead(200, {
                "Content-Type": "text/plain",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
            });
            res.end("F-MCP ATezer Bridge (connect via WebSocket)\n");
        });
        server.on("error", (err) => {
            if (err.code === "EADDRINUSE") {
                server.close();
                this.attemptListen(candidatePorts, index + 1);
                return;
            }
            logger.error({ err }, "Plugin bridge server error");
        });
        const bindHost = process.env.FIGMA_BRIDGE_HOST || "127.0.0.1";
        server.listen(port, bindHost, () => {
            this.port = port;
            process.env.FIGMA_PLUGIN_BRIDGE_PORT = String(port);
            process.env.FIGMA_MCP_BRIDGE_PORT = String(port);
            if (port !== this.preferredPort) {
                console.error(`\n⚠️  Port ${this.preferredPort} was busy — F-MCP bridge bound to ${port} instead.\n` +
                    `   Set FIGMA_PLUGIN_BRIDGE_PORT=${port} in your MCP config to avoid this message, or free port ${this.preferredPort}.\n`);
            }
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
                                bridgeVersion: "1.1.0",
                                port: this.port,
                                clientId,
                                multiClient: true,
                            }));
                            return;
                        }
                        if (msg.type === "pong" || msg.type === "keepalive") {
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