/**
 * v1.10.0: figma_rest_api URL resolution. The user's Figma token is attached to
 * every request, so a full URL is only accepted when it points at api.figma.com
 * over HTTPS — otherwise a prompt-injected endpoint could exfiltrate the token.
 */

const FIGMA_API_HOST = "api.figma.com";

export function resolveFigmaRestUrl(endpoint: string): string {
	const raw = endpoint.trim();
	const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw)
		? raw
		: `https://${FIGMA_API_HOST}${raw.startsWith("/") ? "" : "/"}${raw}`;
	let parsed: URL;
	try {
		parsed = new URL(candidate);
	} catch {
		throw new Error(`Invalid REST endpoint "${endpoint}".`);
	}
	if (
		parsed.protocol !== "https:" ||
		parsed.hostname !== FIGMA_API_HOST ||
		parsed.username ||
		parsed.password ||
		parsed.port
	) {
		throw new Error(
			`figma_rest_api only calls https://${FIGMA_API_HOST} (got "${parsed.protocol}//${parsed.host}"). ` +
				"Pass a path like /v1/files/<key> instead of a full URL.",
		);
	}
	return parsed.toString();
}

/** Only idempotent methods may be retried after a network error/timeout. */
export function isRetryableMethod(method: string | undefined): boolean {
	const m = (method || "GET").toUpperCase();
	return m === "GET" || m === "HEAD";
}
