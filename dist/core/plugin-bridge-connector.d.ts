/**
 * Plugin Bridge Connector
 *
 * Implements the same interface as FigmaDesktopConnector but talks to the
 * Figma plugin over WebSocket (PluginBridgeServer). No CDP / debug port needed.
 * Supports optional fileKey routing for multi-client scenarios.
 */
import type { PluginBridgeServer } from "./plugin-bridge-server.js";
import type { PluginVariablesPayload, PluginComponentPayload } from "./types/figma.js";
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
    updateVariable(variableId: string, modeId: string, value: unknown): Promise<unknown>;
    createVariable(name: string, collectionId: string, resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN", options?: {
        valuesByMode?: Record<string, unknown>;
        description?: string;
        scopes?: string[];
    }): Promise<unknown>;
    createVariableCollection(name: string, options?: {
        initialModeName?: string;
        additionalModes?: string[];
    }): Promise<unknown>;
    deleteVariable(variableId: string): Promise<unknown>;
    deleteVariableCollection(collectionId: string): Promise<unknown>;
    renameVariable(variableId: string, newName: string): Promise<unknown>;
    addMode(collectionId: string, modeName: string): Promise<unknown>;
    renameMode(collectionId: string, modeId: string, newName: string): Promise<unknown>;
    refreshVariables(): Promise<unknown>;
    getLocalComponents(opts?: {
        currentPageOnly?: boolean;
        limit?: number;
    }): Promise<PluginComponentPayload>;
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
    }): Promise<unknown>;
    setInstanceProperties(nodeId: string, properties: Record<string, unknown>): Promise<unknown>;
    getDocumentStructure(depth?: number, verbosity?: string, opts?: {
        excludeScreenshot?: boolean;
        includeLayout?: boolean;
        includeVisual?: boolean;
        includeTypography?: boolean;
        includeCodeReady?: boolean;
        outputHint?: "react" | "tailwind";
    }): Promise<unknown>;
    getNodeContext(nodeId: string, depth?: number, verbosity?: string, opts?: {
        excludeScreenshot?: boolean;
        includeLayout?: boolean;
        includeVisual?: boolean;
        includeTypography?: boolean;
        includeCodeReady?: boolean;
        outputHint?: "react" | "tailwind";
    }): Promise<unknown>;
    getLocalStyles(verbosity?: string): Promise<unknown>;
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
    }): Promise<unknown>;
    arrangeComponentSet(nodeIds: string[]): Promise<{
        nodeId: string;
        name: string;
    }>;
    dispose(): Promise<void>;
}
//# sourceMappingURL=plugin-bridge-connector.d.ts.map