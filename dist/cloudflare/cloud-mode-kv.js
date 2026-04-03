/**
 * Cloud Mode pairing / bind / rate-limit helpers (KV: reuses OAUTH_STATE binding).
 * Key prefixes are reserved to avoid collisions with OAuth state tokens (64+ hex).
 */
export const FMCP_PAIR_PREFIX = "fmcp_pair:";
export const FMCP_BIND_PREFIX = "fmcp_bind:";
export const FMCP_RL_PREFIX = "fmcp_rl:";
export const PAIRING_TTL_SEC = 300;
export const BIND_TTL_SEC = 86400;
export const PAIRING_CODE_LENGTH = 6;
const CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export function generatePairingCode() {
    let out = "";
    const arr = new Uint8Array(PAIRING_CODE_LENGTH);
    crypto.getRandomValues(arr);
    for (let i = 0; i < PAIRING_CODE_LENGTH; i++) {
        out += CODE_CHARS[arr[i] % CODE_CHARS.length];
    }
    return out;
}
export function generatePairingSecret() {
    const a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function putPairing(kv, code, record) {
    await kv.put(`${FMCP_PAIR_PREFIX}${code}`, JSON.stringify(record), {
        expirationTtl: PAIRING_TTL_SEC,
    });
}
export async function getPairing(kv, code) {
    const raw = await kv.get(`${FMCP_PAIR_PREFIX}${code}`, "text");
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export async function deletePairing(kv, code) {
    await kv.delete(`${FMCP_PAIR_PREFIX}${code}`);
}
export async function putBind(kv, mcpSessionId, record) {
    await kv.put(`${FMCP_BIND_PREFIX}${mcpSessionId}`, JSON.stringify(record), {
        expirationTtl: BIND_TTL_SEC,
    });
}
export async function getBind(kv, mcpSessionId) {
    const raw = await kv.get(`${FMCP_BIND_PREFIX}${mcpSessionId}`, "text");
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export async function deleteBind(kv, mcpSessionId) {
    await kv.delete(`${FMCP_BIND_PREFIX}${mcpSessionId}`);
}
export async function rateLimitAllow(kv, key, limit, windowSec) {
    const now = Date.now();
    const raw = await kv.get(key, "text");
    let stamps = [];
    if (raw) {
        try {
            stamps = JSON.parse(raw).t ?? [];
        }
        catch {
            stamps = [];
        }
    }
    const windowMs = windowSec * 1000;
    stamps = stamps.filter((ts) => now - ts < windowMs);
    if (stamps.length >= limit)
        return false;
    stamps.push(now);
    await kv.put(key, JSON.stringify({ t: stamps }), { expirationTtl: Math.max(windowSec * 2, 120) });
    return true;
}
export function clientIp(request) {
    return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || "unknown";
}
