/**
 * Design System Manifest Types
 *
 * A structured representation of a Figma design system that enables
 * high-fidelity AI-assisted design generation.
 */
/**
 * Cache for design system manifests with TTL-based invalidation.
 * Singleton pattern to share cache across tool calls.
 */
export class DesignSystemManifestCache {
    constructor() {
        this.cache = new Map();
        this.TTL_MS = 5 * 60 * 1000; // 5 minutes
    }
    static getInstance() {
        if (!DesignSystemManifestCache.instance) {
            DesignSystemManifestCache.instance = new DesignSystemManifestCache();
        }
        return DesignSystemManifestCache.instance;
    }
    get(fileKey) {
        const entry = this.cache.get(fileKey);
        if (!entry)
            return null;
        if (!this.isValid(entry)) {
            this.cache.delete(fileKey);
            return null;
        }
        return entry;
    }
    set(fileKey, manifest, rawComponents) {
        this.cache.set(fileKey, {
            manifest,
            timestamp: Date.now(),
            fileKey,
            rawComponents,
        });
    }
    invalidate(fileKey) {
        this.cache.delete(fileKey);
    }
    invalidateAll() {
        this.cache.clear();
    }
    isValid(entry) {
        return Date.now() - entry.timestamp < this.TTL_MS;
    }
    getStats() {
        const stats = [];
        for (const [fileKey, entry] of this.cache) {
            stats.push({
                fileKey,
                age: Math.round((Date.now() - entry.timestamp) / 1000),
                componentCount: entry.manifest.summary.totalComponents + entry.manifest.summary.totalComponentSets,
                tokenCount: entry.manifest.summary.totalTokens,
            });
        }
        return stats;
    }
}
/**
 * Search components by name, category, or description
 */
export function searchComponents(manifest, query, options) {
    const limit = options?.limit ?? 10;
    const offset = options?.offset ?? 0;
    const queryLower = query.toLowerCase();
    const categoryLower = options?.category?.toLowerCase();
    const allResults = [];
    // Search component sets first (they're typically the main design system components)
    for (const [name, compSet] of Object.entries(manifest.componentSets)) {
        const nameLower = name.toLowerCase();
        const descLower = compSet.description?.toLowerCase() || '';
        const matchesQuery = !query || nameLower.includes(queryLower) || descLower.includes(queryLower);
        const matchesCategory = !categoryLower || inferCategory(name).toLowerCase().includes(categoryLower);
        if (matchesQuery && matchesCategory) {
            allResults.push({
                name: compSet.name,
                key: compSet.key,
                nodeId: compSet.nodeId,
                type: 'componentSet',
                description: compSet.description,
                category: inferCategory(name),
                variantCount: compSet.variants?.length || 0,
            });
        }
    }
    // Then search standalone components
    for (const [name, comp] of Object.entries(manifest.components)) {
        const nameLower = name.toLowerCase();
        const descLower = comp.description?.toLowerCase() || '';
        const matchesQuery = !query || nameLower.includes(queryLower) || descLower.includes(queryLower);
        const matchesCategory = !categoryLower || inferCategory(name).toLowerCase().includes(categoryLower);
        if (matchesQuery && matchesCategory) {
            allResults.push({
                name: comp.name,
                key: comp.key,
                nodeId: comp.nodeId,
                type: 'component',
                description: comp.description,
                category: inferCategory(name),
                defaultSize: comp.defaultSize,
            });
        }
    }
    const total = allResults.length;
    const paginatedResults = allResults.slice(offset, offset + limit);
    const hasMore = offset + limit < total;
    return { results: paginatedResults, total, hasMore };
}
/**
 * Infer category from component name (e.g., "Button/Primary" -> "Button")
 */
function inferCategory(name) {
    const parts = name.split('/');
    return parts[0] || 'Uncategorized';
}
/**
 * Get unique categories from manifest
 */
export function getCategories(manifest) {
    const categories = new Map();
    for (const name of Object.keys(manifest.componentSets)) {
        const cat = inferCategory(name);
        const existing = categories.get(cat) || { componentCount: 0, componentSetCount: 0 };
        existing.componentSetCount++;
        categories.set(cat, existing);
    }
    for (const name of Object.keys(manifest.components)) {
        const cat = inferCategory(name);
        const existing = categories.get(cat) || { componentCount: 0, componentSetCount: 0 };
        existing.componentCount++;
        categories.set(cat, existing);
    }
    return Array.from(categories.entries())
        .map(([name, counts]) => ({ name, ...counts }))
        .sort((a, b) => (b.componentCount + b.componentSetCount) - (a.componentCount + a.componentSetCount));
}
/**
 * Get token categories and counts for summary
 */
export function getTokenSummary(manifest) {
    // Group colors by prefix (e.g., "primary/500" -> "primary")
    const colorGroups = new Set();
    for (const name of Object.keys(manifest.tokens.colors)) {
        const group = name.split('/')[0];
        colorGroups.add(group);
    }
    // Group typography by prefix
    const typographyGroups = new Set();
    for (const name of Object.keys(manifest.tokens.typography)) {
        const group = name.split('/')[0];
        typographyGroups.add(group);
    }
    // Get spacing scale values
    const spacingValues = Object.values(manifest.tokens.spacing)
        .map(t => t.value)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .sort((a, b) => a - b);
    return {
        colors: {
            count: Object.keys(manifest.tokens.colors).length,
            groups: Array.from(colorGroups).slice(0, 10),
        },
        spacing: {
            count: Object.keys(manifest.tokens.spacing).length,
            scale: spacingValues.slice(0, 15),
        },
        typography: {
            count: Object.keys(manifest.tokens.typography).length,
            groups: Array.from(typographyGroups).slice(0, 10),
        },
        effects: {
            count: Object.keys(manifest.tokens.effects).length,
        },
        collections: manifest.collections.map(c => c.name),
    };
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Convert RGB color object to hex string
 */
export function rgbToHex(color) {
    const toHex = (n) => Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`.toUpperCase();
}
/**
 * Parse a Figma color value to hex
 */
export function figmaColorToHex(value) {
    if (typeof value === 'string')
        return value;
    if (value && typeof value === 'object' && 'r' in value) {
        return rgbToHex(value);
    }
    return '#000000';
}
/**
 * Generate a human-readable summary of the manifest
 */
export function generateManifestSummary(manifest) {
    const lines = [
        `# Design System Manifest`,
        ``,
        `**File:** ${manifest.fileName || manifest.fileKey}`,
        `**Generated:** ${new Date(manifest.generatedAt).toISOString()}`,
        ``,
        `## Summary`,
        `- **${manifest.summary.totalTokens}** design tokens`,
        `- **${manifest.summary.totalComponents}** components`,
        `- **${manifest.summary.totalComponentSets}** component sets`,
        ``,
        `## Color Palette`,
        manifest.summary.colorPalette.slice(0, 10).map(c => `- ${c}`).join('\n'),
        ``,
        `## Spacing Scale`,
        `${manifest.summary.spacingScale.join('px, ')}px`,
        ``,
        `## Typography`,
        manifest.summary.typographyScale.slice(0, 10).map(t => `- ${t}`).join('\n'),
        ``,
        `## Component Categories`,
        manifest.summary.componentCategories.map(c => `- ${c}`).join('\n'),
    ];
    return lines.join('\n');
}
/**
 * Create an empty manifest template
 */
export function createEmptyManifest(fileKey) {
    return {
        version: '1.0.0',
        generatedAt: Date.now(),
        fileKey,
        collections: [],
        tokens: {
            colors: {},
            spacing: {},
            typography: {},
            effects: {},
            other: {},
        },
        components: {},
        componentSets: {},
        patterns: {},
        rules: [],
        summary: {
            totalTokens: 0,
            totalComponents: 0,
            totalComponentSets: 0,
            colorPalette: [],
            spacingScale: [],
            typographyScale: [],
            componentCategories: [],
        },
    };
}
