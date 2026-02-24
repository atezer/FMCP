#!/usr/bin/env node

/**
 * F-MCP ATezer Bridge – Plugin-only MCP relay
 *
 * Minimal MCP server: NO Figma REST API, NO FIGMA_ACCESS_TOKEN, NO CDP.
 * All data comes from the F-MCP ATezer Bridge plugin via WebSocket (port 5454).
 * Claude connects to this process; plugin in Figma connects to the same process.
 *
 * Usage: node dist/local-plugin-only.js
 * Claude config: "args": ["/path/to/figma-mcp-bridge/dist/local-plugin-only.js"]
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getConfig } from "./core/config.js";
import { createChildLogger } from "./core/logger.js";
import { PluginBridgeServer } from "./core/plugin-bridge-server.js";
import { PluginBridgeConnector } from "./core/plugin-bridge-connector.js";

const logger = createChildLogger({ component: "plugin-only-mcp" });

function rgbaToHex(color: { r?: number; g?: number; b?: number; a?: number }): string {
	if (!color || typeof color !== "object") return "";
	const r = Math.round((Number((color as any).r) ?? 0) * 255);
	const g = Math.round((Number((color as any).g) ?? 0) * 255);
	const b = Math.round((Number((color as any).b) ?? 0) * 255);
	return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function normalizeTokenValue(value: unknown, resolvedType?: string): string {
	if (value === undefined || value === null) return "";
	if (typeof value === "object" && "r" in (value as object)) return rgbaToHex(value as any);
	if (typeof value === "number") return String(value);
	if (typeof value === "boolean") return value ? "true" : "false";
	return String(value).trim();
}

function normalizeForCompare(s: string): string {
	s = s.toLowerCase().trim();
	if (s.startsWith("#")) return s.replace(/\s/g, "");
	return s.replace(/\s/g, "");
}

const PLUGIN_NOT_CONNECTED =
	"F-MCP ATezer Bridge plugin not connected. Open Figma → Plugins → Development → F-MCP ATezer Bridge, wait for 'ready'.";

function getConnector(bridge: PluginBridgeServer): PluginBridgeConnector {
	if (!bridge.isConnected()) throw new Error(PLUGIN_NOT_CONNECTED);
	return new PluginBridgeConnector(bridge);
}

export async function main() {
	const config = getConfig();
	const port = config.local?.pluginBridgePort ?? 5454;
	const auditLogPath = config.local?.auditLogPath;

	const bridge = new PluginBridgeServer(port, { auditLogPath });
	bridge.start();

	const server = new McpServer({
		name: "F-MCP ATezer Bridge (Plugin-only)",
		version: "1.0.0",
	});

	// ---- figma_get_file_data_plugin (no REST, no token) ----
	server.tool(
		"figma_get_file_data",
		"Get file structure and document tree from the open Figma file. No REST API or token needed. Uses plugin only. Start with depth=1 and verbosity=summary for minimal tokens.",
		{
			depth: z.number().min(0).max(3).optional().default(1),
			verbosity: z.enum(["summary", "standard", "full"]).optional().default("summary"),
		},
		async ({ depth, verbosity }) => {
			try {
				const conn = getConnector(bridge);
				const data = await conn.getDocumentStructure(depth, verbosity);
				const text =
					data === undefined || data === null
						? JSON.stringify({ success: false, error: "No data from plugin" })
						: typeof data === "string"
							? data
							: JSON.stringify(data, null, 0);
				return { content: [{ type: "text" as const, text }] };
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: msg }, null, 0) }],
					isError: true,
				};
			}
		}
	);

	// ---- figma_get_design_context (get_design_context tarzı, token tasarruflu, Figma token yok) ----
	server.tool(
		"figma_get_design_context",
		"Design context for a node or whole file: structure + text content (TEXT nodes include 'characters'). No Figma REST API, no token, no screenshot — low token usage. Use instead of Figma's get_design_context when user asks for frame text, node context (e.g. nodeId 45:4602), or design context. If nodeId is given returns that node's subtree; otherwise returns document structure. verbosity standard/full includes text.",
		{
			nodeId: z.string().optional(),
			depth: z.number().min(0).max(3).optional().default(2),
			verbosity: z.enum(["summary", "standard", "full"]).optional().default("standard"),
			excludeScreenshot: z.boolean().optional(),
		},
		async ({ nodeId, depth, verbosity }) => {
			try {
				const conn = getConnector(bridge);
				const data = nodeId
					? await conn.getNodeContext(nodeId, depth, verbosity)
					: await conn.getDocumentStructure(depth, verbosity);
				const text =
					data === undefined || data === null
						? JSON.stringify({ success: false, error: "No data from plugin" })
						: typeof data === "string"
							? data
							: JSON.stringify(data, null, 0);
				return { content: [{ type: "text" as const, text }] };
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: msg }, null, 0) }],
					isError: true,
				};
			}
		}
	);

	// ---- figma_get_variables (plugin only, token-friendly default) ----
	server.tool(
		"figma_get_variables",
		"Get design tokens and variables from the open Figma file. No REST API or token. Returns summary by default to save tokens.",
		{
			verbosity: z.enum(["inventory", "summary", "standard", "full"]).optional().default("summary"),
		},
		async ({ verbosity }) => {
			const conn = getConnector(bridge);
			const raw = await conn.getVariablesFromPluginUI();
			if (!raw || !raw.variables) {
				return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "Variables not loaded" }) }] };
			}
			const out: any = {
				success: true,
				source: "plugin",
				variables: raw.variables,
				variableCollections: raw.variableCollections || [],
			};
			if (verbosity === "inventory") {
				out.variables = raw.variables.map((v: any) => ({ id: v.id, name: v.name }));
				out.variableCollections = (raw.variableCollections || []).map((c: any) => ({ id: c.id, name: c.name }));
			} else if (verbosity === "summary") {
				out.variables = raw.variables.map((v: any) => ({
					id: v.id,
					name: v.name,
					resolvedType: v.resolvedType,
					valuesByMode: v.valuesByMode,
				}));
			}
			return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 0) }] };
		}
	);

	// ---- figma_get_component ----
	server.tool(
		"figma_get_component",
		"Get component metadata by node ID from the open Figma file. No REST API. Use figma_get_file_data or figma_search_components to find nodeIds.",
		{ nodeId: z.string() },
		async ({ nodeId }) => {
			const conn = getConnector(bridge);
			const result = await conn.getComponentFromPluginUI(nodeId);
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
		}
	);

	// ---- figma_get_styles (plugin only) ----
	server.tool(
		"figma_get_styles",
		"Get local paint, text, and effect styles from the open Figma file. No REST API. Default verbosity=summary for token saving.",
		{ verbosity: z.enum(["summary", "full"]).optional().default("summary") },
		async ({ verbosity }) => {
			const conn = getConnector(bridge);
			const data = await conn.getLocalStyles(verbosity);
			return { content: [{ type: "text" as const, text: JSON.stringify(data || {}, null, 0) }] };
		}
	);

	// ---- figma_execute ----
	server.tool(
		"figma_execute",
		"Run JavaScript in the Figma plugin context. Full Plugin API available (figma.root, figma.createFrame, etc.). No token needed.",
		{
			code: z.string(),
			timeout: z.number().optional().default(5000),
		},
		async ({ code, timeout }) => {
			const conn = getConnector(bridge);
			const result = await conn.executeCodeViaUI(code, timeout);
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
		}
	);

	// ---- figma_capture_screenshot ----
	server.tool(
		"figma_capture_screenshot",
		"Capture screenshot of a node or current view from the plugin. No REST API.",
		{
			nodeId: z.string().optional(),
			format: z.enum(["PNG", "JPG"]).optional().default("PNG"),
			scale: z.number().optional().default(2),
		},
		async ({ nodeId, format, scale }) => {
			const conn = getConnector(bridge);
			const result = await conn.captureScreenshot(nodeId ?? null, { format, scale });
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
		}
	);

	// ---- figma_set_instance_properties ----
	server.tool(
		"figma_set_instance_properties",
		"Set component instance properties (TEXT, BOOLEAN, VARIANT, etc.).",
		{
			nodeId: z.string(),
			properties: z.record(z.union([z.string(), z.boolean()])),
		},
		async ({ nodeId, properties }) => {
			const conn = getConnector(bridge);
			const result = await conn.setInstanceProperties(nodeId, properties as Record<string, unknown>);
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
		}
	);

	// ---- Variable CRUD ----
	server.tool(
		"figma_update_variable",
		"Update a variable value in a mode. Get IDs from figma_get_variables.",
		{
			variableId: z.string(),
			modeId: z.string(),
			value: z.union([z.string(), z.number(), z.boolean()]),
		},
		async (p) => {
			const conn = getConnector(bridge);
			const result = await conn.updateVariable(p.variableId, p.modeId, p.value);
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
		}
	);

	server.tool(
		"figma_create_variable",
		"Create a variable in a collection. Get collectionId from figma_get_variables.",
		{
			name: z.string(),
			collectionId: z.string(),
			resolvedType: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN"]),
			options: z.record(z.any()).optional(),
		},
		async (p) => {
			const conn = getConnector(bridge);
			const result = await conn.createVariable(p.name, p.collectionId, p.resolvedType as any, p.options);
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
		}
	);

	server.tool(
		"figma_create_variable_collection",
		"Create a variable collection.",
		{ name: z.string(), options: z.record(z.any()).optional() },
		async (p) => {
			const conn = getConnector(bridge);
			const result = await conn.createVariableCollection(p.name, p.options);
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
		}
	);

	server.tool("figma_delete_variable", "Delete a variable.", { variableId: z.string() }, async (p) => {
		const conn = getConnector(bridge);
		const result = await conn.deleteVariable(p.variableId);
		return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
	});

	server.tool("figma_delete_variable_collection", "Delete a variable collection.", { collectionId: z.string() }, async (p) => {
		const conn = getConnector(bridge);
		const result = await conn.deleteVariableCollection(p.collectionId);
		return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
	});

	server.tool("figma_rename_variable", "Rename a variable.", { variableId: z.string(), newName: z.string() }, async (p) => {
		const conn = getConnector(bridge);
		const result = await conn.renameVariable(p.variableId, p.newName);
		return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
	});

	server.tool("figma_add_mode", "Add a mode to a collection.", { collectionId: z.string(), modeName: z.string() }, async (p) => {
		const conn = getConnector(bridge);
		const result = await conn.addMode(p.collectionId, p.modeName);
		return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
	});

	server.tool(
		"figma_rename_mode",
		"Rename a mode in a collection.",
		{ collectionId: z.string(), modeId: z.string(), newName: z.string() },
		async (p) => {
			const conn = getConnector(bridge);
			const result = await conn.renameMode(p.collectionId, p.modeId, p.newName);
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
		}
	);

	// ---- Design system summary (minimal tokens) ----
	server.tool(
		"figma_get_design_system_summary",
		"Get a compact overview: variable collection names and component counts. Minimal tokens. No REST API.",
		{},
		async () => {
			const conn = getConnector(bridge);
			const [vars, components] = await Promise.all([conn.getVariablesFromPluginUI(), conn.getLocalComponents()]);
			const compData = (components as any)?.data;
			const out = {
				success: true,
				source: "plugin",
				variableCollections: (vars?.variableCollections || []).map((c: any) => ({ id: c.id, name: c.name, variableCount: c.variableIds?.length || 0 })),
				components: compData?.totalComponents ?? 0,
				componentSets: compData?.totalComponentSets ?? 0,
			};
			return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 0) }] };
		}
	);

	// ---- figma_search_components ----
	server.tool(
		"figma_search_components",
		"Search local components by name. Returns nodeIds and names. No REST API.",
		{ query: z.string().optional() },
		async ({ query }) => {
			const conn = getConnector(bridge);
			const result = (await conn.getLocalComponents()) as any;
			const data = result?.data;
			if (!data) {
				return { content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: "No component data" }) }] };
			}
			let list = [...(data.components || []), ...(data.componentSets || [])];
			if (query && query.trim()) {
				const q = query.trim().toLowerCase();
				list = list.filter((c: any) => (c.name || "").toLowerCase().includes(q));
			}
			const summary = list.map((c: any) => ({ id: c.id, name: c.name, type: c.type }));
			return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, components: summary }, null, 0) }] };
		}
	);

	// ---- Node operations (short list) ----
	server.tool(
		"figma_instantiate_component",
		"Create a component instance. Use componentKey from figma_search_components or nodeId for local components.",
		{
			componentKey: z.string(),
			options: z
				.object({
					nodeId: z.string().optional(),
					position: z.object({ x: z.number(), y: z.number() }).optional(),
					parentId: z.string().optional(),
					overrides: z.record(z.any()).optional(),
				})
				.optional(),
		},
		async (p) => {
			const conn = getConnector(bridge);
			const result = await conn.instantiateComponent(p.componentKey, p.options || {});
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
		}
	);

	server.tool("figma_refresh_variables", "Refresh variables from the file.", {}, async () => {
		const conn = getConnector(bridge);
		const result = await conn.refreshVariables();
		return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
	});

	// ---- Console (plugin buffer, no CDP) ----
	server.tool(
		"figma_get_console_logs",
		"Get plugin console logs (log/warn/error) from the F-MCP plugin buffer. No CDP. Limit default 50.",
		{ limit: z.number().min(1).max(200).optional().default(50) },
		async ({ limit }) => {
			const conn = getConnector(bridge);
			const data = await conn.getConsoleLogs(limit);
			return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, ...data }, null, 0) }] };
		}
	);

	server.tool(
		"figma_watch_console",
		"Stream new plugin console logs until timeout. Polls the plugin buffer. Timeout default 30s.",
		{ timeoutSeconds: z.number().min(1).max(120).optional().default(30) },
		async ({ timeoutSeconds }) => {
			const conn = getConnector(bridge);
			const deadline = Date.now() + timeoutSeconds * 1000;
			const seen = new Set<string>();
			const stream: unknown[] = [];
			while (Date.now() < deadline) {
				const { logs } = await conn.getConsoleLogs(200);
				for (const entry of logs as Array<{ level: string; time: number; args: unknown[] }>) {
					const key = `${entry.time}-${JSON.stringify(entry.args)}`;
					if (!seen.has(key)) {
						seen.add(key);
						stream.push(entry);
					}
				}
				await new Promise((r) => setTimeout(r, 1000));
			}
			return {
				content: [{ type: "text" as const, text: JSON.stringify({ success: true, stream, count: stream.length }, null, 0) }],
			};
		}
	);

	server.tool("figma_clear_console", "Clear the plugin console log buffer.", {}, async () => {
		const conn = getConnector(bridge);
		await conn.clearConsole();
		return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, message: "Console cleared" }, null, 0) }] };
	});

	// ---- set_description, get_component_image, get_component_for_development ----
	server.tool(
		"figma_set_description",
		"Set description on a component, component set, or style node. Supports markdown (descriptionMarkdown).",
		{
			nodeId: z.string(),
			description: z.string(),
			descriptionMarkdown: z.string().optional(),
		},
		async (p) => {
			const conn = getConnector(bridge);
			const result = await conn.setNodeDescription(p.nodeId, p.description, p.descriptionMarkdown);
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
		}
	);

	server.tool(
		"figma_get_component_image",
		"Get screenshot of a node (component/frame). Returns base64 image. No REST API.",
		{
			nodeId: z.string(),
			scale: z.number().min(0.5).max(4).optional().default(2),
			format: z.enum(["PNG", "JPG"]).optional().default("PNG"),
		},
		async ({ nodeId, scale, format }) => {
			const conn = getConnector(bridge);
			const result = await conn.captureScreenshot(nodeId, { scale, format });
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
		}
	);

	server.tool(
		"figma_get_component_for_development",
		"Get component metadata plus base64 screenshot in one call. For design-to-code workflows.",
		{
			nodeId: z.string(),
			scale: z.number().min(0.5).max(4).optional().default(2),
			format: z.enum(["PNG", "JPG"]).optional().default("PNG"),
		},
		async ({ nodeId, scale, format }) => {
			const conn = getConnector(bridge);
			const [component, screenshot] = await Promise.all([
				conn.getComponentFromPluginUI(nodeId),
				conn.captureScreenshot(nodeId, { scale, format }),
			]);
			const comp = (component as any)?.component ?? component;
			const out = { success: true, component: comp, image: (screenshot as any)?.image ?? (screenshot as any)?.data };
			return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 0) }] };
		}
	);

	// ---- Batch variables & setup_design_tokens & arrange_component_set ----
	server.tool(
		"figma_batch_create_variables",
		"Create up to 100 variables in one call. Each item: collectionId, name, resolvedType (COLOR/FLOAT/STRING/BOOLEAN), value, modeId. Returns created and failed lists.",
		{
			items: z.array(
				z.object({
					collectionId: z.string(),
					name: z.string(),
					resolvedType: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN"]),
					value: z.unknown().optional(),
					modeId: z.string().optional(),
					valuesByMode: z.record(z.unknown()).optional(),
				})
			).max(100),
		},
		async ({ items }) => {
			const conn = getConnector(bridge);
			const result = await conn.batchCreateVariables(items);
			return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, ...result }, null, 0) }] };
		}
	);

	server.tool(
		"figma_batch_update_variables",
		"Update up to 100 variables. Each item: variableId, modeId, value. Returns updated and failed lists.",
		{
			items: z.array(
				z.object({
					variableId: z.string(),
					modeId: z.string(),
					value: z.union([z.string(), z.number(), z.boolean()]),
				})
			).max(100),
		},
		async ({ items }) => {
			const conn = getConnector(bridge);
			const result = await conn.batchUpdateVariables(items);
			return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, ...result }, null, 0) }] };
		}
	);

	server.tool(
		"figma_setup_design_tokens",
		"Atomically create a variable collection + modes + variables. Rollback on any error. Params: collectionName, modes (array), tokens (array of { name, type?, value? or values? }).",
		{
			collectionName: z.string(),
			modes: z.array(z.string()).min(1),
			tokens: z.array(
				z.object({
					name: z.string(),
					type: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN"]).optional(),
					value: z.unknown().optional(),
					values: z.record(z.unknown()).optional(),
				})
			),
		},
		async (p) => {
			const conn = getConnector(bridge);
			const result = await conn.setupDesignTokens(p);
			return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 0) }] };
		}
	);

	server.tool(
		"figma_arrange_component_set",
		"Combine multiple component nodes into one Figma component set (combineAsVariants). Params: nodeIds (array of at least 2 component node IDs). Returns new component set nodeId.",
		{ nodeIds: z.array(z.string()).min(2) },
		async ({ nodeIds }) => {
			const conn = getConnector(bridge);
			const result = await conn.arrangeComponentSet(nodeIds);
			return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, ...result }, null, 0) }] };
		}
	);

	// ---- figma_check_design_parity (design–code gap analysis) ----
	server.tool(
		"figma_check_design_parity",
		"Compare Figma design tokens (variables + styles) with code-side tokens. Critical for design-code gap analysis. Returns matching, inFigmaOnly, inCodeOnly, and divergent (same name, different value). Optional codeTokens: JSON string of expected tokens, e.g. {\"primary\": \"#0066cc\", \"spacing.md\": 16} or {\"primary\": {\"value\": \"#0066cc\"}}.",
		{
			codeTokens: z.string().optional(),
		},
		async ({ codeTokens }) => {
			try {
				const conn = getConnector(bridge);
				const [varsPayload, stylesPayload] = await Promise.all([
					conn.getVariablesFromPluginUI(),
					conn.getLocalStyles("full"),
				]);

				const figmaMap = new Map<string, string>();

				// Variables: name -> first mode value (normalized string)
				const variables = (varsPayload as any)?.variables || [];
				const collections = (varsPayload as any)?.variableCollections || [];
				const collectionNames = new Map<string, string>();
				for (const c of collections) {
					collectionNames.set(c.id, c.name || c.id);
				}
				for (const v of variables) {
					const name = v.name || v.id;
					const val = v.valuesByMode;
					const firstMode = val && typeof val === "object" ? Object.values(val)[0] : undefined;
					figmaMap.set(name, normalizeTokenValue(firstMode, v.resolvedType));
				}

				// Paint styles: name -> color string
				const paintStyles = (stylesPayload as any)?.paintStyles || [];
				for (const s of paintStyles) {
					const name = s.name || s.id;
					const fills = s.paints || [];
					const solid = fills.find((p: any) => p.type === "SOLID");
					figmaMap.set(name, solid ? rgbaToHex(solid.color) : "");
				}

				// Text styles: name -> fontSize or "fontStyle"
				const textStyles = (stylesPayload as any)?.textStyles || [];
				for (const s of textStyles) {
					const name = s.name || s.id;
					const fontSize = s.fontSize ?? s.style?.fontSize;
					figmaMap.set(name, fontSize != null ? String(fontSize) : "");
				}

				if (!codeTokens || !codeTokens.trim()) {
					const list = Array.from(figmaMap.entries()).map(([name, value]) => ({ name, value }));
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify(
									{
										success: true,
										source: "figma_only",
										message: "No codeTokens provided. Listing Figma tokens only. Pass codeTokens (JSON string) for parity comparison.",
										figmaTokenCount: figmaMap.size,
										figmaTokens: list,
									},
									null,
									0
								),
							},
						],
					};
				}

				let codeMap: Map<string, string>;
				try {
					const parsed = JSON.parse(codeTokens) as Record<string, unknown>;
					codeMap = new Map<string, string>();
					for (const [k, v] of Object.entries(parsed)) {
						if (v != null && typeof v === "object" && "value" in (v as object)) {
							codeMap.set(k, normalizeTokenValue((v as { value: unknown }).value, undefined));
						} else {
							codeMap.set(k, normalizeTokenValue(v, undefined));
						}
					}
				} catch {
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify({ success: false, error: "codeTokens must be valid JSON" }, null, 0),
							},
						],
						isError: true,
					};
				}

				const matching: { name: string; value: string }[] = [];
				const divergent: { name: string; figmaValue: string; codeValue: string }[] = [];
				const inFigmaOnly: { name: string; value: string }[] = [];
				const inCodeOnly: { name: string; value: string }[] = [];

				for (const [name, figVal] of figmaMap) {
					const codeVal = codeMap.get(name);
					if (codeVal === undefined) {
						inFigmaOnly.push({ name, value: figVal });
					} else if (normalizeForCompare(figVal) === normalizeForCompare(codeVal)) {
						matching.push({ name, value: figVal });
					} else {
						divergent.push({ name, figmaValue: figVal, codeValue: codeVal });
					}
				}
				for (const [name, codeVal] of codeMap) {
					if (!figmaMap.has(name)) inCodeOnly.push({ name, value: codeVal });
				}

				const out = {
					success: true,
					summary: {
						matching: matching.length,
						divergent: divergent.length,
						inFigmaOnly: inFigmaOnly.length,
						inCodeOnly: inCodeOnly.length,
					},
					matching,
					divergent,
					inFigmaOnly,
					inCodeOnly,
				};
				return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 0) }] };
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: msg }, null, 0) }],
					isError: true,
				};
			}
		}
	);

	// ---- figma_get_token_browser (Token Browser – kurulum özel MCP App) ----
	server.tool(
		"figma_get_token_browser",
		"Token Browser: hierarchical view of design tokens for browsing. Returns variable collections with variables and modes, plus paint and text styles. Use for exploring and auditing tokens in the open Figma file. No REST API.",
		{
			verbosity: z.enum(["summary", "full"]).optional().default("summary"),
		},
		async ({ verbosity }) => {
			try {
				const conn = getConnector(bridge);
				const [varsPayload, stylesPayload] = await Promise.all([
					conn.getVariablesFromPluginUI(),
					conn.getLocalStyles(verbosity === "full" ? "full" : "summary"),
				]);

				const variables = (varsPayload as any)?.variables || [];
				const collections = (varsPayload as any)?.variableCollections || [];
				const paintStyles = (stylesPayload as any)?.paintStyles || [];
				const textStyles = (stylesPayload as any)?.textStyles || [];

				const collectionById = new Map<string, any>();
				for (const c of collections) {
					collectionById.set(c.id, {
						id: c.id,
						name: c.name,
						modes: (c.modes || []).map((m: any) => ({ id: m.id, name: m.name })),
						variables: [],
					});
				}
				for (const v of variables) {
					const c = collectionById.get(v.variableCollectionId);
					if (!c) continue;
					const entry: any = {
						id: v.id,
						name: v.name,
						resolvedType: v.resolvedType,
						description: v.description || undefined,
					};
					if (verbosity === "full") {
						entry.valuesByMode = v.valuesByMode;
						entry.scopes = v.scopes;
					} else {
						entry.valuesByMode = v.valuesByMode;
					}
					c.variables.push(entry);
				}

				const out = {
					success: true,
					source: "plugin",
					tokenBrowser: {
						variableCollections: Array.from(collectionById.values()),
						paintStyles: paintStyles.map((s: any) =>
							verbosity === "full"
								? s
								: { id: s.id, name: s.name, paints: s.paints }
						),
						textStyles: textStyles.map((s: any) =>
							verbosity === "full"
								? s
								: { id: s.id, name: s.name, fontSize: s.fontSize ?? s.style?.fontSize, fontName: s.fontName ?? s.style?.fontName }
						),
					},
				};
				return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 0) }] };
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return {
					content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: msg }, null, 0) }],
					isError: true,
				};
			}
		}
	);

	// ---- figma_get_status (plugin-only) ----
	server.tool(
		"figma_get_status",
		"Check if F-MCP ATezer Bridge plugin is connected. No REST API or token.",
		{},
		async () => {
			const connected = bridge.isConnected();
			const msg = connected
				? "F-MCP ATezer Bridge plugin is connected. You can use all figma_* tools."
				: PLUGIN_NOT_CONNECTED;
			return { content: [{ type: "text" as const, text: JSON.stringify({ pluginConnected: connected, message: msg }, null, 0) }] };
		}
	);

	const transport = new StdioServerTransport();
	await server.connect(transport);
	logger.info({ port }, "F-MCP ATezer Bridge (plugin-only) MCP server running on stdio; WebSocket on port %s", port);
}

main().catch((err) => {
	logger.error({ err }, "Fatal");
	process.exit(1);
});
