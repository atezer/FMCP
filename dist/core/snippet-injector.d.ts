/**
 * Snippet Injector
 * Generates and manages console-based data extraction snippets for Figma
 */
import type { ConsoleLogEntry } from './types/index.js';
export declare class SnippetInjector {
    /**
     * Generate variables extraction snippet for Figma console
     */
    generateVariablesSnippet(): string;
    /**
     * Parse variables from console log entry
     */
    parseVariablesFromLog(logEntry: ConsoleLogEntry): {
        variables: any[];
        variableCollections: any[];
        timestamp: number;
    } | null;
    /**
     * Find the most recent variables log entry
     */
    findVariablesLog(logs: ConsoleLogEntry[]): ConsoleLogEntry | null;
}
//# sourceMappingURL=snippet-injector.d.ts.map