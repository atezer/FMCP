/**
 * TTL + LRU cache for read-only MCP tool responses.
 * Prevents redundant WebSocket round-trips during skill chains.
 *
 * v1.10.2: LRU (a hit refreshes recency) and a size budget. Entries are
 * normally the final response text, so a hit needs no re-serialization and
 * the size of each entry is known exactly.
 */

interface CacheEntry {
	data: unknown;
	timestamp: number;
	size: number;
}

const DEFAULT_MAX_ENTRIES = 50;
/** Total budget in UTF-16 code units (~16 MB of memory for ASCII-heavy JSON). */
const DEFAULT_MAX_CHARS = 8 * 1024 * 1024;

function sizeOf(data: unknown): number {
	if (typeof data === "string") return data.length;
	try {
		return JSON.stringify(data)?.length ?? 0;
	} catch {
		return 0;
	}
}

export class ResponseCache {
	private store = new Map<string, CacheEntry>();
	private totalSize = 0;

	constructor(
		private readonly maxEntries = DEFAULT_MAX_ENTRIES,
		private readonly maxChars = DEFAULT_MAX_CHARS,
	) {}

	/** Get cached value if within TTL, otherwise null. A hit marks the entry most recently used. */
	get(key: string, ttlMs: number): unknown | null {
		const entry = this.store.get(key);
		if (!entry) return null;
		if (Date.now() - entry.timestamp > ttlMs) {
			this.remove(key);
			return null;
		}
		// Map preserves insertion order: re-insert to move to the MRU end
		this.store.delete(key);
		this.store.set(key, entry);
		return entry.data;
	}

	/**
	 * Store a value. Evicts least recently used entries until both the entry
	 * count and the size budget fit. A value larger than the whole budget is
	 * not cached.
	 */
	set(key: string, data: unknown): void {
		const size = sizeOf(data);
		this.remove(key);
		if (size > this.maxChars) return;
		while (
			this.store.size > 0 &&
			(this.store.size >= this.maxEntries ||
				this.totalSize + size > this.maxChars)
		) {
			const lruKey = this.store.keys().next().value;
			if (lruKey === undefined) break;
			this.remove(lruKey);
		}
		this.store.set(key, { data, timestamp: Date.now(), size });
		this.totalSize += size;
	}

	/** Invalidate all entries, or only those matching a prefix. */
	invalidate(prefix?: string): void {
		if (!prefix) {
			this.store.clear();
			this.totalSize = 0;
			return;
		}
		for (const key of [...this.store.keys()]) {
			if (key.startsWith(prefix)) this.remove(key);
		}
	}

	/** Current number of cached entries. */
	get size(): number {
		return this.store.size;
	}

	/** Current total size of cached entries (UTF-16 code units). */
	get totalChars(): number {
		return this.totalSize;
	}

	private remove(key: string): void {
		const entry = this.store.get(key);
		if (!entry) return;
		this.totalSize -= entry.size;
		this.store.delete(key);
	}
}
