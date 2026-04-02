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
import { parseFigmaUrl } from "./core/figma-url.js";
import { truncateRestResponse } from "./core/response-guard.js";
const logger = createChildLogger({ component: "plugin-only-mcp" });
/** Resolve fileKey from figmaUrl (parse) or explicit fileKey. Returns undefined if neither yields a key. */
function resolveFileKey(figmaUrl, explicitFileKey) {
    if (explicitFileKey && explicitFileKey.trim())
        return explicitFileKey.trim();
    if (figmaUrl) {
        const parsed = parseFigmaUrl(figmaUrl);
        if (parsed?.fileKey)
            return parsed.fileKey;
    }
    return undefined;
}
/** For figma_get_design_context: resolve fileKey and nodeId from figmaUrl or explicit params. */
function resolveDesignContextParams(params) {
    const fileKey = resolveFileKey(params.figmaUrl, params.fileKey);
    let nodeId = params.nodeId?.trim();
    if (!nodeId && params.figmaUrl) {
        const parsed = parseFigmaUrl(params.figmaUrl);
        if (parsed?.nodeId)
            nodeId = parsed.nodeId;
    }
    return { fileKey, nodeId: nodeId || undefined };
}
function rgbaToHex(color) {
    if (!color || typeof color !== "object")
        return "";
    const r = Math.round((Number(color.r) ?? 0) * 255);
    const g = Math.round((Number(color.g) ?? 0) * 255);
    const b = Math.round((Number(color.b) ?? 0) * 255);
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function normalizeTokenValue(value, resolvedType) {
    if (value === undefined || value === null)
        return "";
    if (typeof value === "object" && "r" in value)
        return rgbaToHex(value);
    if (typeof value === "number")
        return String(value);
    if (typeof value === "boolean")
        return value ? "true" : "false";
    return String(value).trim();
}
function normalizeForCompare(s) {
    s = s.toLowerCase().trim();
    if (s.startsWith("#"))
        return s.replace(/\s/g, "");
    return s.replace(/\s/g, "");
}
const PLUGIN_NOT_CONNECTED = "F-MCP ATezer Bridge plugin not connected. Open Figma → Plugins → Development → F-MCP ATezer Bridge, wait for 'ready'.";
function getConnector(bridge, fileKey) {
    if (!bridge.isConnected(fileKey)) {
        if (fileKey) {
            const connected = bridge.listConnectedFiles();
            const fileList = connected.length > 0
                ? ` Connected files: ${connected.map(f => `${f.fileName || "?"} (${f.fileKey || "?"})`).join(", ")}`
                : "";
            throw new Error(`No plugin connected for fileKey "${fileKey}".${fileList} ` +
                "Open the target file in Figma and run the F-MCP ATezer Bridge plugin.");
        }
        throw new Error(PLUGIN_NOT_CONNECTED);
    }
    return new PluginBridgeConnector(bridge, fileKey);
}
export async function main() {
    const config = getConfig();
    const port = config.local?.pluginBridgePort ?? 5454;
    const auditLogPath = config.local?.auditLogPath;
    const bridge = new PluginBridgeServer(port, { auditLogPath });
    bridge.start();
    const server = new McpServer({
        name: "F-MCP ATezer Bridge (Plugin-only)",
        version: "1.4.3",
    });
    // ---- figma_list_connected_files (multi-client discovery) ----
    server.registerTool("figma_list_connected_files", {
        description: "List all currently connected Figma/FigJam plugin instances (Figma Desktop, FigJam browser, Figma browser). Returns fileKey, fileName, and connection time for each. Use when multiple windows or agents are active. Pass the returned fileKey (or a Figma/FigJam URL via figmaUrl) to other tools to target a specific file.",
        inputSchema: {},
        annotations: { readOnlyHint: true },
    }, async () => {
        const files = bridge.listConnectedFiles();
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        connectedFiles: files,
                        totalConnections: files.length,
                        message: files.length === 0
                            ? "No plugins connected. Open Figma and run the F-MCP ATezer Bridge plugin."
                            : `${files.length} plugin(s) connected. Use fileKey parameter in other tools to target a specific file.`,
                    }, null, 0),
                }],
        };
    });
    // ---- figma_get_file_data_plugin (no REST, no token) ----
    server.registerTool("figma_get_file_data", {
        description: "Get file structure and document tree from the open Figma file. No REST API or token. Use fileKey or figmaUrl to target a specific file when multiple plugins are connected (Figma Desktop, FigJam browser, Figma browser). Pass a Figma/FigJam URL in figmaUrl to route by link.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL; fileKey is extracted from the link for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file. Use figma_list_connected_files to see available files."),
            depth: z.number().min(0).max(3).optional().default(1),
            verbosity: z.enum(["summary", "standard", "full"]).optional().default("summary"),
            includeLayout: z.boolean().optional(),
            includeVisual: z.boolean().optional(),
            includeTypography: z.boolean().optional(),
            includeCodeReady: z.boolean().optional(),
            outputHint: z.enum(["react", "tailwind"]).optional(),
        },
        annotations: { readOnlyHint: true },
    }, async ({ figmaUrl, fileKey, depth, verbosity, includeLayout, includeVisual, includeTypography, includeCodeReady, outputHint }) => {
        try {
            const resolvedKey = resolveFileKey(figmaUrl, fileKey);
            if (figmaUrl && !resolvedKey) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ success: false, error: "Invalid Figma/FigJam URL: could not extract file key." }, null, 0) }],
                    isError: true,
                };
            }
            const conn = getConnector(bridge, resolvedKey);
            const opts = includeLayout !== undefined ||
                includeVisual !== undefined ||
                includeTypography !== undefined ||
                includeCodeReady !== undefined ||
                outputHint !== undefined
                ? { includeLayout, includeVisual, includeTypography, includeCodeReady, outputHint }
                : undefined;
            const data = await conn.getDocumentStructure(depth, verbosity, opts);
            const text = data === undefined || data === null
                ? JSON.stringify({ success: false, error: "No data from plugin" })
                : typeof data === "string"
                    ? data
                    : JSON.stringify(data, null, 0);
            return { content: [{ type: "text", text }] };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, error: msg }, null, 0) }],
                isError: true,
            };
        }
    });
    // ---- figma_get_design_context (get_design_context tarzı, token tasarruflu, Figma token yok) ----
    server.registerTool("figma_get_design_context", {
        description: "Design context for a node or whole file: structure + text, layout/visual/typography. Use fileKey or figmaUrl to target a file when multiple plugins are connected. Pass a Figma/FigJam URL in figmaUrl; fileKey and node-id (if present in the link) are extracted automatically.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL; fileKey and optional node-id are extracted for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            nodeId: z.string().optional(),
            depth: z.number().min(0).max(3).optional().default(2),
            verbosity: z.enum(["summary", "standard", "full"]).optional().default("standard"),
            excludeScreenshot: z.boolean().optional(),
            includeLayout: z.boolean().optional(),
            includeVisual: z.boolean().optional(),
            includeTypography: z.boolean().optional(),
            includeCodeReady: z.boolean().optional(),
            outputHint: z.enum(["react", "tailwind"]).optional(),
        },
        annotations: { readOnlyHint: true },
    }, async ({ figmaUrl, fileKey, nodeId, depth, verbosity, excludeScreenshot, includeLayout, includeVisual, includeTypography, includeCodeReady, outputHint }) => {
        try {
            const { fileKey: resolvedKey, nodeId: resolvedNodeId } = resolveDesignContextParams({ figmaUrl, fileKey, nodeId });
            if (figmaUrl && !resolvedKey) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ success: false, error: "Invalid Figma/FigJam URL: could not extract file key." }, null, 0) }],
                    isError: true,
                };
            }
            const conn = getConnector(bridge, resolvedKey);
            const opts = excludeScreenshot !== undefined ||
                includeLayout !== undefined ||
                includeVisual !== undefined ||
                includeTypography !== undefined ||
                includeCodeReady !== undefined ||
                outputHint !== undefined
                ? { excludeScreenshot, includeLayout, includeVisual, includeTypography, includeCodeReady, outputHint }
                : undefined;
            const effectiveNodeId = resolvedNodeId ?? nodeId?.trim();
            const data = effectiveNodeId
                ? await conn.getNodeContext(effectiveNodeId, depth, verbosity, opts)
                : await conn.getDocumentStructure(depth, verbosity, opts);
            const text = data === undefined || data === null
                ? JSON.stringify({ success: false, error: "No data from plugin" })
                : typeof data === "string"
                    ? data
                    : JSON.stringify(data, null, 0);
            return { content: [{ type: "text", text }] };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, error: msg }, null, 0) }],
                isError: true,
            };
        }
    });
    // ---- figma_get_variables (plugin only, token-friendly default) ----
    server.registerTool("figma_get_variables", {
        description: "Get design tokens and variables from the open Figma file. No REST API or token. Use fileKey or figmaUrl to target a specific file when multiple plugins are connected.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            verbosity: z.enum(["inventory", "summary", "standard", "full"]).optional().default("summary"),
        },
        annotations: { readOnlyHint: true },
    }, async ({ figmaUrl, fileKey, verbosity }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const raw = await conn.getVariablesFromPluginUI();
        if (!raw || !raw.variables) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "Variables not loaded" }) }] };
        }
        const out = {
            success: true,
            source: "plugin",
            variables: raw.variables,
            variableCollections: raw.variableCollections || [],
        };
        if (verbosity === "inventory") {
            out.variables = raw.variables.map((v) => ({ id: v.id, name: v.name }));
            out.variableCollections = (raw.variableCollections || []).map((c) => ({ id: c.id, name: c.name }));
        }
        else if (verbosity === "summary") {
            out.variables = raw.variables.map((v) => ({
                id: v.id,
                name: v.name,
                resolvedType: v.resolvedType,
                valuesByMode: v.valuesByMode,
            }));
        }
        return { content: [{ type: "text", text: JSON.stringify(out, null, 0) }] };
    });
    // ---- figma_get_component ----
    server.registerTool("figma_get_component", {
        description: "Get component metadata by node ID from the open Figma file. No REST API. Use fileKey or figmaUrl to target a specific file.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            nodeId: z.string(),
        },
        annotations: { readOnlyHint: true },
    }, async ({ figmaUrl, fileKey, nodeId }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const result = await conn.getComponentFromPluginUI(nodeId);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    // ---- figma_get_styles (plugin only) ----
    server.registerTool("figma_get_styles", {
        description: "Get local paint, text, and effect styles from the open Figma file. No REST API. Use fileKey or figmaUrl to target a specific file.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            verbosity: z.enum(["summary", "full"]).optional().default("summary"),
        },
        annotations: { readOnlyHint: true },
    }, async ({ figmaUrl, fileKey, verbosity }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const data = await conn.getLocalStyles(verbosity);
        return { content: [{ type: "text", text: JSON.stringify(data || {}, null, 0) }] };
    });
    // ---- figma_execute ----
    server.registerTool("figma_execute", {
        description: "Run JavaScript in the Figma plugin context. Full Plugin API available. Use fileKey or figmaUrl to target a specific file.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            code: z.string(),
            timeout: z.number().optional().default(5000),
        },
        annotations: { destructiveHint: true },
    }, async ({ figmaUrl, fileKey, code, timeout }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const result = await conn.executeCodeViaUI(code, timeout);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    // ---- figma_capture_screenshot ----
    server.registerTool("figma_capture_screenshot", {
        description: "Capture screenshot of a node or current view from the plugin. No REST API. Use fileKey or figmaUrl to target a specific file.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            nodeId: z.string().optional(),
            format: z.enum(["PNG", "JPG"]).optional().default("PNG"),
            scale: z.number().optional().default(2),
        },
        annotations: { readOnlyHint: true },
    }, async ({ figmaUrl, fileKey, nodeId, format, scale }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const result = await conn.captureScreenshot(nodeId ?? null, { format, scale });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    // ---- figma_set_instance_properties ----
    server.registerTool("figma_set_instance_properties", {
        description: "Set component instance properties (TEXT, BOOLEAN, VARIANT, etc.). Use fileKey or figmaUrl to target a specific file.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            nodeId: z.string(),
            properties: z.record(z.union([z.string(), z.boolean()])),
        },
        annotations: { destructiveHint: true },
    }, async ({ figmaUrl, fileKey, nodeId, properties }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const result = await conn.setInstanceProperties(nodeId, properties);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    // ---- Variable CRUD ----
    server.registerTool("figma_update_variable", {
        description: "Update a variable value in a mode. Get IDs from figma_get_variables.",
        inputSchema: {
            variableId: z.string(),
            modeId: z.string(),
            value: z.union([z.string(), z.number(), z.boolean()]),
        },
        annotations: { destructiveHint: true },
    }, async (p) => {
        const conn = getConnector(bridge);
        const result = await conn.updateVariable(p.variableId, p.modeId, p.value);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    server.registerTool("figma_create_variable", {
        description: "Create a variable in a collection. Get collectionId from figma_get_variables.",
        inputSchema: {
            name: z.string(),
            collectionId: z.string(),
            resolvedType: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN"]),
            options: z.record(z.any()).optional(),
        },
        annotations: { destructiveHint: true },
    }, async (p) => {
        const conn = getConnector(bridge);
        const result = await conn.createVariable(p.name, p.collectionId, p.resolvedType, p.options);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    server.registerTool("figma_create_variable_collection", {
        description: "Create a variable collection.",
        inputSchema: { name: z.string(), options: z.record(z.any()).optional() },
        annotations: { destructiveHint: true },
    }, async (p) => {
        const conn = getConnector(bridge);
        const result = await conn.createVariableCollection(p.name, p.options);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    server.registerTool("figma_delete_variable", {
        description: "Delete a variable.",
        inputSchema: { variableId: z.string() },
        annotations: { destructiveHint: true },
    }, async (p) => {
        const conn = getConnector(bridge);
        const result = await conn.deleteVariable(p.variableId);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    server.registerTool("figma_delete_variable_collection", {
        description: "Delete a variable collection.",
        inputSchema: { collectionId: z.string() },
        annotations: { destructiveHint: true },
    }, async (p) => {
        const conn = getConnector(bridge);
        const result = await conn.deleteVariableCollection(p.collectionId);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    server.registerTool("figma_rename_variable", {
        description: "Rename a variable.",
        inputSchema: { variableId: z.string(), newName: z.string() },
        annotations: { destructiveHint: true },
    }, async (p) => {
        const conn = getConnector(bridge);
        const result = await conn.renameVariable(p.variableId, p.newName);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    server.registerTool("figma_add_mode", {
        description: "Add a mode to a collection.",
        inputSchema: { collectionId: z.string(), modeName: z.string() },
        annotations: { destructiveHint: true },
    }, async (p) => {
        const conn = getConnector(bridge);
        const result = await conn.addMode(p.collectionId, p.modeName);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    server.registerTool("figma_rename_mode", {
        description: "Rename a mode in a collection.",
        inputSchema: { collectionId: z.string(), modeId: z.string(), newName: z.string() },
        annotations: { destructiveHint: true },
    }, async (p) => {
        const conn = getConnector(bridge);
        const result = await conn.renameMode(p.collectionId, p.modeId, p.newName);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    // ---- Design system summary (minimal tokens) ----
    server.registerTool("figma_get_design_system_summary", {
        description: "Get a compact overview: variable collection names and component counts. Minimal tokens. Use fileKey or figmaUrl to target a specific file.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            currentPageOnly: z.boolean().optional().default(true),
            limit: z.number().min(0).optional(),
        },
        annotations: { readOnlyHint: true },
    }, async ({ figmaUrl, fileKey, currentPageOnly, limit }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const [vars, components] = await Promise.all([
            conn.getVariablesFromPluginUI(),
            conn.getLocalComponents({ currentPageOnly, limit }),
        ]);
        const compData = components?.data;
        const out = {
            success: true,
            source: "plugin",
            currentPageOnly: currentPageOnly,
            variableCollections: (vars?.variableCollections || []).map((c) => ({ id: c.id, name: c.name, variableCount: c.variableIds?.length || 0 })),
            components: compData?.totalComponents ?? 0,
            componentSets: compData?.totalComponentSets ?? 0,
        };
        return { content: [{ type: "text", text: JSON.stringify(out, null, 0) }] };
    });
    // ---- figma_search_components ----
    server.registerTool("figma_search_components", {
        description: "Search local components by name. Returns nodeIds and names. No REST API. Use fileKey or figmaUrl to target a specific file.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            query: z.string().optional(),
            currentPageOnly: z.boolean().optional().default(true),
            limit: z.number().min(0).optional(),
        },
        annotations: { readOnlyHint: true },
    }, async ({ figmaUrl, fileKey, query, currentPageOnly, limit }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const result = (await conn.getLocalComponents({ currentPageOnly, limit }));
        const data = result?.data;
        if (!data) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: "No component data" }) }] };
        }
        let list = [...(data.components || []), ...(data.componentSets || [])];
        if (query && query.trim()) {
            const q = query.trim().toLowerCase();
            list = list.filter((c) => (c.name || "").toLowerCase().includes(q));
        }
        const summary = list.map((c) => ({ id: c.id, name: c.name, key: c.key, type: c.type }));
        return { content: [{ type: "text", text: JSON.stringify({ success: true, components: summary }, null, 0) }] };
    });
    // ---- Node operations (short list) ----
    server.registerTool("figma_instantiate_component", {
        description: "Create a component instance. Use componentKey from figma_search_components or nodeId for local components.",
        inputSchema: {
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
        annotations: { destructiveHint: true },
    }, async (p) => {
        const conn = getConnector(bridge);
        const result = await conn.instantiateComponent(p.componentKey, p.options || {});
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    server.registerTool("figma_refresh_variables", {
        description: "Refresh variables from the file.",
        inputSchema: {},
        annotations: { readOnlyHint: false, destructiveHint: false },
    }, async () => {
        const conn = getConnector(bridge);
        const result = await conn.refreshVariables();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    // ---- Console (plugin buffer, no CDP) ----
    server.registerTool("figma_get_console_logs", {
        description: "Get plugin console logs (log/warn/error) from the F-MCP plugin buffer. No CDP. Limit default 50.",
        inputSchema: { limit: z.number().min(1).max(200).optional().default(50) },
        annotations: { readOnlyHint: true },
    }, async ({ limit }) => {
        const conn = getConnector(bridge);
        const data = await conn.getConsoleLogs(limit);
        return { content: [{ type: "text", text: JSON.stringify({ success: true, ...data }, null, 0) }] };
    });
    server.registerTool("figma_watch_console", {
        description: "Stream new plugin console logs until timeout. Polls the plugin buffer. Timeout default 30s.",
        inputSchema: { timeoutSeconds: z.number().min(1).max(120).optional().default(30) },
        annotations: { readOnlyHint: true },
    }, async ({ timeoutSeconds }) => {
        const conn = getConnector(bridge);
        const deadline = Date.now() + timeoutSeconds * 1000;
        const seen = new Set();
        const stream = [];
        while (Date.now() < deadline) {
            const { logs } = await conn.getConsoleLogs(200);
            for (const entry of logs) {
                const key = `${entry.time}-${JSON.stringify(entry.args)}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    stream.push(entry);
                }
            }
            await new Promise((r) => setTimeout(r, 1000));
        }
        return {
            content: [{ type: "text", text: JSON.stringify({ success: true, stream, count: stream.length }, null, 0) }],
        };
    });
    server.registerTool("figma_clear_console", {
        description: "Clear the plugin console log buffer.",
        inputSchema: {},
        annotations: { destructiveHint: true },
    }, async () => {
        const conn = getConnector(bridge);
        await conn.clearConsole();
        return { content: [{ type: "text", text: JSON.stringify({ success: true, message: "Console cleared" }, null, 0) }] };
    });
    // ---- set_description, get_component_image, get_component_for_development ----
    server.registerTool("figma_set_description", {
        description: "Set description on a component, component set, or style node. Supports markdown (descriptionMarkdown).",
        inputSchema: {
            nodeId: z.string(),
            description: z.string(),
            descriptionMarkdown: z.string().optional(),
        },
        annotations: { destructiveHint: true },
    }, async (p) => {
        const conn = getConnector(bridge);
        const result = await conn.setNodeDescription(p.nodeId, p.description, p.descriptionMarkdown);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    server.registerTool("figma_get_component_image", {
        description: "Get screenshot of a node (component/frame). Returns base64 image. No REST API.",
        inputSchema: {
            nodeId: z.string(),
            scale: z.number().min(0.5).max(4).optional().default(2),
            format: z.enum(["PNG", "JPG"]).optional().default("PNG"),
        },
        annotations: { readOnlyHint: true },
    }, async ({ nodeId, scale, format }) => {
        const conn = getConnector(bridge);
        const result = await conn.captureScreenshot(nodeId, { scale, format });
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    server.registerTool("figma_get_component_for_development", {
        description: "Get component metadata plus base64 screenshot in one call. For design-to-code workflows.",
        inputSchema: {
            nodeId: z.string(),
            scale: z.number().min(0.5).max(4).optional().default(2),
            format: z.enum(["PNG", "JPG"]).optional().default("PNG"),
        },
        annotations: { readOnlyHint: true },
    }, async ({ nodeId, scale, format }) => {
        const conn = getConnector(bridge);
        const [component, screenshot] = await Promise.all([
            conn.getComponentFromPluginUI(nodeId),
            conn.captureScreenshot(nodeId, { scale, format }),
        ]);
        const comp = component?.component ?? component;
        const out = { success: true, component: comp, image: screenshot?.image ?? screenshot?.data };
        return { content: [{ type: "text", text: JSON.stringify(out, null, 0) }] };
    });
    // ---- Batch variables & setup_design_tokens & arrange_component_set ----
    server.registerTool("figma_batch_create_variables", {
        description: "Create up to 100 variables in one call. Each item: collectionId, name, resolvedType (COLOR/FLOAT/STRING/BOOLEAN), value, modeId. Returns created and failed lists.",
        inputSchema: {
            items: z.array(z.object({
                collectionId: z.string(),
                name: z.string(),
                resolvedType: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN"]),
                value: z.unknown().optional(),
                modeId: z.string().optional(),
                valuesByMode: z.record(z.unknown()).optional(),
            })).max(100),
        },
        annotations: { destructiveHint: true },
    }, async ({ items }) => {
        const conn = getConnector(bridge);
        const result = await conn.batchCreateVariables(items);
        return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }, null, 0) }] };
    });
    server.registerTool("figma_batch_update_variables", {
        description: "Update up to 100 variables. Each item: variableId, modeId, value. Returns updated and failed lists.",
        inputSchema: {
            items: z.array(z.object({
                variableId: z.string(),
                modeId: z.string(),
                value: z.union([z.string(), z.number(), z.boolean()]),
            })).max(100),
        },
        annotations: { destructiveHint: true },
    }, async ({ items }) => {
        const conn = getConnector(bridge);
        const result = await conn.batchUpdateVariables(items);
        return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }, null, 0) }] };
    });
    server.registerTool("figma_setup_design_tokens", {
        description: "Atomically create a variable collection + modes + variables. Rollback on any error. Params: collectionName, modes (array), tokens (array of { name, type?, value? or values? }).",
        inputSchema: {
            collectionName: z.string(),
            modes: z.array(z.string()).min(1),
            tokens: z.array(z.object({
                name: z.string(),
                type: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN"]).optional(),
                value: z.unknown().optional(),
                values: z.record(z.unknown()).optional(),
            })),
        },
        annotations: { destructiveHint: true },
    }, async (p) => {
        const conn = getConnector(bridge);
        const result = await conn.setupDesignTokens(p);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 0) }] };
    });
    server.registerTool("figma_arrange_component_set", {
        description: "Combine multiple component nodes into one Figma component set (combineAsVariants). Params: nodeIds (array of at least 2 component node IDs). Returns new component set nodeId.",
        inputSchema: { nodeIds: z.array(z.string()).min(2) },
        annotations: { destructiveHint: true },
    }, async ({ nodeIds }) => {
        const conn = getConnector(bridge);
        const result = await conn.arrangeComponentSet(nodeIds);
        return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }, null, 0) }] };
    });
    // ---- figma_check_design_parity (design–code gap analysis) ----
    server.registerTool("figma_check_design_parity", {
        description: "Compare Figma design tokens (variables + styles) with code-side tokens. Critical for design-code gap analysis. Returns matching, inFigmaOnly, inCodeOnly, and divergent (same name, different value). Optional codeTokens: JSON string of expected tokens, e.g. {\"primary\": \"#0066cc\", \"spacing.md\": 16} or {\"primary\": {\"value\": \"#0066cc\"}}.",
        inputSchema: {
            codeTokens: z.string().optional(),
        },
        annotations: { readOnlyHint: true },
    }, async ({ codeTokens }) => {
        try {
            const conn = getConnector(bridge);
            const [varsPayload, stylesPayload] = await Promise.all([
                conn.getVariablesFromPluginUI(),
                conn.getLocalStyles("full"),
            ]);
            const figmaMap = new Map();
            // Variables: name -> first mode value (normalized string)
            const variables = varsPayload?.variables || [];
            const collections = varsPayload?.variableCollections || [];
            const collectionNames = new Map();
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
            const paintStyles = stylesPayload?.paintStyles || [];
            for (const s of paintStyles) {
                const name = s.name || s.id;
                const fills = s.paints || [];
                const solid = fills.find((p) => p.type === "SOLID");
                figmaMap.set(name, solid ? rgbaToHex(solid.color) : "");
            }
            // Text styles: name -> fontSize or "fontStyle"
            const textStyles = stylesPayload?.textStyles || [];
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
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                source: "figma_only",
                                message: "No codeTokens provided. Listing Figma tokens only. Pass codeTokens (JSON string) for parity comparison.",
                                figmaTokenCount: figmaMap.size,
                                figmaTokens: list,
                            }, null, 0),
                        },
                    ],
                };
            }
            let codeMap;
            try {
                const parsed = JSON.parse(codeTokens);
                codeMap = new Map();
                for (const [k, v] of Object.entries(parsed)) {
                    if (v != null && typeof v === "object" && "value" in v) {
                        codeMap.set(k, normalizeTokenValue(v.value, undefined));
                    }
                    else {
                        codeMap.set(k, normalizeTokenValue(v, undefined));
                    }
                }
            }
            catch {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ success: false, error: "codeTokens must be valid JSON" }, null, 0),
                        },
                    ],
                    isError: true,
                };
            }
            const matching = [];
            const divergent = [];
            const inFigmaOnly = [];
            const inCodeOnly = [];
            for (const [name, figVal] of figmaMap) {
                const codeVal = codeMap.get(name);
                if (codeVal === undefined) {
                    inFigmaOnly.push({ name, value: figVal });
                }
                else if (normalizeForCompare(figVal) === normalizeForCompare(codeVal)) {
                    matching.push({ name, value: figVal });
                }
                else {
                    divergent.push({ name, figmaValue: figVal, codeValue: codeVal });
                }
            }
            for (const [name, codeVal] of codeMap) {
                if (!figmaMap.has(name))
                    inCodeOnly.push({ name, value: codeVal });
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
            return { content: [{ type: "text", text: JSON.stringify(out, null, 0) }] };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, error: msg }, null, 0) }],
                isError: true,
            };
        }
    });
    // ---- figma_get_token_browser (Token Browser – kurulum özel MCP App) ----
    server.registerTool("figma_get_token_browser", {
        description: "Token Browser: hierarchical view of design tokens for browsing. Returns variable collections with variables and modes, plus paint and text styles. Use for exploring and auditing tokens in the open Figma file. No REST API.",
        inputSchema: {
            verbosity: z.enum(["summary", "full"]).optional().default("summary"),
        },
        annotations: { readOnlyHint: true },
    }, async ({ verbosity }) => {
        try {
            const conn = getConnector(bridge);
            const [varsPayload, stylesPayload] = await Promise.all([
                conn.getVariablesFromPluginUI(),
                conn.getLocalStyles(verbosity === "full" ? "full" : "summary"),
            ]);
            const variables = varsPayload?.variables || [];
            const collections = varsPayload?.variableCollections || [];
            const paintStyles = stylesPayload?.paintStyles || [];
            const textStyles = stylesPayload?.textStyles || [];
            const collectionById = new Map();
            for (const c of collections) {
                collectionById.set(c.id, {
                    id: c.id,
                    name: c.name,
                    modes: (c.modes || []).map((m) => ({ id: m.id, name: m.name })),
                    variables: [],
                });
            }
            for (const v of variables) {
                const c = collectionById.get(v.variableCollectionId);
                if (!c)
                    continue;
                const entry = {
                    id: v.id,
                    name: v.name,
                    resolvedType: v.resolvedType,
                    description: v.description || undefined,
                };
                if (verbosity === "full") {
                    entry.valuesByMode = v.valuesByMode;
                    entry.scopes = v.scopes;
                }
                else {
                    entry.valuesByMode = v.valuesByMode;
                }
                c.variables.push(entry);
            }
            const out = {
                success: true,
                source: "plugin",
                tokenBrowser: {
                    variableCollections: Array.from(collectionById.values()),
                    paintStyles: paintStyles.map((s) => verbosity === "full"
                        ? s
                        : { id: s.id, name: s.name, paints: s.paints }),
                    textStyles: textStyles.map((s) => verbosity === "full"
                        ? s
                        : { id: s.id, name: s.name, fontSize: s.fontSize ?? s.style?.fontSize, fontName: s.fontName ?? s.style?.fontName }),
                },
            };
            return { content: [{ type: "text", text: JSON.stringify(out, null, 0) }] };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, error: msg }, null, 0) }],
                isError: true,
            };
        }
    });
    // ---- figma_get_status (plugin-only) ----
    server.registerTool("figma_get_status", {
        description: "Check if F-MCP ATezer Bridge plugin is connected and list all connected files. No REST API or token.",
        inputSchema: {},
        annotations: { readOnlyHint: true },
    }, async () => {
        const connected = bridge.isConnected();
        const connectedFiles = bridge.listConnectedFiles();
        const clientCount = bridge.connectedClientCount();
        const listening = bridge.isListening();
        const currentPort = bridge.getPort();
        const startError = bridge.getStartError();
        let msg;
        if (!listening) {
            msg = startError
                ? `Bridge is NOT listening. ${startError}`
                : "Bridge is starting up...";
        }
        else if (connected) {
            msg = `F-MCP ATezer Bridge: ${clientCount} plugin(s) connected on port ${currentPort}. You can use all figma_* tools.`;
        }
        else {
            msg = PLUGIN_NOT_CONNECTED;
        }
        const portHint = !listening || clientCount === 0
            ? `Bridge port: ${currentPort}. ${!listening ? "Use figma_set_port to switch to an available port." : `Figma plugin'de Port: ${currentPort} ayarlayın.`}`
            : undefined;
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        pluginConnected: connected,
                        bridgeListening: listening,
                        connectedClients: clientCount,
                        connectedFiles,
                        bridgePort: currentPort,
                        message: msg,
                        ...(startError && { startError }),
                        ...(portHint && { portHint }),
                    }, null, 0),
                }],
        };
    });
    // ---- figma_set_port (runtime port change) ----
    let portChangeInProgress = false;
    server.registerTool("figma_set_port", {
        description: "Change the WebSocket bridge port at runtime. Stops the current bridge and restarts on the new port. " +
            "Use when the default port is busy (e.g. another AI tool holds it). " +
            "After calling this, the Figma plugin must reconnect to the new port. " +
            "Valid range: 5454–5470.",
        inputSchema: {
            port: z.number().min(5454).max(5470).describe("New WebSocket bridge port (5454–5470)"),
        },
    }, async ({ port: newPort }) => {
        if (portChangeInProgress) {
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: "Port değişikliği zaten devam ediyor. Lütfen tamamlanmasını bekleyin.",
                        }, null, 0),
                    }],
                isError: true,
            };
        }
        portChangeInProgress = true;
        try {
            const oldPort = bridge.getPort();
            logger.info({ oldPort, newPort }, "figma_set_port: switching bridge port");
            const result = await bridge.restart(newPort);
            if (result.success) {
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                previousPort: oldPort,
                                newPort: result.port,
                                message: `Bridge restarted on port ${result.port}. Figma plugin'de Port: ${result.port} ayarlayın ve bağlanmasını bekleyin.`,
                            }, null, 0),
                        }],
                };
            }
            else {
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: false,
                                previousPort: oldPort,
                                attemptedPort: newPort,
                                error: result.error || "Port bind failed",
                                message: `Port ${newPort} bağlanamadı. Başka bir port deneyin (5454–5470).`,
                            }, null, 0),
                        }],
                    isError: true,
                };
            }
        }
        finally {
            portChangeInProgress = false;
        }
    });
    // ---- Figma REST API token management ----
    server.registerTool("figma_set_rest_token", {
        description: "Set Figma REST API token for REST API calls (export, comments, version history, etc.). " +
            "Token is stored in memory only — never written to disk. Cleared on restart. " +
            "Get a token from Figma → Settings → Personal access tokens (max 90 days).",
        inputSchema: {
            token: z.string().describe("Figma personal access token (figd_...)"),
        },
    }, async ({ token }) => {
        if (!token.startsWith("figd_")) {
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, error: "Token must start with 'figd_'" }, null, 0) }],
                isError: true,
            };
        }
        // Validate token with a lightweight API call
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            const res = await fetch("https://api.figma.com/v1/me", {
                headers: { "X-Figma-Token": token },
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!res.ok) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ success: false, error: `Token validation failed: ${res.status} ${res.statusText}` }, null, 0) }],
                    isError: true,
                };
            }
            const me = await res.json();
            bridge.setFigmaRestToken(token);
            // Read rate limit headers
            const remaining = parseInt(res.headers.get("x-ratelimit-remaining") || "0", 10);
            const limit = parseInt(res.headers.get("x-ratelimit-limit") || "0", 10);
            const resetAt = parseInt(res.headers.get("x-ratelimit-reset") || "0", 10);
            if (limit > 0)
                bridge.updateRateLimit(remaining, limit, resetAt);
            return {
                content: [{ type: "text", text: JSON.stringify({
                            success: true,
                            user: me.handle || me.email || "unknown",
                            message: "Token set. REST API tools are now available.",
                            rateLimit: limit > 0 ? { remaining, limit, resetAt } : undefined,
                        }, null, 0) }],
            };
        }
        catch (err) {
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, error: `Token validation error: ${err instanceof Error ? err.message : String(err)}` }, null, 0) }],
                isError: true,
            };
        }
    });
    server.registerTool("figma_clear_rest_token", {
        description: "Clear the stored Figma REST API token from memory.",
        inputSchema: {},
    }, async () => {
        bridge.clearFigmaRestToken();
        return { content: [{ type: "text", text: JSON.stringify({ success: true, message: "Token cleared." }, null, 0) }] };
    });
    server.registerTool("figma_rest_api", {
        description: "Call Figma REST API directly. Requires a token set via figma_set_rest_token. " +
            "Use for: file export (SVG/PNG), comments, version history, team/project listing, " +
            "image fills, and anything not available through the plugin bridge. " +
            "Endpoint examples: GET /v1/files/:fileKey, GET /v1/images/:fileKey, GET /v1/files/:fileKey/comments",
        inputSchema: {
            endpoint: z.string().describe("REST API path, e.g. '/v1/files/abc123' or '/v1/me'"),
            method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional().default("GET").describe("HTTP method"),
            body: z.string().optional().describe("JSON body for POST/PUT requests"),
        },
        annotations: { readOnlyHint: false },
    }, async ({ endpoint, method, body }) => {
        const tokenInfo = bridge.getFigmaRestToken();
        if (!tokenInfo) {
            return {
                content: [{ type: "text", text: JSON.stringify({
                            success: false,
                            error: "No Figma REST API token set. Use figma_set_rest_token first. Or enter token in Figma plugin Advanced panel.",
                        }, null, 0) }],
                isError: true,
            };
        }
        // Rate limit pre-check
        const rl = tokenInfo.rateLimit;
        if (rl && rl.remaining === 0) {
            const resetDate = new Date(rl.resetAt * 1000);
            return {
                content: [{ type: "text", text: JSON.stringify({
                            success: false,
                            error: `API rate limit exhausted (0/${rl.limit}). Resets at ${resetDate.toISOString()}. Wait and retry.`,
                            rateLimit: rl,
                        }, null, 0) }],
                isError: true,
            };
        }
        const url = endpoint.startsWith("http") ? endpoint : `https://api.figma.com${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
        const MAX_RETRIES = 3;
        const BACKOFF_BASE_MS = 5000;
        const MAX_TOTAL_MS = 45000;
        const startTime = Date.now();
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 30000);
                const fetchOpts = {
                    method: method || "GET",
                    headers: {
                        "X-Figma-Token": tokenInfo.token,
                        "Content-Type": "application/json",
                    },
                    signal: controller.signal,
                };
                if (body && (method === "POST" || method === "PUT")) {
                    fetchOpts.body = body;
                }
                const res = await fetch(url, fetchOpts);
                clearTimeout(timeout);
                // Update rate limits
                const remaining = parseInt(res.headers.get("x-ratelimit-remaining") || "0", 10);
                const limit = parseInt(res.headers.get("x-ratelimit-limit") || "0", 10);
                const resetAt = parseInt(res.headers.get("x-ratelimit-reset") || "0", 10);
                if (limit > 0)
                    bridge.updateRateLimit(remaining, limit, resetAt);
                // 429 Rate Limited — retry with backoff
                if (res.status === 429 && attempt < MAX_RETRIES) {
                    const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
                    const delayMs = retryAfter > 0 ? retryAfter * 1000 : BACKOFF_BASE_MS * Math.pow(2, attempt);
                    const elapsed = Date.now() - startTime;
                    if (elapsed + delayMs > MAX_TOTAL_MS) {
                        return {
                            content: [{ type: "text", text: JSON.stringify({
                                        success: false, status: 429,
                                        error: `Rate limited. ${attempt + 1} attempts, total ${Math.round(elapsed / 1000)}s. Retry later.`,
                                        rateLimit: limit > 0 ? { remaining, limit, resetAt } : undefined,
                                    }, null, 0) }],
                            isError: true,
                        };
                    }
                    logger.warn({ attempt, delayMs, endpoint }, "figma_rest_api: 429, retrying after %dms", delayMs);
                    await new Promise((r) => setTimeout(r, delayMs));
                    continue;
                }
                const responseText = await res.text();
                let responseData;
                try {
                    responseData = JSON.parse(responseText);
                }
                catch {
                    responseData = responseText;
                }
                if (!res.ok) {
                    return {
                        content: [{ type: "text", text: JSON.stringify({
                                    success: false, status: res.status, statusText: res.statusText,
                                    error: responseData,
                                    rateLimit: limit > 0 ? { remaining, limit, resetAt } : undefined,
                                }, null, 0) }],
                        isError: true,
                    };
                }
                // Response size protection — truncate if > 200KB
                const contentBlocks = [];
                // Rate limit warning
                if (limit > 0 && remaining > 0 && remaining < 10) {
                    contentBlocks.push({
                        type: "text",
                        text: `⚠️ API limit low: ${remaining}/${limit} requests remaining.`,
                    });
                }
                const result = truncateRestResponse(endpoint, responseData, 200);
                if (result.wasTruncated) {
                    contentBlocks.push({
                        type: "text",
                        text: `⚠️ Response truncated: ${Math.round(result.originalSizeKB)}KB → ${Math.round(result.truncatedSizeKB)}KB (${result.itemsRemoved} items removed). Use more specific endpoint or parameters for full data.`,
                    });
                }
                contentBlocks.push({
                    type: "text",
                    text: JSON.stringify({
                        success: true, status: res.status,
                        data: result.data,
                        ...(result.wasTruncated && { _responseGuard: { originalSizeKB: Math.round(result.originalSizeKB), truncatedSizeKB: Math.round(result.truncatedSizeKB) } }),
                        rateLimit: limit > 0 ? { remaining, limit, resetAt } : undefined,
                    }, null, 0),
                });
                return { content: contentBlocks };
            }
            catch (err) {
                if (attempt < MAX_RETRIES && (Date.now() - startTime) < MAX_TOTAL_MS) {
                    const delayMs = BACKOFF_BASE_MS * Math.pow(2, attempt);
                    logger.warn({ attempt, err, endpoint }, "figma_rest_api: fetch error, retrying");
                    await new Promise((r) => setTimeout(r, delayMs));
                    continue;
                }
                return {
                    content: [{ type: "text", text: JSON.stringify({
                                success: false,
                                error: `REST API call failed after ${attempt + 1} attempts: ${err instanceof Error ? err.message : String(err)}`,
                            }, null, 0) }],
                    isError: true,
                };
            }
        }
        // Should not reach here
        return {
            content: [{ type: "text", text: JSON.stringify({ success: false, error: "Unexpected: all retries exhausted" }, null, 0) }],
            isError: true,
        };
    });
    server.registerTool("figma_get_rest_token_status", {
        description: "Check if a Figma REST API token is set and view rate limit usage.",
        inputSchema: {},
        annotations: { readOnlyHint: true },
    }, async () => {
        const tokenInfo = bridge.getFigmaRestToken();
        if (!tokenInfo) {
            return {
                content: [{ type: "text", text: JSON.stringify({
                            hasToken: false,
                            message: "No token set. Use figma_set_rest_token to add one.",
                        }, null, 0) }],
            };
        }
        const rl = tokenInfo.rateLimit;
        let warning;
        if (rl && rl.limit > 0) {
            const pct = (rl.remaining / rl.limit) * 100;
            if (rl.remaining === 0) {
                warning = `API limiti doldu (0/${rl.limit}). Reset: ${new Date(rl.resetAt * 1000).toISOString()}`;
            }
            else if (pct <= 20) {
                warning = `API limiti düşük: ${rl.remaining}/${rl.limit} (${Math.round(pct)}%)`;
            }
        }
        return {
            content: [{ type: "text", text: JSON.stringify({
                        hasToken: true,
                        setAt: new Date(tokenInfo.setAt).toISOString(),
                        rateLimit: rl || null,
                        ...(warning && { warning }),
                        message: warning || "Token is set. REST API tools are available.",
                    }, null, 0) }],
        };
    });
    const shutdown = () => {
        logger.info("Shutting down plugin-only MCP server...");
        try {
            bridge.stop();
        }
        catch { /* ignore */ }
        process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info({ port }, "F-MCP ATezer Bridge (plugin-only) MCP server running on stdio; WebSocket on port %s", port);
}
main().catch((err) => {
    logger.error({ err }, "Fatal");
    process.exit(1);
});
//# sourceMappingURL=local-plugin-only.js.map