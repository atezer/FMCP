/**
 * Console Monitor
 * Captures and manages console logs from Figma plugins via Chrome DevTools Protocol
 * Monitors both main page console AND Web Worker consoles (where Figma plugins run)
 */
import type { ConsoleLogEntry, ConsoleConfig } from './types/index.js';
/**
 * Console Monitor
 * Listens to page console events and maintains a circular buffer of logs
 * Also monitors Web Workers to capture Figma plugin console logs
 */
export declare class ConsoleMonitor {
    private logs;
    private config;
    private isMonitoring;
    private page;
    private workers;
    private lastUrl;
    constructor(config: ConsoleConfig);
    /**
     * Start monitoring console logs on a page
     * Accepts any puppeteer Page type (puppeteer-core or @cloudflare/puppeteer)
     */
    startMonitoring(page: any): Promise<void>;
    /**
     * Attach console listeners to a Web Worker
     * This captures Figma plugin console logs
     */
    private attachWorkerListeners;
    /**
     * Process console message from Puppeteer
     * @param msg - Console message from page or worker
     * @param context - Where the message came from ('page' or 'worker')
     * @param workerUrl - URL of the worker (if context is 'worker')
     */
    private processConsoleMessage;
    /**
     * Determine if log is from plugin or Figma based on URL
     */
    private determineSource;
    /**
     * Add log to circular buffer
     */
    private addLog;
    /**
     * Truncate string to max length
     */
    private truncateString;
    /**
     * Truncate value (string, array, object) intelligently
     * Based on AgentDesk pattern to prevent context overflow
     */
    private truncateValue;
    /**
     * Get logs with optional filtering
     */
    getLogs(options?: {
        count?: number;
        level?: ConsoleLogEntry['level'] | 'all';
        since?: number;
    }): ConsoleLogEntry[];
    /**
     * Clear log buffer
     */
    clear(): number;
    /**
     * Stop monitoring
     */
    stopMonitoring(): void;
    /**
     * Get monitoring status
     */
    getStatus(): {
        isMonitoring: boolean;
        logCount: number;
        bufferSize: number;
        workerCount: number;
        oldestTimestamp: number;
        newestTimestamp: number;
    };
}
//# sourceMappingURL=console-monitor.d.ts.map