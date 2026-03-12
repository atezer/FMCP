/**
 * Plugin Bridge WebSocket Server
 *
 * Listens for connections from the F-MCP ATezer Bridge plugin (no CDP needed).
 * When the plugin connects, MCP tools can send JSON-RPC style requests and get
 * responses (variables, execute, component, etc.).
 */
import { WebSocketServer } from "ws";
import { createServer, get as httpGet } from "http";
import { logger } from "./logger.js";
import { auditTool, auditPlugin } from "./audit-log.js";
const HEARTBEAT_INTERVAL_MS = 3000;
const MIN_PORT = 5454;
const MAX_PORT = 5470;
export class PluginBridgeServer {
    constructor(port, options) {
        this.wss = null;
        this.httpServer = null;
        this.client = null;
        this.clientAlive = false;
        this.missedHeartbeats = 0;
        this.pending = new Map();
        this.requestTimeoutMs = 120000;
        this.heartbeatTimer = null;
        this.port = port;
        this.auditLogPath = options?.auditLogPath;
    }
    /**
     * Start the WebSocket server on the configured port. Fails loudly if port is in use. Idempotent.
     */
    start() {
        if (this.wss) {
            logger.debug({ port: this.port }, "Plugin bridge server already running");
            return;
        }
        this.tryListen(this.port);
    }
    checkPortConflict(port) {
        return new Promise((resolve) => {
            const req = httpGet(`http://127.0.0.1:${port}`, (res) => {
                let body = "";
                res.on("data", (c) => { body += c.toString(); });
                res.on("end", () => resolve(body));
            });
            req.on("error", () => resolve(null));
            req.setTimeout(2000, () => { req.destroy(); resolve(null); });
        });
    }
    tryListen(port) {
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
                this.checkPortConflict(port).then((body) => {
                    const isFmcp = body !== null && body.includes("F-MCP");
                    const hint = process.platform === "win32"
                        ? `netstat -ano | findstr :${port}`
                        : `lsof -i :${port}`;
                    if (isFmcp) {
                        console.error(`\n❌ Port ${port} is already used by another F-MCP bridge instance.\n` +
                            `   Find it: ${hint}\n` +
                            `   Kill it and retry, or set FIGMA_PLUGIN_BRIDGE_PORT to a different port.\n` +
                            `   ⚠️  Cursor/Claude starts the bridge automatically — do NOT also run 'npm run dev:local'.\n`);
                    }
                    else {
                        console.error(`\n❌ Port ${port} is already in use by another application.\n` +
                            `   Find it: ${hint}\n` +
                            `   Free the port and retry, or set FIGMA_PLUGIN_BRIDGE_PORT to a different port.\n`);
                    }
                    process.exit(1);
                });
                server.close();
                return;
            }
            logger.error({ err }, "Plugin bridge server error");
        });
        const bindHost = process.env.FIGMA_BRIDGE_HOST || "127.0.0.1";
        server.listen(port, bindHost, () => {
            this.port = port;
            this.httpServer = server;
            this.wss = new WebSocketServer({ server });
            this.wss.on("connection", (ws) => {
                if (this.client && this.client !== ws) {
                    this.rejectAllPending("Replaced by new plugin connection");
                    logger.info("Plugin bridge: new connection arrived, switching to it");
                }
                this.client = ws;
                this.clientAlive = true;
                this.missedHeartbeats = 0;
                logger.info({ port: this.port }, "Plugin bridge: plugin connected");
                auditPlugin(this.auditLogPath, "plugin_connect");
                ws.on("message", (data) => {
                    this.clientAlive = true;
                    try {
                        const msg = JSON.parse(data.toString());
                        if (msg.type === "ready") {
                            logger.info("Plugin bridge: plugin sent ready, sending welcome");
                            ws.send(JSON.stringify({ type: "welcome", bridgeVersion: "1.0.0", port: this.port }));
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
                    if (this.client === ws) {
                        this.client = null;
                        this.clientAlive = false;
                        this.clearHeartbeatTimers();
                        this.rejectAllPending("Plugin disconnected");
                        auditPlugin(this.auditLogPath, "plugin_disconnect");
                        logger.info("Plugin bridge: plugin disconnected");
                    }
                });
                ws.on("error", (err) => {
                    logger.warn({ err }, "Plugin bridge: client error");
                });
            });
            logger.info({ port: this.port, host: bindHost }, "Plugin bridge server listening (ws://%s:%s)", bindHost, this.port);
            this.heartbeatTimer = setInterval(() => {
                if (this.client && this.client.readyState === 1) {
                    if (!this.clientAlive) {
                        this.missedHeartbeats++;
                        if (this.missedHeartbeats >= 3) {
                            logger.warn("Plugin bridge: client not responding to heartbeat, terminating connection");
                            try {
                                this.client.terminate();
                            }
                            catch { /* ignore */ }
                            this.client = null;
                            this.clientAlive = false;
                            this.missedHeartbeats = 0;
                            return;
                        }
                    }
                    else {
                        this.missedHeartbeats = 0;
                        this.clientAlive = false;
                    }
                    try {
                        this.client.send(JSON.stringify({ type: "ping" }));
                    }
                    catch { /* ignore */ }
                }
            }, HEARTBEAT_INTERVAL_MS);
        });
    }
    /**
     * Send a request to the plugin and wait for the response.
     */
    async request(method, params) {
        if (!this.client || this.client.readyState !== 1) {
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
            });
            try {
                this.client.send(JSON.stringify(req));
            }
            catch (err) {
                this.pending.delete(id);
                clearTimeout(timeout);
                auditTool(this.auditLogPath, method, false, "send_failed", Date.now() - startTime);
                reject(new Error(`Failed to send request '${method}': ${err instanceof Error ? err.message : String(err)}`));
            }
        });
    }
    isConnected() {
        return !!this.client && this.client.readyState === 1;
    }
    clearHeartbeatTimers() {
        // placeholder for future timers
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
        for (const p of this.pending.values()) {
            clearTimeout(p.timeout);
            p.reject(new Error("Plugin bridge server stopped"));
        }
        this.pending.clear();
        if (this.client) {
            try {
                this.client.close();
            }
            catch {
                // ignore
            }
            this.client = null;
        }
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
