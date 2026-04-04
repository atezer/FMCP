/**
 * Response Guard — Shared response size protection for MCP tools.
 *
 * Prevents AI context window exhaustion by truncating large responses.
 * Used by both plugin-based tools (figma-tools.ts) and REST API tools (local-plugin-only.ts).
 */
export const RESPONSE_SIZE_THRESHOLDS = {
    IDEAL_KB: 100,
    WARNING_KB: 200,
    CRITICAL_KB: 500,
    MAX_KB: 1000,
};
const DEFAULT_TRUNCATE_OPTIONS = {
    maxArrayItems: 50,
    maxStringLength: 500,
    maxObjectDepth: 3,
    maxKB: 200,
};
/** Estimate token count from data (≈1 token per 4 chars of JSON). */
export function estimateTokens(data) {
    const json = typeof data === "string" ? data : JSON.stringify(data);
    return Math.ceil(json.length / 4);
}
/** Calculate KB size of data. */
export function calculateSizeKB(data) {
    const json = typeof data === "string" ? data : JSON.stringify(data);
    return json.length / 1024;
}
/** Deep truncate any JSON value to fit within size limits. */
export function truncateResponse(data, opts) {
    const o = { ...DEFAULT_TRUNCATE_OPTIONS, ...opts };
    const originalJson = JSON.stringify(data);
    const originalSizeKB = originalJson.length / 1024;
    if (originalSizeKB <= o.maxKB) {
        return { data, originalSizeKB, truncatedSizeKB: originalSizeKB, wasTruncated: false, itemsRemoved: 0 };
    }
    let itemsRemoved = 0;
    function truncate(val, depth) {
        if (val === null || val === undefined)
            return val;
        if (typeof val === "string") {
            if (val.length > o.maxStringLength) {
                itemsRemoved++;
                return val.slice(0, o.maxStringLength) + `... (${val.length - o.maxStringLength} chars truncated)`;
            }
            return val;
        }
        if (typeof val === "number" || typeof val === "boolean")
            return val;
        if (depth >= o.maxObjectDepth) {
            itemsRemoved++;
            return typeof val === "object" && val !== null
                ? (Array.isArray(val) ? `[Array: ${val.length} items]` : `[Object: ${Object.keys(val).length} keys]`)
                : val;
        }
        if (Array.isArray(val)) {
            if (val.length > o.maxArrayItems) {
                const sliced = val.slice(0, o.maxArrayItems).map((v) => truncate(v, depth + 1));
                const removed = val.length - o.maxArrayItems;
                itemsRemoved += removed;
                sliced.push({ _truncated: true, _message: `${removed} more items not shown` });
                return sliced;
            }
            return val.map((v) => truncate(v, depth + 1));
        }
        if (typeof val === "object") {
            const obj = val;
            const result = {};
            for (const [key, v] of Object.entries(obj)) {
                result[key] = truncate(v, depth + 1);
            }
            return result;
        }
        return val;
    }
    const truncated = truncate(data, 0);
    const truncatedJson = JSON.stringify(truncated);
    const truncatedSizeKB = truncatedJson.length / 1024;
    // If still too large after first pass, do aggressive array trimming
    if (truncatedSizeKB > o.maxKB * 1.5) {
        const aggressive = truncate(data, 0);
        // Will use smaller limits on second pass if needed
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
export function truncateRestResponse(endpoint, data, maxKB = 200) {
    const originalJson = JSON.stringify(data);
    const originalSizeKB = originalJson.length / 1024;
    if (originalSizeKB <= maxKB) {
        return { data, originalSizeKB, truncatedSizeKB: originalSizeKB, wasTruncated: false, itemsRemoved: 0 };
    }
    const obj = data;
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
        const doc = obj.document;
        if (doc.children && Array.isArray(doc.children)) {
            const total = doc.children.length;
            const kept = 20;
            const trimmedChildren = doc.children.slice(0, kept).map((child) => {
                if (typeof child === "object" && child !== null) {
                    const c = child;
                    // Remove nested children to save space
                    const { children: _, ...rest } = c;
                    return rest;
                }
                return child;
            });
            if (total > kept)
                itemsRemoved = total - kept;
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
