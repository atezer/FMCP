/**
 * Plugin Bridge Connector
 *
 * Implements the same interface as FigmaDesktopConnector but talks to the
 * Figma plugin over WebSocket (PluginBridgeServer). No CDP / debug port needed.
 * Supports optional fileKey routing for multi-client scenarios.
 */
import type { PluginBridgeServer } from "./plugin-bridge-server.js";
import type { PluginVariablesPayload, PluginStylesPayload, PluginComponentPayload, PluginDocumentStructure, PluginScreenshotPayload, PluginCrudResult } from "./types/figma.js";
export declare class PluginBridgeConnector {
    private bridge;
    private fileKey?;
    constructor(bridge: PluginBridgeServer, fileKey?: string);
    setFileKey(fileKey: string | undefined): void;
    initialize(): Promise<void>;
    getVariablesFromPluginUI(fileKey?: string): Promise<PluginVariablesPayload>;
    getComponentFromPluginUI(nodeId: string): Promise<PluginComponentPayload>;
    getVariables(fileKey?: string): Promise<PluginVariablesPayload>;
    getComponentByNodeId(nodeId: string): Promise<PluginComponentPayload>;
    executeCodeViaUI(code: string, timeout?: number): Promise<unknown>;
    updateVariable(variableId: string, modeId: string, value: unknown): Promise<PluginCrudResult>;
    createVariable(name: string, collectionId: string, resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN", options?: {
        valuesByMode?: Record<string, unknown>;
        description?: string;
        scopes?: string[];
    }): Promise<PluginCrudResult>;
    createVariableCollection(name: string, options?: {
        initialModeName?: string;
        additionalModes?: string[];
    }): Promise<PluginCrudResult>;
    deleteVariable(variableId: string): Promise<PluginCrudResult>;
    deleteVariableCollection(collectionId: string): Promise<PluginCrudResult>;
    renameVariable(variableId: string, newName: string): Promise<PluginCrudResult>;
    addMode(collectionId: string, modeName: string): Promise<PluginCrudResult>;
    renameMode(collectionId: string, modeId: string, newName: string): Promise<PluginCrudResult>;
    refreshVariables(): Promise<PluginCrudResult>;
    getLocalComponents(opts?: {
        currentPageOnly?: boolean;
        limit?: number;
    }): Promise<PluginComponentPayload>;
    searchLibraryAssets(opts?: {
        query?: string;
        assetTypes?: string[];
        limit?: number;
        currentPageOnly?: boolean;
    }): Promise<unknown>;
    batchExportNodes(params: {
        nodeIds: string[];
        format?: "PNG" | "SVG" | "JPG" | "PDF";
        scale?: number;
        svgOutlineText?: boolean;
        svgIncludeId?: boolean;
        svgSimplifyStroke?: boolean;
    }): Promise<{
        results: Array<{
            nodeId: string;
            name?: string;
            format?: string;
            base64?: string;
            byteLength?: number;
            error?: string;
        }>;
    }>;
    instantiateComponent(componentKey: string, options?: {
        nodeId?: string;
        position?: {
            x: number;
            y: number;
        };
        size?: {
            width: number;
            height: number;
        };
        overrides?: Record<string, unknown>;
        variant?: Record<string, string>;
        parentId?: string;
    }): Promise<unknown>;
    setNodeDescription(nodeId: string, description: string, descriptionMarkdown?: string): Promise<unknown>;
    addComponentProperty(nodeId: string, propertyName: string, type: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT", defaultValue: unknown, options?: {
        preferredValues?: unknown[];
    }): Promise<unknown>;
    editComponentProperty(nodeId: string, propertyName: string, newValue: {
        name?: string;
        defaultValue?: unknown;
        preferredValues?: unknown[];
    }): Promise<unknown>;
    deleteComponentProperty(nodeId: string, propertyName: string): Promise<unknown>;
    resizeNode(nodeId: string, width: number, height: number, withConstraints?: boolean): Promise<unknown>;
    moveNode(nodeId: string, x: number, y: number): Promise<unknown>;
    setNodeFills(nodeId: string, fills: unknown[]): Promise<unknown>;
    setNodeStrokes(nodeId: string, strokes: unknown[], strokeWeight?: number): Promise<unknown>;
    setNodeOpacity(nodeId: string, opacity: number): Promise<unknown>;
    setNodeCornerRadius(nodeId: string, radius: number): Promise<unknown>;
    cloneNode(nodeId: string): Promise<unknown>;
    deleteNode(nodeId: string): Promise<unknown>;
    renameNode(nodeId: string, newName: string): Promise<unknown>;
    setTextContent(nodeId: string, text: string, options?: {
        fontSize?: number;
    }): Promise<unknown>;
    createChildNode(parentId: string, nodeType: "RECTANGLE" | "ELLIPSE" | "FRAME" | "TEXT" | "LINE" | "POLYGON" | "STAR" | "VECTOR", properties?: Record<string, unknown>): Promise<unknown>;
    captureScreenshot(nodeId: string | null, options?: {
        format?: string;
        scale?: number;
        jpegQuality?: number;
    }): Promise<PluginScreenshotPayload>;
    /**
     * v1.8.1+: Clone a source screen and adapt it to a target device dimension.
     * Preserves library instances, bound variables, and auto-layout where possible.
     */
    cloneScreenToDevice(params: {
        sourceNodeId: string;
        targetWidth: number;
        targetHeight: number;
        targetDeviceName: string;
        newName?: string;
        targetParentId?: string;
        position?: {
            x: number;
            y: number;
        };
    }): Promise<unknown>;
    /**
     * v1.8.1+: Validate a screen against design-system discipline criteria.
     * Returns a DS compliance score + violation list.
     * v1.9.4: `detailed: true` adds hardcoded samples, overflow analysis, and primitive fallback list.
     */
    validateScreen(params: {
        nodeId: string;
        expectedDs?: string;
        minScore?: number;
        detailed?: boolean;
    }): Promise<unknown>;
    /**
     * v1.9.4: Full DS compliance scan — detailed coverage breakdown with hardcoded samples,
     * overflow detection, and primitive fallback list. Calls validateScreen with detailed=true.
     */
    scanDsCompliance(params: {
        nodeId: string;
        threshold?: number;
        expectedDs?: string;
    }): Promise<unknown>;
    setInstanceProperties(nodeId: string, properties: Record<string, unknown>): Promise<PluginCrudResult>;
    getDocumentStructure(depth?: number, verbosity?: string, opts?: {
        excludeScreenshot?: boolean;
        includeLayout?: boolean;
        includeVisual?: boolean;
        includeTypography?: boolean;
        includeCodeReady?: boolean;
        outputHint?: "react" | "tailwind";
    }): Promise<PluginDocumentStructure>;
    getNodeContext(nodeId: string, depth?: number, verbosity?: string, opts?: {
        excludeScreenshot?: boolean;
        includeLayout?: boolean;
        includeVisual?: boolean;
        includeTypography?: boolean;
        includeCodeReady?: boolean;
        outputHint?: "react" | "tailwind";
    }): Promise<PluginDocumentStructure>;
    getLocalStyles(verbosity?: string): Promise<PluginStylesPayload>;
    getConsoleLogs(limit?: number): Promise<{
        logs: Array<{
            level: string;
            time: number;
            args: unknown[];
        }>;
        total: number;
    }>;
    clearConsole(): Promise<void>;
    batchCreateVariables(items: Array<{
        collectionId: string;
        name: string;
        resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
        value?: unknown;
        modeId?: string;
        valuesByMode?: Record<string, unknown>;
    }>): Promise<{
        created: Array<{
            name: string;
            id: string;
        }>;
        failed: Array<{
            name: string;
            error: string;
        }>;
    }>;
    batchUpdateVariables(items: Array<{
        variableId: string;
        modeId: string;
        value: unknown;
    }>): Promise<{
        updated: Array<{
            variableId: string;
        }>;
        failed: Array<{
            variableId: string;
            error: string;
        }>;
    }>;
    setupDesignTokens(payload: {
        collectionName: string;
        modes: string[];
        tokens: Array<{
            name: string;
            type?: string;
            value?: unknown;
            values?: Record<string, unknown>;
        }> | Record<string, unknown>;
    }): Promise<PluginCrudResult>;
    arrangeComponentSet(nodeIds: string[]): Promise<{
        nodeId: string;
        name: string;
    }>;
    dispose(): Promise<void>;
}
//# sourceMappingURL=plugin-bridge-connector.d.ts.map