/**
 * HTTP + WebSocket routes for FMCP Cloud Mode (pairing, plugin bridge).
 */
import { corsHeaders, getAllowedCorsOrigin, withCors } from "./cloud-cors.js";
import { clientIp, FMCP_RL_PREFIX, generatePairingCode, generatePairingSecret, PAIRING_TTL_SEC, putPairing, rateLimitAllow, getPairing, } from "./cloud-mode-kv.js";
const PAIRING_HTTP_LIMIT = 20;
const PAIRING_HTTP_WINDOW_SEC = 60;
function json(data, status = 200, request) {
    const headers = { "Content-Type": "application/json" };
    if (request)
        Object.assign(headers, corsHeaders(request));
    return new Response(JSON.stringify(data), { status, headers });
}
function baseUrl(request) {
    const u = new URL(request.url);
    return `${u.protocol}//${u.host}`;
}
export async function handleCloudModeRoutes(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/fmcp-cloud/plugin") {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders(request) });
        }
        if (request.headers.get("Upgrade") !== "websocket") {
            return json({ error: "expected_websocket_upgrade" }, 426, request);
        }
        const code = url.searchParams.get("code")?.trim().toUpperCase();
        const secret = url.searchParams.get("secret");
        if (!code || !secret) {
            return json({ error: "missing_code_or_secret" }, 400, request);
        }
        const pair = await getPairing(env.OAUTH_STATE, code);
        if (!pair || pair.secret !== secret) {
            return json({ error: "invalid_or_expired_pairing" }, 401, request);
        }
        const id = env.FMCP_RELAY.idFromName(`pair:${code}`);
        const res = await env.FMCP_RELAY.get(id).fetch(request);
        return withCors(request, res);
    }
    if (url.pathname === "/fmcp-cloud/pairing") {
        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders(request) });
        }
        if (request.method !== "POST") {
            return json({ error: "method_not_allowed" }, 405, request);
        }
        const token = env.FMCP_PAIRING_TOKEN;
        if (token) {
            const auth = request.headers.get("Authorization");
            const expected = `Bearer ${token}`;
            if (auth !== expected) {
                return json({ error: "unauthorized" }, 401, request);
            }
        }
        const ip = clientIp(request);
        const rlKey = `${FMCP_RL_PREFIX}pair:${ip}`;
        const ok = await rateLimitAllow(env.OAUTH_STATE, rlKey, PAIRING_HTTP_LIMIT, PAIRING_HTTP_WINDOW_SEC);
        if (!ok) {
            return json({ error: "rate_limited" }, 429, request);
        }
        const code = generatePairingCode();
        const secret = generatePairingSecret();
        const record = { secret, createdAt: Date.now() };
        await putPairing(env.OAUTH_STATE, code, record);
        const origin = baseUrl(request);
        const wsProto = url.protocol === "https:" ? "wss:" : "ws:";
        const wsHost = url.host;
        const pluginWsUrl = `${wsProto}//${wsHost}/fmcp-cloud/plugin?code=${encodeURIComponent(code)}&secret=${encodeURIComponent(secret)}`;
        return json({
            ok: true,
            code,
            secret,
            expiresInSeconds: PAIRING_TTL_SEC,
            pluginWebSocketUrl: pluginWsUrl,
            hint: "Paste code and secret into F-MCP plugin Cloud Mode, or share code + secret with your AI to call fmcp_cloud_bind.",
        }, 200, request);
    }
    if (url.pathname === "/fmcp-cloud/health") {
        return json({ ok: true, cloudMode: true }, 200, request);
    }
    return null;
}
/** Merge restrictive CORS onto MCP / SSE responses when Origin matches allowlist. */
export function maybeTightenMcpCors(request, response) {
    const origin = request.headers.get("Origin");
    if (!origin)
        return response;
    const allowed = getAllowedCorsOrigin(request);
    if (!allowed)
        return response;
    const h = new Headers(response.headers);
    h.set("Access-Control-Allow-Origin", allowed);
    if (!h.has("Access-Control-Expose-Headers")) {
        h.set("Access-Control-Expose-Headers", "mcp-session-id");
    }
    return new Response(response.body, { status: response.status, headers: h });
}
