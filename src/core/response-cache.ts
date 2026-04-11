/**
 * Simple TTL cache for read-only MCP tool responses.
 * Prevents redundant WebSocket round-trips during skill chains.
 */

interface CacheEntry {
	data: unknown;
	timestamp: number;
}

const MAX_ENTRIES = 50;

export class ResponseCache {
	private store = new Map<string, CacheEntry>();

	/** Get cached value if within TTL, otherwise null. */
	get(key: string, ttlMs: number): unknown | null {
		const entry = this.store.get(key);
		if (!entry) return null;
		if (Date.now() - entry.timestamp > ttlMs) {
			this.store.delete(key);
			return null;
		}
		return entry.data;
	}

	/** Store a value in cache. Evicts oldest entry if at capacity. */
	set(key: string, data: unknown): void {
		if (this.store.size >= MAX_ENTRIES && !this.store.has(key)) {
			const oldestKey = this.store.keys().next().value;
			if (oldestKey !== undefined) this.store.delete(oldestKey);
		}
		this.store.set(key, { data, timestamp: Date.now() });
	}

	/** Invalidate all entries, or only those matching a prefix. */
	invalidate(prefix?: string): void {
		if (!prefix) {
			this.store.clear();
			return;
		}
		for (const key of this.store.keys()) {
			if (key.startsWith(prefix)) this.store.delete(key);
		}
	}

	/** Current number of cached entries. */
	get size(): number {
		return this.store.size;
	}
}
