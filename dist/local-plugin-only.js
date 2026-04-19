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
import { truncateRestResponse, truncatePluginResponse } from "./core/response-guard.js";
import { analyzeCodeForWarnings } from "./core/code-warnings.js";
import { discoveryCounter } from "./core/discovery-counter.js";
import { blockingTracker, extractBlockingNodeIds } from "./core/blocking-tracker.js";
import { bootstrapInjector } from "./core/bootstrap-injector.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { resolveDevice, DEVICE_PRESETS } from "./core/device-presets.js";
import { closeAuditLog } from "./core/audit-log.js";
import { FMCP_VERSION } from "./core/version.js";
import { ResponseCache } from "./core/response-cache.js";
const logger = createChildLogger({ component: "plugin-only-mcp" });
/**
 * Legacy default flag — when set, restores pre-v1.8.0 default values for
 * read-only tools (depth=2, verbosity="standard", scale=2, format="PNG").
 * Allows downstream consumers to opt back into the heavier defaults during
 * the v1.8.0 → v1.9.0 transition. Will be removed in v1.9.0.
 *
 * Set: FMCP_LEGACY_DEFAULTS=1
 */
const LEGACY_DEFAULTS = process.env.FMCP_LEGACY_DEFAULTS === "1";
/** Resolve fileKey from figmaUrl (parse) or explicit fileKey. Returns undefined if neither yields a key. */
/**
 * v1.9.5: Screenshot dosya kayıt konumu.
 * ~/.fmcp/screenshots/ altında timestamp-nodeId.ext formatı.
 */
const SCREENSHOT_DIR = join(homedir(), ".fmcp", "screenshots");
function ensureScreenshotDir() {
    try {
        mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
    catch { /* ignore EEXIST */ }
    return SCREENSHOT_DIR;
}
/**
 * v1.9.5: Base64 image payload'u disk'e yaz, filePath döndür.
 * Base64 decode edilir, dosyaya binary olarak yazılır.
 */
function saveBase64ToFile(base64, format, nodeIdHint) {
    ensureScreenshotDir();
    const ts = Date.now();
    const safeNodeId = (nodeIdHint ?? "node").replace(/[^a-zA-Z0-9_-]/g, "_");
    const ext = format.toLowerCase() === "png" ? "png" : "jpg";
    const fileName = `${ts}-${safeNodeId}.${ext}`;
    const filePath = join(SCREENSHOT_DIR, fileName);
    const buffer = Buffer.from(base64, "base64");
    writeFileSync(filePath, buffer);
    return { filePath, fileSize: buffer.length };
}
/**
 * v1.9.5: Screenshot result'ı returnMode'a göre post-process.
 * - file: base64'u disk'e yaz, image.base64 yerine filePath döndür
 * - regions: regions[].image.base64'u tek tek disk'e yaz, regions[].filePath döndür
 * - summary: plugin zaten metadata döndürdü, dokunma
 * - base64: eski davranış, dokunma (ama _warning ekle)
 */
async function postProcessScreenshotResult(result, returnMode, format, nodeId) {
    if (!result || typeof result !== "object" || !result.success)
        return result;
    if (returnMode === "file") {
        // Plugin single-image response: { success, image: { base64, format, width, height } }
        if (result.image && typeof result.image === "object" && typeof result.image.base64 === "string") {
            try {
                const { filePath, fileSize } = saveBase64ToFile(result.image.base64, format, nodeId);
                const { base64, ...imageMetaRest } = result.image;
                return {
                    success: true,
                    filePath,
                    fileSize,
                    dimensions: { width: result.image.width, height: result.image.height },
                    format: result.image.format ?? format,
                    nodeId: nodeId ?? null,
                    imageMeta: imageMetaRest,
                    hint: "v1.9.5 file mode: Screenshot diske yazildi. Claude Desktop 'open <filePath>' ile acabilir. Base64 context'te YOK (~30K token tasarrufu). Onceki davranis icin returnMode: 'base64'.",
                };
            }
            catch (err) {
                return { ...result, _warning: `File save failed: ${err instanceof Error ? err.message : String(err)}. Falling back to base64 mode.` };
            }
        }
    }
    if (returnMode === "regions" && Array.isArray(result.regions)) {
        const processedRegions = result.regions.map((region, idx) => {
            if (region.image && typeof region.image.base64 === "string") {
                try {
                    const regionNodeId = region.nodeId ?? `${nodeId}-region-${idx}`;
                    const { filePath, fileSize } = saveBase64ToFile(region.image.base64, format, regionNodeId);
                    const { base64, ...imageMetaRest } = region.image;
                    return {
                        name: region.name,
                        nodeId: region.nodeId,
                        filePath,
                        fileSize,
                        dimensions: { width: region.image.width, height: region.image.height },
                        imageMeta: imageMetaRest,
                    };
                }
                catch (err) {
                    return { ...region, _warning: `File save failed: ${err instanceof Error ? err.message : String(err)}` };
                }
            }
            return region;
        });
        return {
            ...result,
            regions: processedRegions,
            hint: "v1.9.5 regions mode: Her region ayri dosyada. Ilgili olanlari 'open <filePath>' ile ac. Tumune bakmana gerek yok. Base64 context'te YOK.",
        };
    }
    if (returnMode === "base64") {
        // Legacy — add warning
        return {
            ...result,
            _warning: "BASE64_MODE: Context'e ~30K token eklendi. Bir sonraki call'da 'file' veya 'regions' tercih et.",
        };
    }
    // summary mode — plugin already returned metadata-only, no post-processing needed
    return result;
}
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
/** Categorize figma_execute errors for actionable user feedback. */
function categorizeExecuteError(message, durationMs, timeoutMs) {
    const msg = (message ?? "").toLowerCase();
    if (msg.includes("timed out") || msg.includes("timeout") || (durationMs >= timeoutMs * 0.9))
        return "TIMEOUT";
    if (msg.includes("syntax error") || msg.includes("unexpected token") || msg.includes("unexpected identifier"))
        return "SYNTAX";
    if (msg.includes("not connected") || msg.includes("plugin bridge") || msg.includes("websocket") || msg.includes("bridge active"))
        return "CONNECTION";
    if (msg.includes("serialization") || msg.includes("could not be serialized") || msg.includes("circular"))
        return "SERIALIZATION";
    if (msg.includes("font") && (msg.includes("not loaded") || msg.includes("loadfontasync")))
        return "FONT_NOT_LOADED";
    if (msg.includes("cannot read") || msg.includes("is not a function") || msg.includes("undefined"))
        return "RUNTIME";
    return "RUNTIME";
}
function getErrorHint(category) {
    switch (category) {
        case "TIMEOUT": return "Islem cok uzun surdu. timeout parametresini artir (max 120000ms), veya islemi daha kucuk parcalara bol.";
        case "SYNTAX": return "JavaScript syntax hatasi. Kaçis karakterleri, eksik parantez veya reserved word kontrol et.";
        case "CONNECTION": return "Plugin bagli degil. Figma'da F-MCP ATezer Bridge plugin'ini ac ve 'Bridge active' gosterdigini dogrula.";
        case "SERIALIZATION": return "Sonuc JSON serialize edilemedi. Figma node objesi degil, plain object don: { id: node.id, name: node.name }";
        case "FONT_NOT_LOADED": return "Font yuklenmemis. Kodun basina await figma.loadFontAsync({family, style}) ekle.";
        case "RUNTIME": return "Kod calisma hatasi. Yaygin: yanlis sayfa (setCurrentPageAsync eksik), null node, undefined property.";
        default: return "Hata mesajini kontrol et.";
    }
}
// analyzeCodeForWarnings + CodeWarning type moved to ./core/code-warnings.ts (v1.8.1)
// Imported at the top of this file — this comment marks where the helper used to live.
/** Wrap a tool handler with try-catch to prevent unhandled rejections. */
function safeToolHandler(handler) {
    return async (params) => {
        try {
            return await handler(params);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, error: msg }) }],
                isError: true,
            };
        }
    };
}
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
    const cache = new ResponseCache();
    /** Invalidate cache after any mutating operation. */
    function invalidateCache() { cache.invalidate(); }
    /**
     * Build a stable cache key from tool name + params. Sort keys for determinism.
     * fileKey is included to avoid cross-file leakage in multi-file sessions.
     */
    function makeCacheKey(toolName, params) {
        const sortedEntries = Object.entries(params)
            .filter(([_, v]) => v !== undefined)
            .sort(([a], [b]) => a.localeCompare(b));
        return `${toolName}::${JSON.stringify(sortedEntries)}`;
    }
    /**
     * Shared envelope wrapper for plugin tool results. Applies truncatePluginResponse
     * unless skipGuard is true (for cache hits whose data was already guarded).
     * When debug=true, the _responseGuard marker is preserved; otherwise stripped.
     */
    function toolResult(data, toolName, opts) {
        let payload;
        if (data === undefined || data === null) {
            payload = { success: false, error: "No data from plugin" };
        }
        else if (opts?.skipGuard) {
            payload = data;
        }
        else {
            const result = truncatePluginResponse(data, toolName);
            payload = result.data;
            // Strip _responseGuard marker unless debug=true
            if (!opts?.debug && payload && typeof payload === "object" && payload._responseGuard) {
                const stripped = { ...payload };
                delete stripped._responseGuard;
                payload = stripped;
            }
        }
        const text = typeof payload === "string" ? payload : JSON.stringify(payload);
        return { content: [{ type: "text", text }] };
    }
    /** Helper for error responses with consistent shape. */
    function errorResult(msg) {
        return {
            content: [{ type: "text", text: JSON.stringify({ success: false, error: msg }) }],
            isError: true,
        };
    }
    const server = new McpServer({
        name: "F-MCP ATezer Bridge (Plugin-only)",
        version: FMCP_VERSION,
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
                    }),
                }],
        };
    });
    // ---- figma_get_file_data_plugin (no REST, no token) ----
    // v1.8.0: Defaults already conservative (depth=1, verbosity="summary"). Cached + truncated.
    server.registerTool("figma_get_file_data", {
        description: "Get file structure and document tree from the open Figma file. No REST API or token. Use fileKey or figmaUrl to target a specific file when multiple plugins are connected. Defaults to depth=1, verbosity='summary'. Cached 60s per session.",
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
            debug: z.boolean().optional().describe("Bypass cache and include _responseGuard fields."),
        },
        annotations: { readOnlyHint: true },
    }, async ({ figmaUrl, fileKey, depth, verbosity, includeLayout, includeVisual, includeTypography, includeCodeReady, outputHint, debug }) => {
        try {
            const resolvedKey = resolveFileKey(figmaUrl, fileKey);
            if (figmaUrl && !resolvedKey) {
                return errorResult("Invalid Figma/FigJam URL: could not extract file key.");
            }
            const conn = getConnector(bridge, resolvedKey);
            const opts = includeLayout !== undefined ||
                includeVisual !== undefined ||
                includeTypography !== undefined ||
                includeCodeReady !== undefined ||
                outputHint !== undefined
                ? { includeLayout, includeVisual, includeTypography, includeCodeReady, outputHint }
                : undefined;
            const cacheK = makeCacheKey("figma_get_file_data", { resolvedKey, depth, verbosity, opts });
            const cached = debug ? null : cache.get(cacheK, 60_000);
            const data = cached ?? await conn.getDocumentStructure(depth, verbosity, opts);
            if (!cached)
                cache.set(cacheK, data);
            return toolResult(data, "figma_get_file_data", { skipGuard: !!cached, debug });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, error: msg }) }],
                isError: true,
            };
        }
    });
    // ---- figma_get_design_context (get_design_context tarzı, token tasarruflu, Figma token yok) ----
    // v1.8.0: Context-safe defaults — depth=1, verbosity="summary"
    // Override with FMCP_LEGACY_DEFAULTS=1 env var or pass explicit params.
    server.registerTool("figma_get_design_context", {
        description: "Design context for a node or whole file: structure + text, layout/visual/typography. Defaults to depth=1, verbosity='summary' for context safety. Pass depth/verbosity explicitly for deeper data. Cached 60s per session.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL; fileKey and optional node-id are extracted for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            nodeId: z.string().optional(),
            depth: z.number().min(0).max(3).optional().default(LEGACY_DEFAULTS ? 2 : 1),
            verbosity: z.enum(["summary", "standard", "full"]).optional().default(LEGACY_DEFAULTS ? "standard" : "summary"),
            excludeScreenshot: z.boolean().optional().describe("Reserved for future use; plugin currently does not embed screenshots in design_context."),
            includeLayout: z.boolean().optional(),
            includeVisual: z.boolean().optional(),
            includeTypography: z.boolean().optional(),
            includeCodeReady: z.boolean().optional(),
            outputHint: z.enum(["react", "tailwind"]).optional(),
            debug: z.boolean().optional().describe("Bypass cache and include _responseGuard/_metrics fields."),
        },
        annotations: { readOnlyHint: true },
    }, async ({ figmaUrl, fileKey, nodeId, depth, verbosity, excludeScreenshot, includeLayout, includeVisual, includeTypography, includeCodeReady, outputHint, debug }) => {
        try {
            const { fileKey: resolvedKey, nodeId: resolvedNodeId } = resolveDesignContextParams({ figmaUrl, fileKey, nodeId });
            if (figmaUrl && !resolvedKey) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ success: false, error: "Invalid Figma/FigJam URL: could not extract file key." }) }],
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
            // Cache lookup (60s TTL) — bypassed when debug=true
            const cacheK = makeCacheKey("figma_get_design_context", { resolvedKey, effectiveNodeId, depth, verbosity, opts });
            const cached = debug ? null : cache.get(cacheK, 60_000);
            const data = cached ?? (effectiveNodeId
                ? await conn.getNodeContext(effectiveNodeId, depth, verbosity, opts)
                : await conn.getDocumentStructure(depth, verbosity, opts));
            if (!cached)
                cache.set(cacheK, data);
            return toolResult(data, "figma_get_design_context", { skipGuard: !!cached, debug });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, error: msg }) }],
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
    }, safeToolHandler(async ({ figmaUrl, fileKey, verbosity }) => {
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
        return { content: [{ type: "text", text: JSON.stringify(out) }] };
    }));
    // ---- figma_get_component ----
    server.registerTool("figma_get_component", {
        description: "Get component metadata by node ID from the open Figma file. No REST API. Use fileKey or figmaUrl to target a specific file.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            nodeId: z.string(),
        },
        annotations: { readOnlyHint: true },
    }, safeToolHandler(async ({ figmaUrl, fileKey, nodeId }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const result = await conn.getComponentFromPluginUI(nodeId);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    // ---- figma_get_styles (plugin only) ----
    server.registerTool("figma_get_styles", {
        description: "Get local paint, text, and effect styles from the open Figma file. No REST API. Use fileKey or figmaUrl to target a specific file.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            verbosity: z.enum(["summary", "full"]).optional().default("summary"),
        },
        annotations: { readOnlyHint: true },
    }, safeToolHandler(async ({ figmaUrl, fileKey, verbosity }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const data = await conn.getLocalStyles(verbosity);
        return { content: [{ type: "text", text: JSON.stringify(data || {}) }] };
    }));
    // ---- figma_execute ----
    server.registerTool("figma_execute", {
        description: "Run JavaScript in the Figma plugin context. Full Plugin API available. Use fileKey or figmaUrl to target a specific file. " +
            "v1.8.1+: Static analysis detects design-system discipline violations (hardcoded colors, missing token bindings, no-instance usage, hardcoded typography). " +
            "SEVERE warnings are promoted to the top of the response as _designSystemViolations — Claude must read and self-correct. " +
            "Also detects gotchas: FILL/ABSOLUTE before appendChild, sync API usage, missing loadFontAsync, sync currentPage assignment. " +
            "For component instances: use setProperties({...}), NOT findAll(TEXT). " +
            "v1.9.6+: Post-execute scan — eğer kod `return { createdNodeIds: [...] }` veya `nodeIds`/`ids`/`frameId`/`rootId`/`nodeId` döndürürse " +
            "plugin oluşturulan node'ları otomatik tarar, unbound fill/padding/radius/text-style varsa response'a `_POST_EXECUTE_SCAN_BLOCKING: true` ve " +
            "`_postExecuteViolations` alanı ekler. Bu flag varsa execute geçersiz sayılır — kodu düzelt (setBoundVariable/setTextStyleIdAsync ekle) ve tekrar çalıştır.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            code: z.string(),
            timeout: z.number().optional().default(15000),
        },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async ({ figmaUrl, fileKey, code, timeout }) => {
        if (code.length > 50000) {
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, errorCategory: "VALIDATION", error: "Code too long (max 50,000 characters). Break into smaller pieces." }) }],
                isError: true,
            };
        }
        const clampedTimeout = Math.max(3000, Math.min(timeout ?? 15000, 30000));
        invalidateCache();
        // v1.9.7 Katman 3: BLOCKING suppression prevention — check before executing
        const suppression = blockingTracker.checkSuppression(code);
        if (suppression.error) {
            return {
                content: [{ type: "text", text: JSON.stringify({
                            success: false,
                            error: suppression.error,
                            errorCategory: "BLOCKING_SUPPRESSION",
                            _BLOCKING_SUPPRESSION_DETECTED: true,
                            matchedNodeIds: suppression.matchedNodeIds,
                            hint: "Kok nedeni cozdukten sonra tekrar dene. Veya kullanici onayi ile kod basina '// FORCE_OVERRIDE' comment ekle.",
                        }) }],
                isError: true,
            };
        }
        // v1.9.5: Discovery budget tracking — code pattern analysis (read-only vs mutation)
        const budget = discoveryCounter.track("figma_execute", code);
        // v1.8.1: Structured warnings with SEVERE vs ADVISORY severity
        const codeWarnings = analyzeCodeForWarnings(code);
        const severeWarnings = codeWarnings.filter((w) => w.severity === "SEVERE");
        const advisoryWarnings = codeWarnings.filter((w) => w.severity === "ADVISORY");
        // SEVERE warnings go to a prominent field that Claude cannot ignore.
        // v1.9.4: action text elevated to BLOCKING — Claude must retry, cannot proceed.
        const dsViolations = severeWarnings.length > 0
            ? {
                _DESIGN_SYSTEM_VIOLATIONS_BLOCKING: true, // v1.9.4: top-level flag Claude Desktop cannot scroll past
                _designSystemViolations: {
                    count: severeWarnings.length,
                    severity: "BLOCKING",
                    message: "❌ DESIGN SYSTEM DISIPLIN IHLALI — BLOCKING. Bu kod KABUL EDILMEZ. Execute sonucu gecersizdir.",
                    violations: severeWarnings.map((w) => ({ category: w.category, message: w.message })),
                    action: "❌ BLOCKING: Bu kodu simdi duzelt ve tekrar calistir. Skip edemezsin. Her SOLID fill icin setBoundVariableForPaint zorunlu; her padding/itemSpacing/cornerRadius icin setBoundVariable zorunlu; her TEXT icin setTextStyleIdAsync zorunlu. Detay: figma-canvas-ops SKILL Kural 10, fmcp-screen-recipes SKILL Adim 9.",
                    retry_required: true,
                },
            }
            : {};
        // v1.9.5: Discovery budget warnings merge with advisory warnings
        const combinedWarnings = [
            ...advisoryWarnings.map((w) => w.message),
            ...(budget.warnings ?? []),
        ];
        const warningsField = combinedWarnings.length > 0
            ? { _warnings: combinedWarnings }
            : {};
        const budgetBlockingField = budget._DISCOVERY_BUDGET_EXCEEDED_BLOCKING
            ? { _DISCOVERY_BUDGET_EXCEEDED_BLOCKING: true }
            : {};
        const startTime = Date.now();
        try {
            const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
            const result = await conn.executeCodeViaUI(code, clampedTimeout);
            const durationMs = Date.now() - startTime;
            // Plugin may return { success: false, error: "..." } without throwing
            if (typeof result === "object" && result !== null && result.success === false) {
                const pluginError = String(result.error || "Unknown plugin error");
                let category = "RUNTIME";
                let hint = "Hata mesajini kontrol et.";
                try {
                    category = categorizeExecuteError(pluginError, durationMs, clampedTimeout);
                    hint = getErrorHint(category);
                }
                catch { /* safe fallback */ }
                return {
                    content: [{ type: "text", text: JSON.stringify({
                                ...budgetBlockingField, // v1.9.5: discovery BLOCKING flag at top
                                ...dsViolations, // v1.8.1: SEVERE warnings FIRST, before anything else
                                ...result,
                                errorCategory: category,
                                _metrics: { durationMs, timeoutMs: clampedTimeout },
                                hint,
                                ...warningsField,
                            }) }],
                    isError: true,
                };
            }
            // v1.9.6: Post-execute scan result → BLOCKING signal injection
            const postScan = typeof result === "object" && result !== null
                ? result._postExecuteScan
                : undefined;
            const postScanBlocking = {};
            if (postScan && typeof postScan.violationCount === "number" && postScan.violationCount > 0) {
                postScanBlocking._POST_EXECUTE_SCAN_BLOCKING = true;
                postScanBlocking._postExecuteViolations = {
                    count: postScan.violationCount,
                    totalChecked: postScan.totalChecked ?? 0,
                    severity: "BLOCKING",
                    message: "❌ v1.9.6 POST-EXECUTE SCAN: Olusturulan node'larda " + postScan.violationCount + " unbound tespit edildi. Kodu duzelt — her unbound icin setBoundVariable veya setTextStyleIdAsync cagrisi ekle.",
                    violations: postScan.violations ?? [],
                    action: "❌ BLOCKING: Execute sonucu KABUL EDILMEZ. Listelenen nodeId'lerdeki unbound node'lari bagla ve kodu tekrar calistir. Skip edemezsin.",
                    retry_required: true,
                };
            }
            // v1.9.7: Record blocking state for suppression tracker (any BLOCKING flag)
            const hadBlocking = Object.keys(postScanBlocking).length > 0 ||
                severeWarnings.length > 0;
            if (hadBlocking) {
                const extracted = extractBlockingNodeIds({
                    _postExecuteScan: result?._postExecuteScan,
                    _postExecuteViolations: postScanBlocking._postExecuteViolations,
                    _designSystemViolations: dsViolations._designSystemViolations,
                });
                if (extracted.nodeIds.length > 0) {
                    blockingTracker.recordBlocking(extracted.nodeIds, extracted.categories);
                }
            }
            // v1.9.7: _nextStep hint injection
            const nextStep = bootstrapInjector.injectNextStep("figma_execute", {
                ...result,
                ...postScanBlocking,
                ...budgetBlockingField,
                ...dsViolations,
            });
            let enriched;
            try {
                enriched = typeof result === "object" && result !== null
                    ? {
                        ...postScanBlocking, // v1.9.6: post-execute BLOCKING top
                        ...budgetBlockingField, // v1.9.5: discovery BLOCKING flag at top
                        ...dsViolations, // v1.8.1: SEVERE warnings at top level
                        ...result,
                        _metrics: { durationMs, timeoutMs: clampedTimeout },
                        ...warningsField,
                        ...(nextStep && { _nextStep: nextStep }),
                    }
                    : severeWarnings.length > 0 || advisoryWarnings.length > 0 || combinedWarnings.length > 0
                        ? { ...budgetBlockingField, ...dsViolations, result, ...warningsField, ...(nextStep && { _nextStep: nextStep }) }
                        : result;
            }
            catch {
                enriched = result;
            }
            return { content: [{ type: "text", text: JSON.stringify(enriched) }] };
        }
        catch (err) {
            const durationMs = Date.now() - startTime;
            const msg = err instanceof Error ? err.message : String(err);
            let category = "RUNTIME";
            let hint = "Hata mesajini kontrol et.";
            try {
                category = categorizeExecuteError(msg, durationMs, clampedTimeout);
                hint = getErrorHint(category);
            }
            catch { /* safe fallback */ }
            logger.warn({ errorCategory: category, durationMs, timeout: clampedTimeout }, "figma_execute failed: %s", msg);
            return {
                content: [{ type: "text", text: JSON.stringify({
                            success: false,
                            errorCategory: category,
                            error: msg,
                            _metrics: { durationMs, timeoutMs: clampedTimeout },
                            hint,
                            ...warningsField,
                        }) }],
                isError: true,
            };
        }
    }));
    // ============================================================================
    // v1.8.1: HIGH-LEVEL "FAST AND CORRECT" TOOLS
    // ============================================================================
    //
    // These tools sit above figma_execute and provide one-call solutions for
    // common workflows. Claude should prefer these over hand-written execute
    // code when possible — they handle token binding, auto-layout preservation,
    // and DS instance preservation automatically.
    // ============================================================================
    // ---- figma_clone_screen_to_device ----
    // v1.8.2: NARROW USE CASE ONLY — device migration.
    // For alternatives/variations/new designs, use figma_execute with the
    // generate-figma-screen SKILL Step 5 "build from scratch" pattern.
    // Clone will copy benchmark's existing mistakes (hardcoded rectangles,
    // missing token bindings, non-responsive layouts).
    server.registerTool("figma_clone_screen_to_device", {
        description: "⚠️ NARROW USE CASE — Device migration ONLY. Clone a Figma screen to a target device " +
            "dimension, preserving library instances, bound variables, and auto-layout. " +
            "USE ONLY WHEN: same design system + same layout structure + only screen size changes. " +
            "DO NOT USE FOR: creating alternatives, variations, or new designs — these REQUIRE " +
            "building from scratch with figma_execute following the generate-figma-screen SKILL " +
            "Step 5 pattern (search_assets → instantiate_component → setBoundVariable → auto-layout FILL). " +
            "Clone copies benchmark's EXISTING mistakes (hardcoded rectangles, missing token bindings, " +
            "non-responsive layouts). Benchmark is INSPIRATION, not a copy source for variations. " +
            "If the user says 'alternatif', 'varyasyon', 'farklı', 'yeni', 'tasarla' — USE figma_execute + Step 5, NOT this tool. " +
            "Device presets: iPhone 17, iPhone 16 Pro Max, Android Compact, iPad Pro 11, Desktop, " +
            "and more. Custom: 'WxH' format.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            sourceNodeId: z.string().describe("Node ID of the source screen to clone (e.g. '139:3407')"),
            targetDevice: z.string().describe("Device preset name (e.g. 'iPhone 17', 'Android Compact') or custom 'WxH' (e.g. '1200x800')"),
            newName: z.string().optional().describe("Name for the cloned screen (default: source name + device suffix)"),
            targetParentId: z.string().optional().describe("Parent node to place the clone under (default: current page)"),
            position: z
                .object({ x: z.number(), y: z.number() })
                .optional()
                .describe("Explicit position for the clone (default: auto-placed right of source)"),
        },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async ({ figmaUrl, fileKey, sourceNodeId, targetDevice, newName, targetParentId, position, }) => {
        // Resolve device name to concrete dimensions
        const resolved = resolveDevice(targetDevice);
        if (!resolved) {
            return errorResult(`Unknown device preset '${targetDevice}'. Supported presets: ${DEVICE_PRESETS.map((p) => p.name).join(", ")}. For custom, use 'WxH' format (e.g. '1200x800').`);
        }
        invalidateCache();
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const result = await conn.cloneScreenToDevice({
            sourceNodeId,
            targetWidth: resolved.width,
            targetHeight: resolved.height,
            targetDeviceName: resolved.name,
            newName,
            targetParentId,
            position,
        });
        return toolResult(result, "figma_clone_screen_to_device");
    }));
    // ---- figma_validate_screen ----
    // Post-creation audit tool. Walks a node tree and scores its DS compliance
    // across 3 dimensions: instance coverage, token binding coverage, auto-layout
    // coverage. Returns pass/fail + actionable violations.
    server.registerTool("figma_validate_screen", {
        description: "Validate a screen against design-system discipline criteria. Returns a compliance score (0-100) " +
            "across 3 dimensions: instance coverage (library usage), token binding coverage (bound variables), " +
            "and auto-layout coverage. Use this AFTER creating a screen to verify DS compliance. " +
            "If score < minScore, Claude should delete the screen and rebuild it using DS components + token bindings. " +
            "v1.9.4: `breakdown` now always includes `coverage` (granular fills/paddings/radius/itemSpacing/textStyle bind ratios) + `overflow` (root auto-layout overflow). " +
            "For hardcoded samples + primitive fallback list, use figma_scan_ds_compliance instead. " +
            "Read-only — never mutates the file.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            nodeId: z.string().describe("Node ID of the screen to validate"),
            expectedDs: z.string().optional().describe("Expected DS library name (e.g. '❖ SUI') for library match scoring"),
            minScore: z.number().min(0).max(100).optional().default(80).describe("Minimum acceptable score (0-100). Below this, the screen is considered non-compliant."),
        },
        annotations: { readOnlyHint: true },
    }, safeToolHandler(async ({ figmaUrl, fileKey, nodeId, expectedDs, minScore, }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const result = await conn.validateScreen({ nodeId, expectedDs, minScore });
        return toolResult(result, "figma_validate_screen");
    }));
    // ---- figma_scan_ds_compliance (v1.9.4) ----
    // Full DS compliance audit — superset of figma_validate_screen with hardcoded samples,
    // primitive fallback list, and overflow detection. Call this as the FINAL GATE before
    // considering a screen complete. Threshold default is 85 (stricter than validate's 80)
    // because detailed mode flags granular binding gaps that brief mode smooths over.
    server.registerTool("figma_scan_ds_compliance", {
        description: "v1.9.4: FINAL GATE — Full DS compliance scan for a completed screen. " +
            "Returns the same score + breakdown as figma_validate_screen PLUS: " +
            "(1) `coverage` = granular bind percentages (fills/paddings/radius/itemSpacing/textStyle/textColor/strokes), " +
            "(2) `samples.hardcodedHex` = up to 8 nodes with hardcoded SOLID colors, " +
            "(3) `samples.hardcodedFontSize` = up to 8 text nodes with hardcoded fontSize (no textStyleId), " +
            "(4) `samples.primitiveFrames` = up to 8 frames that should have been DS component instances, " +
            "(5) `overflow` = root auto-layout overflow analysis (frameSize vs contentSize). " +
            "If `passed: false`, Claude MUST fix listed violations before presenting the screen as complete. " +
            "Threshold 85 default (stricter than validate_screen's 80) because this flags granular gaps. " +
            "Read-only — never mutates the file.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            nodeId: z.string().describe("Node ID of the completed screen to audit"),
            threshold: z.number().min(0).max(100).optional().default(85).describe("Pass threshold (0-100). Default 85. Below this, screen is non-compliant and must be fixed."),
            expectedDs: z.string().optional().describe("Expected DS library name (e.g. '❖ SUI')"),
        },
        annotations: { readOnlyHint: true },
    }, safeToolHandler(async ({ figmaUrl, fileKey, nodeId, threshold, expectedDs, }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const result = await conn.scanDsCompliance({ nodeId, threshold, expectedDs });
        return toolResult(result, "figma_scan_ds_compliance");
    }));
    // ---- figma_create_mini_ds (v1.9.7) ----
    // Boş Figma dosyasında tek tool ile minimal DS (Variable Collections + Text Styles + Components) kur.
    // Katman 2 implementasyonu. Kullanıcı "(b) Mini DS" seçtiğinde Claude bu tool'u çağırır.
    server.registerTool("figma_create_mini_ds", {
        description: "v1.9.7: Boş Figma dosyası için minimal Design System oluştur. " +
            "Tek tool çağrısı ile 12 color variable + 8 sizing variable (spacing + radius) + 3 text style + Button/Input/Card component'leri kurar. " +
            "Kullanıcı 'Blank File 4-option dialog'da (b) Mini DS seçerse çağır. " +
            "Parametreler opsiyonel: primaryColor (default '#1464FF'), fontFamily (default 'Inter'), name (default 'Mini DS'), includeComponents (default true). " +
            "Sonuç: { success, dsName, variableCollectionIds, textStyleIds, componentIds, summary } — sonrasında figma_execute ile ekran kurulabilir.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            primaryColor: z.string().optional().default("#1464FF").describe("Primary brand color (hex). Default mavi."),
            fontFamily: z.string().optional().default("Inter").describe("Font family for text styles. Default Inter."),
            name: z.string().optional().default("Mini DS").describe("DS name prefix."),
            includeComponents: z.boolean().optional().default(true).describe("Button/Input/Card component'lerini dahil et."),
        },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async ({ figmaUrl, fileKey, primaryColor, fontFamily, name, includeComponents }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const result = await conn.createMiniDs({ primaryColor, fontFamily, name, includeComponents });
        const nextStep = bootstrapInjector.injectNextStep("figma_create_mini_ds", result);
        const enriched = nextStep && typeof result === "object" && result !== null
            ? { ...result, _nextStep: nextStep }
            : result;
        return toolResult(enriched, "figma_create_mini_ds");
    }));
    // ---- figma_capture_screenshot (v1.9.5: method selection) ----
    // v1.8.0: Default JPG@1x (~80% smaller base64 vs PNG@2x).
    // v1.9.5: returnMode param — Claude bağlama göre file/summary/regions/base64 seçer.
    //         Default "file": screenshot ~/.fmcp/screenshots/ altına yazılır, filePath döner,
    //         base64 context'e girmez (30K → 0.3K token tasarrufu).
    server.registerTool("figma_capture_screenshot", {
        description: "v1.9.5: 4 returnMode ile screenshot. Default 'file' (dosyaya yazar, base64 context'te YOK). " +
            "'summary' screenshot çekmeden metadata özeti (planlama için), " +
            "'regions' büyük ekranları children/slices olarak parçalar, " +
            "'base64' eski davranış (opt-in, ~30K token maliyetli). " +
            "Context-aware fallback: >%80 context kullanımında base64/file → summary'ye otomatik düşer. " +
            "Karar ağacı: planlama→summary, teslimat→file, scroll'lu ekran→regions, son çare→base64.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            nodeId: z.string().optional(),
            format: z.enum(["PNG", "JPG"]).optional().default(LEGACY_DEFAULTS ? "PNG" : "JPG"),
            scale: z.number().optional().default(LEGACY_DEFAULTS ? 2 : 1),
            jpegQuality: z.number().min(30).max(100).optional().default(70).describe("JPEG quality 30-100. Ignored when format=PNG."),
            returnMode: z
                .enum(["file", "base64", "summary", "regions"])
                .optional()
                .default("file")
                .describe("v1.9.5 method: 'file' (default, disk + filePath), 'base64' (legacy, context'e dahil), " +
                "'summary' (metadata-only, screenshotsuz), 'regions' (parçalı — children veya slices)."),
            regionStrategy: z
                .enum(["children", "slices"])
                .optional()
                .default("children")
                .describe("returnMode='regions' için: 'children' = node'un top-level child'ları ayrı ayrı, 'slices' = dikey slice'lar."),
            maxRegions: z.number().min(1).max(20).optional().default(8).describe("returnMode='regions' için: maks region sayısı."),
            sliceHeight: z.number().min(200).max(2000).optional().default(600).describe("regionStrategy='slices' için slice yüksekliği (px)."),
            requestedSlices: z.array(z.number()).optional().describe("regionStrategy='slices' için spesifik slice index'leri (örn: [0,2] → sadece 1. ve 3. slice)."),
        },
        annotations: { readOnlyHint: true },
    }, safeToolHandler(async ({ figmaUrl, fileKey, nodeId, format, scale, jpegQuality, returnMode, regionStrategy, maxRegions, sliceHeight, requestedSlices, }) => {
        // v1.9.5: Track discovery budget
        const budget = discoveryCounter.track("figma_capture_screenshot");
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const result = await conn.captureScreenshot(nodeId ?? null, {
            format,
            scale,
            jpegQuality,
            returnMode,
            regionStrategy,
            maxRegions,
            sliceHeight,
            requestedSlices,
        });
        // v1.9.5 post-processing: base64 payload'ları file'a yaz (mode='file' veya 'regions')
        const processed = await postProcessScreenshotResult(result, returnMode, format, nodeId);
        // Budget warning injection
        const budgetFields = {};
        if (budget.warnings && budget.warnings.length > 0) {
            budgetFields._warnings = [...(processed._warnings ?? []), ...budget.warnings];
        }
        if (budget._DISCOVERY_BUDGET_EXCEEDED_BLOCKING) {
            budgetFields._DISCOVERY_BUDGET_EXCEEDED_BLOCKING = true;
        }
        const enriched = typeof processed === "object" && processed !== null
            ? { ...processed, ...budgetFields }
            : processed;
        // skipGuard: true — base64 intact kalır (legacy mode için gerekli)
        return toolResult(enriched, "figma_capture_screenshot", { skipGuard: true });
    }));
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
    }, safeToolHandler(async ({ figmaUrl, fileKey, nodeId, properties }) => {
        invalidateCache();
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const result = await conn.setInstanceProperties(nodeId, properties);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    // ---- Variable CRUD ----
    server.registerTool("figma_update_variable", {
        description: "Update a variable value in a mode. Get IDs from figma_get_variables.",
        inputSchema: {
            variableId: z.string(),
            modeId: z.string(),
            value: z.union([z.string(), z.number(), z.boolean()]),
        },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async (p) => {
        invalidateCache();
        const conn = getConnector(bridge);
        const result = await conn.updateVariable(p.variableId, p.modeId, p.value);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    server.registerTool("figma_create_variable", {
        description: "Create a variable in a collection. Get collectionId from figma_get_variables.",
        inputSchema: {
            name: z.string(),
            collectionId: z.string(),
            resolvedType: z.enum(["COLOR", "FLOAT", "STRING", "BOOLEAN"]),
            options: z.record(z.any()).optional(),
        },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async (p) => {
        invalidateCache();
        const conn = getConnector(bridge);
        const result = await conn.createVariable(p.name, p.collectionId, p.resolvedType, p.options);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    server.registerTool("figma_create_variable_collection", {
        description: "Create a variable collection.",
        inputSchema: { name: z.string(), options: z.record(z.any()).optional() },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async (p) => {
        invalidateCache();
        const conn = getConnector(bridge);
        const result = await conn.createVariableCollection(p.name, p.options);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    server.registerTool("figma_delete_variable", {
        description: "Delete a variable.",
        inputSchema: { variableId: z.string() },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async (p) => {
        invalidateCache();
        const conn = getConnector(bridge);
        const result = await conn.deleteVariable(p.variableId);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    server.registerTool("figma_delete_variable_collection", {
        description: "Delete a variable collection.",
        inputSchema: { collectionId: z.string() },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async (p) => {
        invalidateCache();
        const conn = getConnector(bridge);
        const result = await conn.deleteVariableCollection(p.collectionId);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    server.registerTool("figma_rename_variable", {
        description: "Rename a variable.",
        inputSchema: { variableId: z.string(), newName: z.string() },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async (p) => {
        invalidateCache();
        const conn = getConnector(bridge);
        const result = await conn.renameVariable(p.variableId, p.newName);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    server.registerTool("figma_add_mode", {
        description: "Add a mode to a collection.",
        inputSchema: { collectionId: z.string(), modeName: z.string() },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async (p) => {
        invalidateCache();
        const conn = getConnector(bridge);
        const result = await conn.addMode(p.collectionId, p.modeName);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    server.registerTool("figma_rename_mode", {
        description: "Rename a mode in a collection.",
        inputSchema: { collectionId: z.string(), modeId: z.string(), newName: z.string() },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async (p) => {
        invalidateCache();
        const conn = getConnector(bridge);
        const result = await conn.renameMode(p.collectionId, p.modeId, p.newName);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
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
    }, safeToolHandler(async ({ figmaUrl, fileKey, currentPageOnly, limit }) => {
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
        // v1.9.7: _nextStep hint — blank file detection drives Claude to 4-option dialog
        const nextStep = bootstrapInjector.injectNextStep("figma_get_design_system_summary", out);
        const enriched = nextStep ? { ...out, _nextStep: nextStep } : out;
        return { content: [{ type: "text", text: JSON.stringify(enriched) }] };
    }));
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
    }, safeToolHandler(async ({ figmaUrl, fileKey, query, currentPageOnly, limit }) => {
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
        return { content: [{ type: "text", text: JSON.stringify({ success: true, components: summary }) }] };
    }));
    // ---- Node operations (short list) ----
    server.registerTool("figma_instantiate_component", {
        description: "Create a component instance. Use componentKey from figma_search_components, figma_search_assets, or REST API. " +
            "Supports library components (importComponentByKeyAsync) and local components (by nodeId). " +
            "After creation: use overrides with setProperties({...}) for component properties — do NOT use findAll(TEXT) to modify instance text.",
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
    }, safeToolHandler(async (p) => {
        invalidateCache();
        const conn = getConnector(bridge);
        const result = await conn.instantiateComponent(p.componentKey, p.options || {});
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    server.registerTool("figma_refresh_variables", {
        description: "Refresh variables from the file.",
        inputSchema: {},
        annotations: { readOnlyHint: false, destructiveHint: false },
    }, safeToolHandler(async () => {
        const conn = getConnector(bridge);
        const result = await conn.refreshVariables();
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    // ---- Console (plugin buffer, no CDP) ----
    server.registerTool("figma_get_console_logs", {
        description: "Get plugin console logs (log/warn/error) from the F-MCP plugin buffer. No CDP. Limit default 50.",
        inputSchema: { limit: z.number().min(1).max(200).optional().default(50) },
        annotations: { readOnlyHint: true },
    }, safeToolHandler(async ({ limit }) => {
        const conn = getConnector(bridge);
        const data = await conn.getConsoleLogs(limit);
        return { content: [{ type: "text", text: JSON.stringify({ success: true, ...data }) }] };
    }));
    server.registerTool("figma_watch_console", {
        description: "Stream new plugin console logs until timeout. Polls the plugin buffer. Timeout default 30s.",
        inputSchema: { timeoutSeconds: z.number().min(1).max(120).optional().default(30) },
        annotations: { readOnlyHint: true },
    }, safeToolHandler(async ({ timeoutSeconds }) => {
        const conn = getConnector(bridge);
        const deadline = Date.now() + timeoutSeconds * 1000;
        let lastSeenTime = 0;
        const stream = [];
        let pollIntervalMs = 1000;
        let consecutiveEmptyPolls = 0;
        while (Date.now() < deadline) {
            const { logs } = await conn.getConsoleLogs(200);
            let newCount = 0;
            for (const entry of logs) {
                if (entry.time > lastSeenTime) {
                    stream.push(entry);
                    newCount++;
                    if (entry.time > lastSeenTime)
                        lastSeenTime = entry.time;
                }
            }
            if (newCount > 0) {
                consecutiveEmptyPolls = 0;
                pollIntervalMs = 1000;
            }
            else {
                consecutiveEmptyPolls++;
                if (consecutiveEmptyPolls >= 10)
                    break;
                if (consecutiveEmptyPolls >= 3) {
                    pollIntervalMs = Math.min(pollIntervalMs * 2, 5000);
                }
            }
            await new Promise((r) => setTimeout(r, pollIntervalMs));
        }
        return {
            content: [{ type: "text", text: JSON.stringify({ success: true, stream, count: stream.length }) }],
        };
    }));
    server.registerTool("figma_clear_console", {
        description: "Clear the plugin console log buffer.",
        inputSchema: {},
        annotations: { destructiveHint: true },
    }, safeToolHandler(async () => {
        const conn = getConnector(bridge);
        await conn.clearConsole();
        return { content: [{ type: "text", text: JSON.stringify({ success: true, message: "Console cleared" }) }] };
    }));
    // ---- set_description, get_component_image, get_component_for_development ----
    server.registerTool("figma_set_description", {
        description: "Set description on a component, component set, or style node. Supports markdown (descriptionMarkdown).",
        inputSchema: {
            nodeId: z.string(),
            description: z.string(),
            descriptionMarkdown: z.string().optional(),
        },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async (p) => {
        invalidateCache();
        const conn = getConnector(bridge);
        const result = await conn.setNodeDescription(p.nodeId, p.description, p.descriptionMarkdown);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    server.registerTool("figma_get_component_image", {
        description: "Get screenshot of a node (component/frame). Returns base64 image. Defaults to JPG@1x q70 (v1.8.0 context-safe).",
        inputSchema: {
            nodeId: z.string(),
            scale: z.number().min(0.5).max(4).optional().default(LEGACY_DEFAULTS ? 2 : 1),
            format: z.enum(["PNG", "JPG"]).optional().default(LEGACY_DEFAULTS ? "PNG" : "JPG"),
            jpegQuality: z.number().min(30).max(100).optional().default(70),
        },
        annotations: { readOnlyHint: true },
    }, safeToolHandler(async ({ nodeId, scale, format, jpegQuality }) => {
        const conn = getConnector(bridge);
        const result = await conn.captureScreenshot(nodeId, { scale, format, jpegQuality });
        return toolResult(result, "figma_get_component_image");
    }));
    server.registerTool("figma_get_component_for_development", {
        description: "Get component metadata plus base64 screenshot in one call. For design-to-code workflows. Defaults to JPG@1x q70 (v1.8.0 context-safe).",
        inputSchema: {
            nodeId: z.string(),
            scale: z.number().min(0.5).max(4).optional().default(LEGACY_DEFAULTS ? 2 : 1),
            format: z.enum(["PNG", "JPG"]).optional().default(LEGACY_DEFAULTS ? "PNG" : "JPG"),
            jpegQuality: z.number().min(30).max(100).optional().default(70),
        },
        annotations: { readOnlyHint: true },
    }, safeToolHandler(async ({ nodeId, scale, format, jpegQuality }) => {
        const conn = getConnector(bridge);
        const [component, screenshot] = await Promise.all([
            conn.getComponentFromPluginUI(nodeId),
            conn.captureScreenshot(nodeId, { scale, format, jpegQuality }),
        ]);
        const comp = component?.component ?? component;
        const out = { success: true, component: comp, image: screenshot?.image ?? screenshot?.data };
        return toolResult(out, "figma_get_component_for_development");
    }));
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
    }, safeToolHandler(async ({ items }) => {
        invalidateCache();
        const conn = getConnector(bridge);
        const result = await conn.batchCreateVariables(items);
        return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }] };
    }));
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
    }, safeToolHandler(async ({ items }) => {
        invalidateCache();
        const conn = getConnector(bridge);
        const result = await conn.batchUpdateVariables(items);
        return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }] };
    }));
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
    }, safeToolHandler(async (p) => {
        invalidateCache();
        const conn = getConnector(bridge);
        const result = await conn.setupDesignTokens(p);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    server.registerTool("figma_arrange_component_set", {
        description: "Combine multiple component nodes into one Figma component set (combineAsVariants). Params: nodeIds (array of at least 2 component node IDs). Returns new component set nodeId.",
        inputSchema: { nodeIds: z.array(z.string()).min(2) },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async ({ nodeIds }) => {
        invalidateCache();
        const conn = getConnector(bridge);
        const result = await conn.arrangeComponentSet(nodeIds);
        return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }] };
    }));
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
                figmaMap.set(name, solid?.color ? rgbaToHex(solid.color) : "");
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
                            text: JSON.stringify({ success: false, error: "codeTokens must be valid JSON" }),
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
                else {
                    codeMap.delete(name);
                    if (normalizeForCompare(figVal) === normalizeForCompare(codeVal)) {
                        matching.push({ name, value: figVal });
                    }
                    else {
                        divergent.push({ name, figmaValue: figVal, codeValue: codeVal });
                    }
                }
            }
            for (const [name, codeVal] of codeMap) {
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
            return { content: [{ type: "text", text: JSON.stringify(out) }] };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, error: msg }) }],
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
                const c = collectionById.get(v.variableCollectionId || "");
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
            return { content: [{ type: "text", text: JSON.stringify(out) }] };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, error: msg }) }],
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
        // v1.8.0+: detect plugin/server version mismatch
        const outdatedPlugins = connectedFiles.filter((f) => f.pluginVersion === null || (f.pluginVersion && f.pluginVersion !== FMCP_VERSION));
        const versionWarning = outdatedPlugins.length > 0
            ? `⚠️ Plugin version mismatch detected: ${outdatedPlugins.map(f => `${f.fileName || "?"} (plugin v${f.pluginVersion ?? "<1.8.0"}, server v${FMCP_VERSION})`).join(", ")}. Reinstall the plugin from f-mcp-plugin/ for full v1.8.0 context-safe defaults.`
            : undefined;
        let msg;
        if (!listening) {
            msg = startError
                ? `Bridge is NOT listening. ${startError}`
                : "Bridge is starting up...";
        }
        else if (connected) {
            msg = `F-MCP ATezer Bridge: ${clientCount} plugin(s) connected on port ${currentPort}. You can use all figma_* tools.`;
            if (versionWarning)
                msg += " " + versionWarning;
        }
        else {
            msg = PLUGIN_NOT_CONNECTED;
        }
        const autoIncremented = bridge.getPreferredPort() !== currentPort;
        const portHint = !listening
            ? `All ports (5454-5470) are in use. Free a port or restart a stale instance.`
            : autoIncremented
                ? `Bridge auto-incremented to port ${currentPort} (preferred ${bridge.getPreferredPort()} was occupied). Plugin discovers automatically.`
                : clientCount === 0
                    ? `Bridge port: ${currentPort}. Configure Figma plugin to Port: ${currentPort} or use auto-scan.`
                    : undefined;
        // v1.9.7: Bootstrap injection — zero-click enforcement
        const bootstrap = bootstrapInjector.getBootstrap();
        const nextStep = bootstrapInjector.injectNextStep("figma_get_status", { pluginConnected: connected });
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        pluginConnected: connected,
                        bridgeListening: listening,
                        connectedClients: clientCount,
                        connectedFiles,
                        bridgePort: currentPort,
                        serverVersion: FMCP_VERSION,
                        ...(autoIncremented && { preferredPort: bridge.getPreferredPort(), autoIncremented }),
                        message: msg,
                        ...(startError && { startError }),
                        ...(portHint && { portHint }),
                        ...(versionWarning && { versionWarning }),
                        // v1.9.7 bootstrap
                        _bootstrap: bootstrap,
                        ...(nextStep && { _nextStep: nextStep }),
                    }),
                }],
        };
    });
    // ---- Node Creation Tools ----
    // v1.8.0: figma_create_frame now supports auto-layout out of the box.
    // Default layoutMode="VERTICAL" with sensible padding/gap. Pass layoutMode="NONE"
    // for a free-form frame (legacy behavior).
    server.registerTool("figma_create_frame", {
        description: "Create a new frame node with optional auto-layout. Returns the created node ID. " +
            "v1.8.0: defaults to layoutMode='VERTICAL' with paddingTop/Bottom=16, paddingLeft/Right=16, itemSpacing=12, " +
            "primaryAxisSizingMode='AUTO', counterAxisSizingMode='AUTO'. Pass layoutMode='NONE' for legacy free-form frames.",
        inputSchema: {
            name: z.string().optional().default("Frame").describe("Frame name"),
            x: z.number().optional().describe("X position. If omitted, auto-positions to the right of existing content"),
            y: z.number().optional().default(0),
            width: z.number().optional().default(200),
            height: z.number().optional().default(200),
            fillColor: z.string().optional().describe("Hex color e.g. '#ffffff'. DEPRECATED — prefer fillVariableKey for DS token binding (v1.8.1+)."),
            parentId: z.string().optional().describe("Parent node ID (default: current page)"),
            // Auto-layout parameters (v1.8.0)
            layoutMode: z.enum(["NONE", "HORIZONTAL", "VERTICAL"]).optional().default("VERTICAL").describe("Auto-layout direction. VERTICAL by default; pass 'NONE' for free-form frames."),
            paddingTop: z.number().optional().default(16),
            paddingBottom: z.number().optional().default(16),
            paddingLeft: z.number().optional().default(16),
            paddingRight: z.number().optional().default(16),
            itemSpacing: z.number().optional().default(12).describe("Gap between auto-layout children"),
            primaryAxisSizingMode: z.enum(["FIXED", "AUTO"]).optional().default("AUTO").describe("AUTO = hug contents, FIXED = use width/height"),
            counterAxisSizingMode: z.enum(["FIXED", "AUTO"]).optional().default("AUTO"),
            primaryAxisAlignItems: z.enum(["MIN", "CENTER", "MAX", "SPACE_BETWEEN"]).optional().describe("Main-axis alignment (MIN=top/left, MAX=bottom/right)"),
            counterAxisAlignItems: z.enum(["MIN", "CENTER", "MAX", "BASELINE"]).optional().describe("Cross-axis alignment"),
            layoutWrap: z.enum(["NO_WRAP", "WRAP"]).optional().describe("Wrap children when they exceed primary axis"),
            // v1.8.1+: DS token binding params — PREFER over hardcoded fillColor / padding / radius
            fillVariableKey: z.string().optional().describe("DS variable key for fill binding (from figma_get_library_variables). Takes precedence over fillColor."),
            paddingVariableKey: z.string().optional().describe("DS spacing variable key — applies to all 4 paddings via setBoundVariable."),
            itemSpacingVariableKey: z.string().optional().describe("DS spacing variable key for itemSpacing via setBoundVariable."),
            cornerRadiusVariableKey: z.string().optional().describe("DS radius variable key for cornerRadius via setBoundVariable."),
            cornerRadius: z.number().optional().describe("Hardcoded corner radius in px. DEPRECATED — prefer cornerRadiusVariableKey."),
        },
    }, async ({ name, x, y, width, height, fillColor, parentId, layoutMode, paddingTop, paddingBottom, paddingLeft, paddingRight, itemSpacing, primaryAxisSizingMode, counterAxisSizingMode, primaryAxisAlignItems, counterAxisAlignItems, layoutWrap, fillVariableKey, paddingVariableKey, itemSpacingVariableKey, cornerRadiusVariableKey, cornerRadius }) => {
        try {
            invalidateCache();
            const conn = getConnector(bridge);
            const autoPosition = x === undefined && !parentId;
            const useAutoLayout = layoutMode !== "NONE";
            const code = `
					${autoPosition ? `
					let posX = 0;
					const children = figma.currentPage.children;
					if (children.length > 0) {
						let maxX = 0;
						children.forEach(c => {
							const right = c.x + c.width;
							if (right > maxX) maxX = right;
						});
						posX = maxX + 100;
					}
					` : `let posX = ${x ?? 0};`}
					const frame = figma.createFrame();
					frame.name = ${JSON.stringify(name)};
					frame.x = posX; frame.y = ${y};
					frame.resize(${width}, ${height});
					${useAutoLayout ? `
					frame.layoutMode = ${JSON.stringify(layoutMode)};
					frame.paddingTop = ${paddingTop};
					frame.paddingBottom = ${paddingBottom};
					frame.paddingLeft = ${paddingLeft};
					frame.paddingRight = ${paddingRight};
					frame.itemSpacing = ${itemSpacing};
					frame.primaryAxisSizingMode = ${JSON.stringify(primaryAxisSizingMode)};
					frame.counterAxisSizingMode = ${JSON.stringify(counterAxisSizingMode)};
					${primaryAxisAlignItems ? `frame.primaryAxisAlignItems = ${JSON.stringify(primaryAxisAlignItems)};` : ""}
					${counterAxisAlignItems ? `frame.counterAxisAlignItems = ${JSON.stringify(counterAxisAlignItems)};` : ""}
					${layoutWrap ? `frame.layoutWrap = ${JSON.stringify(layoutWrap)};` : ""}
					` : ""}
					${cornerRadius != null ? `frame.cornerRadius = ${cornerRadius};` : ""}
					// v1.8.1: DS token binding takes precedence over hardcoded values
					${fillVariableKey ? `
					try {
						const fillVar = await figma.variables.importVariableByKeyAsync(${JSON.stringify(fillVariableKey)});
						const baseFill = { type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 1 };
						const boundFill = figma.variables.setBoundVariableForPaint(baseFill, 'color', fillVar);
						frame.fills = [boundFill];
					} catch (fillBindErr) {
						console.warn('[figma_create_frame] fillVariableKey binding failed:', fillBindErr.message);
					}
					` : fillColor ? `frame.fills = [{ type: 'SOLID', color: { r: parseInt('${fillColor}'.slice(1,3),16)/255, g: parseInt('${fillColor}'.slice(3,5),16)/255, b: parseInt('${fillColor}'.slice(5,7),16)/255 } }];` : ""}
					${paddingVariableKey ? `
					try {
						const padVar = await figma.variables.importVariableByKeyAsync(${JSON.stringify(paddingVariableKey)});
						frame.setBoundVariable('paddingTop', padVar);
						frame.setBoundVariable('paddingBottom', padVar);
						frame.setBoundVariable('paddingLeft', padVar);
						frame.setBoundVariable('paddingRight', padVar);
					} catch (padBindErr) {
						console.warn('[figma_create_frame] paddingVariableKey binding failed:', padBindErr.message);
					}
					` : ""}
					${itemSpacingVariableKey ? `
					try {
						const gapVar = await figma.variables.importVariableByKeyAsync(${JSON.stringify(itemSpacingVariableKey)});
						frame.setBoundVariable('itemSpacing', gapVar);
					} catch (gapBindErr) {
						console.warn('[figma_create_frame] itemSpacingVariableKey binding failed:', gapBindErr.message);
					}
					` : ""}
					${cornerRadiusVariableKey ? `
					try {
						const radVar = await figma.variables.importVariableByKeyAsync(${JSON.stringify(cornerRadiusVariableKey)});
						frame.setBoundVariable('topLeftRadius', radVar);
						frame.setBoundVariable('topRightRadius', radVar);
						frame.setBoundVariable('bottomLeftRadius', radVar);
						frame.setBoundVariable('bottomRightRadius', radVar);
					} catch (radBindErr) {
						console.warn('[figma_create_frame] cornerRadiusVariableKey binding failed:', radBindErr.message);
					}
					` : ""}
					${parentId ? `const parent = await figma.getNodeByIdAsync(${JSON.stringify(parentId)}); if (parent && 'appendChild' in parent) parent.appendChild(frame);` : ""}
					const boundCount = frame.boundVariables ? Object.keys(frame.boundVariables).length : 0;
					return { id: frame.id, name: frame.name, width: frame.width, height: frame.height, x: frame.x, y: frame.y, layoutMode: frame.layoutMode, boundVariableCount: boundCount };
				`;
            const result = await conn.executeCodeViaUI(code, 10000);
            return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }) }], isError: true };
        }
    });
    server.registerTool("figma_create_text", {
        description: "Create a new text node on the current page. Returns the created node ID. " +
            "IMPORTANT: fontFamily defaults to 'Inter' — if using a design system (e.g. SUI uses SHBGrotesk), specify the DS font. " +
            "For DS text with proper token binding, prefer figma_execute with importStyleByKeyAsync + setTextStyleIdAsync instead.",
        inputSchema: {
            text: z.string().describe("Text content"),
            x: z.number().optional().default(0),
            y: z.number().optional().default(0),
            name: z.string().optional().describe("Node name (default: text content)"),
            fontSize: z.number().optional().default(16),
            fontFamily: z.string().optional().default("Inter").describe("Font family — defaults to Inter. Specify DS font if using a design system (e.g. SHBGrotesk for SUI)."),
            fontStyle: z.string().optional().default("Regular"),
            fillColor: z.string().optional().describe("Text color hex e.g. '#000000'"),
            parentId: z.string().optional().describe("Parent node ID"),
        },
    }, async ({ text, x, y, name, fontSize, fontFamily, fontStyle, fillColor, parentId }) => {
        try {
            const conn = getConnector(bridge);
            const code = `
					const node = figma.createText();
					await figma.loadFontAsync({ family: ${JSON.stringify(fontFamily)}, style: ${JSON.stringify(fontStyle)} });
					node.characters = ${JSON.stringify(text)};
					node.name = ${JSON.stringify(name || text.slice(0, 30))};
					node.x = ${x}; node.y = ${y};
					node.fontSize = ${fontSize};
					${fillColor ? `node.fills = [{ type: 'SOLID', color: { r: parseInt('${fillColor}'.slice(1,3),16)/255, g: parseInt('${fillColor}'.slice(3,5),16)/255, b: parseInt('${fillColor}'.slice(5,7),16)/255 } }];` : ""}
					${parentId ? `const parent = await figma.getNodeByIdAsync(${JSON.stringify(parentId)}); if (parent && 'appendChild' in parent) parent.appendChild(node);` : ""}
					return { id: node.id, name: node.name, characters: node.characters };
				`;
            const result = await conn.executeCodeViaUI(code, 10000);
            return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }) }], isError: true };
        }
    });
    server.registerTool("figma_create_rectangle", {
        description: "Create a new rectangle node on the current page.",
        inputSchema: {
            x: z.number().optional().default(0),
            y: z.number().optional().default(0),
            width: z.number().optional().default(100),
            height: z.number().optional().default(100),
            name: z.string().optional().default("Rectangle"),
            fillColor: z.string().optional().default("#cccccc").describe("Hex color"),
            cornerRadius: z.number().optional().describe("Corner radius"),
            parentId: z.string().optional(),
        },
    }, async ({ x, y, width, height, name, fillColor, cornerRadius, parentId }) => {
        try {
            const conn = getConnector(bridge);
            const code = `
					const rect = figma.createRectangle();
					rect.name = ${JSON.stringify(name)};
					rect.x = ${x}; rect.y = ${y};
					rect.resize(${width}, ${height});
					${fillColor ? `rect.fills = [{ type: 'SOLID', color: { r: parseInt('${fillColor}'.slice(1,3),16)/255, g: parseInt('${fillColor}'.slice(3,5),16)/255, b: parseInt('${fillColor}'.slice(5,7),16)/255 } }];` : ""}
					${cornerRadius !== undefined ? `rect.cornerRadius = ${cornerRadius};` : ""}
					${parentId ? `const parent = await figma.getNodeByIdAsync(${JSON.stringify(parentId)}); if (parent && 'appendChild' in parent) parent.appendChild(rect);` : ""}
					return { id: rect.id, name: rect.name };
				`;
            const result = await conn.executeCodeViaUI(code, 10000);
            return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }) }], isError: true };
        }
    });
    server.registerTool("figma_create_group", {
        description: "Group existing nodes into a new group. Provide node IDs to group.",
        inputSchema: {
            nodeIds: z.array(z.string()).min(1).describe("Array of node IDs to group"),
            name: z.string().optional().default("Group"),
        },
    }, async ({ nodeIds, name }) => {
        try {
            const conn = getConnector(bridge);
            const code = `
					const nodes = [];
					for (const id of ${JSON.stringify(nodeIds)}) {
						const n = await figma.getNodeByIdAsync(id);
						if (n) nodes.push(n);
					}
					if (nodes.length === 0) throw new Error("No valid nodes found");
					const group = figma.group(nodes, nodes[0].parent || figma.currentPage);
					group.name = ${JSON.stringify(name)};
					return { id: group.id, name: group.name, childCount: group.children.length };
				`;
            const result = await conn.executeCodeViaUI(code, 10000);
            return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }) }], isError: true };
        }
    });
    // ---- figma_export_nodes (batch SVG/PNG/JPG/PDF export) ----
    server.registerTool("figma_export_nodes", {
        description: "Export one or multiple nodes as SVG, PNG, JPG, or PDF. Returns base64-encoded data for each node. " +
            "Supports batch export (up to 50 nodes). No REST API token needed — uses plugin exportAsync. " +
            "SVG preserves vectors; PNG/JPG are rasterized at configurable scale. " +
            "v1.8.0: default scale=1 for context safety (was 2). Override for high-DPI exports.",
        inputSchema: {
            nodeIds: z.array(z.string()).min(1).max(50).describe("Node IDs to export (1-50)"),
            format: z.enum(["PNG", "SVG", "JPG", "PDF"]).optional().default("PNG").describe("Export format"),
            scale: z.number().min(0.5).max(4).optional().default(LEGACY_DEFAULTS ? 2 : 1).describe("Scale factor (0.5-4, default 1)"),
            svgOutlineText: z.boolean().optional().describe("SVG: render text as outlines (default true)"),
            svgIncludeId: z.boolean().optional().describe("SVG: include node IDs in attributes"),
        },
    }, async ({ nodeIds, format, scale, svgOutlineText, svgIncludeId }) => {
        try {
            const conn = getConnector(bridge);
            const result = await conn.batchExportNodes({
                nodeIds,
                format: format,
                scale,
                svgOutlineText,
                svgIncludeId,
            });
            const results = result?.results || [];
            const successful = results.filter((r) => !r.error);
            const failed = results.filter((r) => r.error);
            const totalBytes = successful.reduce((sum, r) => sum + (r.byteLength || 0), 0);
            const contentBlocks = [];
            if (totalBytes > 5 * 1024 * 1024) {
                contentBlocks.push({
                    type: "text",
                    text: `⚠️ Large export: ${Math.round(totalBytes / 1024 / 1024)}MB total. Consider fewer nodes or lower scale.`,
                });
            }
            contentBlocks.push({
                type: "text",
                text: JSON.stringify({
                    success: true,
                    format,
                    scale,
                    exported: successful.length,
                    failed: failed.length,
                    totalBytes,
                    results: results.map((r) => ({
                        nodeId: r.nodeId,
                        name: r.name,
                        format: r.format,
                        byteLength: r.byteLength,
                        ...(r.base64 && { base64: r.base64 }),
                        ...(r.error && { error: r.error }),
                    })),
                }),
            });
            return { content: contentBlocks };
        }
        catch (err) {
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }) }],
                isError: true,
            };
        }
    });
    // ---- figma_search_assets (team library search via plugin) ----
    server.registerTool("figma_search_assets", {
        description: "Search for design system assets in the current Figma file. Returns: " +
            "(1) team library VARIABLES via figma.teamLibrary API (all enabled libraries), " +
            "(2) file-local COMPONENTS / COMPONENT_SETS, and " +
            "(3) v1.8.0+: REMOTE LIBRARY COMPONENTS discovered by scanning existing INSTANCE nodes (returned as 'libraryComponents'). " +
            "For library components to appear, at least one DS instance must exist in the file — place one manually first if empty. " +
            "Pass currentPageOnly=false to scan all pages for instance discovery. " +
            "Use the returned componentKey with figma_instantiate_component to place new instances. " +
            "Pass assetTypes to filter: ['variables'], ['components'], or both (default).",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma or FigJam file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            query: z.string().optional().describe("Search query to filter by name"),
            assetTypes: z.array(z.string()).optional().describe("Asset types to search: 'variables', 'components'. Default: both."),
            limit: z.number().min(1).max(80).optional().describe("Max results per asset type (default 25, max 80)"),
            currentPageOnly: z.boolean().optional().describe("For components: search current page only (default true)"),
        },
        annotations: { readOnlyHint: true },
    }, safeToolHandler(async ({ figmaUrl, fileKey, query, assetTypes, limit, currentPageOnly }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const result = await conn.searchLibraryAssets({
            query: query || undefined,
            assetTypes: assetTypes?.length ? assetTypes : undefined,
            limit: limit ?? undefined,
            currentPageOnly,
        });
        const data = result;
        return { content: [{ type: "text", text: JSON.stringify({ success: true, ...data }) }] };
    }));
    // ---- figma_get_code_connect (Code Connect hints: documentationLinks + componentKey) ----
    server.registerTool("figma_get_code_connect", {
        description: "Get Code Connect hints for components/instances: documentationLinks, componentKey, name, description. " +
            "Pass nodeIds for specific nodes, or scanCurrentPage=true to scan the current page for COMPONENT/COMPONENT_SET/INSTANCE nodes. " +
            "Note: Full Code Connect source map lives in figma.config / Figma CLI; this tool returns plugin-accessible hints only. " +
            "Use Figma's official MCP get_code_connect_map for native repo paths.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            nodeIds: z.array(z.string()).optional().describe("Explicit node IDs to inspect."),
            scanCurrentPage: z.boolean().optional().describe("Scan COMPONENT/COMPONENT_SET/INSTANCE on current page."),
            maxNodes: z.number().min(1).max(120).optional().describe("Cap for current-page scan (default 40, max 120)."),
        },
        annotations: { readOnlyHint: true },
    }, safeToolHandler(async ({ figmaUrl, fileKey, nodeIds, scanCurrentPage, maxNodes }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const result = await conn.getCodeConnectHints({ nodeIds, scanCurrentPage, maxNodes });
        const data = result;
        return { content: [{ type: "text", text: JSON.stringify({ success: true, ...data }) }] };
    }));
    // ---- figma_use (high-level orchestrator: component + token + design_context) ----
    server.registerTool("figma_use", {
        description: "High-level orchestrator that bundles component, token and design-context lookups in one call. " +
            "intent='component' -> node detail + Code Connect hint. " +
            "intent='token' -> team library variable search. " +
            "intent='design_context' -> full bundle (component + hints + tokens). " +
            "Prefer this before implementing a design to collect all references in a single round-trip.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            intent: z.enum(["component", "token", "design_context"]).describe("Lookup mode."),
            nodeId: z.string().optional().describe("Required for 'component' and 'design_context'."),
            query: z.string().optional().describe("Token name filter for 'token' / 'design_context'."),
            limit: z.number().min(1).max(80).optional().describe("Max variable results (default 25)."),
        },
        annotations: { readOnlyHint: true },
    }, safeToolHandler(async ({ figmaUrl, fileKey, intent, nodeId, query, limit }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const needsNode = intent === "component" || intent === "design_context";
        if (needsNode && !nodeId) {
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, error: `intent='${intent}' requires nodeId` }) }],
                isError: true,
            };
        }
        const safe = async (key, p) => p.then((value) => ({ key, ok: true, value }))
            .catch((e) => ({ key, ok: false, error: e instanceof Error ? e.message : String(e) }));
        const tasks = [];
        if (intent === "component" || intent === "design_context") {
            tasks.push(safe("component", conn.getComponentByNodeId(nodeId)));
            tasks.push(safe("codeConnect", conn.getCodeConnectHints({ nodeIds: [nodeId] })));
        }
        if (intent === "token" || intent === "design_context") {
            tasks.push(safe("tokens", conn.searchLibraryAssets({
                assetTypes: ["variables"],
                query: query || undefined,
                limit: limit ?? undefined,
            })));
        }
        const results = await Promise.all(tasks);
        const partial = results.some((r) => r.ok === false);
        return {
            content: [{ type: "text", text: JSON.stringify({ success: true, intent, partial, results }) }],
        };
    }));
    // ---- figma_get_library_variables (team library variable discovery with import keys) ----
    server.registerTool("figma_get_library_variables", {
        description: "List variables from team library collections with import keys. " +
            "Uses figma.teamLibrary API — works in the TARGET file, no need to connect the DS source file. " +
            "Returns variable name, key (for importVariableByKeyAsync), resolvedType, collection, and library name. " +
            "Use the returned keys with figma_bind_variable or figma.variables.importVariableByKeyAsync() in figma_execute.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            query: z.string().optional().describe("Filter variables by name (case-insensitive contains)"),
            collectionName: z.string().optional().describe("Filter by collection name (exact match)"),
            libraryName: z.string().optional().describe("Filter by library name (exact match, e.g. '❖ SUI')"),
            limit: z.number().min(1).max(500).optional().describe("Max results (default 100)"),
        },
        annotations: { readOnlyHint: true },
    }, safeToolHandler(async ({ figmaUrl, fileKey, query, collectionName, libraryName, limit }) => {
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const maxResults = limit ?? 100;
        const q = query ? query.toLowerCase() : "";
        const code = `
				if (!figma.teamLibrary) return { success: false, error: "teamLibrary API not available" };
				var cols = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
				var filtered = cols;
				${collectionName ? `filtered = filtered.filter(function(c) { return c.name === ${JSON.stringify(collectionName)}; });` : ""}
				${libraryName ? `filtered = filtered.filter(function(c) { return c.libraryName === ${JSON.stringify(libraryName)}; });` : ""}
				var results = [];
				for (var ci = 0; ci < filtered.length && results.length < ${maxResults}; ci++) {
					var col = filtered[ci];
					var vars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(col.key);
					for (var vi = 0; vi < vars.length && results.length < ${maxResults}; vi++) {
						var v = vars[vi];
						var nm = (v.name || "").toLowerCase();
						if (!${JSON.stringify(q)} || nm.indexOf(${JSON.stringify(q)}) >= 0) {
							results.push({ name: v.name, key: v.key, resolvedType: v.resolvedType, collection: col.name, library: col.libraryName });
						}
					}
				}
				return { success: true, count: results.length, variables: results };
			`;
        const result = await conn.executeCodeViaUI(code, 30000);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    // ---- figma_bind_variable (import variable and bind to node property) ----
    server.registerTool("figma_bind_variable", {
        description: "Import a library variable by key and bind it to a node property. " +
            "For colors: binds to fills or strokes via setBoundVariableForPaint. " +
            "For spacing/sizing: binds via setBoundVariable (paddingLeft, itemSpacing, cornerRadius, etc.). " +
            "Get variableKey from figma_get_library_variables. " +
            "The node's fill/spacing will dynamically update when the DS token changes.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            nodeId: z.string().describe("Target node ID"),
            variableKey: z.string().describe("Variable import key from figma_get_library_variables"),
            property: z.enum([
                "fills", "strokes",
                "paddingLeft", "paddingRight", "paddingTop", "paddingBottom",
                "itemSpacing", "counterAxisSpacing",
                "topLeftRadius", "topRightRadius", "bottomLeftRadius", "bottomRightRadius", "cornerRadius",
                "strokeWeight", "opacity",
                "width", "height", "minWidth", "minHeight", "maxWidth", "maxHeight",
            ]).describe("Node property to bind the variable to"),
            paintIndex: z.number().optional().default(0).describe("For fills/strokes: which paint index (default 0)"),
        },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async ({ figmaUrl, fileKey, nodeId, variableKey, property, paintIndex }) => {
        invalidateCache();
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const idx = paintIndex ?? 0;
        const code = `
				var variable = await figma.variables.importVariableByKeyAsync(${JSON.stringify(variableKey)});
				var node = await figma.getNodeByIdAsync(${JSON.stringify(nodeId)});
				if (!node) throw new Error("Node not found: " + ${JSON.stringify(nodeId)});
				var prop = ${JSON.stringify(property)};
				if (prop === "fills" || prop === "strokes") {
					var paints = [];
					for (var i = 0; i < node[prop].length; i++) paints.push(node[prop][i]);
					if (!paints[${idx}]) throw new Error("No paint at index ${idx} on " + prop);
					var boundPaint = figma.variables.setBoundVariableForPaint(paints[${idx}], "color", variable);
					paints[${idx}] = boundPaint;
					node[prop] = paints;
				} else {
					node.setBoundVariable(prop, variable);
				}
				return { success: true, nodeId: ${JSON.stringify(nodeId)}, property: prop, variableName: variable.name, variableId: variable.id };
			`;
        const result = await conn.executeCodeViaUI(code, 10000);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    // ---- figma_import_style (import text/paint/effect style from library) ----
    server.registerTool("figma_import_style", {
        description: "Import a text, paint, or effect style from a team library by key, and optionally apply it to a node. " +
            "IMPORTANT: This API only imports PUBLISHED LIBRARY styles, NOT local file styles. " +
            "For local styles, use 'node.fillStyleId = style.id' (or textStyleId/effectStyleId) directly via figma_execute. " +
            "Get library style keys from .claude/libraries/ cache or REST API: figma_rest_api GET /v1/files/{fileKey}/styles. " +
            "For TEXT styles: applies via setTextStyleIdAsync (includes font, size, weight). " +
            "For PAINT styles: applies via fillStyleId. For EFFECT styles: applies via effectStyleId.",
        inputSchema: {
            figmaUrl: z.string().optional().describe("Figma file URL for routing."),
            fileKey: z.string().optional().describe("Target a specific connected file."),
            styleKey: z.string().describe("Library style key (must be from a PUBLISHED team library, not a local style)"),
            nodeId: z.string().optional().describe("Node ID to apply the style to (optional — omit to just import)"),
        },
        annotations: { destructiveHint: true },
    }, safeToolHandler(async ({ figmaUrl, fileKey, styleKey, nodeId }) => {
        invalidateCache();
        const conn = getConnector(bridge, resolveFileKey(figmaUrl, fileKey));
        const code = `
				var style;
				try {
					style = await figma.importStyleByKeyAsync(${JSON.stringify(styleKey)});
				} catch (e) {
					var origMsg = e && e.message ? e.message : String(e);
					throw new Error(
						"importStyleByKeyAsync failed for key '" + ${JSON.stringify(styleKey)} + "'. " +
						"This API only works with PUBLISHED LIBRARY styles. " +
						"Local file styles cannot be imported this way — use 'node.fillStyleId/textStyleId/effectStyleId = <localStyleId>' directly via figma_execute. " +
						"To find library style keys, use REST API: GET /v1/files/{fileKey}/styles. " +
						"Original error: " + origMsg
					);
				}
				var applied = false;
				${nodeId ? `
				var node = await figma.getNodeByIdAsync(${JSON.stringify(nodeId)});
				if (!node) throw new Error("Node not found: " + ${JSON.stringify(nodeId)});
				if (style.type === "TEXT" && node.type === "TEXT") {
					await node.setTextStyleIdAsync(style.id);
					applied = true;
				} else if (style.type === "PAINT") {
					node.fillStyleId = style.id;
					applied = true;
				} else if (style.type === "EFFECT") {
					node.effectStyleId = style.id;
					applied = true;
				}
				` : ""}
				return { success: true, styleId: style.id, styleName: style.name, styleType: style.type, applied: applied };
			`;
        const result = await conn.executeCodeViaUI(code, 10000);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }));
    // ---- figma_plugin_diagnostics ----
    server.registerTool("figma_plugin_diagnostics", {
        description: "Get diagnostic info about plugin connection health: uptime, connected clients, " +
            "pending requests, bridge version, memory usage.",
        inputSchema: {},
        annotations: { readOnlyHint: true },
    }, async () => {
        const clients = bridge.listConnectedFiles();
        const tokenInfo = bridge.getFigmaRestToken();
        const mem = process.memoryUsage();
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        preferredPort: bridge.getPreferredPort(),
                        actualPort: bridge.getPort(),
                        autoIncremented: bridge.getPreferredPort() !== bridge.getPort(),
                        bridgeListening: bridge.isListening(),
                        connectedClients: bridge.connectedClientCount(),
                        connectedFiles: clients.map((c) => ({ fileKey: c.fileKey, fileName: c.fileName })),
                        uptime: Math.round(process.uptime()),
                        memoryMB: {
                            rss: Math.round(mem.rss / 1024 / 1024),
                            heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
                            heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
                        },
                        hasRestToken: !!tokenInfo,
                        rateLimit: tokenInfo?.rateLimit || null,
                        nodeVersion: process.version,
                    }),
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
                        }),
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
                            }),
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
                            }),
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
                content: [{ type: "text", text: JSON.stringify({ success: false, error: "Token must start with 'figd_'" }) }],
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
                    content: [{ type: "text", text: JSON.stringify({ success: false, error: `Token validation failed: ${res.status} ${res.statusText}` }) }],
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
                        }) }],
            };
        }
        catch (err) {
            return {
                content: [{ type: "text", text: JSON.stringify({ success: false, error: `Token validation error: ${err instanceof Error ? err.message : String(err)}` }) }],
                isError: true,
            };
        }
    });
    server.registerTool("figma_clear_rest_token", {
        description: "Clear the stored Figma REST API token from memory.",
        inputSchema: {},
    }, async () => {
        bridge.clearFigmaRestToken();
        return { content: [{ type: "text", text: JSON.stringify({ success: true, message: "Token cleared." }) }] };
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
                        }) }],
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
                        }) }],
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
                                    }) }],
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
                                }) }],
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
                    }),
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
                            }) }],
                    isError: true,
                };
            }
        }
        // Should not reach here
        return {
            content: [{ type: "text", text: JSON.stringify({ success: false, error: "Unexpected: all retries exhausted" }) }],
            isError: true,
        };
    });
    // ---- v1.9.9: Figma Prototype Connections + Animations (FUTURE.md:176-254) ----
    server.registerTool("figma_create_prototype_connection", {
        description: "Create a prototype reaction between two nodes (source -> destination). " +
            "Maps Figma Prototype panel: trigger (On click/hover/press/drag, After delay, Mouse events, Key/gamepad) + " +
            "action (Navigate/Overlay/Swap/Back/Close/Change to/Scroll to/Open link) + " +
            "transition type (Dissolve/Smart animate/Scroll animate/Move in-out/Push/Slide in-out) with direction (LEFT/RIGHT/TOP/BOTTOM) + " +
            "easing + duration (ms, converted to seconds internally) + matchLayers (only on DirectionalTransition per Figma schema). " +
            "Uses Figma Plugin API setReactionsAsync (reactions property is readonly in 2024+ API). " +
            "v1 scope: SET_VARIABLE, SET_VARIABLE_MODE, UPDATE_MEDIA_RUNTIME, CONDITIONAL actions are NOT included (future release). " +
            "Overlay background/close-on-outside are readonly in Plugin API — configure in Figma UI (Prototype tab -> Advanced -> Overlay).",
        inputSchema: {
            sourceNodeId: z.string().describe("Source node id (FRAME/INSTANCE/COMPONENT/GROUP etc.) that will receive the reaction."),
            destinationNodeId: z.string().optional().describe("Destination FRAME id. Required for NAVIGATE/OVERLAY/SWAP/SCROLL_TO/CHANGE_TO; omitted for BACK/CLOSE/URL."),
            trigger: z.enum(["ON_CLICK", "ON_HOVER", "ON_PRESS", "ON_DRAG", "AFTER_TIMEOUT", "MOUSE_ENTER", "MOUSE_LEAVE", "MOUSE_UP", "MOUSE_DOWN", "ON_KEY_DOWN"]).optional().default("ON_CLICK"),
            timeout: z.number().optional().describe("Milliseconds — required when trigger=AFTER_TIMEOUT (default 1000)."),
            mouseDelay: z.number().optional().describe("Seconds — optional hold-delay for MOUSE_* triggers (e.g. 0.3 = 300ms hover before firing)."),
            keyCodes: z.array(z.number()).optional().describe("Required when trigger=ON_KEY_DOWN (e.g. [13]=Enter, [27]=Escape, [32]=Space)."),
            device: z.enum(["KEYBOARD", "XBOX_ONE", "PS4", "SWITCH_PRO", "UNKNOWN_CONTROLLER"]).optional().default("KEYBOARD").describe("Input device for ON_KEY_DOWN."),
            action: z.enum(["NAVIGATE", "OVERLAY", "SWAP", "BACK", "CLOSE", "SCROLL_TO", "CHANGE_TO", "URL"]).optional().default("NAVIGATE"),
            url: z.string().optional().describe("Required when action=URL."),
            transitionType: z.enum(["INSTANT", "DISSOLVE", "SMART_ANIMATE", "SCROLL_ANIMATE", "MOVE_IN", "MOVE_OUT", "PUSH", "SLIDE_IN", "SLIDE_OUT"]).optional().default("INSTANT").describe("INSTANT -> transition: null (no Figma INSTANT type). Directional types (MOVE_IN/OUT, PUSH, SLIDE_IN/OUT) require 'direction'."),
            direction: z.enum(["LEFT", "RIGHT", "TOP", "BOTTOM"]).optional().describe("Required for MOVE_IN/MOVE_OUT/PUSH/SLIDE_IN/SLIDE_OUT transitions."),
            matchLayers: z.boolean().optional().default(false).describe("DirectionalTransition only (SLIDE_IN/MOVE_IN/PUSH/...) — enables smart layer morph on top of directional transition. INVALID for SMART_ANIMATE (Figma schema rejects it). SMART_ANIMATE inherently matches layers."),
            duration: z.number().optional().default(300).describe("Transition duration in ms; converted to seconds for Plugin API."),
            easing: z.enum(["EASE_IN", "EASE_OUT", "EASE_IN_AND_OUT", "LINEAR", "GENTLE", "QUICK", "BOUNCY", "SLOW", "EASE_IN_BACK", "EASE_OUT_BACK", "EASE_IN_AND_OUT_BACK"]).optional().default("EASE_OUT"),
            preserveScrollPosition: z.boolean().optional().default(false),
            overlayRelativePosition: z.object({ x: z.number(), y: z.number() }).optional().describe("OVERLAY action only — free overlay position. Requires destination frame's overlayPositionType=MANUAL (set in Figma UI)."),
            replace: z.boolean().optional().default(false).describe("true: replace reactions array; false (default): append."),
        },
    }, async ({ sourceNodeId, destinationNodeId, trigger, timeout, mouseDelay, keyCodes, device, action, url, transitionType, direction, matchLayers, duration, easing, preserveScrollPosition, overlayRelativePosition, replace }) => {
        try {
            invalidateCache();
            // TS-side param validation (fail fast, before hitting the plugin)
            if (trigger === "ON_KEY_DOWN" && (!keyCodes || keyCodes.length === 0)) {
                throw new Error("KEYCODES_REQUIRED: trigger=ON_KEY_DOWN için keyCodes (en az 1 tuş kodu) gerekli");
            }
            const directionalTypes = ["MOVE_IN", "MOVE_OUT", "PUSH", "SLIDE_IN", "SLIDE_OUT"];
            if (directionalTypes.includes(transitionType) && !direction) {
                throw new Error(`DIRECTION_REQUIRED: transitionType=${transitionType} için direction (LEFT/RIGHT/TOP/BOTTOM) gerekli`);
            }
            const conn = getConnector(bridge);
            // Trigger extras (inject into the generated JS as an object literal fragment)
            let triggerExtras = "";
            if (trigger === "AFTER_TIMEOUT") {
                triggerExtras = `, timeout: ${timeout ?? 1000}`;
            }
            else if (trigger === "ON_KEY_DOWN") {
                triggerExtras = `, device: ${JSON.stringify(device)}, keyCodes: ${JSON.stringify(keyCodes ?? [])}`;
            }
            else if (["MOUSE_UP", "MOUSE_DOWN", "MOUSE_ENTER", "MOUSE_LEAVE"].includes(trigger) && mouseDelay !== undefined) {
                triggerExtras = `, delay: ${mouseDelay}`;
            }
            const code = `
					const src = await figma.getNodeByIdAsync(${JSON.stringify(sourceNodeId)});
					if (!src) throw new Error("SOURCE_NOT_FOUND: " + ${JSON.stringify(sourceNodeId)});
					if (typeof src.setReactionsAsync !== "function") throw new Error("UNSUPPORTED_NODE_TYPE: " + src.type);

					const NO_DEST = ["BACK","CLOSE","URL"].indexOf(${JSON.stringify(action)}) !== -1;
					let destId = null;
					if (!NO_DEST) {
						if (!${JSON.stringify(destinationNodeId || "")}) throw new Error("DESTINATION_REQUIRED: action=" + ${JSON.stringify(action)});
						const dst = await figma.getNodeByIdAsync(${JSON.stringify(destinationNodeId || "")});
						if (!dst) throw new Error("DESTINATION_NOT_FOUND: " + ${JSON.stringify(destinationNodeId || "")});
						if (${JSON.stringify(action)} === "NAVIGATE" && dst.type !== "FRAME")
							throw new Error("NAVIGATE_REQUIRES_FRAME: dst=" + dst.type);
						// v1.9.10 preflight: OVERLAY action destination frame needs overlayPositionType set in Figma UI
						// Plugin API can't write overlayPositionType/overlayBackgroundInteraction/overlayBackground (readonly).
						if (${JSON.stringify(action)} === "OVERLAY" && dst.type === "FRAME" && ("overlayPositionType" in dst) && dst.overlayPositionType === "NONE") {
							throw new Error("OVERLAY_FRAME_NOT_CONFIGURED: destinationNodeId=" + ${JSON.stringify(destinationNodeId || "")} + " Figma'da overlay olarak isaretli degil. Cozum: frame'i sec -> Prototype tab -> Advanced -> 'Overlay' ac -> Position sec. Plugin API bu ayari yazamiyor (readonly).");
						}
						destId = dst.id;
					}

					const triggerObj = { type: ${JSON.stringify(trigger)}${triggerExtras} };

					let actionObj;
					if (${JSON.stringify(action)} === "BACK") actionObj = { type: "BACK" };
					else if (${JSON.stringify(action)} === "CLOSE") actionObj = { type: "CLOSE" };
					else if (${JSON.stringify(action)} === "URL") actionObj = { type: "URL", url: ${JSON.stringify(url || "")} };
					else {
						const navMap = { NAVIGATE: "NAVIGATE", OVERLAY: "OVERLAY", SWAP: "SWAP", SCROLL_TO: "SCROLL_TO", CHANGE_TO: "CHANGE_TO" };
						const tranType = ${JSON.stringify(transitionType)};
						const isInstant = tranType === "INSTANT";
						const isDirectional = ["MOVE_IN","MOVE_OUT","PUSH","SLIDE_IN","SLIDE_OUT"].indexOf(tranType) !== -1;
						let transitionObj = null;
						if (!isInstant) {
							transitionObj = { type: tranType, easing: { type: ${JSON.stringify(easing)} }, duration: ${duration} / 1000 };
							if (isDirectional) {
								transitionObj.direction = ${JSON.stringify(direction || "RIGHT")};
								// v1.9.10 fix: matchLayers is only valid on DirectionalTransition (schema validation),
								// NOT on SMART_ANIMATE (SimpleTransition inherently matches layers). Only inject when true + directional.
								${matchLayers ? `transitionObj.matchLayers = true;` : ""}
							}
							// SMART_ANIMATE and other SimpleTransition types: do NOT inject matchLayers.
						}
						actionObj = {
							type: "NODE",
							destinationId: destId,
							navigation: navMap[${JSON.stringify(action)}],
							transition: transitionObj,
							preserveScrollPosition: ${preserveScrollPosition}
						};
						${overlayRelativePosition ? `if (${JSON.stringify(action)} === "OVERLAY") actionObj.overlayRelativePosition = ${JSON.stringify(overlayRelativePosition)};` : ""}
						// v1.9.10 NOT: overlayCloseOnClickOutside and overlayBackgroundColor params removed
						// — FrameNode.overlayBackgroundInteraction and overlayBackground are readonly in Plugin API.
						// User must configure these in Figma UI (Prototype tab -> Advanced -> Overlay).
					}

					const reaction = { trigger: triggerObj, actions: [actionObj] };
					const current = ${replace} ? [] : ((src.reactions) || []).slice();
					current.push(reaction);
					await src.setReactionsAsync(current);
					const after = (src.reactions) || [];
					return { id: src.id, reactionsCount: after.length, trigger: triggerObj.type, action: actionObj.type, destinationId: destId, transitionType: ${JSON.stringify(transitionType)}, direction: ${JSON.stringify(direction || null)} };
				`;
            const result = await conn.executeCodeViaUI(code, 10000);
            return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }) }], isError: true };
        }
    });
    server.registerTool("figma_get_prototype_connections", {
        description: "Read prototype reactions on a node subtree or the whole current page. " +
            "Read-only audit — returns trigger, action, navigation, destinationId, transition, flowStartingPoints. " +
            "Uses getReactionsAsync if available, falls back to node.reactions getter. " +
            "At least one of nodeId or pageScope=true must be provided.",
        inputSchema: {
            nodeId: z.string().optional().describe("Scans this node and its descendants."),
            pageScope: z.boolean().optional().default(false).describe("true: scan the entire current page. Either nodeId or pageScope is required."),
            includeFlowStartingPoints: z.boolean().optional().default(true),
        },
        annotations: { readOnlyHint: true },
    }, async ({ nodeId, pageScope, includeFlowStartingPoints }) => {
        try {
            const conn = getConnector(bridge);
            const code = `
					if (!${JSON.stringify(nodeId || "")} && !${pageScope}) throw new Error("MISSING_SCOPE: nodeId veya pageScope=true gerekli");

					const getR = async (n) => {
						if (typeof n.getReactionsAsync === "function") return await n.getReactionsAsync();
						return n.reactions || [];
					};

					const summarize = (n, reactions) => ({
						nodeId: n.id, name: n.name, type: n.type,
						reactions: (reactions || []).map(r => ({
							trigger: r.trigger,
							actions: (r.actions || []).map(a => ({
								type: a.type,
								navigation: a.navigation || null,
								destinationId: a.destinationId || null,
								transition: a.transition ? { type: a.transition.type, direction: a.transition.direction || null, matchLayers: a.transition.matchLayers || false, easing: a.transition.easing && a.transition.easing.type, duration: a.transition.duration } : null,
								url: a.url || null,
								preserveScrollPosition: a.preserveScrollPosition || false,
								overlayRelativePosition: a.overlayRelativePosition || null
							}))
						}))
					});

					const results = [];
					const hasReactions = (n) => typeof n.setReactionsAsync === "function" || "reactions" in n;

					if (${JSON.stringify(nodeId || "")}) {
						const root = await figma.getNodeByIdAsync(${JSON.stringify(nodeId || "")});
						if (!root) throw new Error("NODE_NOT_FOUND: " + ${JSON.stringify(nodeId || "")});
						if (hasReactions(root)) {
							const r = await getR(root);
							if (r.length) results.push(summarize(root, r));
						}
						if ("findAll" in root) {
							const descendants = root.findAll(n => hasReactions(n));
							for (const n of descendants) {
								const r = await getR(n);
								if (r.length) results.push(summarize(n, r));
							}
						}
					} else if (${pageScope}) {
						const all = figma.currentPage.findAll(n => hasReactions(n));
						for (const n of all) {
							const r = await getR(n);
							if (r.length) results.push(summarize(n, r));
						}
					}
					const fsps = ${includeFlowStartingPoints} ? (figma.currentPage.flowStartingPoints || []) : [];
					return { connections: results, totalReactions: results.reduce((s, r) => s + r.reactions.length, 0), flowStartingPoints: fsps };
				`;
            const result = await conn.executeCodeViaUI(code, 15000);
            return toolResult(result, "figma_get_prototype_connections");
        }
        catch (err) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }) }], isError: true };
        }
    });
    server.registerTool("figma_set_flow_starting_point", {
        description: "Mark a FRAME as a prototype flow starting point (shown in Figma Prototype panel). " +
            "Uses page.setFlowStartingPointsAsync if available (future API), falls back to direct assignment. " +
            "Description is stored via pluginData (Figma FlowStartingPoint shape is { nodeId, name } only).",
        inputSchema: {
            nodeId: z.string().describe("FRAME node id to mark as a starting point."),
            name: z.string().describe("Flow name shown in Prototype panel (e.g. 'Login Akışı')."),
            description: z.string().optional().default(""),
            replace: z.boolean().optional().default(false).describe("true: replace entire array; false (default): append or update same nodeId."),
        },
    }, async ({ nodeId, name, description, replace }) => {
        try {
            invalidateCache();
            const conn = getConnector(bridge);
            const code = `
					const node = await figma.getNodeByIdAsync(${JSON.stringify(nodeId)});
					if (!node) throw new Error("NODE_NOT_FOUND: " + ${JSON.stringify(nodeId)});
					if (node.type !== "FRAME") throw new Error("FLOW_REQUIRES_FRAME: " + node.type);
					const page = node.parent && node.parent.type === "PAGE" ? node.parent : figma.currentPage;
					const existing = (page.flowStartingPoints || []).slice();
					const entry = { nodeId: node.id, name: ${JSON.stringify(name)} };
					const idx = existing.findIndex(fsp => fsp.nodeId === node.id);
					let nextArr;
					if (${replace}) nextArr = [entry];
					else if (idx === -1) { existing.push(entry); nextArr = existing; }
					else { existing[idx] = entry; nextArr = existing; }

					if (typeof page.setFlowStartingPointsAsync === "function") {
						await page.setFlowStartingPointsAsync(nextArr);
					} else {
						page.flowStartingPoints = nextArr;
					}
					if (${JSON.stringify(description)}) node.setPluginData("flow.description", ${JSON.stringify(description)});
					return { id: node.id, name: ${JSON.stringify(name)}, total: (page.flowStartingPoints || []).length };
				`;
            const result = await conn.executeCodeViaUI(code, 10000);
            return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }) }], isError: true };
        }
    });
    server.registerTool("figma_create_interaction", {
        description: "Create a variant state-change interaction on an INSTANCE/variant node (hover/press/focus -> variant). " +
            "Uses reactions API with navigation: CHANGE_TO. Target variant resolved by id or name within the same COMPONENT_SET. " +
            "Uses getMainComponentAsync for deprecation-safe main component access. " +
            "v1 supports INSTANT/DISSOLVE/SMART_ANIMATE transitions (DirectionalTransition not applicable to variants).",
        inputSchema: {
            nodeId: z.string().describe("INSTANCE or variant node id."),
            trigger: z.enum(["ON_HOVER", "ON_PRESS", "MOUSE_ENTER", "MOUSE_LEAVE", "MOUSE_DOWN", "MOUSE_UP", "ON_CLICK"]).optional().default("ON_HOVER"),
            targetVariantId: z.string().optional(),
            targetVariantName: z.string().optional().describe("Variant name (e.g. 'State=Hover') — resolved within the source's COMPONENT_SET."),
            transitionType: z.enum(["INSTANT", "DISSOLVE", "SMART_ANIMATE"]).optional().default("SMART_ANIMATE").describe("SMART_ANIMATE inherently matches layers — no explicit matchLayers param needed (Figma schema rejects it)."),
            duration: z.number().optional().default(150),
            easing: z.enum(["EASE_IN", "EASE_OUT", "EASE_IN_AND_OUT", "LINEAR", "GENTLE", "QUICK", "BOUNCY", "SLOW"]).optional().default("EASE_IN"),
        },
    }, async ({ nodeId, trigger, targetVariantId, targetVariantName, transitionType, duration, easing }) => {
        try {
            invalidateCache();
            const conn = getConnector(bridge);
            const code = `
					const node = await figma.getNodeByIdAsync(${JSON.stringify(nodeId)});
					if (!node) throw new Error("NODE_NOT_FOUND: " + ${JSON.stringify(nodeId)});
					if (typeof node.setReactionsAsync !== "function") throw new Error("UNSUPPORTED_NODE_TYPE: " + node.type);

					let targetId = ${JSON.stringify(targetVariantId || "")};
					if (!targetId) {
						const mc = node.type === "INSTANCE" ? await node.getMainComponentAsync() : node;
						const set = mc && mc.parent && mc.parent.type === "COMPONENT_SET" ? mc.parent : null;
						if (!set) throw new Error("NO_COMPONENT_SET");
						const match = set.children.find(c => c.name === ${JSON.stringify(targetVariantName || "")});
						if (!match) throw new Error("VARIANT_NOT_FOUND: " + ${JSON.stringify(targetVariantName || "")});
						targetId = match.id;
					}

					const tranType = ${JSON.stringify(transitionType)};
					let transitionObj = null;
					if (tranType !== "INSTANT") {
						// v1.9.10 fix: NO matchLayers for SMART_ANIMATE / DISSOLVE — Figma schema rejects it on SimpleTransition.
						transitionObj = { type: tranType, easing: { type: ${JSON.stringify(easing)} }, duration: ${duration} / 1000 };
					}
					const reaction = {
						trigger: { type: ${JSON.stringify(trigger)} },
						actions: [{
							type: "NODE",
							destinationId: targetId,
							navigation: "CHANGE_TO",
							transition: transitionObj,
							preserveScrollPosition: false
						}]
					};
					const current = (node.reactions || []).slice();
					current.push(reaction);
					await node.setReactionsAsync(current);
					const after = (node.reactions) || [];
					return { id: node.id, targetVariantId: targetId, reactionsCount: after.length };
				`;
            const result = await conn.executeCodeViaUI(code, 10000);
            return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }) }], isError: true };
        }
    });
    server.registerTool("figma_set_scroll_behavior", {
        description: "Set a node's scroll behavior (Figma Prototype panel > Scroll behavior). " +
            "overflowDirection (FrameNode): NONE/HORIZONTAL/VERTICAL/BOTH — defines prototype scroll axis. " +
            "scrollBehavior (SceneNode): SCROLLS/FIXED/STICKY_SCROLLS — FIXED = sticky header, STICKY_SCROLLS = becomes sticky after scrolling past. " +
            "At least one of overflowDirection or scrollBehavior must be provided.",
        inputSchema: {
            nodeId: z.string().describe("Target node id (FRAME/COMPONENT/COMPONENT_SET/INSTANCE for overflowDirection; any SceneNode for scrollBehavior)."),
            overflowDirection: z.enum(["NONE", "HORIZONTAL", "VERTICAL", "BOTH"]).optional(),
            scrollBehavior: z.enum(["SCROLLS", "FIXED", "STICKY_SCROLLS"]).optional(),
        },
    }, async ({ nodeId, overflowDirection, scrollBehavior }) => {
        try {
            if (!overflowDirection && !scrollBehavior) {
                throw new Error("MISSING_PARAM: overflowDirection veya scrollBehavior'dan en az biri verilmeli");
            }
            invalidateCache();
            const conn = getConnector(bridge);
            const code = `
					const node = await figma.getNodeByIdAsync(${JSON.stringify(nodeId)});
					if (!node) throw new Error("NODE_NOT_FOUND: " + ${JSON.stringify(nodeId)});
					const results = {};
					${overflowDirection ? `
					if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "COMPONENT_SET" && node.type !== "INSTANCE") {
						throw new Error("OVERFLOW_REQUIRES_FRAME_LIKE: " + node.type);
					}
					node.overflowDirection = ${JSON.stringify(overflowDirection)};
					results.overflowDirection = node.overflowDirection;
					` : ""}
					${scrollBehavior ? `
					if (!("scrollBehavior" in node)) throw new Error("SCROLL_BEHAVIOR_UNSUPPORTED: " + node.type);
					node.scrollBehavior = ${JSON.stringify(scrollBehavior)};
					results.scrollBehavior = node.scrollBehavior;
					` : ""}
					return { id: node.id, ...results };
				`;
            const result = await conn.executeCodeViaUI(code, 10000);
            return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }) }], isError: true };
        }
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
                        }) }],
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
                    }) }],
        };
    });
    const shutdown = () => {
        logger.info("Shutting down plugin-only MCP server...");
        closeAuditLog();
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
    const actualPort = bridge.getPort();
    const autoInc = bridge.getPreferredPort() !== actualPort;
    logger.info({ port: actualPort, preferredPort: bridge.getPreferredPort(), autoIncremented: autoInc }, "F-MCP ATezer Bridge (plugin-only) MCP server running on stdio; WebSocket on port %s%s", actualPort, autoInc ? ` (auto-incremented from ${bridge.getPreferredPort()})` : "");
}
main().catch((err) => {
    logger.error({ err }, "Fatal");
    process.exit(1);
});
//# sourceMappingURL=local-plugin-only.js.map