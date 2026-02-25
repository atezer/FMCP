/**
 * Design System Manifest Types
 *
 * A structured representation of a Figma design system that enables
 * high-fidelity AI-assisted design generation.
 */
export interface ColorToken {
    name: string;
    value: string;
    variableId?: string;
    description?: string;
    scopes?: string[];
}
export interface SpacingToken {
    name: string;
    value: number;
    variableId?: string;
    description?: string;
}
export interface TypographyToken {
    name: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    lineHeight: number | {
        value: number;
        unit: 'PIXELS' | 'PERCENT' | 'AUTO';
    };
    letterSpacing?: number;
    textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE';
    textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
    styleId?: string;
    description?: string;
}
export interface EffectToken {
    name: string;
    type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
    effects: Array<{
        type: string;
        color?: {
            r: number;
            g: number;
            b: number;
            a: number;
        };
        offset?: {
            x: number;
            y: number;
        };
        radius?: number;
        spread?: number;
        visible?: boolean;
    }>;
    styleId?: string;
    description?: string;
}
export interface TokenCollection {
    id: string;
    name: string;
    modes: Array<{
        modeId: string;
        name: string;
    }>;
    defaultModeId: string;
}
export interface ComponentVariant {
    name: string;
    values: string[];
    defaultValue?: string;
}
export interface ComponentProperty {
    name: string;
    type: 'TEXT' | 'BOOLEAN' | 'INSTANCE_SWAP' | 'VARIANT';
    defaultValue?: string | boolean;
    options?: string[];
}
export interface ComponentSpec {
    key: string;
    nodeId: string;
    name: string;
    description?: string;
    variants?: ComponentVariant[];
    properties?: ComponentProperty[];
    defaultSize?: {
        width: number;
        height: number;
    };
    boundVariables?: Record<string, string>;
    usage?: string;
    category?: string;
}
export interface ComponentSet {
    key: string;
    nodeId: string;
    name: string;
    description?: string;
    variants: ComponentSpec[];
    variantAxes: ComponentVariant[];
}
export interface LayoutPattern {
    name: string;
    description: string;
    properties: {
        padding?: string | number;
        gap?: string | number;
        borderRadius?: number;
        background?: string;
        shadow?: string;
        layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
        primaryAxisAlign?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
        counterAxisAlign?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE';
    };
    usage?: string;
}
export interface DesignRule {
    category: 'spacing' | 'color' | 'typography' | 'component' | 'layout';
    rule: string;
    priority: 'required' | 'recommended' | 'optional';
    examples?: string[];
}
export interface DesignSystemManifest {
    version: string;
    generatedAt: number;
    fileKey: string;
    fileName?: string;
    fileUrl?: string;
    collections: TokenCollection[];
    tokens: {
        colors: Record<string, ColorToken>;
        spacing: Record<string, SpacingToken>;
        typography: Record<string, TypographyToken>;
        effects: Record<string, EffectToken>;
        other: Record<string, {
            name: string;
            type: string;
            value: any;
            variableId?: string;
        }>;
    };
    components: Record<string, ComponentSpec>;
    componentSets: Record<string, ComponentSet>;
    patterns: Record<string, LayoutPattern>;
    rules: DesignRule[];
    summary: {
        totalTokens: number;
        totalComponents: number;
        totalComponentSets: number;
        colorPalette: string[];
        spacingScale: number[];
        typographyScale: string[];
        componentCategories: string[];
    };
}
export interface ManifestGenerationOptions {
    includeTokens?: boolean;
    includeComponents?: boolean;
    includeStyles?: boolean;
    includePatterns?: boolean;
    componentCategories?: string[];
    tokenCollections?: string[];
    inferPatterns?: boolean;
    verbose?: boolean;
}
export interface ManifestCacheEntry {
    manifest: DesignSystemManifest;
    timestamp: number;
    fileKey: string;
    rawComponents?: {
        components: any[];
        componentSets: any[];
    };
}
/**
 * Cache for design system manifests with TTL-based invalidation.
 * Singleton pattern to share cache across tool calls.
 */
export declare class DesignSystemManifestCache {
    private static instance;
    private cache;
    private readonly TTL_MS;
    private constructor();
    static getInstance(): DesignSystemManifestCache;
    get(fileKey: string): ManifestCacheEntry | null;
    set(fileKey: string, manifest: DesignSystemManifest, rawComponents?: {
        components: any[];
        componentSets: any[];
    }): void;
    invalidate(fileKey: string): void;
    invalidateAll(): void;
    isValid(entry: ManifestCacheEntry): boolean;
    getStats(): {
        fileKey: string;
        age: number;
        componentCount: number;
        tokenCount: number;
    }[];
}
export interface ComponentSearchResult {
    name: string;
    key: string;
    nodeId: string;
    type: 'component' | 'componentSet';
    description?: string;
    category?: string;
    variantCount?: number;
    defaultSize?: {
        width: number;
        height: number;
    };
}
/**
 * Search components by name, category, or description
 */
export declare function searchComponents(manifest: DesignSystemManifest, query: string, options?: {
    category?: string;
    limit?: number;
    offset?: number;
}): {
    results: ComponentSearchResult[];
    total: number;
    hasMore: boolean;
};
/**
 * Get unique categories from manifest
 */
export declare function getCategories(manifest: DesignSystemManifest): {
    name: string;
    componentCount: number;
    componentSetCount: number;
}[];
/**
 * Get token categories and counts for summary
 */
export declare function getTokenSummary(manifest: DesignSystemManifest): {
    colors: {
        count: number;
        groups: string[];
    };
    spacing: {
        count: number;
        scale: number[];
    };
    typography: {
        count: number;
        groups: string[];
    };
    effects: {
        count: number;
    };
    collections: string[];
};
/**
 * Convert RGB color object to hex string
 */
export declare function rgbToHex(color: {
    r: number;
    g: number;
    b: number;
}): string;
/**
 * Parse a Figma color value to hex
 */
export declare function figmaColorToHex(value: any): string;
/**
 * Generate a human-readable summary of the manifest
 */
export declare function generateManifestSummary(manifest: DesignSystemManifest): string;
/**
 * Create an empty manifest template
 */
export declare function createEmptyManifest(fileKey: string): DesignSystemManifest;
//# sourceMappingURL=design-system-manifest.d.ts.map