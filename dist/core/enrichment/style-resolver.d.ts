/**
 * Style Value Resolver
 * Resolves style values from variable references and provides formatted outputs
 */
import type { VariableReference, ExportFormats, ExportFormat } from "../types/enriched.js";
import type pino from "pino";
type Logger = pino.Logger;
export declare class StyleValueResolver {
    private cache;
    private variableCache;
    private logger;
    constructor(logger: Logger);
    /**
     * Resolve a style's value, handling variable references
     */
    resolveStyleValue(style: any, variables: Map<string, any>, maxDepth?: number): Promise<{
        value: any;
        variableRef?: VariableReference;
    }>;
    /**
     * Resolve a variable's value, handling alias chains
     */
    resolveVariableValue(variable: any, allVariables: Map<string, any>, maxDepth?: number, currentDepth?: number): Promise<any>;
    /**
     * Format a variable value based on its type
     */
    private formatVariableValue;
    /**
     * Format a color value to hex string
     */
    private formatColor;
    /**
     * Generate export formats for a resolved value
     */
    generateExportFormats(name: string, value: any, type: string, formats?: ExportFormat[]): ExportFormats;
    /**
     * Convert token name to CSS variable format
     * Example: "color/background/primary-default" -> "--color-background-primary-default"
     */
    private toCSSVariableName;
    /**
     * Convert token name to Sass variable format
     * Example: "color/background/primary-default" -> "$color-background-primary-default"
     */
    private toSassVariableName;
    /**
     * Convert token name to Tailwind class format
     * Example: "color/background/primary-default" -> "bg-primary"
     */
    private toTailwindClassName;
    /**
     * Convert token name to TypeScript path format
     * Example: "color/background/primary-default" -> "tokens.color.background.primaryDefault"
     */
    private toTypeScriptPath;
    /**
     * Convert token name to nested JSON path
     * Example: "color/background/primary-default" -> { color: { background: { primaryDefault: value } } }
     */
    private toJSONPath;
    /**
     * Get style data from Figma API
     * This would be called via the Figma API client
     */
    private getStyleData;
    /**
     * Find variable reference in style data
     */
    private findVariableReference;
    /**
     * Extract direct value from style (no variable)
     */
    private extractDirectValue;
    /**
     * Clear the cache
     */
    clearCache(): void;
}
export {};
//# sourceMappingURL=style-resolver.d.ts.map