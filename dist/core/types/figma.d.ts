/**
 * Figma Plugin API response types for F-MCP Bridge.
 *
 * These types represent the data shapes returned by the Figma plugin
 * via WebSocket bridge. They are used to replace `any` casts in
 * local-plugin-only.ts and plugin-bridge-connector.ts.
 */
export interface RGBColor {
    r?: number;
    g?: number;
    b?: number;
    a?: number;
}
export interface FigmaFill {
    type: string;
    color?: RGBColor;
    opacity?: number;
    visible?: boolean;
}
export interface FigmaFontName {
    family: string;
    style: string;
}
export interface FigmaVariableMode {
    id: string;
    name: string;
}
export interface FigmaVariable {
    id: string;
    name: string;
    resolvedType: string;
    valuesByMode?: Record<string, unknown>;
    description?: string;
    scopes?: string[];
    variableCollectionId?: string;
}
export interface FigmaVariableCollection {
    id: string;
    name: string;
    defaultModeId?: string;
    modes?: FigmaVariableMode[];
    variableIds?: string[];
}
export interface FigmaPaintStyle {
    id: string;
    name: string;
    type?: string;
    description?: string;
    key?: string;
    paints?: FigmaFill[];
}
export interface FigmaTextStyle {
    id: string;
    name: string;
    type?: string;
    description?: string;
    key?: string;
    fontSize?: number;
    fontName?: FigmaFontName;
    style?: {
        fontSize?: number;
        fontName?: FigmaFontName;
    };
}
export interface FigmaComponent {
    id: string;
    name: string;
    type: string;
    key?: string;
    description?: string;
    children?: unknown[];
    componentSetId?: string;
}
export interface FigmaComponentSet {
    id: string;
    name: string;
    type: string;
    key?: string;
    description?: string;
    children?: FigmaComponent[];
}
export interface PluginVariablesPayload {
    variables?: FigmaVariable[];
    variableCollections?: FigmaVariableCollection[];
}
export interface PluginStylesPayload {
    paintStyles?: FigmaPaintStyle[];
    textStyles?: FigmaTextStyle[];
    effectStyles?: unknown[];
}
export interface PluginComponentPayload {
    success?: boolean;
    error?: string;
    data?: PluginComponentData;
    component?: FigmaComponent;
    components?: FigmaComponent[];
    componentSets?: FigmaComponent[];
    totalComponents?: number;
    totalComponentSets?: number;
}
export interface PluginComponentData {
    components?: FigmaComponent[];
    componentSets?: FigmaComponent[];
    totalComponents?: number;
    totalComponentSets?: number;
    fileKey?: string;
    timestamp?: number;
    [key: string]: unknown;
}
export interface PluginScreenshotPayload {
    image?: string;
    data?: string;
    format?: string;
    scale?: number;
}
export interface PluginExecuteResult {
    success: boolean;
    result?: unknown;
    error?: string;
}
export interface PluginDocumentStructure {
    document?: {
        name: string;
        id: string;
        type: string;
        fileKey?: string;
        children?: unknown[];
    };
    fileKey?: string;
    fileName?: string;
}
export interface DesignSystemSummary {
    variableCollections?: Array<{
        name: string;
        variableCount: number;
        modes: string[];
    }>;
    componentCount?: number;
    styleCount?: number;
}
export interface PluginReadyMessage {
    type: "ready";
    fileKey?: string;
    fileName?: string;
}
export interface PluginSetTokenMessage {
    type: "setToken";
    token: string;
}
export interface PluginClearTokenMessage {
    type: "clearToken";
}
export interface PluginPongMessage {
    type: "pong" | "keepalive";
}
export type PluginIncomingMessage = PluginReadyMessage | PluginSetTokenMessage | PluginClearTokenMessage | PluginPongMessage | {
    type?: string;
    id?: string;
    method?: string;
    result?: unknown;
    error?: string;
    fileKey?: string;
    fileName?: string;
    token?: string;
};
//# sourceMappingURL=figma.d.ts.map