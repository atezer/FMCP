/**
 * Response Guard — Shared response size protection for MCP tools.
 *
 * Prevents AI context window exhaustion by truncating large responses.
 * Used by local-plugin-only.ts to truncate large responses.
 */

export const RESPONSE_SIZE_THRESHOLDS = {
	IDEAL_KB: 100,
	WARNING_KB: 200,
	CRITICAL_KB: 500,
	MAX_KB: 1000,
} as const;

const DEFAULT_TRUNCATE_OPTIONS = {
	maxArrayItems: 50,
	maxStringLength: 500,
	maxObjectDepth: 3,
	maxKB: 200,
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
export function estimateTokens(data: unknown): number {
	const json = typeof data === "string" ? data : JSON.stringify(data);
	return Math.ceil(json.length / 4);
}

/** Calculate KB size of data. */
export function calculateSizeKB(data: unknown): number {
	const json = typeof data === "string" ? data : JSON.stringify(data);
	return json.length / 1024;
}

/** Deep truncate any JSON value to fit within size limits. */
export function truncateResponse(data: unknown, opts?: TruncateOptions): TruncateResult {
	const o = { ...DEFAULT_TRUNCATE_OPTIONS, ...opts };
	const originalJson = JSON.stringify(data);
	const originalSizeKB = originalJson.length / 1024;

	if (originalSizeKB <= o.maxKB) {
		return { data, originalSizeKB, truncatedSizeKB: originalSizeKB, wasTruncated: false, itemsRemoved: 0 };
	}

	let itemsRemoved = 0;

	function truncate(val: unknown, depth: number, limits: { maxArrayItems: number; maxStringLength: number; maxObjectDepth: number }): unknown {
		if (val === null || val === undefined) return val;
		if (typeof val === "string") {
			if (val.length > limits.maxStringLength) {
				itemsRemoved++;
				return val.slice(0, limits.maxStringLength) + `... (${val.length - limits.maxStringLength} chars truncated)`;
			}
			return val;
		}
		if (typeof val === "number" || typeof val === "boolean") return val;
		if (depth >= limits.maxObjectDepth) {
			itemsRemoved++;
			return typeof val === "object" && val !== null
				? (Array.isArray(val) ? `[Array: ${val.length} items]` : `[Object: ${Object.keys(val as object).length} keys]`)
				: val;
		}
		if (Array.isArray(val)) {
			if (val.length > limits.maxArrayItems) {
				const sliced = val.slice(0, limits.maxArrayItems).map((v) => truncate(v, depth + 1, limits));
				const removed = val.length - limits.maxArrayItems;
				itemsRemoved += removed;
				sliced.push({ _truncated: true, _message: `${removed} more items not shown` } as unknown);
				return sliced;
			}
			return val.map((v) => truncate(v, depth + 1, limits));
		}
		if (typeof val === "object") {
			const obj = val as Record<string, unknown>;
			const result: Record<string, unknown> = {};
			for (const [key, v] of Object.entries(obj)) {
				result[key] = truncate(v, depth + 1, limits);
			}
			return result;
		}
		return val;
	}

	const firstLimits = { maxArrayItems: o.maxArrayItems, maxStringLength: o.maxStringLength, maxObjectDepth: o.maxObjectDepth };
	const truncated = truncate(data, 0, firstLimits);
	const truncatedJson = JSON.stringify(truncated);
	const truncatedSizeKB = truncatedJson.length / 1024;

	// If still too large after first pass, do aggressive truncation with halved limits
	if (truncatedSizeKB > o.maxKB * 1.5) {
		itemsRemoved = 0;
		const aggressiveLimits = {
			maxArrayItems: Math.max(5, Math.floor(o.maxArrayItems / 2)),
			maxStringLength: Math.max(100, Math.floor(o.maxStringLength / 2)),
			maxObjectDepth: Math.max(2, o.maxObjectDepth - 1),
		};
		const aggressive = truncate(data, 0, aggressiveLimits);
		return {
			data: aggressive,
			originalSizeKB,
			truncatedSizeKB: JSON.stringify(aggressive).length / 1024,
			wasTruncated: true,
			itemsRemoved,
		};
	}

	return { data: truncated, originalSizeKB, truncatedSizeKB, wasTruncated: true, itemsRemoved };
}

/**
 * Endpoint-aware truncation for Figma REST API responses.
 * Applies smarter truncation based on known endpoint patterns.
 */
export function truncateRestResponse(endpoint: string, data: unknown, maxKB: number = 200): TruncateResult {
	const originalJson = JSON.stringify(data);
	const originalSizeKB = originalJson.length / 1024;

	if (originalSizeKB <= maxKB) {
		return { data, originalSizeKB, truncatedSizeKB: originalSizeKB, wasTruncated: false, itemsRemoved: 0 };
	}

	const obj = data as Record<string, unknown>;
	let itemsRemoved = 0;

	// /v1/files/:key/comments — keep last 20 comments
	if (endpoint.includes("/comments") && obj.comments && Array.isArray(obj.comments)) {
		const total = obj.comments.length;
		const kept = 20;
		if (total > kept) {
			itemsRemoved = total - kept;
			const trimmed = {
				...obj,
				comments: obj.comments.slice(-kept),
				_truncated: { totalComments: total, showing: kept, message: `Son ${kept} yorum gösteriliyor (toplam ${total})` },
			};
			const sizeKB = JSON.stringify(trimmed).length / 1024;
			return { data: trimmed, originalSizeKB, truncatedSizeKB: sizeKB, wasTruncated: true, itemsRemoved };
		}
	}

	// /v1/files/:key/versions — keep last 10 versions
	if (endpoint.includes("/versions") && obj.versions && Array.isArray(obj.versions)) {
		const total = obj.versions.length;
		const kept = 10;
		if (total > kept) {
			itemsRemoved = total - kept;
			const trimmed = {
				...obj,
				versions: obj.versions.slice(0, kept),
				_truncated: { totalVersions: total, showing: kept, message: `Son ${kept} versiyon gösteriliyor (toplam ${total})` },
			};
			const sizeKB = JSON.stringify(trimmed).length / 1024;
			return { data: trimmed, originalSizeKB, truncatedSizeKB: sizeKB, wasTruncated: true, itemsRemoved };
		}
	}

	// /v1/files/:key — trim document children (pages)
	if (obj.document && typeof obj.document === "object") {
		const doc = obj.document as Record<string, unknown>;
		if (doc.children && Array.isArray(doc.children)) {
			const total = doc.children.length;
			const kept = 20;
			const trimmedChildren = doc.children.slice(0, kept).map((child: unknown) => {
				if (typeof child === "object" && child !== null) {
					const c = child as Record<string, unknown>;
					// Remove nested children to save space
					const { children: _, ...rest } = c;
					return rest;
				}
				return child;
			});
			if (total > kept) itemsRemoved = total - kept;
			const trimmed = {
				...obj,
				document: { ...doc, children: trimmedChildren },
				_truncated: { totalPages: total, showing: Math.min(total, kept), childrenStripped: true },
			};
			const sizeKB = JSON.stringify(trimmed).length / 1024;
			if (sizeKB <= maxKB * 1.5) {
				return { data: trimmed, originalSizeKB, truncatedSizeKB: sizeKB, wasTruncated: true, itemsRemoved };
			}
		}
	}

	// Fallback: generic truncation
	return truncateResponse(data, { maxKB, maxArrayItems: 20, maxStringLength: 300, maxObjectDepth: 3 });
}
