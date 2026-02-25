/**
 * Plugin Bridge WebSocket Server
 *
 * Listens for connections from the F-MCP ATezer Bridge plugin (no CDP needed).
 * When the plugin connects, MCP tools can send JSON-RPC style requests and get
 * responses (variables, execute, component, etc.).
 */
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { logger } from "./logger.js";
import { auditTool, auditPlugin } from "./audit-log.js";
const PING_INTERVAL_MS = 15000;
const MIN_PORT = 5454;
const MAX_PORT = 5470;
export class PluginBridgeServer {
    constructor(port, options) {
        this.wss = null;
        this.httpServer = null;
        this.client = null;
        this.pending = new Map();
        this.requestTimeoutMs = 120000;
        this.pingTimer = null;
        this.port = port;
        this.auditLogPath = options?.auditLogPath;
    }
    /**
     * Start the WebSocket server. Tries ports 5454–5470 if the preferred port is in use (multi-instance). Idempotent.
     */
    start() {
        if (this.wss) {
            logger.debug({ port: this.port }, "Plugin bridge server already running");
            return;
        }
        this.tryListen(this.port);
    }
    tryListen(port) {
        if (port > MAX_PORT) {
            console.error("\n❌ No free port in range %s–%s. Free one with: lsof -i :5454 (or your port) then kill <PID>\n", MIN_PORT, MAX_PORT);
            process.exit(1);
        }
        const server = createServer((_req, res) => {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("F-MCP ATezer Bridge (connect via WebSocket)\n");
        });
        server.on("error", (err) => {
            if (err.code === "EADDRINUSE") {
                logger.warn({ port }, "Port in use, trying next...");
                server.close();
                this.tryListen(port + 1);
                return;
            }
            logger.error({ err }, "Plugin bridge server error");
        });
        server.listen(port, "127.0.0.1", () => {
            this.port = port;
            this.httpServer = server;
            this.wss = new WebSocketServer({ server });
            this.wss.on("connection", (ws) => {
                if (this.client) {
                    try {
                        this.client.close();
                    }
                    catch {
                        // ignore
                    }
                }
                this.client = ws;
                logger.info({ port: this.port }, "Plugin bridge: plugin connected");
                auditPlugin(this.auditLogPath, "plugin_connect");
                ws.on("message", (data) => {
                    try {
                        const msg = JSON.parse(data.toString());
                        if (msg.type === "ready") {
                            logger.info("Plugin bridge: plugin sent ready");
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
                        auditPlugin(this.auditLogPath, "plugin_disconnect");
                        logger.info("Plugin bridge: plugin disconnected");
                    }
                });
                ws.on("error", (err) => {
                    logger.warn({ err }, "Plugin bridge: client error");
                });
            });
            logger.info({ port: this.port }, "Plugin bridge server listening (ws://127.0.0.1:%s)", this.port);
            this.pingTimer = setInterval(() => {
                if (this.client && this.client.readyState === 1) {
                    this.client.ping();
                }
            }, PING_INTERVAL_MS);
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
            this.client.send(JSON.stringify(req));
        });
    }
    isConnected() {
        return !!this.client && this.client.readyState === 1;
    }
    stop() {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
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
//# sourceMappingURL=plugin-bridge-server.js.map