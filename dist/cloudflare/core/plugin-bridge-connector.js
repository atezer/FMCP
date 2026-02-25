/**
 * Plugin Bridge Connector
 *
 * Implements the same interface as FigmaDesktopConnector but talks to the
 * Figma plugin over WebSocket (PluginBridgeServer). No CDP / debug port needed.
 */
import { logger } from "./logger.js";
export class PluginBridgeConnector {
    constructor(bridge) {
        this.bridge = bridge;
    }
    async initialize() {
        logger.info("Plugin bridge connector initialized (no CDP)");
    }
    async getVariablesFromPluginUI(fileKey) {
        return this.bridge.request("getVariablesFromPluginUI", { fileKey });
    }
    async getComponentFromPluginUI(nodeId) {
        return this.bridge.request("getComponentFromPluginUI", { nodeId });
    }
    async getVariables(fileKey) {
        return this.bridge.request("getVariables", { fileKey });
    }
    async getComponentByNodeId(nodeId) {
        return this.bridge.request("getComponentByNodeId", { nodeId });
    }
    async executeCodeViaUI(code, timeout = 5000) {
        return this.bridge.request("executeCodeViaUI", { code, timeout });
    }
    async updateVariable(variableId, modeId, value) {
        return this.bridge.request("updateVariable", { variableId, modeId, value });
    }
    async createVariable(name, collectionId, resolvedType, options) {
        return this.bridge.request("createVariable", { name, collectionId, resolvedType, options });
    }
    async createVariableCollection(name, options) {
        return this.bridge.request("createVariableCollection", { name, options });
    }
    async deleteVariable(variableId) {
        return this.bridge.request("deleteVariable", { variableId });
    }
    async deleteVariableCollection(collectionId) {
        return this.bridge.request("deleteVariableCollection", { collectionId });
    }
    async renameVariable(variableId, newName) {
        return this.bridge.request("renameVariable", { variableId, newName });
    }
    async addMode(collectionId, modeName) {
        return this.bridge.request("addMode", { collectionId, modeName });
    }
    async renameMode(collectionId, modeId, newName) {
        return this.bridge.request("renameMode", { collectionId, modeId, newName });
    }
    async refreshVariables() {
        return this.bridge.request("refreshVariables", {});
    }
    async getLocalComponents(opts) {
        const params = {};
        if (opts?.currentPageOnly === true)
            params.currentPageOnly = true;
        if (opts?.limit != null && opts.limit > 0)
            params.limit = opts.limit;
        return this.bridge.request("getLocalComponents", params);
    }
    async instantiateComponent(componentKey, options) {
        return this.bridge.request("instantiateComponent", { componentKey, options });
    }
    async setNodeDescription(nodeId, description, descriptionMarkdown) {
        return this.bridge.request("setNodeDescription", { nodeId, description, descriptionMarkdown });
    }
    async addComponentProperty(nodeId, propertyName, type, defaultValue, options) {
        return this.bridge.request("addComponentProperty", { nodeId, propertyName, type, defaultValue, options });
    }
    async editComponentProperty(nodeId, propertyName, newValue) {
        return this.bridge.request("editComponentProperty", { nodeId, propertyName, newValue });
    }
    async deleteComponentProperty(nodeId, propertyName) {
        return this.bridge.request("deleteComponentProperty", { nodeId, propertyName });
    }
    async resizeNode(nodeId, width, height, withConstraints = true) {
        return this.bridge.request("resizeNode", { nodeId, width, height, withConstraints });
    }
    async moveNode(nodeId, x, y) {
        return this.bridge.request("moveNode", { nodeId, x, y });
    }
    async setNodeFills(nodeId, fills) {
        return this.bridge.request("setNodeFills", { nodeId, fills });
    }
    async setNodeStrokes(nodeId, strokes, strokeWeight) {
        return this.bridge.request("setNodeStrokes", { nodeId, strokes, strokeWeight });
    }
    async setNodeOpacity(nodeId, opacity) {
        return this.bridge.request("setNodeOpacity", { nodeId, opacity });
    }
    async setNodeCornerRadius(nodeId, radius) {
        return this.bridge.request("setNodeCornerRadius", { nodeId, radius });
    }
    async cloneNode(nodeId) {
        return this.bridge.request("cloneNode", { nodeId });
    }
    async deleteNode(nodeId) {
        return this.bridge.request("deleteNode", { nodeId });
    }
    async renameNode(nodeId, newName) {
        return this.bridge.request("renameNode", { nodeId, newName });
    }
    async setTextContent(nodeId, text, options) {
        return this.bridge.request("setTextContent", { nodeId, text, options });
    }
    async createChildNode(parentId, nodeType, properties) {
        return this.bridge.request("createChildNode", { parentId, nodeType, properties });
    }
    async captureScreenshot(nodeId, options) {
        return this.bridge.request("captureScreenshot", { nodeId, options });
    }
    async setInstanceProperties(nodeId, properties) {
        return this.bridge.request("setInstanceProperties", { nodeId, properties });
    }
    async getDocumentStructure(depth, verbosity, opts) {
        const params = { depth: depth ?? 1, verbosity: verbosity ?? "summary" };
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
        return this.bridge.request("getDocumentStructure", params);
    }
    async getNodeContext(nodeId, depth, verbosity, opts) {
        const params = {
            nodeId,
            depth: depth ?? 2,
            verbosity: verbosity ?? "standard",
        };
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
        return this.bridge.request("getNodeContext", params);
    }
    async getLocalStyles(verbosity) {
        return this.bridge.request("getLocalStyles", { verbosity: verbosity ?? "summary" });
    }
    async getConsoleLogs(limit = 50) {
        const res = await this.bridge.request("getConsoleLogs", { limit });
        return res?.data ?? { logs: [], total: 0 };
    }
    async clearConsole() {
        await this.bridge.request("clearConsole", {});
    }
    async batchCreateVariables(items) {
        const res = await this.bridge.request("batchCreateVariables", { items });
        return res ?? { created: [], failed: [] };
    }
    async batchUpdateVariables(items) {
        const res = await this.bridge.request("batchUpdateVariables", { items });
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
        });
    }
    async arrangeComponentSet(nodeIds) {
        const res = (await this.bridge.request("arrangeComponentSet", { nodeIds }));
        return res?.data ?? res ?? { nodeId: "", name: "" };
    }
    async dispose() {
        logger.info("Plugin bridge connector disposed");
    }
}
