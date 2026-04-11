/**
 * Configuration management for F-MCP ATezer (Figma MCP Bridge) server
 */
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
    mode: 'local',
    local: {
        pluginBridgePort: parseInt(process.env.FIGMA_MCP_BRIDGE_PORT || process.env.FIGMA_PLUGIN_BRIDGE_PORT || '5454', 10),
        auditLogPath: process.env.FIGMA_MCP_AUDIT_LOG_PATH || undefined,
    },
};
/**
 * Possible config file locations (checked in order)
 */
const CONFIG_PATHS = [
    // Environment variable override
    process.env.FIGMA_CONSOLE_CONFIG,
    // Project-local config
    join(process.cwd(), '.figma-mcp-bridge.json'),
    join(process.cwd(), 'figma-mcp-bridge.json'),
    // User home config
    join(homedir(), '.config', 'figma-mcp-bridge', 'config.json'),
    join(homedir(), '.figma-mcp-bridge.json'),
].filter((path) => path !== undefined);
/**
 * Load configuration from file or use defaults
 */
export function loadConfig() {
    // Try to load from config file
    for (const configPath of CONFIG_PATHS) {
        if (existsSync(configPath)) {
            try {
                const fileContent = readFileSync(configPath, 'utf-8');
                const userConfig = JSON.parse(fileContent);
                // Merge with defaults
                return {
                    mode: 'local',
                    local: {
                        ...DEFAULT_CONFIG.local,
                        ...(userConfig.local || {}),
                    },
                };
            }
            catch (error) {
                console.error(`Failed to load config from ${configPath}:`, error);
                // Continue to next config path
            }
        }
    }
    // No config file found, use defaults
    return DEFAULT_CONFIG;
}
let cachedConfig = null;
/**
 * Get configuration (cached after first load)
 */
export function getConfig() {
    if (cachedConfig)
        return cachedConfig;
    cachedConfig = loadConfig();
    return cachedConfig;
}
//# sourceMappingURL=config.js.map