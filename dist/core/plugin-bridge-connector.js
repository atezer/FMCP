/**
 * Plugin Bridge Connector
 *
 * Implements the same interface as FigmaDesktopConnector but talks to the
 * Figma plugin over WebSocket (PluginBridgeServer). No CDP / debug port needed.
 * Supports optional fileKey routing for multi-client scenarios.
 */
import { logger } from "./logger.js";
export class PluginBridgeConnector {
    constructor(bridge, fileKey) {
        this.bridge = bridge;
        this.fileKey = fileKey;
    }
    setFileKey(fileKey) {
        this.fileKey = fileKey;
    }
    async initialize() {
        logger.info("Plugin bridge connector initialized (no CDP)");
    }
    async getVariablesFromPluginUI(fileKey) {
        return this.bridge.request("getVariablesFromPluginUI", { fileKey }, this.fileKey ?? fileKey);
    }
    async getComponentFromPluginUI(nodeId) {
        return this.bridge.request("getComponentFromPluginUI", { nodeId }, this.fileKey);
    }
    async getVariables(fileKey) {
        return this.bridge.request("getVariables", { fileKey }, this.fileKey ?? fileKey);
    }
    async getComponentByNodeId(nodeId) {
        return this.bridge.request("getComponentByNodeId", { nodeId }, this.fileKey);
    }
    async executeCodeViaUI(code, timeout = 5000) {
        return this.bridge.request("executeCodeViaUI", { code, timeout }, this.fileKey);
    }
    async updateVariable(variableId, modeId, value) {
        return this.bridge.request("updateVariable", { variableId, modeId, value }, this.fileKey);
    }
    async createVariable(name, collectionId, resolvedType, options) {
        return this.bridge.request("createVariable", { name, collectionId, resolvedType, options }, this.fileKey);
    }
    async createVariableCollection(name, options) {
        return this.bridge.request("createVariableCollection", { name, options }, this.fileKey);
    }
    async deleteVariable(variableId) {
        return this.bridge.request("deleteVariable", { variableId }, this.fileKey);
    }
    async deleteVariableCollection(collectionId) {
        return this.bridge.request("deleteVariableCollection", { collectionId }, this.fileKey);
    }
    async renameVariable(variableId, newName) {
        return this.bridge.request("renameVariable", { variableId, newName }, this.fileKey);
    }
    async addMode(collectionId, modeName) {
        return this.bridge.request("addMode", { collectionId, modeName }, this.fileKey);
    }
    async renameMode(collectionId, modeId, newName) {
        return this.bridge.request("renameMode", { collectionId, modeId, newName }, this.fileKey);
    }
    async refreshVariables() {
        return this.bridge.request("refreshVariables", {}, this.fileKey);
    }
    async getLocalComponents(opts) {
        const params = {};
        if (opts?.currentPageOnly !== undefined)
            params.currentPageOnly = opts.currentPageOnly;
        if (opts?.limit != null && opts.limit > 0)
            params.limit = opts.limit;
        return this.bridge.request("getLocalComponents", params, this.fileKey);
    }
    async instantiateComponent(componentKey, options) {
        return this.bridge.request("instantiateComponent", { componentKey, options }, this.fileKey);
    }
    async setNodeDescription(nodeId, description, descriptionMarkdown) {
        return this.bridge.request("setNodeDescription", { nodeId, description, descriptionMarkdown }, this.fileKey);
    }
    async addComponentProperty(nodeId, propertyName, type, defaultValue, options) {
        return this.bridge.request("addComponentProperty", { nodeId, propertyName, type, defaultValue, options }, this.fileKey);
    }
    async editComponentProperty(nodeId, propertyName, newValue) {
        return this.bridge.request("editComponentProperty", { nodeId, propertyName, newValue }, this.fileKey);
    }
    async deleteComponentProperty(nodeId, propertyName) {
        return this.bridge.request("deleteComponentProperty", { nodeId, propertyName }, this.fileKey);
    }
    async resizeNode(nodeId, width, height, withConstraints = true) {
        return this.bridge.request("resizeNode", { nodeId, width, height, withConstraints }, this.fileKey);
    }
    async moveNode(nodeId, x, y) {
        return this.bridge.request("moveNode", { nodeId, x, y }, this.fileKey);
    }
    async setNodeFills(nodeId, fills) {
        return this.bridge.request("setNodeFills", { nodeId, fills }, this.fileKey);
    }
    async setNodeStrokes(nodeId, strokes, strokeWeight) {
        return this.bridge.request("setNodeStrokes", { nodeId, strokes, strokeWeight }, this.fileKey);
    }
    async setNodeOpacity(nodeId, opacity) {
        return this.bridge.request("setNodeOpacity", { nodeId, opacity }, this.fileKey);
    }
    async setNodeCornerRadius(nodeId, radius) {
        return this.bridge.request("setNodeCornerRadius", { nodeId, radius }, this.fileKey);
    }
    async cloneNode(nodeId) {
        return this.bridge.request("cloneNode", { nodeId }, this.fileKey);
    }
    async deleteNode(nodeId) {
        return this.bridge.request("deleteNode", { nodeId }, this.fileKey);
    }
    async renameNode(nodeId, newName) {
        return this.bridge.request("renameNode", { nodeId, newName }, this.fileKey);
    }
    async setTextContent(nodeId, text, options) {
        return this.bridge.request("setTextContent", { nodeId, text, options }, this.fileKey);
    }
    async createChildNode(parentId, nodeType, properties) {
        return this.bridge.request("createChildNode", { parentId, nodeType, properties }, this.fileKey);
    }
    async captureScreenshot(nodeId, options) {
        return this.bridge.request("captureScreenshot", { nodeId, options }, this.fileKey);
    }
    async setInstanceProperties(nodeId, properties) {
        return this.bridge.request("setInstanceProperties", { nodeId, properties }, this.fileKey);
    }
    async getDocumentStructure(depth, verbosity, opts) {
        const params = { depth: depth ?? 1, verbosity: verbosity ?? "summary" };
        if (opts?.excludeScreenshot !== undefined)
            params.excludeScreenshot = opts.excludeScreenshot;
        if (opts?.includeLayout !== undefined)
            params.includeLayout = opts.includeLayout;
        if (opts?.includeVisual !== undefined)
            params.includeVisual = opts.includeVisual;
        if (opts?.includeTypography !== undefined)
            params.includeTypography = opts.includeTypography;
        if (opts?.includeCodeReady !== undefined)
            params.includeCodeReady = opts.includeCodeReady;
        if (opts?.outputHint !== undefined)
            params.outputHint = opts.outputHint;
        return this.bridge.request("getDocumentStructure", params, this.fileKey);
    }
    async getNodeContext(nodeId, depth, verbosity, opts) {
        const params = {
            nodeId,
            depth: depth ?? 2,
            verbosity: verbosity ?? "standard",
        };
        if (opts?.excludeScreenshot !== undefined)
            params.excludeScreenshot = opts.excludeScreenshot;
        if (opts?.includeLayout !== undefined)
            params.includeLayout = opts.includeLayout;
        if (opts?.includeVisual !== undefined)
            params.includeVisual = opts.includeVisual;
        if (opts?.includeTypography !== undefined)
            params.includeTypography = opts.includeTypography;
        if (opts?.includeCodeReady !== undefined)
            params.includeCodeReady = opts.includeCodeReady;
        if (opts?.outputHint !== undefined)
            params.outputHint = opts.outputHint;
        return this.bridge.request("getNodeContext", params, this.fileKey);
    }
    async getLocalStyles(verbosity) {
        return this.bridge.request("getLocalStyles", { verbosity: verbosity ?? "summary" }, this.fileKey);
    }
    async getConsoleLogs(limit = 50) {
        const res = await this.bridge.request("getConsoleLogs", { limit }, this.fileKey);
        return res?.data ?? { logs: [], total: 0 };
    }
    async clearConsole() {
        await this.bridge.request("clearConsole", {}, this.fileKey);
    }
    async batchCreateVariables(items) {
        const res = await this.bridge.request("batchCreateVariables", { items }, this.fileKey);
        return res ?? { created: [], failed: [] };
    }
    async batchUpdateVariables(items) {
        const res = await this.bridge.request("batchUpdateVariables", { items }, this.fileKey);
        return res ?? { updated: [], failed: [] };
    }
    async setupDesignTokens(payload) {
        const tokens = Array.isArray(payload.tokens)
            ? payload.tokens
            : Object.entries(payload.tokens || {}).map(([name, v]) => typeof v === "object" && v !== null && "type" in v
                ? { name, ...v }
                : { name, type: "STRING", value: v });
        return this.bridge.request("setupDesignTokens", {
            collectionName: payload.collectionName,
            modes: payload.modes,
            tokens,
        }, this.fileKey);
    }
    async arrangeComponentSet(nodeIds) {
        const res = (await this.bridge.request("arrangeComponentSet", { nodeIds }, this.fileKey));
        return res?.data ?? res ?? { nodeId: "", name: "" };
    }
    async dispose() {
        logger.info("Plugin bridge connector disposed");
    }
}
//# sourceMappingURL=plugin-bridge-connector.js.map