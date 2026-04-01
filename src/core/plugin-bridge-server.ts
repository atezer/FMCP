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

import { WebSocketServer, type WebSocket } from "ws";
import { createServer, get as httpGet } from "http";
import { logger } from "./logger.js";
import { auditTool, auditPlugin } from "./audit-log.js";

const HEARTBEAT_INTERVAL_MS = 3000;
const MIN_PORT = 5454;
const MAX_PORT = 5470;
const STALE_PORT_RETRY_DELAY_MS = 1500;

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
	clientId: string;
};

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

export class PluginBridgeServer {
	private wss: WebSocketServer | null = null;
	private httpServer: ReturnType<typeof createServer> | null = null;
	private clients = new Map<string, ClientInfo>();
	private pending = new Map<string, Pending>();
	private requestTimeoutMs = 120000;
	private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	private auditLogPath: string | undefined;
	private clientIdCounter = 0;

	/** User/config preferred port (before clamp and fallback). */
	private readonly preferredPort: number;

	constructor(port: number, options?: { auditLogPath?: string }) {
		const clamped = Math.max(MIN_PORT, Math.min(MAX_PORT, port));
		this.preferredPort = clamped;
		this.port = clamped;
		this.auditLogPath = options?.auditLogPath;
	}
	private port: number;

	start(): void {
		if (this.wss) {
			logger.debug({ port: this.port }, "Plugin bridge server already running");
			return;
		}
		this.tryListenFixed(this.preferredPort, false);
	}

	private generateClientId(): string {
		return `client_${Date.now()}_${++this.clientIdCounter}`;
	}

	private findClientByFileKey(fileKey: string): ClientInfo | undefined {
		for (const client of this.clients.values()) {
			if (client.fileKey === fileKey && client.ws.readyState === 1) {
				return client;
			}
		}
		return undefined;
	}

	private getDefaultClient(): ClientInfo | undefined {
		let latest: ClientInfo | undefined;
		for (const client of this.clients.values()) {
			if (client.ws.readyState !== 1) continue;
			if (!latest || client.connectedAt > latest.connectedAt) {
				latest = client;
			}
		}
		return latest;
	}

	private resolveClient(fileKey?: string): ClientInfo | undefined {
		if (fileKey) {
			return this.findClientByFileKey(fileKey) ?? this.getDefaultClient();
		}
		return this.getDefaultClient();
	}

	private removeClient(clientId: string, reason: string): void {
		const info = this.clients.get(clientId);
		if (!info) return;
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
	private probePort(port: number, host: string): Promise<"fmcp" | "other" | "dead"> {
		return new Promise((resolve) => {
			const req = httpGet({ hostname: host, port, path: "/", timeout: 2000 }, (res) => {
				let body = "";
				res.on("data", (chunk: Buffer | string) => { body += chunk; });
				res.on("end", () => {
					resolve(body.includes("F-MCP") ? "fmcp" : "other");
				});
			});
			req.on("error", () => resolve("dead"));
			req.on("timeout", () => { req.destroy(); resolve("dead"); });
		});
	}

	private tryListenFixed(port: number, isRetry: boolean): void {
		const server = createServer((_req, res) => {
			res.writeHead(200, {
				"Content-Type": "text/plain",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
			});
			res.end("F-MCP ATezer Bridge (connect via WebSocket)\n");
		});

		const bindHost = process.env.FIGMA_BRIDGE_HOST || "127.0.0.1";

		server.on("error", (err: NodeJS.ErrnoException) => {
			if (err.code === "EADDRINUSE") {
				server.close();
				if (isRetry) {
					console.error(
						`\n❌ Port ${port} is still busy after retry.\n` +
						`   A process may be holding this port. Find and stop it:\n` +
						`     lsof -i :${port}   (macOS/Linux)\n` +
						`   Then restart, or set FIGMA_PLUGIN_BRIDGE_PORT to a different value (${MIN_PORT}–${MAX_PORT}).\n`,
					);
					process.exit(1);
					return;
				}
				const probeHost = bindHost === "0.0.0.0" ? "127.0.0.1" : bindHost;
			this.probePort(port, probeHost).then((status) => {
					if (status === "fmcp") {
						console.error(
							`\n⚠️  Port ${port} is already in use by another F-MCP bridge instance.\n` +
							`   One bridge is enough for all Figma/FigJam windows.\n` +
							`   If you need a separate session, set FIGMA_PLUGIN_BRIDGE_PORT to a different value (${MIN_PORT}–${MAX_PORT}).\n`,
						);
						process.exit(1);
					} else if (status === "dead") {
						console.error(
							`\n⚠️  Port ${port} is busy but not responding (stale process).\n` +
							`   Retrying in ${STALE_PORT_RETRY_DELAY_MS}ms…\n`,
						);
						setTimeout(() => this.tryListenFixed(port, true), STALE_PORT_RETRY_DELAY_MS);
					} else {
						console.error(
							`\n❌ Port ${port} is in use by a different service (not F-MCP).\n` +
							`   Free the port or set FIGMA_PLUGIN_BRIDGE_PORT to a different value (${MIN_PORT}–${MAX_PORT}).\n`,
						);
						process.exit(1);
					}
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

			this.wss.on("connection", (ws: WebSocket) => {
				const clientId = this.generateClientId();
				const clientInfo: ClientInfo = {
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

				ws.on("message", (data: Buffer | string) => {
					clientInfo.alive = true;
					try {
						const msg = JSON.parse(data.toString()) as BridgeResponse & {
							type?: string;
							fileKey?: string;
							fileName?: string;
						};

						if (msg.type === "ready") {
							const incomingFileKey = msg.fileKey || null;
							const incomingFileName = msg.fileName || null;

							if (incomingFileKey) {
								const existing = this.findClientByFileKey(incomingFileKey);
								if (existing && existing.clientId !== clientId) {
									logger.info(
										{ oldClientId: existing.clientId, newClientId: clientId, fileKey: incomingFileKey },
										"Plugin bridge: replacing existing client for same fileKey"
									);
									this.removeClient(existing.clientId, "Replaced by new connection for same file");
									try { existing.ws.close(); } catch { /* ignore */ }
								}
							}

							clientInfo.fileKey = incomingFileKey;
							clientInfo.fileName = incomingFileName;
							logger.info(
								{ clientId, fileKey: incomingFileKey, fileName: incomingFileName },
								"Plugin bridge: client registered (fileKey=%s, fileName=%s)",
								incomingFileKey, incomingFileName
							);

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
							try { info.ws.terminate(); } catch { /* ignore */ }
							this.removeClient(clientId, "Heartbeat timeout");
							continue;
						}
					} else {
						info.missedHeartbeats = 0;
						info.alive = false;
					}
					try {
						info.ws.send(JSON.stringify({ type: "ping" }));
					} catch { /* ignore */ }
				}
			}, HEARTBEAT_INTERVAL_MS);
		});
	}

	/**
	 * Send a request to a plugin and wait for the response.
	 * If fileKey is specified, routes to the client serving that file.
	 * Otherwise routes to the most recently connected client.
	 */
	async request<T = unknown>(method: string, params?: Record<string, unknown>, fileKey?: string): Promise<T> {
		const client = this.resolveClient(fileKey);
		if (!client || client.ws.readyState !== 1) {
			if (fileKey) {
				const available = this.listConnectedFiles();
				const fileList = available.length > 0
					? ` Connected files: ${available.map(f => `${f.fileName || "?"} (${f.fileKey || "?"})`).join(", ")}`
					: "";
				throw new Error(
					`No plugin connected for fileKey "${fileKey}".${fileList} ` +
					"Open the target file in Figma and run the F-MCP ATezer Bridge plugin."
				);
			}
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
				clientId: client.clientId,
			});
			try {
				client.ws.send(JSON.stringify(req));
			} catch (err) {
				this.pending.delete(id);
				clearTimeout(timeout);
				auditTool(this.auditLogPath, method, false, "send_failed", Date.now() - startTime);
				reject(new Error(`Failed to send request '${method}': ${err instanceof Error ? err.message : String(err)}`));
			}
		});
	}

	isConnected(fileKey?: string): boolean {
		if (fileKey) {
			const client = this.findClientByFileKey(fileKey);
			return !!client && client.ws.readyState === 1;
		}
		for (const client of this.clients.values()) {
			if (client.ws.readyState === 1) return true;
		}
		return false;
	}

	listConnectedFiles(): ConnectedFileInfo[] {
		const result: ConnectedFileInfo[] = [];
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

	connectedClientCount(): number {
		let count = 0;
		for (const client of this.clients.values()) {
			if (client.ws.readyState === 1) count++;
		}
		return count;
	}

	private rejectPendingForClient(clientId: string, reason: string): void {
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

	private rejectAllPending(reason: string): void {
		for (const [id, p] of this.pending) {
			clearTimeout(p.timeout);
			const durationMs = Date.now() - p.startTime;
			auditTool(this.auditLogPath, p.method, false, reason, durationMs);
			p.reject(new Error(`Plugin bridge request '${p.method}' failed: ${reason}`));
		}
		this.pending.clear();
	}

	stop(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
		this.rejectAllPending("Plugin bridge server stopped");
		for (const client of this.clients.values()) {
			try { client.ws.close(); } catch { /* ignore */ }
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
