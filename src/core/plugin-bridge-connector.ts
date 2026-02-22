/**
 * Plugin Bridge Connector
 *
 * Implements the same interface as FigmaDesktopConnector but talks to the
 * Figma plugin over WebSocket (PluginBridgeServer). No CDP / debug port needed.
 */

import type { PluginBridgeServer } from "./plugin-bridge-server.js";
import { logger } from "./logger.js";

export class PluginBridgeConnector {
	constructor(private bridge: PluginBridgeServer) {}

	async initialize(): Promise<void> {
		logger.info("Plugin bridge connector initialized (no CDP)");
	}

	async getVariablesFromPluginUI(fileKey?: string): Promise<any> {
		return this.bridge.request("getVariablesFromPluginUI", { fileKey });
	}

	async getComponentFromPluginUI(nodeId: string): Promise<any> {
		return this.bridge.request("getComponentFromPluginUI", { nodeId });
	}

	async getVariables(fileKey?: string): Promise<any> {
		return this.bridge.request("getVariables", { fileKey });
	}

	async getComponentByNodeId(nodeId: string): Promise<any> {
		return this.bridge.request("getComponentByNodeId", { nodeId });
	}

	async executeCodeViaUI(code: string, timeout: number = 5000): Promise<any> {
		return this.bridge.request("executeCodeViaUI", { code, timeout });
	}

	async updateVariable(variableId: string, modeId: string, value: any): Promise<any> {
		return this.bridge.request("updateVariable", { variableId, modeId, value });
	}

	async createVariable(
		name: string,
		collectionId: string,
		resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN",
		options?: { valuesByMode?: Record<string, any>; description?: string; scopes?: string[] }
	): Promise<any> {
		return this.bridge.request("createVariable", { name, collectionId, resolvedType, options });
	}

	async createVariableCollection(
		name: string,
		options?: { initialModeName?: string; additionalModes?: string[] }
	): Promise<any> {
		return this.bridge.request("createVariableCollection", { name, options });
	}

	async deleteVariable(variableId: string): Promise<any> {
		return this.bridge.request("deleteVariable", { variableId });
	}

	async deleteVariableCollection(collectionId: string): Promise<any> {
		return this.bridge.request("deleteVariableCollection", { collectionId });
	}

	async renameVariable(variableId: string, newName: string): Promise<any> {
		return this.bridge.request("renameVariable", { variableId, newName });
	}

	async addMode(collectionId: string, modeName: string): Promise<any> {
		return this.bridge.request("addMode", { collectionId, modeName });
	}

	async renameMode(collectionId: string, modeId: string, newName: string): Promise<any> {
		return this.bridge.request("renameMode", { collectionId, modeId, newName });
	}

	async refreshVariables(): Promise<any> {
		return this.bridge.request("refreshVariables", {});
	}

	async getLocalComponents(): Promise<any> {
		return this.bridge.request("getLocalComponents", {});
	}

	async instantiateComponent(
		componentKey: string,
		options?: {
			nodeId?: string;
			position?: { x: number; y: number };
			size?: { width: number; height: number };
			overrides?: Record<string, any>;
			variant?: Record<string, string>;
			parentId?: string;
		}
	): Promise<any> {
		return this.bridge.request("instantiateComponent", { componentKey, options });
	}

	async setNodeDescription(nodeId: string, description: string, descriptionMarkdown?: string): Promise<any> {
		return this.bridge.request("setNodeDescription", { nodeId, description, descriptionMarkdown });
	}

	async addComponentProperty(
		nodeId: string,
		propertyName: string,
		type: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT",
		defaultValue: any,
		options?: { preferredValues?: any[] }
	): Promise<any> {
		return this.bridge.request("addComponentProperty", { nodeId, propertyName, type, defaultValue, options });
	}

	async editComponentProperty(
		nodeId: string,
		propertyName: string,
		newValue: { name?: string; defaultValue?: any; preferredValues?: any[] }
	): Promise<any> {
		return this.bridge.request("editComponentProperty", { nodeId, propertyName, newValue });
	}

	async deleteComponentProperty(nodeId: string, propertyName: string): Promise<any> {
		return this.bridge.request("deleteComponentProperty", { nodeId, propertyName });
	}

	async resizeNode(nodeId: string, width: number, height: number, withConstraints: boolean = true): Promise<any> {
		return this.bridge.request("resizeNode", { nodeId, width, height, withConstraints });
	}

	async moveNode(nodeId: string, x: number, y: number): Promise<any> {
		return this.bridge.request("moveNode", { nodeId, x, y });
	}

	async setNodeFills(nodeId: string, fills: any[]): Promise<any> {
		return this.bridge.request("setNodeFills", { nodeId, fills });
	}

	async setNodeStrokes(nodeId: string, strokes: any[], strokeWeight?: number): Promise<any> {
		return this.bridge.request("setNodeStrokes", { nodeId, strokes, strokeWeight });
	}

	async setNodeOpacity(nodeId: string, opacity: number): Promise<any> {
		return this.bridge.request("setNodeOpacity", { nodeId, opacity });
	}

	async setNodeCornerRadius(nodeId: string, radius: number): Promise<any> {
		return this.bridge.request("setNodeCornerRadius", { nodeId, radius });
	}

	async cloneNode(nodeId: string): Promise<any> {
		return this.bridge.request("cloneNode", { nodeId });
	}

	async deleteNode(nodeId: string): Promise<any> {
		return this.bridge.request("deleteNode", { nodeId });
	}

	async renameNode(nodeId: string, newName: string): Promise<any> {
		return this.bridge.request("renameNode", { nodeId, newName });
	}

	async setTextContent(nodeId: string, text: string, options?: { fontSize?: number }): Promise<any> {
		return this.bridge.request("setTextContent", { nodeId, text, options });
	}

	async createChildNode(
		parentId: string,
		nodeType: "RECTANGLE" | "ELLIPSE" | "FRAME" | "TEXT" | "LINE" | "POLYGON" | "STAR" | "VECTOR",
		properties?: Record<string, unknown>
	): Promise<any> {
		return this.bridge.request("createChildNode", { parentId, nodeType, properties });
	}

	async captureScreenshot(nodeId: string | null, options?: { format?: string; scale?: number }): Promise<any> {
		return this.bridge.request("captureScreenshot", { nodeId, options });
	}

	async setInstanceProperties(nodeId: string, properties: Record<string, unknown>): Promise<any> {
		return this.bridge.request("setInstanceProperties", { nodeId, properties });
	}

	async getDocumentStructure(depth?: number, verbosity?: string): Promise<any> {
		return this.bridge.request("getDocumentStructure", { depth: depth ?? 1, verbosity: verbosity ?? "summary" });
	}

	async getLocalStyles(verbosity?: string): Promise<any> {
		return this.bridge.request("getLocalStyles", { verbosity: verbosity ?? "summary" });
	}

	async dispose(): Promise<void> {
		logger.info("Plugin bridge connector disposed");
	}
}
