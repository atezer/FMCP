/**
 * Logging infrastructure using pino
 */
import pino from 'pino';
/**
 * Log levels
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
/**
 * Create logger instance
 * Note: In Cloudflare Workers, console methods are automatically captured
 */
export declare function createLogger(level?: LogLevel): pino.Logger;
/**
 * Default logger instance
 */
export declare const logger: pino.Logger<never, boolean>;
/**
 * Create child logger with additional context
 */
export declare function createChildLogger(bindings: Record<string, unknown>): pino.Logger;
//# sourceMappingURL=logger.d.ts.map