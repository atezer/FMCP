/**
 * FMCP Cloud Mode — per-pairing-code Durable Object.
 * Holds the Figma plugin WebSocket and forwards PluginBridge RPC to the plugin.
 */

import type { Env } from "./browser-manager.js";

type Pending = {
	resolve: (v: unknown) => void;
	reject: (e: Error) => void;
	timeout: ReturnType<typeof setTimeout>;
};

const RPC_TIMEOUT_MS = 120_000;

export class FmcpRelaySession implements DurableObject {
	private pending = new Map<string, Pending>();
	private env!: Env;

	constructor(private ctx: DurableObjectState, env: Env) {
		this.env = env;
	}

	private relayNameFromId(): string {
		return this.ctx.id.toString();
	}

	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "POST" && url.pathname.endsWith("/disconnect")) {
			for (const s of this.ctx.getWebSockets()) {
				try {
					s.close(1000, "disconnect");
				} catch {
					/* ignore */
				}
			}
			return Response.json({ ok: true, closed: true });
		}

		if (request.method === "POST" && url.pathname.endsWith("/rpc")) {
			return this.handleRpc(request);
		}

		if (request.method === "GET" && url.pathname.endsWith("/status")) {
			const sockets = this.ctx.getWebSockets();
			const connected = sockets.length > 0;
			return Response.json({
				ok: true,
				pluginConnected: connected,
				relayId: this.relayNameFromId(),
			});
		}

		if (request.headers.get("Upgrade") !== "websocket") {
			return new Response("Not found", { status: 404 });
		}

		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);
		this.ctx.acceptWebSocket(server);
		return new Response(null, { status: 101, webSocket: client });
	}

	private async handleRpc(request: Request): Promise<Response> {
		let body: { method?: string; params?: Record<string, unknown>; fileKey?: string };
		try {
			body = (await request.json()) as typeof body;
		} catch {
			return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
		}
		const method = body.method;
		if (!method || typeof method !== "string") {
			return Response.json({ ok: false, error: "missing_method" }, { status: 400 });
		}

		const sockets = this.ctx.getWebSockets();
		if (!sockets || sockets.length === 0) {
			return Response.json({ ok: false, error: "plugin_not_connected" }, { status: 503 });
		}
		const ws = sockets[0]!;

		const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
		const payload = JSON.stringify({
			id,
			method,
			params: body.params ?? {},
		});

		try {
			const result = await new Promise<unknown>((resolve, reject) => {
				const timeout = setTimeout(() => {
					this.pending.delete(id);
					reject(new Error(`Plugin bridge request '${method}' timed out after ${RPC_TIMEOUT_MS}ms`));
				}, RPC_TIMEOUT_MS);
				this.pending.set(id, { resolve, reject, timeout });
				ws.send(payload);
			});
			return Response.json({ ok: true, result });
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			return Response.json({ ok: false, error: msg }, { status: 500 });
		}
	}

	async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		const text = typeof message === "string" ? message : new TextDecoder().decode(message);
		let msg: Record<string, unknown>;
		try {
			msg = JSON.parse(text) as Record<string, unknown>;
		} catch {
			return;
		}

		const t = msg.type;
		if (t === "pong" || t === "keepalive") return;

		if (t === "ready") {
			try {
				ws.send(
					JSON.stringify({
						type: "welcome",
						bridgeVersion: "cloud-1.0.0",
						port: 0,
						clientId: `cloud_${Date.now()}`,
						multiClient: false,
					}),
				);
			} catch {
				/* ignore */
			}
			return;
		}

		const mid = msg.id as string | undefined;
		if (mid && this.pending.has(mid)) {
			const p = this.pending.get(mid)!;
			this.pending.delete(mid);
			clearTimeout(p.timeout);
			if (msg.error) {
				p.reject(new Error(String(msg.error)));
			} else {
				p.resolve(msg.result);
			}
		}
	}

	async webSocketClose(_ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
		for (const [rid, p] of this.pending) {
			clearTimeout(p.timeout);
			p.reject(new Error("Plugin disconnected"));
			this.pending.delete(rid);
		}
	}

	async webSocketError(_ws: WebSocket, _error: unknown): Promise<void> {
		for (const [rid, p] of this.pending) {
			clearTimeout(p.timeout);
			p.reject(new Error("Plugin WebSocket error"));
			this.pending.delete(rid);
		}
	}
}
