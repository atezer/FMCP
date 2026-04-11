/**
 * Simple TTL cache for read-only MCP tool responses.
 * Prevents redundant WebSocket round-trips during skill chains.
 */
export declare class ResponseCache {
    private store;
    /** Get cached value if within TTL, otherwise null. */
    get(key: string, ttlMs: number): unknown | null;
    /** Store a value in cache. Evicts oldest entry if at capacity. */
    set(key: string, data: unknown): void;
    /** Invalidate all entries, or only those matching a prefix. */
    invalidate(prefix?: string): void;
    /** Current number of cached entries. */
    get size(): number;
}
//# sourceMappingURL=response-cache.d.ts.map