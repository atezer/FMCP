/**
 * Response Guard — Shared response size protection for MCP tools.
 *
 * Prevents AI context window exhaustion by truncating large responses.
 * Used by local-plugin-only.ts to truncate large responses.
 */
export declare const RESPONSE_SIZE_THRESHOLDS: {
    readonly IDEAL_KB: 100;
    readonly WARNING_KB: 200;
    readonly CRITICAL_KB: 500;
    readonly MAX_KB: 1000;
};
/**
 * Plugin-aware size thresholds — significantly tighter than REST limits because
 * Claude chat sessions cannot tolerate single 200 KB+ responses without
 * triggering "conversation too long" errors. Used by truncatePluginResponse.
 */
export declare const PLUGIN_SIZE_THRESHOLDS: {
    readonly IDEAL_KB: 40;
    readonly WARNING_KB: 80;
    readonly CRITICAL_KB: 160;
    readonly MAX_KB: 250;
};
export interface TruncateOptions {
    maxArrayItems?: number;
    maxStringLength?: number;
    maxObjectDepth?: number;
    maxKB?: number;
}
export interface TruncateResult {
    data: unknown;
    originalSizeKB: number;
    truncatedSizeKB: number;
    wasTruncated: boolean;
    itemsRemoved: number;
}
/** Estimate token count from data (≈1 token per 4 chars of JSON). */
export declare function estimateTokens(data: unknown): number;
/** Calculate KB size of data. */
export declare function calculateSizeKB(data: unknown): number;
/** Deep truncate any JSON value to fit within size limits. */
export declare function truncateResponse(data: unknown, opts?: TruncateOptions): TruncateResult;
/**
 * Endpoint-aware truncation for Figma REST API responses.
 * Applies smarter truncation based on known endpoint patterns.
 */
export declare function truncateRestResponse(endpoint: string, data: unknown, maxKB?: number): TruncateResult;
/**
 * Truncate a plugin tool response so it fits within Claude chat's context
 * window. Walks the wrapper envelope ({data: {document|node|...}}) and applies
 * progressive node-tree pruning. Adds a _responseGuard marker when truncated.
 *
 * @param data Raw plugin response (any shape — envelope-aware)
 * @param toolName MCP tool name for telemetry/logging
 * @param opts.maxKB Override the default WARNING_KB threshold
 */
export declare function truncatePluginResponse(data: unknown, toolName: string, opts?: {
    maxKB?: number;
}): TruncateResult;
//# sourceMappingURL=response-guard.d.ts.map