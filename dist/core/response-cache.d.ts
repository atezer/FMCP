/**
 * TTL + LRU cache for read-only MCP tool responses.
 * Prevents redundant WebSocket round-trips during skill chains.
 *
 * v1.10.2: LRU (a hit refreshes recency) and a size budget. Entries are
 * normally the final response text, so a hit needs no re-serialization and
 * the size of each entry is known exactly.
 */
export declare class ResponseCache {
    private readonly maxEntries;
    private readonly maxChars;
    private store;
    private totalSize;
    constructor(maxEntries?: number, maxChars?: number);
    /** Get cached value if within TTL, otherwise null. A hit marks the entry most recently used. */
    get(key: string, ttlMs: number): unknown | null;
    /**
     * Store a value. Evicts least recently used entries until both the entry
     * count and the size budget fit. A value larger than the whole budget is
     * not cached.
     */
    set(key: string, data: unknown): void;
    /** Invalidate all entries, or only those matching a prefix. */
    invalidate(prefix?: string): void;
    /** Current number of cached entries. */
    get size(): number;
    /** Current total size of cached entries (UTF-16 code units). */
    get totalChars(): number;
    private remove;
}
//# sourceMappingURL=response-cache.d.ts.map