/**
 * Parse Figma and FigJam URLs to extract fileKey and optional nodeId.
 * Used for link-based routing in multi-client scenarios.
 */
/**
 * Supported URL patterns:
 * - https://www.figma.com/design/<fileKey>/...
 * - https://www.figma.com/board/<fileKey>/... (FigJam)
 * - https://www.figma.com/jam/<fileKey>/...
 * - https://www.figma.com/proto/<fileKey>/...
 * - https://figma.com/... (no www)
 * Query: ?node-id=0-1 or ?node-id=0:1 → nodeId "0:1"
 */
const FIGMA_PATH_REGEX = /^https?:\/\/(www\.)?figma\.com\/(design|board|jam|proto|file)\/([a-zA-Z0-9_-]{10,128})(?:\/|$)/i;
export function parseFigmaUrl(url) {
    if (!url || typeof url !== "string")
        return null;
    const trimmed = url.trim();
    if (!trimmed)
        return null;
    let fileKey = null;
    // Try path-based match: /design/KEY, /board/KEY, /jam/KEY, /proto/KEY, /file/KEY
    const pathMatch = trimmed.match(FIGMA_PATH_REGEX);
    if (pathMatch) {
        fileKey = pathMatch[3];
    }
    // Fallback: some Figma links use /file/KEY or just KEY in path
    if (!fileKey) {
        const fileKeyFromPath = trimmed.match(/figma\.com\/(?:design|board|jam|proto|file)\/([a-zA-Z0-9_-]{10,128})/i);
        if (fileKeyFromPath)
            fileKey = fileKeyFromPath[1];
    }
    if (!fileKey)
        return null;
    let nodeId;
    try {
        const parsed = new URL(trimmed);
        const nodeIdParam = parsed.searchParams.get("node-id");
        if (nodeIdParam) {
            // Figma uses 0-1 or 0:1 format; plugin API expects "0:1"
            nodeId = nodeIdParam.replace(/-/g, ":");
        }
    }
    catch {
        // URL constructor failed, ignore query parsing
    }
    return { fileKey, nodeId };
}
//# sourceMappingURL=figma-url.js.map