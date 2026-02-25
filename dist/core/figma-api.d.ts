/**
 * Figma REST API Client
 * Handles HTTP calls to Figma's REST API for file data, variables, components, and styles
 */
/**
 * Figma API Client Configuration
 */
export interface FigmaAPIConfig {
    accessToken: string;
}
/**
 * Extract file key from Figma URL
 * @example https://www.figma.com/design/abc123/My-File -> abc123
 */
export declare function extractFileKey(url: string): string | null;
/**
 * Figma API Client
 * Makes authenticated requests to Figma REST API
 */
export declare class FigmaAPI {
    private accessToken;
    constructor(config: FigmaAPIConfig);
    /**
     * Make authenticated request to Figma API
     */
    private request;
    /**
     * GET /v1/files/:file_key
     * Get full file data including document tree, components, and styles
     */
    getFile(fileKey: string, options?: {
        version?: string;
        ids?: string[];
        depth?: number;
        geometry?: 'paths' | 'screen';
        plugin_data?: string;
        branch_data?: boolean;
    }): Promise<any>;
    /**
     * GET /v1/files/:file_key/variables/local
     * Get local variables (design tokens) from a file
     */
    getLocalVariables(fileKey: string): Promise<any>;
    /**
     * GET /v1/files/:file_key/variables/published
     * Get published variables from a file
     */
    getPublishedVariables(fileKey: string): Promise<any>;
    /**
     * GET /v1/files/:file_key/nodes
     * Get specific nodes by ID
     */
    getNodes(fileKey: string, nodeIds: string[], options?: {
        version?: string;
        depth?: number;
        geometry?: 'paths' | 'screen';
        plugin_data?: string;
    }): Promise<any>;
    /**
     * GET /v1/files/:file_key/styles
     * Get styles from a file
     */
    getStyles(fileKey: string): Promise<any>;
    /**
     * GET /v1/files/:file_key/components
     * Get components from a file
     */
    getComponents(fileKey: string): Promise<any>;
    /**
     * GET /v1/files/:file_key/component_sets
     * Get component sets (variants) from a file
     */
    getComponentSets(fileKey: string): Promise<any>;
    /**
     * GET /v1/images/:file_key
     * Renders images for specified nodes
     * @param fileKey - The file key
     * @param nodeIds - Node IDs to render (single string or array)
     * @param options - Rendering options
     * @returns Map of node IDs to image URLs (URLs expire after 30 days)
     */
    getImages(fileKey: string, nodeIds: string | string[], options?: {
        scale?: number;
        format?: 'png' | 'jpg' | 'svg' | 'pdf';
        svg_outline_text?: boolean;
        svg_include_id?: boolean;
        svg_include_node_id?: boolean;
        svg_simplify_stroke?: boolean;
        contents_only?: boolean;
    }): Promise<{
        images: Record<string, string | null>;
    }>;
    /**
     * Helper: Get all design tokens (variables) with formatted output
     */
    getAllVariables(fileKey: string): Promise<{
        local: any;
        published: any;
    }>;
    /**
     * Helper: Get component metadata with properties
     */
    getComponentData(fileKey: string, nodeId: string): Promise<any>;
    /**
     * Helper: Search for components by name
     */
    searchComponents(fileKey: string, searchTerm: string): Promise<any[]>;
}
/**
 * Helper function to format variables for display
 */
export declare function formatVariables(variablesData: any): {
    collections: any[];
    variables: any[];
    summary: {
        totalCollections: number;
        totalVariables: number;
        variablesByType: Record<string, number>;
    };
};
/**
 * Helper function to format component data for display
 */
export declare function formatComponentData(componentNode: any): {
    id: string;
    name: string;
    type: string;
    description?: string;
    descriptionMarkdown?: string;
    properties?: any;
    children?: any[];
    bounds?: any;
    fills?: any[];
    strokes?: any[];
    effects?: any[];
};
//# sourceMappingURL=figma-api.d.ts.map