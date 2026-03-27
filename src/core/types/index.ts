/**
 * Type definitions for F-MCP ATezer (Figma MCP Bridge)
 */

/**
 * Console log entry captured from Figma plugin
 */
export interface ConsoleLogEntry {
  timestamp: number;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  args: any[];
  stackTrace?: StackTrace;
  source: 'plugin' | 'figma' | 'page' | 'unknown';
  workerUrl?: string; // URL of the worker if source is from a Web Worker
}

/**
 * Stack trace information
 */
export interface StackTrace {
  callFrames: CallFrame[];
}

/**
 * Individual stack frame
 */
export interface CallFrame {
  functionName: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
}

/**
 * Screenshot metadata
 */
export interface Screenshot {
  id: string;
  timestamp: number;
  path: string;
  format: 'png' | 'jpeg';
  width: number;
  height: number;
  selector?: string;
  base64?: string;
  metadata?: ScreenshotMetadata;
}

/**
 * Additional screenshot metadata
 */
export interface ScreenshotMetadata {
  pluginName?: string;
  pluginId?: string;
  figmaFileKey?: string;
}

/**
 * Plugin context information
 */
export interface PluginContext {
  pluginId?: string;
  pluginName?: string;
  isRunning: boolean;
  lastReloadTime?: number;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  mode: 'local' | 'cloudflare';
  browser: BrowserConfig;
  console: ConsoleConfig;
  screenshots: ScreenshotConfig;
  local?: LocalModeConfig;
}

/**
 * Browser configuration
 */
export interface BrowserConfig {
  headless: boolean;
  args: string[];
  executablePath?: string;
}

/**
 * Local mode configuration
 */
export interface LocalModeConfig {
  debugHost: string;
  debugPort: number;
  /** Plugin bridge WebSocket server port (no CDP needed when plugin connects) */
  pluginBridgePort?: number;
  /** Optional audit log file path (enterprise); one JSON object per line (NDJSON) */
  auditLogPath?: string;
}

/**
 * Console monitoring configuration
 */
export interface ConsoleConfig {
  bufferSize: number;
  filterLevels: ConsoleLogEntry['level'][];
  truncation: TruncationConfig;
}

/**
 * Screenshot configuration
 */
export interface ScreenshotConfig {
  defaultFormat: 'png' | 'jpeg';
  quality: number;
  storePath: string;
}

/**
 * Log truncation configuration
 */
export interface TruncationConfig {
  maxStringLength: number;
  maxArrayLength: number;
  maxObjectDepth: number;
  removeDuplicates: boolean;
}
