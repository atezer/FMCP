/**
 * Plugin Bridge Connector
 *
 * Implements the same interface as FigmaDesktopConnector but talks to the
 * Figma plugin over WebSocket (PluginBridgeServer). No CDP / debug port needed.
 * Supports optional fileKey routing for multi-client scenarios.
 */

import type { PluginBridgeServer } from "./plugin-bridge-server.js";
import { logger } from "./logger.js";
import type {
	PluginVariablesPayload, PluginStylesPayload, PluginComponentPayload,
	PluginDocumentStructure, PluginScreenshotPayload, PluginExecuteResult,
	DesignSystemSummary, PluginCrudResult,
} from "./types/figma.js";

export class PluginBridgeConnector {
	private fileKey?: string;

	constructor(private bridge: PluginBridgeServer, fileKey?: string) {
		this.fileKey = fileKey;
	}

	setFileKey(fileKey: string | undefined): void {
		this.fileKey = fileKey;
	}

	async initialize(): Promise<void> {
		logger.info("Plugin bridge connector initialized (no CDP)");
	}

	async getVariablesFromPluginUI(fileKey?: string): Promise<PluginVariablesPayload> {
		return this.bridge.request("getVariablesFromPluginUI", { fileKey }, this.fileKey ?? fileKey);
	}

	async getComponentFromPluginUI(nodeId: string): Promise<PluginComponentPayload> {
		return this.bridge.request("getComponentFromPluginUI", { nodeId }, this.fileKey);
	}

	async getVariables(fileKey?: string): Promise<PluginVariablesPayload> {
		return this.bridge.request("getVariables", { fileKey }, this.fileKey ?? fileKey);
	}

	async getComponentByNodeId(nodeId: string): Promise<PluginComponentPayload> {
		return this.bridge.request("getComponentByNodeId", { nodeId }, this.fileKey);
	}

	async executeCodeViaUI(code: string, timeout: number = 15000): Promise<unknown> {
		const MAX_RETRIES = 1;
		for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
			try {
				return await this.bridge.request("executeCodeViaUI", { code, timeout }, this.fileKey);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				const isTransient =
					msg.includes("WebSocket") ||
					msg.includes("not open") ||
					msg.includes("send_failed") ||
					msg.includes("WebSocket closed") ||
					msg.includes("No plugin connected for fileKey") ||
					(msg.includes("Plugin bridge request") && msg.includes("failed:") && !msg.includes("timed out"));
				if (isTransient && attempt < MAX_RETRIES) {
					logger.warn({ attempt, error: msg }, "figma_execute: transient failure, retrying after 1s");
					await new Promise(r => setTimeout(r, 1000));
					continue;
				}
				throw err;
			}
		}
		throw new Error("figma_execute: all retries exhausted");
	}

	async updateVariable(variableId: string, modeId: string, value: unknown): Promise<PluginCrudResult> {
		return this.bridge.request("updateVariable", { variableId, modeId, value }, this.fileKey);
	}

	async createVariable(
		name: string,
		collectionId: string,
		resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN",
		options?: { valuesByMode?: Record<string, unknown>; description?: string; scopes?: string[] }
	): Promise<PluginCrudResult> {
		// Validate mutually exclusive scope combinations early (defense in depth)
		if (options?.scopes) {
			const fillScopes = ["FRAME_FILL", "SHAPE_FILL", "STROKE_COLOR", "TEXT_FILL", "FILL_COLOR"];
			if (options.scopes.includes("ALL_FILLS") && options.scopes.some(s => fillScopes.includes(s))) {
				throw new Error("Scope conflict: ALL_FILLS cannot be combined with specific fill scopes. Use ALL_FILLS alone or use specific scopes (FRAME_FILL, SHAPE_FILL, TEXT_FILL, etc.).");
			}
		}
		return this.bridge.request("createVariable", { name, collectionId, resolvedType, options }, this.fileKey);
	}

	async createVariableCollection(
		name: string,
		options?: { initialModeName?: string; additionalModes?: string[] }
	): Promise<PluginCrudResult> {
		return this.bridge.request("createVariableCollection", { name, options }, this.fileKey);
	}

	async deleteVariable(variableId: string): Promise<PluginCrudResult> {
		return this.bridge.request("deleteVariable", { variableId }, this.fileKey);
	}

	async deleteVariableCollection(collectionId: string): Promise<PluginCrudResult> {
		return this.bridge.request("deleteVariableCollection", { collectionId }, this.fileKey);
	}

	async renameVariable(variableId: string, newName: string): Promise<PluginCrudResult> {
		return this.bridge.request("renameVariable", { variableId, newName }, this.fileKey);
	}

	async addMode(collectionId: string, modeName: string): Promise<PluginCrudResult> {
		return this.bridge.request("addMode", { collectionId, modeName }, this.fileKey);
	}

	async renameMode(collectionId: string, modeId: string, newName: string): Promise<PluginCrudResult> {
		return this.bridge.request("renameMode", { collectionId, modeId, newName }, this.fileKey);
	}

	async refreshVariables(): Promise<PluginCrudResult> {
		return this.bridge.request("refreshVariables", {}, this.fileKey);
	}

	async getLocalComponents(opts?: { currentPageOnly?: boolean; limit?: number }): Promise<PluginComponentPayload> {
		const params: Record<string, unknown> = {};
		if (opts?.currentPageOnly !== undefined) params.currentPageOnly = opts.currentPageOnly;
		if (opts?.limit != null && opts.limit > 0) params.limit = opts.limit;
		return this.bridge.request("getLocalComponents", params, this.fileKey);
	}

	async searchLibraryAssets(opts?: {
		query?: string;
		assetTypes?: string[];
		limit?: number;
		currentPageOnly?: boolean;
	}): Promise<unknown> {
		const params: Record<string, unknown> = {};
		if (opts?.query) params.query = opts.query;
		if (opts?.assetTypes?.length) params.assetTypes = opts.assetTypes;
		if (opts?.limit != null && opts.limit > 0) params.limit = opts.limit;
		if (opts?.currentPageOnly === false) params.currentPageOnly = false;
		return this.bridge.request("searchLibraryAssets", params, this.fileKey);
	}

	async batchExportNodes(params: {
		nodeIds: string[];
		format?: "PNG" | "SVG" | "JPG" | "PDF";
		scale?: number;
		svgOutlineText?: boolean;
		svgIncludeId?: boolean;
		svgSimplifyStroke?: boolean;
	}): Promise<{ results: Array<{ nodeId: string; name?: string; format?: string; base64?: string; byteLength?: number; error?: string }> }> {
		return this.bridge.request("batchExportNodes", params, this.fileKey);
	}

	async instantiateComponent(
		componentKey: string,
		options?: {
			nodeId?: string;
			position?: { x: number; y: number };
			size?: { width: number; height: number };
			overrides?: Record<string, unknown>;
			variant?: Record<string, string>;
			parentId?: string;
		}
	): Promise<unknown> {
		return this.bridge.request("instantiateComponent", { componentKey, options }, this.fileKey);
	}

	async setNodeDescription(nodeId: string, description: string, descriptionMarkdown?: string): Promise<unknown> {
		return this.bridge.request("setNodeDescription", { nodeId, description, descriptionMarkdown }, this.fileKey);
	}

	async addComponentProperty(
		nodeId: string,
		propertyName: string,
		type: "BOOLEAN" | "TEXT" | "INSTANCE_SWAP" | "VARIANT",
		defaultValue: unknown,
		options?: { preferredValues?: unknown[] }
	): Promise<unknown> {
		return this.bridge.request("addComponentProperty", { nodeId, propertyName, type, defaultValue, options }, this.fileKey);
	}

	async editComponentProperty(
		nodeId: string,
		propertyName: string,
		newValue: { name?: string; defaultValue?: unknown; preferredValues?: unknown[] }
	): Promise<unknown> {
		return this.bridge.request("editComponentProperty", { nodeId, propertyName, newValue }, this.fileKey);
	}

	async deleteComponentProperty(nodeId: string, propertyName: string): Promise<unknown> {
		return this.bridge.request("deleteComponentProperty", { nodeId, propertyName }, this.fileKey);
	}

	async resizeNode(nodeId: string, width: number, height: number, withConstraints: boolean = true): Promise<unknown> {
		return this.bridge.request("resizeNode", { nodeId, width, height, withConstraints }, this.fileKey);
	}

	async moveNode(nodeId: string, x: number, y: number): Promise<unknown> {
		return this.bridge.request("moveNode", { nodeId, x, y }, this.fileKey);
	}

	async setNodeFills(nodeId: string, fills: unknown[]): Promise<unknown> {
		return this.bridge.request("setNodeFills", { nodeId, fills }, this.fileKey);
	}

	async setNodeStrokes(nodeId: string, strokes: unknown[], strokeWeight?: number): Promise<unknown> {
		return this.bridge.request("setNodeStrokes", { nodeId, strokes, strokeWeight }, this.fileKey);
	}

	async setNodeOpacity(nodeId: string, opacity: number): Promise<unknown> {
		return this.bridge.request("setNodeOpacity", { nodeId, opacity }, this.fileKey);
	}

	async setNodeCornerRadius(nodeId: string, radius: number): Promise<unknown> {
		return this.bridge.request("setNodeCornerRadius", { nodeId, radius }, this.fileKey);
	}

	async cloneNode(nodeId: string): Promise<unknown> {
		return this.bridge.request("cloneNode", { nodeId }, this.fileKey);
	}

	async deleteNode(nodeId: string): Promise<unknown> {
		return this.bridge.request("deleteNode", { nodeId }, this.fileKey);
	}

	async renameNode(nodeId: string, newName: string): Promise<unknown> {
		return this.bridge.request("renameNode", { nodeId, newName }, this.fileKey);
	}

	async setTextContent(nodeId: string, text: string, options?: { fontSize?: number }): Promise<unknown> {
		return this.bridge.request("setTextContent", { nodeId, text, options }, this.fileKey);
	}

	async createChildNode(
		parentId: string,
		nodeType: "RECTANGLE" | "ELLIPSE" | "FRAME" | "TEXT" | "LINE" | "POLYGON" | "STAR" | "VECTOR",
		properties?: Record<string, unknown>
	): Promise<unknown> {
		return this.bridge.request("createChildNode", { parentId, nodeType, properties }, this.fileKey);
	}

	async captureScreenshot(nodeId: string | null, options?: { format?: string; scale?: number }): Promise<PluginScreenshotPayload> {
		return this.bridge.request("captureScreenshot", { nodeId, options }, this.fileKey);
	}

	async setInstanceProperties(nodeId: string, properties: Record<string, unknown>): Promise<PluginCrudResult> {
		return this.bridge.request("setInstanceProperties", { nodeId, properties }, this.fileKey);
	}

	async getDocumentStructure(
		depth?: number,
		verbosity?: string,
		opts?: {
			excludeScreenshot?: boolean;
			includeLayout?: boolean;
			includeVisual?: boolean;
			includeTypography?: boolean;
			includeCodeReady?: boolean;
			outputHint?: "react" | "tailwind";
		}
	): Promise<PluginDocumentStructure> {
		const params: Record<string, unknown> = { depth: depth ?? 1, verbosity: verbosity ?? "summary" };
		if (opts?.excludeScreenshot !== undefined) params.excludeScreenshot = opts.excludeScreenshot;
		if (opts?.includeLayout !== undefined) params.includeLayout = opts.includeLayout;
		if (opts?.includeVisual !== undefined) params.includeVisual = opts.includeVisual;
		if (opts?.includeTypography !== undefined) params.includeTypography = opts.includeTypography;
		if (opts?.includeCodeReady !== undefined) params.includeCodeReady = opts.includeCodeReady;
		if (opts?.outputHint !== undefined) params.outputHint = opts.outputHint;
		return this.bridge.request("getDocumentStructure", params, this.fileKey);
	}

	async getNodeContext(
		nodeId: string,
		depth?: number,
		verbosity?: string,
		opts?: {
			excludeScreenshot?: boolean;
			includeLayout?: boolean;
			includeVisual?: boolean;
			includeTypography?: boolean;
			includeCodeReady?: boolean;
			outputHint?: "react" | "tailwind";
		}
	): Promise<PluginDocumentStructure> {
		const params: Record<string, unknown> = {
			nodeId,
			depth: depth ?? 2,
			verbosity: verbosity ?? "standard",
		};
		if (opts?.excludeScreenshot !== undefined) params.excludeScreenshot = opts.excludeScreenshot;
		if (opts?.includeLayout !== undefined) params.includeLayout = opts.includeLayout;
		if (opts?.includeVisual !== undefined) params.includeVisual = opts.includeVisual;
		if (opts?.includeTypography !== undefined) params.includeTypography = opts.includeTypography;
		if (opts?.includeCodeReady !== undefined) params.includeCodeReady = opts.includeCodeReady;
		if (opts?.outputHint !== undefined) params.outputHint = opts.outputHint;
		return this.bridge.request("getNodeContext", params, this.fileKey);
	}

	async getLocalStyles(verbosity?: string): Promise<PluginStylesPayload> {
		return this.bridge.request("getLocalStyles", { verbosity: verbosity ?? "summary" }, this.fileKey);
	}

	async getConsoleLogs(limit: number = 50): Promise<{ logs: Array<{ level: string; time: number; args: unknown[] }>; total: number }> {
		const res = await this.bridge.request("getConsoleLogs", { limit }, this.fileKey);
		return ((res as Record<string, unknown>)?.data as { logs: Array<{ level: string; time: number; args: unknown[] }>; total: number }) ?? { logs: [], total: 0 };
	}

	async clearConsole(): Promise<void> {
		await this.bridge.request("clearConsole", {}, this.fileKey);
	}

	async batchCreateVariables(
		items: Array<{
			collectionId: string;
			name: string;
			resolvedType: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";
			value?: unknown;
			modeId?: string;
			valuesByMode?: Record<string, unknown>;
		}>
	): Promise<{ created: Array<{ name: string; id: string }>; failed: Array<{ name: string; error: string }> }> {
		const res = await this.bridge.request("batchCreateVariables", { items }, this.fileKey);
		return (res ?? { created: [], failed: [] }) as { created: Array<{ name: string; id: string }>; failed: Array<{ name: string; error: string }> };
	}

	async batchUpdateVariables(
		items: Array<{ variableId: string; modeId: string; value: unknown }>
	): Promise<{ updated: Array<{ variableId: string }>; failed: Array<{ variableId: string; error: string }> }> {
		const res = await this.bridge.request("batchUpdateVariables", { items }, this.fileKey);
		return (res ?? { updated: [], failed: [] }) as { updated: Array<{ variableId: string }>; failed: Array<{ variableId: string; error: string }> };
	}

	async setupDesignTokens(payload: {
		collectionName: string;
		modes: string[];
		tokens: Array<{ name: string; type?: string; value?: unknown; values?: Record<string, unknown> }> | Record<string, unknown>;
	}): Promise<PluginCrudResult> {
		const tokens = Array.isArray(payload.tokens)
			? payload.tokens
			: Object.entries(payload.tokens || {}).map(([name, v]) =>
					typeof v === "object" && v !== null && "type" in (v as object)
						? { name, ...(v as object) }
						: { name, type: "STRING", value: v }
				);
		return this.bridge.request("setupDesignTokens", {
			collectionName: payload.collectionName,
			modes: payload.modes,
			tokens,
		}, this.fileKey);
	}

	async arrangeComponentSet(nodeIds: string[]): Promise<{ nodeId: string; name: string }> {
		const res = (await this.bridge.request("arrangeComponentSet", { nodeIds }, this.fileKey)) as Record<string, unknown>;
		const data = res?.data as { nodeId: string; name: string } | undefined;
		return data ?? { nodeId: (res?.nodeId as string) ?? "", name: (res?.name as string) ?? "" };
	}

	async dispose(): Promise<void> {
		logger.info("Plugin bridge connector disposed");
	}
}
