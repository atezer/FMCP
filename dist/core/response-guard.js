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
};
/**
 * Plugin-aware size thresholds — significantly tighter than REST limits because
 * Claude chat sessions cannot tolerate single 200 KB+ responses without
 * triggering "conversation too long" errors. Used by truncatePluginResponse.
 */
export const PLUGIN_SIZE_THRESHOLDS = {
    IDEAL_KB: 40,
    WARNING_KB: 80,
    CRITICAL_KB: 160,
    MAX_KB: 250,
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
    function truncate(val, depth, limits) {
        if (val === null || val === undefined)
            return val;
        if (typeof val === "string") {
            if (val.length > limits.maxStringLength) {
                itemsRemoved++;
                return val.slice(0, limits.maxStringLength) + `... (${val.length - limits.maxStringLength} chars truncated)`;
            }
            return val;
        }
        if (typeof val === "number" || typeof val === "boolean")
            return val;
        if (depth >= limits.maxObjectDepth) {
            itemsRemoved++;
            return typeof val === "object" && val !== null
                ? (Array.isArray(val) ? `[Array: ${val.length} items]` : `[Object: ${Object.keys(val).length} keys]`)
                : val;
        }
        if (Array.isArray(val)) {
            if (val.length > limits.maxArrayItems) {
                const sliced = val.slice(0, limits.maxArrayItems).map((v) => truncate(v, depth + 1, limits));
                const removed = val.length - limits.maxArrayItems;
                itemsRemoved += removed;
                sliced.push({ _truncated: true, _message: `${removed} more items not shown` });
                return sliced;
            }
            return val.map((v) => truncate(v, depth + 1, limits));
        }
        if (typeof val === "object") {
            const obj = val;
            const result = {};
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
/**
 * Recursively prune a plugin node payload in-place, reducing detail at the
 * given stage. Higher stages drop more fields:
 *   stage 1: cap children arrays at 5 with _childrenTruncated marker
 *   stage 2: drop effects, boundVariables
 *   stage 3: drop fills, strokes, absoluteBoundingBox
 *   stage 4: keep only id, name, type, children, childCount
 */
function pruneNodeTree(node, stage) {
    if (!node || typeof node !== "object")
        return;
    if (Array.isArray(node.children)) {
        for (const c of node.children)
            pruneNodeTree(c, stage);
        if (stage >= 1 && node.children.length > 5) {
            const removed = node.children.length - 5;
            node.children = node.children.slice(0, 5);
            node._childrenTruncated = removed;
        }
    }
    if (stage >= 2) {
        delete node.effects;
        delete node.boundVariables;
    }
    if (stage >= 3) {
        delete node.fills;
        delete node.strokes;
        delete node.absoluteBoundingBox;
    }
    if (stage >= 4) {
        const keep = new Set(["id", "name", "type", "children", "childCount", "_childrenTruncated"]);
        for (const k of Object.keys(node)) {
            if (!keep.has(k))
                delete node[k];
        }
    }
}
/**
 * Truncate a plugin tool response so it fits within Claude chat's context
 * window. Walks the wrapper envelope ({data: {document|node|...}}) and applies
 * progressive node-tree pruning. Adds a _responseGuard marker when truncated.
 *
 * @param data Raw plugin response (any shape — envelope-aware)
 * @param toolName MCP tool name for telemetry/logging
 * @param opts.maxKB Override the default WARNING_KB threshold
 */
export function truncatePluginResponse(data, toolName, opts) {
    const maxKB = opts?.maxKB ?? PLUGIN_SIZE_THRESHOLDS.WARNING_KB;
    const originalSizeKB = calculateSizeKB(data);
    if (originalSizeKB <= maxKB) {
        return { data, originalSizeKB, truncatedSizeKB: originalSizeKB, wasTruncated: false, itemsRemoved: 0 };
    }
    // Deep clone so we don't mutate the caller's data
    let clone;
    try {
        clone = JSON.parse(JSON.stringify(data));
    }
    catch {
        // Fallback to generic truncation if clone fails (circular refs, BigInt, etc.)
        return truncateResponse(data, { maxKB, maxArrayItems: 10, maxStringLength: 200, maxObjectDepth: 3 });
    }
    // Resolve the root node(s) — envelope-aware
    const cloneObj = clone;
    const dataField = cloneObj.data;
    const candidates = [];
    if (dataField?.document)
        candidates.push(dataField.document);
    if (dataField?.node)
        candidates.push(dataField.node);
    if (cloneObj.document)
        candidates.push(cloneObj.document);
    if (cloneObj.node)
        candidates.push(cloneObj.node);
    if (candidates.length === 0)
        candidates.push(clone);
    // Try progressive stages
    for (let stage = 1; stage <= 4; stage++) {
        for (const root of candidates)
            pruneNodeTree(root, stage);
        const sizeKB = calculateSizeKB(clone);
        if (sizeKB <= maxKB) {
            clone._responseGuard = {
                originalSizeKB: Math.round(originalSizeKB * 10) / 10,
                truncatedSizeKB: Math.round(sizeKB * 10) / 10,
                strategy: `plugin-prune-stage-${stage}`,
                tool: toolName,
            };
            return { data: clone, originalSizeKB, truncatedSizeKB: sizeKB, wasTruncated: true, itemsRemoved: 0 };
        }
    }
    // Final fallback: aggressive generic truncation
    const generic = truncateResponse(clone, { maxKB, maxArrayItems: 10, maxStringLength: 200, maxObjectDepth: 3 });
    if (generic.data && typeof generic.data === "object") {
        generic.data._responseGuard = {
            originalSizeKB: Math.round(originalSizeKB * 10) / 10,
            truncatedSizeKB: Math.round(generic.truncatedSizeKB * 10) / 10,
            strategy: "plugin-prune-fallback-generic",
            tool: toolName,
        };
    }
    return generic;
}
//# sourceMappingURL=response-guard.js.map