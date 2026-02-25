/**
 * Figma Style Extractor
 *
 * Extracts style information (colors, typography, spacing) from Figma files
 * using the REST API /files endpoint. This provides an alternative to the
 * Enterprise-only Variables API by parsing style data directly from nodes.
 *
 * Based on the approach used by Figma-Context-MCP
 */
interface ExtractedVariable {
    id: string;
    name: string;
    value: string;
    type: 'COLOR' | 'TYPOGRAPHY' | 'SPACING' | 'RADIUS' | 'EFFECT';
    category?: string;
    description?: string;
    nodeId?: string;
}
export declare class FigmaStyleExtractor {
    private extractedVariables;
    private colorIndex;
    private typographyIndex;
    private spacingIndex;
    private radiusIndex;
    /**
     * Extract style "variables" from Figma file data
     * This mimics what users would see as variables in Figma
     */
    extractStylesFromFile(fileData: any): Promise<ExtractedVariable[]>;
    /**
     * Process a single node and extract style information
     */
    private processNode;
    /**
     * Extract color variable
     */
    private extractColor;
    /**
     * Extract typography variable
     */
    private extractTypography;
    /**
     * Extract spacing variable
     */
    private extractSpacing;
    /**
     * Extract radius variable
     */
    private extractRadius;
    /**
     * Process Figma styles object
     */
    private processStyles;
    /**
     * Helper to infer color category from node name
     */
    private inferColorCategory;
    /**
     * Generate a meaningful color name
     */
    private generateColorName;
    /**
     * Generate a meaningful typography name
     */
    private generateTypographyName;
    /**
     * Categorize radius values
     */
    private categorizeRadius;
    /**
     * Format the extracted variables for output
     */
    formatVariablesAsOutput(variables: ExtractedVariable[]): any;
}
export {};
//# sourceMappingURL=figma-style-extractor.d.ts.map