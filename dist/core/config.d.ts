/**
 * Configuration management for F-MCP ATezer (Figma MCP Bridge) server
 */
import type { ServerConfig } from './types/index.js';
/**
 * Load configuration from file or use defaults
 */
export declare function loadConfig(): ServerConfig;
/**
 * Validate configuration
 */
export declare function validateConfig(config: ServerConfig): void;
/**
 * Get configuration with validation
 */
export declare function getConfig(): ServerConfig;
//# sourceMappingURL=config.d.ts.map