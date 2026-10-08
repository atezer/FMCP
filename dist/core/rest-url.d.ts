/**
 * v1.10.0: figma_rest_api URL resolution. The user's Figma token is attached to
 * every request, so a full URL is only accepted when it points at api.figma.com
 * over HTTPS — otherwise a prompt-injected endpoint could exfiltrate the token.
 */
export declare function resolveFigmaRestUrl(endpoint: string): string;
/** Only idempotent methods may be retried after a network error/timeout. */
export declare function isRetryableMethod(method: string | undefined): boolean;
//# sourceMappingURL=rest-url.d.ts.map