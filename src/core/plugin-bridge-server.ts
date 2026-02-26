/**
 * Plugin Bridge WebSocket Server
 *
 * Listens for connections from the F-MCP ATezer Bridge plugin (no CDP needed).
 * When the plugin connects, MCP tools can send JSON-RPC style requests and get
 * responses (variables, execute, component, etc.).
 */

import { WebSocketServer, type WebSocket } from "ws";
import { createServer, get as httpGet } from "http";
import { logger } from "./logger.js";
import { auditTool, auditPlugin } from "./audit-log.js";

const PING_INTERVAL_MS = 15000;
const MIN_PORT = 5454;
const MAX_PORT = 5470;

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

type Pending = {
	resolve: (value: unknown) => void;
	reject: (err: Error) => void;
	timeout: ReturnType<typeof setTimeout>;
	method: string;
	startTime: number;
};

export class PluginBridgeServer {
	private wss: WebSocketServer | null = null;
	private httpServer: ReturnType<typeof createServer> | null = null;
	private client: WebSocket | null = null;
	private pending = new Map<string, Pending>();
	private requestTimeoutMs = 120000;
	private pingTimer: ReturnType<typeof setInterval> | null = null;
	private auditLogPath: string | undefined;

	constructor(port: number, options?: { auditLogPath?: string }) {
		this.port = port;
		this.auditLogPath = options?.auditLogPath;
	}
	private port: number;

	/**
	 * Start the WebSocket server on the configured port. Fails loudly if port is in use. Idempotent.
	 */
	start(): void {
		if (this.wss) {
			logger.debug({ port: this.port }, "Plugin bridge server already running");
			return;
		}
		this.tryListen(this.port);
	}

	private checkPortConflict(port: number): Promise<string | null> {
		return new Promise((resolve) => {
			const req = httpGet(`http://127.0.0.1:${port}`, (res) => {
				let body = "";
				res.on("data", (c: Buffer) => { body += c.toString(); });
				res.on("end", () => resolve(body));
			});
			req.on("error", () => resolve(null));
			req.setTimeout(2000, () => { req.destroy(); resolve(null); });
		});
	}

	private tryListen(port: number): void {
		const server = createServer((_req, res) => {
			res.writeHead(200, {
				"Content-Type": "text/plain",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
			});
			res.end("F-MCP ATezer Bridge (connect via WebSocket)\n");
		});

		server.on("error", (err: NodeJS.ErrnoException) => {
			if (err.code === "EADDRINUSE") {
				this.checkPortConflict(port).then((body) => {
					const isFmcp = body !== null && body.includes("F-MCP");
					const hint = process.platform === "win32"
						? `netstat -ano | findstr :${port}`
						: `lsof -i :${port}`;
					if (isFmcp) {
						console.error(
							`\n❌ Port ${port} is already used by another F-MCP bridge instance.\n` +
							`   Find it: ${hint}\n` +
							`   Kill it and retry, or set FIGMA_PLUGIN_BRIDGE_PORT to a different port.\n` +
							`   ⚠️  Cursor/Claude starts the bridge automatically — do NOT also run 'npm run dev:local'.\n`
						);
					} else {
						console.error(
							`\n❌ Port ${port} is already in use by another application.\n` +
							`   Find it: ${hint}\n` +
							`   Free the port and retry, or set FIGMA_PLUGIN_BRIDGE_PORT to a different port.\n`
						);
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

			this.wss.on("connection", (ws: WebSocket) => {
				if (this.client) {
					try {
						this.client.close();
					} catch {
						// ignore
					}
				}
				this.client = ws;
				logger.info({ port: this.port }, "Plugin bridge: plugin connected");
				auditPlugin(this.auditLogPath, "plugin_connect");

				ws.on("message", (data: Buffer | string) => {
					try {
						const msg = JSON.parse(data.toString()) as BridgeResponse & { type?: string };
						if (msg.type === "ready") {
							logger.info("Plugin bridge: plugin sent ready, sending welcome");
							ws.send(JSON.stringify({ type: "welcome", bridgeVersion: "1.0.0", port: this.port }));
							return;
						}
						if (msg.id && this.pending.has(msg.id)) {
							const p = this.pending.get(msg.id)!;
							this.pending.delete(msg.id);
							clearTimeout(p.timeout);
							const durationMs = Date.now() - p.startTime;
							if (msg.error) {
								auditTool(this.auditLogPath, p.method, false, msg.error, durationMs);
								p.reject(new Error(msg.error));
							} else {
								auditTool(this.auditLogPath, p.method, true, undefined, durationMs);
								p.resolve(msg.result);
							}
						}
					} catch (err) {
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

			logger.info({ port: this.port, host: bindHost }, "Plugin bridge server listening (ws://%s:%s)", bindHost, this.port);
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
	async request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
		if (!this.client || this.client.readyState !== 1) {
			throw new Error(
				"F-MCP ATezer Bridge plugin not connected. Open Figma, run the F-MCP ATezer Bridge plugin, and ensure it shows 'Bridge active' (no debug port needed)."
			);
		}

		const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
		const req: BridgeRequest = { id, method, params };

		return new Promise<T>((resolve, reject) => {
			const startTime = Date.now();
			const timeout = setTimeout(() => {
				if (this.pending.delete(id)) {
					auditTool(this.auditLogPath, method, false, "timeout", Date.now() - startTime);
					reject(new Error(`Plugin bridge request '${method}' timed out after ${this.requestTimeoutMs}ms`));
				}
			}, this.requestTimeoutMs);

			this.pending.set(id, {
				resolve: resolve as (v: unknown) => void,
				reject,
				timeout,
				method,
				startTime,
			});
			this.client!.send(JSON.stringify(req));
		});
	}

	isConnected(): boolean {
		return !!this.client && this.client.readyState === 1;
	}

	stop(): void {
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
			} catch {
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
