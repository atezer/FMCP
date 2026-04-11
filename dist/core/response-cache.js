/**
 * Simple TTL cache for read-only MCP tool responses.
 * Prevents redundant WebSocket round-trips during skill chains.
 */
const MAX_ENTRIES = 50;
export class ResponseCache {
    constructor() {
        this.store = new Map();
    }
    /** Get cached value if within TTL, otherwise null. */
    get(key, ttlMs) {
        const entry = this.store.get(key);
        if (!entry)
            return null;
        if (Date.now() - entry.timestamp > ttlMs) {
            this.store.delete(key);
            return null;
        }
        return entry.data;
    }
    /** Store a value in cache. Evicts oldest entry if at capacity. */
    set(key, data) {
        if (this.store.size >= MAX_ENTRIES && !this.store.has(key)) {
            const oldestKey = this.store.keys().next().value;
            if (oldestKey !== undefined)
                this.store.delete(oldestKey);
        }
        this.store.set(key, { data, timestamp: Date.now() });
    }
    /** Invalidate all entries, or only those matching a prefix. */
    invalidate(prefix) {
        if (!prefix) {
            this.store.clear();
            return;
        }
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix))
                this.store.delete(key);
        }
    }
    /** Current number of cached entries. */
    get size() {
        return this.store.size;
    }
}
//# sourceMappingURL=response-cache.js.map