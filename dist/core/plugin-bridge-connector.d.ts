/**
 * Plugin Bridge Connector
 *
 * Implements the same interface as FigmaDesktopConnector but talks to the
 * Figma plugin over WebSocket (PluginBridgeServer). No CDP / debug port needed.
 */
import type { PluginBridgeServer } from "./plugin-bridge-server.js";
export declare class PluginBridgeConnector {
    private bridge;
    constructor(bridge: PluginBridgeServer);
    initialize(): Promise<void>;
    getVariablesFromPluginUI(fileKey?: string): Promise<any>;
    getComponentFromPluginUI(nodeId: string): Promise<any>;
    getVariables(fileKey?: string): Promise<any>;
    getComponentByNodeId(nodeId: string): Promise<any>;
    executeCodeViaUI(code: string, timeout?: number): Promise<any>;
    updateVariable(variableId: string, modeId: string, value: any): Promise<any>;
    createVariable(name: string, collectionId: string, resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN", options?: {
        valuesByMode?: Record<string, any>;
        description?: string;
        scopes?: string[];
    }): Promise<any>;
    createVariableCollection(name: string, options?: {
        initialModeName?: string;
        additionalModes?: string[];
    }): Promise<any>;
    deleteVariable(variableId: string): Promise<any>;
    deleteVariableCollection(collectionId: string): Promise<any>;
    renameVariable(variableId: string, newName: string): Promise<any>;
    addMode(collectionId: string, modeName: string): Promise<any>;
    renameMode(collectionId: string, modeId: string, newName: string): Promise<any>;
    refreshVariables(): Promise<any>;
    getLocalComponents(opts?: {
        currentPageOnly?: boolean;
        limit?: number;
    }): Promise<any>;
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
        overrides?: Record<string, any>;
        variant?: Record<string, string>;
        parentId?: string;
    }): Promise<any>;
    setNodeDescription(nodeId: string, description: string, descriptionMarkdown?: string): Promise<any>;
    addComponentProperty(nodeId: string, propertyName: string, type: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT", defaultValue: any, options?: {
        preferredValues?: any[];
    }): Promise<any>;
    editComponentProperty(nodeId: string, propertyName: string, newValue: {
        name?: string;
        defaultValue?: any;
        preferredValues?: any[];
    }): Promise<any>;
    deleteComponentProperty(nodeId: string, propertyName: string): Promise<any>;
    resizeNode(nodeId: string, width: number, height: number, withConstraints?: boolean): Promise<any>;
    moveNode(nodeId: string, x: number, y: number): Promise<any>;
    setNodeFills(nodeId: string, fills: any[]): Promise<any>;
    setNodeStrokes(nodeId: string, strokes: any[], strokeWeight?: number): Promise<any>;
    setNodeOpacity(nodeId: string, opacity: number): Promise<any>;
    setNodeCornerRadius(nodeId: string, radius: number): Promise<any>;
    cloneNode(nodeId: string): Promise<any>;
    deleteNode(nodeId: string): Promise<any>;
    renameNode(nodeId: string, newName: string): Promise<any>;
    setTextContent(nodeId: string, text: string, options?: {
        fontSize?: number;
    }): Promise<any>;
    createChildNode(parentId: string, nodeType: "RECTANGLE" | "ELLIPSE" | "FRAME" | "TEXT" | "LINE" | "POLYGON" | "STAR" | "VECTOR", properties?: Record<string, unknown>): Promise<any>;
    captureScreenshot(nodeId: string | null, options?: {
        format?: string;
        scale?: number;
    }): Promise<any>;
    setInstanceProperties(nodeId: string, properties: Record<string, unknown>): Promise<any>;
    getDocumentStructure(depth?: number, verbosity?: string, opts?: {
        includeLayout?: boolean;
        includeVisual?: boolean;
        includeTypography?: boolean;
        includeCodeReady?: boolean;
        outputHint?: "react" | "tailwind";
    }): Promise<any>;
    getNodeContext(nodeId: string, depth?: number, verbosity?: string, opts?: {
        includeLayout?: boolean;
        includeVisual?: boolean;
        includeTypography?: boolean;
        includeCodeReady?: boolean;
        outputHint?: "react" | "tailwind";
    }): Promise<any>;
    getLocalStyles(verbosity?: string): Promise<any>;
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
    }): Promise<any>;
    arrangeComponentSet(nodeIds: string[]): Promise<{
        nodeId: string;
        name: string;
    }>;
    dispose(): Promise<void>;
}
//# sourceMappingURL=plugin-bridge-connector.d.ts.map