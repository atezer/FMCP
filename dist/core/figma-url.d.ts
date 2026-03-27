/**
 * Parse Figma and FigJam URLs to extract fileKey and optional nodeId.
 * Used for link-based routing in multi-client scenarios.
 */
export interface ParsedFigmaUrl {
    fileKey: string;
    nodeId?: string;
}
export declare function parseFigmaUrl(url: string): ParsedFigmaUrl | null;
//# sourceMappingURL=figma-url.d.ts.map