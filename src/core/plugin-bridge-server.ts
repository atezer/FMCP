/**
 * Plugin Bridge WebSocket Server
 *
 * Listens for connections from the F-MCP ATezer Bridge plugin (no CDP needed).
 * When the plugin connects, MCP tools can send JSON-RPC style requests and get
 * responses (variables, execute, component, etc.).
 */

import { WebSocketServer, type WebSocket } from "ws";
import { createServer } from "http";
import { logger } from "./logger.js";

const PING_INTERVAL_MS = 15000;
const MIN_PORT = 5454;
const MAX_PORT = 5460;

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
};

export class PluginBridgeServer {
	private wss: WebSocketServer | null = null;
	private httpServer: ReturnType<typeof createServer> | null = null;
	private client: WebSocket | null = null;
	private pending = new Map<string, Pending>();
	private requestTimeoutMs = 60000;
	private pingTimer: ReturnType<typeof setInterval> | null = null;

	constructor(private port: number) {}

	/**
	 * Start the WebSocket server. Tries ports 5454–5460 if the preferred port is in use. Idempotent.
	 */
	start(): void {
		if (this.wss) {
			logger.debug({ port: this.port }, "Plugin bridge server already running");
			return;
		}
		this.tryListen(this.port);
	}

	private tryListen(port: number): void {
		if (port > MAX_PORT) {
			console.error("\n❌ No free port in range %s–%s. Free one with: lsof -i :5454 then kill <PID>\n", MIN_PORT, MAX_PORT);
			process.exit(1);
		}

		const server = createServer((_req, res) => {
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("F-MCP ATezer Bridge (connect via WebSocket)\n");
		});

		server.on("error", (err: NodeJS.ErrnoException) => {
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

				ws.on("message", (data: Buffer | string) => {
					try {
						const msg = JSON.parse(data.toString()) as BridgeResponse & { type?: string };
						if (msg.type === "ready") {
							logger.info("Plugin bridge: plugin sent ready");
							return;
						}
						if (msg.id && this.pending.has(msg.id)) {
							const p = this.pending.get(msg.id)!;
							this.pending.delete(msg.id);
							clearTimeout(p.timeout);
							if (msg.error) p.reject(new Error(msg.error));
							else p.resolve(msg.result);
						}
					} catch (err) {
						logger.warn({ err }, "Plugin bridge: invalid message from plugin");
					}
				});

				ws.on("close", () => {
					if (this.client === ws) {
						this.client = null;
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
	async request<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
		if (!this.client || this.client.readyState !== 1) {
			throw new Error(
				"F-MCP ATezer Bridge plugin not connected. Open Figma, run the F-MCP ATezer Bridge plugin, and ensure it shows 'Bridge active' (no debug port needed)."
			);
		}

		const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
		const req: BridgeRequest = { id, method, params };

		return new Promise<T>((resolve, reject) => {
			const timeout = setTimeout(() => {
				if (this.pending.delete(id)) {
					reject(new Error(`Plugin bridge request '${method}' timed out after ${this.requestTimeoutMs}ms`));
				}
			}, this.requestTimeoutMs);

			this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timeout });
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
