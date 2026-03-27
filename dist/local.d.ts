#!/usr/bin/env node
/**
 * F-MCP ATezer (Figma MCP Bridge) - Local Mode
 *
 * Entry point for local MCP server that connects to Figma Desktop
 * via Chrome Remote Debugging Protocol (port 9222).
 *
 * This implementation uses stdio transport for MCP communication,
 * suitable for local IDE integrations and development workflows.
 *
 * Requirements:
 * - Figma Desktop must be launched with: --remote-debugging-port=9222
 * - "Use Developer VM" enabled in Figma: Plugins → Development → Use Developer VM
 * - FIGMA_ACCESS_TOKEN environment variable for API access
 *
 * macOS launch command:
 *   open -a "Figma" --args --remote-debugging-port=9222
 */
import { FigmaDesktopConnector } from "./core/figma-desktop-connector.js";
import { PluginBridgeConnector } from "./core/plugin-bridge-connector.js";
export type DesktopConnector = FigmaDesktopConnector | PluginBridgeConnector;
/**
 * Local MCP Server
 * Connects to Figma Desktop and provides identical tools to Cloudflare mode
 */
declare class LocalFigmaMCP {
    private server;
    private browserManager;
    private consoleMonitor;
    private figmaAPI;
    private desktopConnector;
    private pluginBridge;
    private config;
    private variablesCache;
    constructor();
    /**
     * Get or create Figma API client
     */
    private getFigmaAPI;
    /**
     * Get or create Desktop Connector for write operations.
     * Prefers Plugin Bridge (no CDP) when the plugin is connected; otherwise uses CDP.
     */
    private getDesktopConnector;
    /**
     * Check if Figma Desktop is accessible
     */
    private checkFigmaDesktop;
    /**
     * Auto-connect to Figma Desktop at startup
     * Runs in background - never blocks or throws
     * Enables "get latest logs" workflow without manual setup
     */
    private autoConnectToFigma;
    /**
     * Initialize browser and console monitoring
     */
    private ensureInitialized;
    /**
     * Register all MCP tools
     */
    private registerTools;
    /**
     * Start the MCP server
     */
    start(): Promise<void>;
    /**
     * Cleanup and shutdown
     */
    shutdown(): Promise<void>;
}
export { LocalFigmaMCP };
//# sourceMappingURL=local.d.ts.map