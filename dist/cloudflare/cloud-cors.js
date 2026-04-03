/**
 * CORS allowlist for Cloud Mode + remote MCP (claude.ai, v0, Lovable, etc.).
 */
const DEFAULT_ALLOWED_ORIGINS = [
    "https://claude.ai",
    "https://www.claude.ai",
    "https://v0.dev",
    "https://www.v0.dev",
    "https://lovable.dev",
    "https://www.lovable.dev",
];
export function getAllowedCorsOrigin(request, extra) {
    const origin = request.headers.get("Origin");
    if (!origin)
        return null;
    const set = new Set([...DEFAULT_ALLOWED_ORIGINS, ...(extra ?? [])]);
    return set.has(origin) ? origin : null;
}
export function corsHeaders(request, extraOrigins) {
    const o = getAllowedCorsOrigin(request, extraOrigins);
    const base = {
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, mcp-session-id, Mcp-Protocol-Version, mcp-protocol-version",
        "Access-Control-Expose-Headers": "mcp-session-id",
        "Access-Control-Max-Age": "86400",
    };
    if (o)
        base["Access-Control-Allow-Origin"] = o;
    else
        base["Access-Control-Allow-Origin"] = "*";
    return base;
}
export function withCors(request, response, extraOrigins) {
    const h = new Headers(response.headers);
    const ch = corsHeaders(request, extraOrigins);
    for (const [k, v] of Object.entries(ch)) {
        h.set(k, v);
    }
    return new Response(response.body, { status: response.status, headers: h });
}
