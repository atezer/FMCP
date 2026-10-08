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

import { WebSocketServer, type WebSocket } from "ws";
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
/** Explicit WebSocket payload cap (ws default is 100 MiB; batch PNG exports can be large). */
const MAX_WS_PAYLOAD_BYTES = 100 * 1024 * 1024;

/**
 * v1.10.0: Which WebSocket/HTTP origins may talk to the bridge.
 * - undefined: non-browser clients (sibling bridges, Node tools)
 * - "null": sandboxed iframes — the Figma plugin UI sends exactly this (verified live)
 * - https://*.figma.com: in case Figma ever serves plugin UIs from its own origin
 * Any other browser origin (a regular web page) is rejected, unless
 * FMCP_BRIDGE_ALLOW_ANY_ORIGIN=1 is set as an escape hatch.
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
	if (process.env.FMCP_BRIDGE_ALLOW_ANY_ORIGIN === "1") return true;
	if (origin === undefined || origin === "" || origin === "null") return true;
	return /^https:\/\/([a-z0-9-]+\.)*figma\.com$/i.test(origin);
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
	pluginVersion: string | null; // v1.8.0+: reported in "ready" handshake
	alive: boolean;
	missedHeartbeats: number;
	connectedAt: number;
}

export interface ConnectedFileInfo {
	clientId: string;
	fileKey: string | null;
	fileName: string | null;
	pluginVersion: string | null; // v1.8.0+: reported in handshake; null for older plugins
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
	private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
	private auditLogPath: string | undefined;
	private clientIdCounter = 0;

	/** v1.9.1+ Sibling bridge discovery state — cached list of active fmcp ports. */
	private knownSiblings: number[] = [];
	private siblingProbeInterval: ReturnType<typeof setInterval> | null = null;

	/** Figma REST API token (in-memory only, never written to disk). */
	private figmaRestToken: FigmaRestTokenInfo | null = null;

	/** AI client name detected from parent process (Claude, Cursor, etc.) */
	private clientName: string;

	/** User/config preferred port (before clamp and fallback). */
	private readonly preferredPort: number;

	constructor(port: number, options?: { auditLogPath?: string }) {
		const clamped = Math.max(MIN_PORT, Math.min(MAX_PORT, port));
		this.preferredPort = clamped;
		this.port = clamped;
		this.auditLogPath = options?.auditLogPath;
		this.clientName = this.detectClientNameSync();
	}

	/** Detect AI client name from env vars (instant, no I/O). */
	private detectClientNameSync(): string {
		if (process.env.FIGMA_MCP_CLIENT_NAME)
			return process.env.FIGMA_MCP_CLIENT_NAME;
		if (process.env.CLAUDECODE === "1") return "Claude Code";
		if (process.env.CURSOR_TRACE_ID) return "Cursor";
		return "MCP";
	}

	/** Async detection via process tree walk — updates clientName in background. */
	private detectClientNameAsync(): void {
		if (this.clientName !== "MCP") return; // Already detected via env
		try {
			let pid = process.ppid;
			for (let i = 0; i < 5 && pid > 1; i++) {
				const line = execSync(`ps -p ${pid} -o ppid=,comm=`, { timeout: 1000 })
					.toString()
					.trim();
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
		} catch {
			/* ignore */
		}
	}
	private port: number;

	/** Last error message when bridge could not bind (port conflict, etc.) */
	private startError: string | null = null;

	/**
	 * v1.10.0: Bumped by stop(). Async bind/retry chains capture it and abandon
	 * themselves when it changes, so a restart can't race an older chain.
	 */
	private generation = 0;
	private retryTimers = new Set<ReturnType<typeof setTimeout>>();
	private relocateTimer: ReturnType<typeof setTimeout> | null = null;
	/** When the connected-client count last changed (for /status idleSeconds). */
	private lastClientChangeAt = Date.now();

	/** setTimeout tracked for cancellation by stop(). */
	private later(fn: () => void, ms: number): void {
		const t = setTimeout(() => {
			this.retryTimers.delete(t);
			fn();
		}, ms);
		this.retryTimers.add(t);
	}

	start(): void {
		if (this.wss) {
			logger.debug({ port: this.port }, "Plugin bridge server already running");
			return;
		}
		this.startError = null;
		this.detectClientNameAsync();
		this.tryListenWithAutoIncrement(this.preferredPort);
	}

	/** Get last startup error (null if running fine). */
	getStartError(): string | null {
		return this.startError;
	}

	/** Stop current WebSocket server (if any) and restart on a new port. Returns when binding resolves or fails. Token is preserved across restart. */
	async restart(
		newPort: number,
	): Promise<{ success: boolean; port: number; error?: string }> {
		const clamped = Math.max(MIN_PORT, Math.min(MAX_PORT, newPort));
		const savedToken = this.figmaRestToken; // Preserve token across restart
		this.stop();
		this.figmaRestToken = savedToken; // Restore after stop()
		this.startError = null;
		return this.tryListenAsync(clamped);
	}

	/** Async listen attempt — resolves when port binds successfully or all ports exhausted. */
	private tryListenAsync(
		port: number,
	): Promise<{ success: boolean; port: number; error?: string }> {
		return new Promise((resolve) => {
			// 30s timeout covers worst case: 17 ports × ~2s probe each
			const TIMEOUT_MS = 30000;
			const timer = setTimeout(() => {
				this._listenResolve = null;
				resolve({
					success: false,
					port,
					error: this.startError || `Port bind timeout (${TIMEOUT_MS}ms)`,
				});
			}, TIMEOUT_MS);

			// Store callback so tryListenWithAutoIncrement/setupBridgeOnServer can notify us
			this._listenResolve = (success: boolean) => {
				clearTimeout(timer);
				if (success) {
					resolve({ success: true, port: this.port });
				} else {
					resolve({
						success: false,
						port,
						error: this.startError || "Port bind failed",
					});
				}
			};

			this.tryListenWithAutoIncrement(port);
		});
	}

	/** Internal resolve callback for async listen flow. */
	private _listenResolve: ((success: boolean) => void) | null = null;

	/** Currently listening port (or preferred port if not yet listening). */
	getPort(): number {
		return this.port;
	}

	/** User/config preferred port before auto-increment fallback. */
	getPreferredPort(): number {
		return this.preferredPort;
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

	/**
	 * v1.10.0: strict — when a fileKey is given, only that file's client is returned.
	 * The old fallback to the most recent client could send writes to the wrong file.
	 */
	private resolveClient(fileKey?: string): ClientInfo | undefined {
		if (fileKey) {
			return this.findClientByFileKey(fileKey);
		}
		return this.getDefaultClient();
	}

	/**
	 * v1.10.0: For mutating tools without an explicit target. Returns an error
	 * message when more than one distinct file is connected (ambiguous target),
	 * otherwise null. Disable with FMCP_REQUIRE_TARGET=0.
	 */
	getAmbiguousTargetError(): string | null {
		if (process.env.FMCP_REQUIRE_TARGET === "0") return null;
		// Only identified files count — a client still in handshake (no fileKey yet) is not ambiguity
		const files = this.listConnectedFiles().filter((f) => !!f.fileKey);
		const distinct = new Set(files.map((f) => f.fileKey));
		if (distinct.size <= 1) return null;
		const list = files
			.map((f) => `"${f.fileName || "?"}" (fileKey: ${f.fileKey || "?"})`)
			.join(", ");
		return (
			`Birden fazla Figma dosyası bağlı; hangi dosyaya yazılacağı belirsiz. ` +
			`Bağlı dosyalar: ${list}. Aracı fileKey (veya figmaUrl) parametresiyle tekrar çağır.`
		);
	}

	/**
	 * Wait for a client to become ready (fileKey populated via "ready" message).
	 * Polls at 200ms intervals. Used to handle the race between plugin connection
	 * and the first incoming MCP request.
	 */
	async waitForClient(
		fileKey?: string,
		timeoutMs: number = 2000,
	): Promise<ClientInfo | undefined> {
		const deadline = Date.now() + timeoutMs;
		while (Date.now() < deadline) {
			const client = this.resolveClient(fileKey);
			if (client && client.ws.readyState === 1) {
				if (!fileKey || client.fileKey === fileKey) return client;
			}
			await new Promise((r) => setTimeout(r, 200));
		}
		return this.resolveClient(fileKey);
	}

	private removeClient(clientId: string, reason: string): void {
		const info = this.clients.get(clientId);
		if (!info) return;
		this.clients.delete(clientId);
		this.lastClientChangeAt = Date.now();
		this.rejectPendingForClient(clientId, reason);
		auditPlugin(this.auditLogPath, "plugin_disconnect");
		logger.info(
			{ clientId, fileKey: info.fileKey, fileName: info.fileName },
			"Plugin bridge: client disconnected (%s)",
			reason,
		);
	}

	/**
	 * Probe a port via HTTP to determine if a live F-MCP bridge is already
	 * running or if the port is held by a stale/dead process.
	 * Returns "fmcp" | "other" | "dead".
	 */
	private probePort(
		port: number,
		host: string,
	): Promise<"fmcp" | "other" | "dead"> {
		return new Promise((resolve) => {
			const req = httpGet(
				{ hostname: host, port, path: "/", timeout: 2000 },
				(res) => {
					let body = "";
					res.on("data", (chunk: Buffer | string) => {
						body += chunk;
					});
					res.on("end", () => {
						resolve(body.includes("F-MCP") ? "fmcp" : "other");
					});
				},
			);
			req.on("error", () => resolve("dead"));
			req.on("timeout", () => {
				req.destroy();
				resolve("dead");
			});
		});
	}

	/**
	 * Probe a live F-MCP bridge's /status endpoint to get its health info.
	 * Returns { clients, uptime } or { -1, -1 } if the endpoint is unavailable
	 * (e.g. older bridge version without /status).
	 */
	private probeStatus(
		port: number,
		host: string,
	): Promise<{ clients: number; uptime: number; idleSeconds?: number }> {
		return new Promise((resolve) => {
			const req = httpGet(
				{ hostname: host, port, path: "/status", timeout: 1000 },
				(res) => {
					let body = "";
					res.on("data", (chunk: Buffer | string) => {
						body += chunk;
					});
					res.on("end", () => {
						try {
							const data = JSON.parse(body);
							resolve({
								clients: typeof data.clients === "number" ? data.clients : -1,
								uptime: typeof data.uptime === "number" ? data.uptime : -1,
								// v1.10.0+ bridges report idle time; older ones don't (undefined → fall back to uptime)
								idleSeconds:
									typeof data.idleSeconds === "number"
										? data.idleSeconds
										: undefined,
							});
						} catch {
							resolve({ clients: -1, uptime: -1 });
						}
					});
				},
			);
			req.on("error", () => resolve({ clients: -1, uptime: -1 }));
			req.on("timeout", () => {
				req.destroy();
				resolve({ clients: -1, uptime: -1 });
			});
		});
	}

	/**
	 * v1.9.1+ Probe all sibling bridges in range (5454-5470) and return active fmcp ports.
	 * Parallel probe, ~2-3s worst case. Errors are swallowed (silent — port inactive).
	 * Node.js network errors stay in server stdout, NEVER leak to plugin browser DevTools.
	 */
	private async probeSiblingBridges(): Promise<number[]> {
		const discovered: number[] = [];
		const host = "127.0.0.1";
		const probes: Promise<void>[] = [];
		for (let p = MIN_PORT; p <= MAX_PORT; p++) {
			if (p === this.port) continue;
			probes.push(
				(async () => {
					try {
						const kind = await this.probePort(p, host);
						if (kind !== "fmcp") return;
						const status = await this.probeStatus(p, host);
						if (status.uptime >= 0) discovered.push(p);
					} catch {
						/* silent */
					}
				})(),
			);
		}
		await Promise.all(probes);
		return discovered.sort((a, b) => a - b);
	}

	/**
	 * v1.9.1+ Broadcast activeBridges update to all connected plugin clients.
	 * Used when periodic probe detects a new sibling (or one disappears).
	 */
	private broadcastSiblingUpdate(): void {
		const msg = JSON.stringify({
			type: "activeBridgesUpdate",
			activeBridges: this.knownSiblings,
		});
		for (const client of this.clients.values()) {
			if (client.ws.readyState === 1) {
				try {
					client.ws.send(msg);
				} catch {
					/* ignore */
				}
			}
		}
	}

	/**
	 * Send a POST /shutdown to an old F-MCP bridge. Calls onAccepted if the bridge
	 * responds with 200, or onRefused otherwise. On error/timeout, assumes the bridge
	 * may have already exited and calls onAccepted.
	 */
	private sendShutdownRequest(
		port: number,
		host: string,
		onAccepted: () => void,
		onRefused: () => void,
	): void {
		console.error(
			`   Sending shutdown request to old F-MCP bridge on port ${port}…\n`,
		);
		const req = httpRequest(
			{
				hostname: host,
				port,
				path: "/shutdown",
				method: "POST",
				timeout: 3000,
			},
			(res) => {
				let body = "";
				res.on("data", (chunk: Buffer | string) => {
					body += chunk;
				});
				res.on("end", () => {
					if (res.statusCode === 200) {
						console.error(
							`   Old bridge accepted shutdown. Retaking port ${port} in ${SHUTDOWN_TAKEOVER_DELAY_MS}ms…\n`,
						);
						onAccepted();
					} else {
						console.error(
							`\n⚠️  Old bridge refused shutdown (status ${res.statusCode}). Trying next port…\n`,
						);
						logger.warn(
							{ port, statusCode: res.statusCode },
							"Old bridge refused shutdown",
						);
						onRefused();
					}
				});
			},
		);
		req.on("error", () => {
			// Old bridge unreachable — might have already exited
			console.error(
				`   Old bridge unreachable after shutdown request. Retrying port ${port}…\n`,
			);
			onAccepted();
		});
		req.on("timeout", () => {
			req.destroy();
			console.error(`   Shutdown request timed out. Retrying port ${port}…\n`);
			onAccepted();
		});
		req.end();
	}

	// ──────────────────────────────────────────────────────────────────────
	// HTTP server factory (used by tryListenWithAutoIncrement)
	// ──────────────────────────────────────────────────────────────────────

	/** Create an HTTP server with /shutdown, /status, and default F-MCP marker endpoints. */
	private createBridgeHttpServer(): ReturnType<typeof createServer> {
		return createServer((req, res) => {
			// Graceful shutdown endpoint: a new bridge instance requests this old one to exit.
			// v1.10.0: browsers always attach an Origin header to cross-site POSTs; sibling
			// bridges (Node http) never do — so any request with an Origin is a web page. Reject it.
			if (req.method === "POST" && req.url === "/shutdown") {
				if (
					req.headers.origin !== undefined ||
					req.headers["sec-fetch-site"] !== undefined
				) {
					logger.warn(
						{ origin: req.headers.origin },
						"Rejected /shutdown from a browser origin",
					);
					res.writeHead(403, { "Content-Type": "text/plain" });
					res.end("forbidden\n");
					return;
				}
				res.writeHead(200, { "Content-Type": "text/plain" });
				res.end("shutting down\n");
				logger.info(
					"Received /shutdown request from new bridge instance — stopping gracefully",
				);
				console.error(
					"\n⚠️  Received shutdown request from new F-MCP bridge instance. Stopping…\n",
				);
				setTimeout(() => {
					this.stop();
					// v1.10.0: don't stay a bridge-less zombie — this MCP session is still alive,
					// so rebind on another free port once the new instance owns ours.
					this.relocateTimer = setTimeout(() => {
						this.relocateTimer = null;
						if (!this.wss) this.start();
					}, SHUTDOWN_TAKEOVER_DELAY_MS + 1500);
				}, 500);
				return;
			}
			// Health check endpoint — used by new instances to decide coexistence vs takeover
			if (req.method === "GET" && req.url === "/status") {
				const clients = this.connectedClientCount();
				const body = JSON.stringify({
					clients,
					uptime: Math.round(process.uptime()),
					// v1.10.0: seconds with zero clients (0 while any client is connected) —
					// takeover decisions use this instead of process uptime
					idleSeconds:
						clients > 0
							? 0
							: Math.round((Date.now() - this.lastClientChangeAt) / 1000),
					version: FMCP_VERSION,
				});
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(body);
				return;
			}
			// Default F-MCP marker (used by probePort to detect F-MCP bridges)
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("F-MCP ATezer Bridge (connect via WebSocket)\n");
		});
	}

	/**
	 * Set up WebSocket server, heartbeat, client handling on a successfully bound HTTP server.
	 * Called from both tryListenFixed and tryListenWithAutoIncrement on bind success.
	 */
	private setupBridgeOnServer(
		server: ReturnType<typeof createServer>,
		port: number,
		bindHost: string,
	): void {
		// v1.10.0: a second chain must never overwrite a live server (would orphan its heartbeat)
		if (this.wss) {
			logger.warn(
				{ port },
				"Plugin bridge: already listening — closing duplicate server",
			);
			try {
				server.close();
			} catch {
				/* ignore */
			}
			return;
		}
		this.port = port;
		process.env.FIGMA_PLUGIN_BRIDGE_PORT = String(port);
		process.env.FIGMA_MCP_BRIDGE_PORT = String(port);
		console.error(`F-MCP bridge listening on ws://${bindHost}:${port}\n`);
		if (bindHost === "0.0.0.0") {
			logger.warn(
				"FIGMA_BRIDGE_HOST=0.0.0.0 — the bridge is reachable from the local network",
			);
			console.error(
				"⚠️  FIGMA_BRIDGE_HOST=0.0.0.0: bridge is reachable from the local network.\n",
			);
		}
		this.httpServer = server;
		this.wss = new WebSocketServer({
			server,
			maxPayload: MAX_WS_PAYLOAD_BYTES,
			// v1.10.0: only the Figma plugin ("null" origin) and non-browser clients may connect
			verifyClient: (info: {
				origin?: string;
				req: { headers: Record<string, string | string[] | undefined> };
			}) => {
				const origin = info.req.headers.origin as string | undefined;
				if (isAllowedOrigin(origin)) return true;
				logger.warn(
					{ origin },
					"Plugin bridge: rejected WebSocket from disallowed origin",
				);
				return false;
			},
		});

		this.wss.on("connection", (ws: WebSocket) => {
			const clientId = this.generateClientId();
			this.lastClientChangeAt = Date.now();
			const clientInfo: ClientInfo = {
				ws,
				clientId,
				fileKey: null,
				fileName: null,
				pluginVersion: null,
				alive: true,
				missedHeartbeats: 0,
				connectedAt: Date.now(),
			};
			this.clients.set(clientId, clientInfo);
			let handshakeDone = false;
			logger.info(
				{ port: this.port, clientId, totalClients: this.clients.size },
				"Plugin bridge: new plugin connected",
			);
			auditPlugin(this.auditLogPath, "plugin_connect");

			ws.on("message", (data: Buffer | string) => {
				clientInfo.alive = true;
				try {
					const msg = JSON.parse(data.toString()) as BridgeResponse & {
						type?: string;
						fileKey?: string;
						fileName?: string;
						pluginVersion?: string;
					};

					if (msg.type === "ready") {
						const incomingFileKey = msg.fileKey || null;
						const incomingFileName = msg.fileName || null;
						const incomingPluginVersion = msg.pluginVersion || null;

						if (incomingFileKey) {
							const existing = this.findClientByFileKey(incomingFileKey);
							if (existing && existing.clientId !== clientId) {
								logger.info(
									{
										oldClientId: existing.clientId,
										newClientId: clientId,
										fileKey: incomingFileKey,
									},
									"Plugin bridge: replacing existing client for same fileKey",
								);
								this.removeClient(
									existing.clientId,
									"Replaced by new connection for same file",
								);
								try {
									existing.ws.close();
								} catch {
									/* ignore */
								}
							}
						}

						clientInfo.fileKey = incomingFileKey;
						clientInfo.fileName = incomingFileName;
						clientInfo.pluginVersion = incomingPluginVersion;
						handshakeDone = true;
						logger.info(
							{
								clientId,
								fileKey: incomingFileKey,
								fileName: incomingFileName,
								pluginVersion: incomingPluginVersion,
							},
							"Plugin bridge: client registered (fileKey=%s, fileName=%s, pluginVersion=%s)",
							incomingFileKey,
							incomingFileName,
							incomingPluginVersion ?? "unknown",
						);

						ws.send(
							JSON.stringify({
								type: "welcome",
								bridgeVersion: FMCP_VERSION,
								port: this.port,
								clientId,
								multiClient: true,
								clientName: this.clientName,
								activeBridges: this.knownSiblings, // v1.9.1+ — cache'ten, 0ms overhead
							}),
						);
						return;
					}

					if (msg.type === "pong" || msg.type === "keepalive") {
						return;
					}

					// v1.10.0: token changes only from a client that completed the "ready" handshake
					if (
						(msg.type === "setToken" || msg.type === "clearToken") &&
						!handshakeDone
					) {
						logger.warn(
							{ clientId, type: msg.type },
							"Plugin bridge: ignored token message from unregistered client",
						);
						return;
					}

					if (
						msg.type === "setToken" &&
						typeof (msg as unknown as Record<string, unknown>).token ===
							"string"
					) {
						const token = (msg as unknown as Record<string, unknown>)
							.token as string;
						if (token) {
							this.setFigmaRestToken(token);
							logger.info(
								{ clientId },
								"Plugin bridge: REST API token set via plugin UI",
							);
						}
						return;
					}

					if (msg.type === "clearToken") {
						this.clearFigmaRestToken();
						logger.info(
							{ clientId },
							"Plugin bridge: REST API token cleared via plugin UI",
						);
						return;
					}

					if (msg.id && this.pending.has(msg.id)) {
						const p = this.pending.get(msg.id)!;
						// v1.10.0: only the client the request was sent to may answer it
						if (p.clientId !== clientId) {
							logger.warn(
								{ clientId, expected: p.clientId, method: p.method },
								"Plugin bridge: ignored response from a different client",
							);
							return;
						}
						this.pending.delete(msg.id);
						clearTimeout(p.timeout);
						const durationMs = Date.now() - p.startTime;
						if (msg.error) {
							auditTool(
								this.auditLogPath,
								p.method,
								false,
								msg.error,
								durationMs,
							);
							p.reject(new Error(msg.error));
						} else {
							if (msg.result === undefined) {
								logger.warn(
									{ method: p.method, msgId: msg.id },
									"Plugin bridge: response has no result and no error",
								);
							}
							auditTool(
								this.auditLogPath,
								p.method,
								true,
								undefined,
								durationMs,
							);
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

		logger.info(
			{ port: this.port, host: bindHost },
			"Plugin bridge server listening (ws://%s:%s) — multi-client enabled",
			bindHost,
			this.port,
		);

		// Notify async restart() / tryListenAsync() that binding succeeded
		this._listenResolve?.(true);
		this._listenResolve = null;

		// v1.9.1+ Sibling bridge discovery — initial probe (background, non-blocking)
		void (async () => {
			try {
				this.knownSiblings = await this.probeSiblingBridges();
				if (this.knownSiblings.length > 0) {
					logger.info(
						{ siblings: this.knownSiblings },
						"Plugin bridge: sibling fmcp bridges discovered",
					);
					this.broadcastSiblingUpdate();
				}
			} catch {
				/* silent */
			}
		})();

		// v1.9.1+ Periodic re-probe (30s) — detect new/disappeared siblings
		if (!this.siblingProbeInterval) {
			this.siblingProbeInterval = setInterval(() => {
				void (async () => {
					try {
						const fresh = await this.probeSiblingBridges();
						const changed =
							JSON.stringify(fresh) !== JSON.stringify(this.knownSiblings);
						if (changed) {
							this.knownSiblings = fresh;
							logger.info(
								{ siblings: fresh },
								"Plugin bridge: sibling list updated",
							);
							this.broadcastSiblingUpdate();
						}
					} catch {
						/* silent */
					}
				})();
			}, 30000);
		}

		const heartbeat = () => {
			for (const [cId, info] of this.clients) {
				if (info.ws.readyState !== 1) {
					this.removeClient(cId, "WebSocket not open");
					continue;
				}
				if (!info.alive) {
					info.missedHeartbeats++;
					if (info.missedHeartbeats >= 3) {
						logger.warn(
							{ clientId: cId, fileKey: info.fileKey },
							"Plugin bridge: client not responding to heartbeat, terminating",
						);
						try {
							info.ws.terminate();
						} catch {
							/* ignore */
						}
						this.removeClient(cId, "Heartbeat timeout");
						continue;
					}
				} else {
					info.missedHeartbeats = 0;
					info.alive = false;
				}
				try {
					info.ws.send(JSON.stringify({ type: "ping" }));
				} catch {
					/* ignore */
				}
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
	private tryListenWithAutoIncrement(
		port: number,
		gen: number = this.generation,
	): void {
		// v1.10.0: abandon chains started before the last stop()/restart()
		if (gen !== this.generation) return;
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
		const next = () => this.tryListenWithAutoIncrement(port + 1, gen);

		/** Bind `srv` on this port; on EADDRINUSE call onBusy, on other errors fail the start. */
		const listenOn = (
			srv: ReturnType<typeof createServer>,
			onBusy: () => void,
		) => {
			srv.on("error", (err: NodeJS.ErrnoException) => {
				if (err.code === "EADDRINUSE") {
					srv.close();
					onBusy();
					return;
				}
				// v1.10.0: EACCES etc. used to leave callers waiting for the 30s timeout
				logger.error({ err, port }, "Plugin bridge server error");
				this.startError = `Port ${port} bind failed: ${err.code ?? err.message}`;
				this._listenResolve?.(false);
				this._listenResolve = null;
			});
			srv.listen(port, bindHost, () => {
				if (gen !== this.generation) {
					srv.close();
					return;
				}
				this.setupBridgeOnServer(srv, port, bindHost);
			});
		};

		const server = this.createBridgeHttpServer();
		listenOn(server, () => {
			const probeHost = bindHost === "0.0.0.0" ? "127.0.0.1" : bindHost;

			this.probePort(port, probeHost)
				.then(async (status) => {
					if (gen !== this.generation) return;
					if (status === "fmcp") {
						// F-MCP bridge detected — check health
						const { clients, uptime, idleSeconds } = await this.probeStatus(
							port,
							probeHost,
						);
						if (gen !== this.generation) return;
						// v1.10.0+: idle time (since last client left) instead of process uptime, so a live
						// session whose plugin just reconnected isn't treated as stale. Older bridges: uptime.
						const idle = idleSeconds ?? uptime;

						if (clients > 0) {
							// HEALTHY bridge with active clients — coexist, skip to next port
							logger.info(
								{ port, clients },
								"Port %d: healthy F-MCP bridge (%d clients), skipping to next port",
								port,
								clients,
							);
							console.error(
								`   Port ${port}: healthy bridge (${clients} client(s)), trying ${port + 1}…\n`,
							);
							next();
						} else if (
							clients === 0 &&
							idle >= 0 &&
							idle < FRESH_BRIDGE_UPTIME_THRESHOLD_S
						) {
							// Fresh / briefly idle bridge (no clients yet) — skip, don't takeover
							logger.info(
								{ port, idle },
								"Port %d: F-MCP bridge idle only %ds, skipping to next port",
								port,
								idle,
							);
							console.error(
								`   Port ${port}: recently active bridge (${idle}s idle), trying ${port + 1}…\n`,
							);
							next();
						} else if (
							clients === 0 &&
							idle >= FRESH_BRIDGE_UPTIME_THRESHOLD_S
						) {
							// STALE bridge (0 clients for ≥ 30s) — takeover
							logger.info(
								{ port, idle },
								"Port %d: stale F-MCP bridge (0 clients, %ds idle), requesting shutdown",
								port,
								idle,
							);
							console.error(
								`\n⚠️  Port ${port}: stale bridge (0 clients, ${idle}s idle). Requesting shutdown…\n`,
							);
							this.sendShutdownRequest(
								port,
								probeHost,
								() => {
									// Shutdown accepted — retry same port after delay; still busy → next port
									this.later(() => {
										if (gen !== this.generation) return;
										listenOn(this.createBridgeHttpServer(), () => {
											logger.warn(
												{ port },
												"Port %d still busy after takeover, trying next",
												port,
											);
											next();
										});
									}, SHUTDOWN_TAKEOVER_DELAY_MS);
								},
								() => next(), // Shutdown refused — move to next port
							);
						} else {
							// Unknown health (old bridge version without /status, or probe failed)
							// Safe choice: skip, don't kill
							logger.info(
								{ port, clients, uptime },
								"Port %d: F-MCP bridge with unknown health (clients=%d, uptime=%d), skipping",
								port,
								clients,
								uptime,
							);
							console.error(
								`   Port ${port}: F-MCP bridge (unknown health), trying ${port + 1}…\n`,
							);
							next();
						}
					} else if (status === "dead") {
						// Port held by stale/unresponsive process — retry after delay; still busy → next port
						console.error(
							`\n⚠️  Port ${port} is busy but not responding. Retrying in ${STALE_PORT_RETRY_DELAY_MS}ms…\n`,
						);
						this.later(() => {
							if (gen !== this.generation) return;
							listenOn(this.createBridgeHttpServer(), next);
						}, STALE_PORT_RETRY_DELAY_MS);
					} else {
						// Non-F-MCP service — skip to next port
						logger.info(
							{ port },
							"Port %d occupied by non-F-MCP service, skipping",
							port,
						);
						console.error(
							`   Port ${port}: non-F-MCP service, trying ${port + 1}…\n`,
						);
						next();
					}
				})
				.catch(() => {
					// Probe failed — skip to next port
					next();
				});
		});
	}

	// ──────────────────────────────────────────────────────────────────────
	/**
	 * Send a request to a plugin and wait for the response.
	 * If fileKey is specified, routes to the client serving that file.
	 * Otherwise routes to the most recently connected client.
	 */
	async request<T = unknown>(
		method: string,
		params?: Record<string, unknown>,
		fileKey?: string,
	): Promise<T> {
		let client = this.resolveClient(fileKey);
		// If no client found, wait briefly for plugin "ready" (race condition: plugin connected but fileKey not yet set)
		if (!client || client.ws.readyState !== 1) {
			client = await this.waitForClient(fileKey, 2000);
		}
		if (!client || client.ws.readyState !== 1) {
			if (fileKey) {
				const available = this.listConnectedFiles();
				const fileList =
					available.length > 0
						? ` Connected files: ${available.map((f) => `${f.fileName || "?"} (${f.fileKey || "?"})`).join(", ")}`
						: "";
				throw new Error(
					`No plugin connected for fileKey "${fileKey}".${fileList} ` +
						"Open the target file in Figma and run the F-MCP ATezer Bridge plugin.",
				);
			}
			throw new Error(
				"F-MCP ATezer Bridge plugin not connected. Open Figma, run the F-MCP ATezer Bridge plugin, and ensure it shows 'Bridge active' (no debug port needed).",
			);
		}

		const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
		const req: BridgeRequest = { id, method, params };

		return new Promise<T>((resolve, reject) => {
			const startTime = Date.now();
			const timeout = setTimeout(() => {
				if (this.pending.delete(id)) {
					auditTool(
						this.auditLogPath,
						method,
						false,
						"timeout",
						Date.now() - startTime,
					);
					reject(
						new Error(
							`Plugin bridge request '${method}' timed out after ${this.requestTimeoutMs}ms`,
						),
					);
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
				auditTool(
					this.auditLogPath,
					method,
					false,
					"send_failed",
					Date.now() - startTime,
				);
				reject(
					new Error(
						`Failed to send request '${method}': ${err instanceof Error ? err.message : String(err)}`,
					),
				);
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
					pluginVersion: client.pluginVersion,
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
				p.reject(
					new Error(`Plugin bridge request '${p.method}' failed: ${reason}`),
				);
				this.pending.delete(id);
			}
		}
	}

	private rejectAllPending(reason: string): void {
		for (const [id, p] of this.pending) {
			clearTimeout(p.timeout);
			const durationMs = Date.now() - p.startTime;
			auditTool(this.auditLogPath, p.method, false, reason, durationMs);
			p.reject(
				new Error(`Plugin bridge request '${p.method}' failed: ${reason}`),
			);
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
					client.ws.send(
						JSON.stringify({ type: "tokenStatus", hasToken: true }),
					);
				} catch {
					/* ignore */
				}
			}
		}
	}

	clearFigmaRestToken(): void {
		this.figmaRestToken = null;
		logger.info("Figma REST API token cleared");
		for (const client of this.clients.values()) {
			if (client.ws.readyState === 1) {
				try {
					client.ws.send(
						JSON.stringify({ type: "tokenStatus", hasToken: false }),
					);
				} catch {
					/* ignore */
				}
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
						client.ws.send(
							JSON.stringify({
								type: "tokenStatus",
								hasToken: true,
								rateLimit: { remaining, limit, resetAt },
							}),
						);
					} catch {
						/* ignore */
					}
				}
			}
		}
	}

	stop(): void {
		// v1.10.0: invalidate in-flight bind/retry chains and their timers
		this.generation++;
		for (const t of this.retryTimers) clearTimeout(t);
		this.retryTimers.clear();
		if (this.relocateTimer) {
			clearTimeout(this.relocateTimer);
			this.relocateTimer = null;
		}
		if (this.heartbeatTimer) {
			clearTimeout(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
		if (this.siblingProbeInterval) {
			clearInterval(this.siblingProbeInterval);
			this.siblingProbeInterval = null;
		}
		this.rejectAllPending("Plugin bridge server stopped");
		for (const client of this.clients.values()) {
			try {
				client.ws.close();
			} catch {
				/* ignore */
			}
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
