/**
 * FMCP Cloud Mode — per-pairing-code Durable Object.
 * Holds the Figma plugin WebSocket and forwards PluginBridge RPC to the plugin.
 */
import { FMCP_VERSION } from "./core/version.js";
const RPC_TIMEOUT_MS = 120_000;
export class FmcpRelaySession {
    constructor(ctx, env) {
        this.ctx = ctx;
        this.pending = new Map();
        this.env = env;
    }
    relayNameFromId() {
        return this.ctx.id.toString();
    }
    async fetch(request) {
        const url = new URL(request.url);
        if (request.method === "POST" && url.pathname.endsWith("/disconnect")) {
            for (const s of this.ctx.getWebSockets()) {
                try {
                    s.close(1000, "disconnect");
                }
                catch {
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
    async handleRpc(request) {
        let body;
        try {
            body = (await request.json());
        }
        catch {
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
        const ws = sockets[0];
        const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const payload = JSON.stringify({
            id,
            method,
            params: body.params ?? {},
        });
        try {
            const result = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.pending.delete(id);
                    reject(new Error(`Plugin bridge request '${method}' timed out after ${RPC_TIMEOUT_MS}ms`));
                }, RPC_TIMEOUT_MS);
                this.pending.set(id, { resolve, reject, timeout });
                ws.send(payload);
            });
            return Response.json({ ok: true, result });
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            return Response.json({ ok: false, error: msg }, { status: 500 });
        }
    }
    async webSocketMessage(ws, message) {
        const text = typeof message === "string" ? message : new TextDecoder().decode(message);
        let msg;
        try {
            msg = JSON.parse(text);
        }
        catch {
            return;
        }
        const t = msg.type;
        if (t === "pong" || t === "keepalive")
            return;
        if (t === "ready") {
            try {
                ws.send(JSON.stringify({
                    type: "welcome",
                    bridgeVersion: `cloud-${FMCP_VERSION}`,
                    port: 0,
                    clientId: `cloud_${Date.now()}`,
                    multiClient: false,
                }));
            }
            catch {
                /* ignore */
            }
            return;
        }
        const mid = msg.id;
        if (mid && this.pending.has(mid)) {
            const p = this.pending.get(mid);
            this.pending.delete(mid);
            clearTimeout(p.timeout);
            if (msg.error) {
                p.reject(new Error(String(msg.error)));
            }
            else {
                p.resolve(msg.result);
            }
        }
    }
    async webSocketClose(_ws, _code, _reason, _wasClean) {
        for (const [rid, p] of this.pending) {
            clearTimeout(p.timeout);
            p.reject(new Error("Plugin disconnected"));
            this.pending.delete(rid);
        }
    }
    async webSocketError(_ws, _error) {
        for (const [rid, p] of this.pending) {
            clearTimeout(p.timeout);
            p.reject(new Error("Plugin WebSocket error"));
            this.pending.delete(rid);
        }
    }
}
