/**
 * v1.9.7: BLOCKING Suppression Prevention — session-level state.
 *
 * Plan'daki Katman 3 implementasyonu. Amaç: Claude BLOCKING flag'i gördükten
 * sonra aynı nodeId üzerinde ikinci bir mutation execute'ı denerse, server
 * tarafında HARD_ERROR dönerek rasyonalize ederek skip'i engelle.
 *
 * Tespit mekanizması:
 * - Her figma_execute sonrasında _designSystemViolations veya _postExecuteScan
 *   döndüyse, response'dan nodeId'leri ayıkla ve `recordBlocking()` çağır.
 * - Sonraki figma_execute öncesi `checkSuppression(code)` çağırılır.
 * - Kod aynı nodeId'yi içeriyorsa ve explicit `// FORCE_OVERRIDE` comment yoksa
 *   error döndürülür — tool fail olur, Claude skip edemez.
 *
 * Override escape hatch:
 * - Kod başına `// FORCE_OVERRIDE` comment (`/^\s*\/\/\s*FORCE_OVERRIDE\b/m`)
 *   eklendiğinde suppression check bypass edilir. Kullanıcı explicit onay ile
 *   override edebilir, Claude sessizce atlayamaz.
 *
 * TTL: 5 dakika. Aynı oturumda yeni intent geldiğinde BLOCKING state zamanla
 * temizlenir (false positive engellenir).
 */
export type SuppressionCheckResult = {
    /** If set, tool should return error (Claude suppression attempt detected) */
    error?: string;
    /** Convenience flag — true when explicit override comment found */
    forceOverride?: boolean;
    /** Node IDs in code that matched tracked blocking state */
    matchedNodeIds?: string[];
};
export declare class BlockingTracker {
    private lastBlockingTimestamp;
    private lastBlockingNodeIds;
    private lastBlockingCategories;
    /**
     * Record a BLOCKING event from a figma_execute response.
     * Call this after figma_execute if _designSystemViolations or _postExecuteScan had violations.
     */
    recordBlocking(nodeIds: string[], categories?: string[]): void;
    /**
     * Check if an incoming figma_execute code is attempting to suppress a prior BLOCKING.
     * Returns error if suppression detected, empty object if clean.
     */
    checkSuppression(executeCode: string): SuppressionCheckResult;
    /**
     * Manual reset (e.g. new intent, explicit clear).
     */
    reset(): void;
    /**
     * Introspection (for _nextStep hint generation, debugging).
     */
    getState(): {
        nodeCount: number;
        categories: string[];
        timestamp: number;
    };
}
/**
 * Extract nodeIds from figma_execute response (for recordBlocking).
 * Checks _postExecuteScan.violations and _designSystemViolations.
 */
export declare function extractBlockingNodeIds(response: unknown): {
    nodeIds: string[];
    categories: string[];
};
/** Singleton for server process lifetime */
export declare const blockingTracker: BlockingTracker;
//# sourceMappingURL=blocking-tracker.d.ts.map