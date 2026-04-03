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
import { execSync } from "child_process";
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

export interface FigmaRestTokenInfo {
	token: string;
	setAt: number;
	rateLimit?: { remaining: number; limit: number; resetAt: number };
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

	/** Figma REST API token (in-memory only, never written to disk). */
	private figmaRestToken: FigmaRestTokenInfo | null = null;

	/** AI client name detected from parent process (Claude, Cursor, etc.) */
	private readonly clientName: string;

	/** User/config preferred port (before clamp and fallback). */
	private readonly preferredPort: number;

	constructor(port: number, options?: { auditLogPath?: string }) {
		const clamped = Math.max(MIN_PORT, Math.min(MAX_PORT, port));
		this.preferredPort = clamped;
		this.port = clamped;
		this.auditLogPath = options?.auditLogPath;
		this.clientName = this.detectClientName();
	}

	/** Detect AI client name by walking up the process tree. */
	private detectClientName(): string {
		try {
			// Walk up process tree (max 5 levels) to find known AI client
			let pid = process.ppid;
			for (let i = 0; i < 5 && pid > 1; i++) {
				const line = execSync(`ps -p ${pid} -o ppid=,comm=`, { timeout: 1000 }).toString().trim();
				const comm = line.replace(/^\s*\d+\s+/, ""); // strip ppid prefix
				const ppidMatch = line.match(/^\s*(\d+)/);
				if (/[Cc]laude/i.test(comm) && /[Cc]ode/i.test(comm)) return "Claude Code";
				if (/[Cc]laude/i.test(comm)) return "Claude";
				if (/[Cc]ursor/i.test(comm)) return "Cursor";
				if (/[Ww]indsurf/i.test(comm)) return "Windsurf";
				pid = ppidMatch ? parseInt(ppidMatch[1], 10) : 0;
			}
			return process.env.FIGMA_MCP_CLIENT_NAME || "MCP";
		} catch {
			return process.env.FIGMA_MCP_CLIENT_NAME || "MCP";
		}
	}
	private port: number;

	/** Last error message when bridge could not bind (port conflict, etc.) */
	private startError: string | null = null;

	start(): void {
		if (this.wss) {
			logger.debug({ port: this.port }, "Plugin bridge server already running");
			return;
		}
		this.startError = null;
		this.tryListenFixed(this.preferredPort, false);
	}

	/** Get last startup error (null if running fine). */
	getStartError(): string | null {
		return this.startError;
	}

	/** Stop current WebSocket server (if any) and restart on a new port. Returns when binding resolves or fails. Token is preserved across restart. */
	async restart(newPort: number): Promise<{ success: boolean; port: number; error?: string }> {
		const clamped = Math.max(MIN_PORT, Math.min(MAX_PORT, newPort));
		const savedToken = this.figmaRestToken; // Preserve token across restart
		this.stop();
		this.figmaRestToken = savedToken; // Restore after stop()
		this.startError = null;
		return this.tryListenAsync(clamped);
	}

	/** Async listen attempt — resolves when port binds successfully or fails. */
	private tryListenAsync(port: number): Promise<{ success: boolean; port: number; error?: string }> {
		return new Promise((resolve) => {
			const TIMEOUT_MS = 5000;
			const timer = setTimeout(() => {
				this._listenResolve = null;
				resolve({ success: false, port, error: this.startError || `Port ${port} bind timeout (${TIMEOUT_MS}ms)` });
			}, TIMEOUT_MS);

			// Store original callback so tryListenFixed can notify us
			this._listenResolve = (success: boolean) => {
				clearTimeout(timer);
				if (success) {
					resolve({ success: true, port: this.port });
				} else {
					resolve({ success: false, port, error: this.startError || "Port bind failed" });
				}
			};

			this.tryListenFixed(port, false);
		});
	}

	/** Internal resolve callback for async listen flow. */
	private _listenResolve: ((success: boolean) => void) | null = null;

	/** Currently listening port (or preferred port if not yet listening). */
	getPort(): number {
		return this.port;
	}

	/** Whether WebSocket server is actively listening. */
	isListening(): boolean {
		return this.wss !== null;
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
					const msg =
						`Port ${port} is still busy after retry. ` +
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
						const msg =
							`Port ${port} is already in use by another F-MCP bridge instance. ` +
							`Use figma_set_port to switch to a different port (${MIN_PORT}–${MAX_PORT}).`;
						this.startError = msg;
						console.error(`\n⚠️  ${msg}\n`);
						logger.warn({ port }, msg);
						this._listenResolve?.(false);
						this._listenResolve = null;
					} else if (status === "dead") {
						console.error(
							`\n⚠️  Port ${port} is busy but not responding (stale process).\n` +
							`   Retrying in ${STALE_PORT_RETRY_DELAY_MS}ms…\n`,
						);
						setTimeout(() => this.tryListenFixed(port, true), STALE_PORT_RETRY_DELAY_MS);
					} else {
						const msg =
							`Port ${port} is in use by a different service (not F-MCP). ` +
							`Use figma_set_port to switch to a different port (${MIN_PORT}–${MAX_PORT}).`;
						this.startError = msg;
						console.error(`\n⚠️  ${msg}\n`);
						logger.warn({ port }, msg);
						this._listenResolve?.(false);
						this._listenResolve = null;
					}
				}).catch((err) => {
					const msg = `Port probe failed: ${err instanceof Error ? err.message : String(err)}`;
					this.startError = msg;
					logger.error({ err, port }, msg);
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
								bridgeVersion: "1.6.5",
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

						if (msg.type === "setToken" && typeof (msg as unknown as Record<string, unknown>).token === "string") {
							const token = (msg as unknown as Record<string, unknown>).token as string;
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

	// ---- Figma REST API token management (in-memory only) ----

	setFigmaRestToken(token: string): void {
		this.figmaRestToken = { token, setAt: Date.now() };
		logger.info("Figma REST API token set (in-memory)");
		// Broadcast to all connected plugins
		for (const client of this.clients.values()) {
			if (client.ws.readyState === 1) {
				try {
					client.ws.send(JSON.stringify({ type: "tokenStatus", hasToken: true }));
				} catch { /* ignore */ }
			}
		}
	}

	clearFigmaRestToken(): void {
		this.figmaRestToken = null;
		logger.info("Figma REST API token cleared");
		for (const client of this.clients.values()) {
			if (client.ws.readyState === 1) {
				try {
					client.ws.send(JSON.stringify({ type: "tokenStatus", hasToken: false }));
				} catch { /* ignore */ }
			}
		}
	}

	getFigmaRestToken(): FigmaRestTokenInfo | null {
		return this.figmaRestToken;
	}

	updateRateLimit(remaining: number, limit: number, resetAt: number): void {
		if (this.figmaRestToken) {
			this.figmaRestToken.rateLimit = { remaining, limit, resetAt };
			// Broadcast updated rate limit to all connected plugins
			for (const client of this.clients.values()) {
				if (client.ws.readyState === 1) {
					try {
						client.ws.send(JSON.stringify({ type: "tokenStatus", hasToken: true, rateLimit: { remaining, limit, resetAt } }));
					} catch { /* ignore */ }
				}
			}
		}
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
