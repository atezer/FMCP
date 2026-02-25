/**
 * Figma API MCP Tools
 * MCP tool definitions for Figma REST API data extraction
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FigmaAPI } from "./figma-api.js";
import type { ConsoleMonitor } from "./console-monitor.js";
/**
 * Register Figma API tools with the MCP server
 */
export declare function registerFigmaAPITools(server: McpServer, getFigmaAPI: () => Promise<FigmaAPI>, getCurrentUrl: () => string | null, getConsoleMonitor?: () => ConsoleMonitor | null, getBrowserManager?: () => any, ensureInitialized?: () => Promise<void>, variablesCache?: Map<string, {
    data: any;
    timestamp: number;
}>, getDesktopConnector?: () => Promise<{
    captureScreenshot?: (nodeId: string | null, options?: {
        format?: string;
        scale?: number;
    }) => Promise<any>;
    setInstanceProperties?: (nodeId: string, properties: Record<string, unknown>) => Promise<any>;
} | null>): void;
//# sourceMappingURL=figma-tools.d.ts.map