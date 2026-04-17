/**
 * v1.9.5: Discovery Budget Enforcement — session-level counter.
 *
 * Her MCP server oturumunda keşif (read-only) tool çağrılarını sayar.
 * Amaç: Claude'un aşırı keşif fazı yapıp üretime geçmemesini engellemek.
 *
 * Threshold'lar:
 * - WARN: 8 keşif call — response'a _warnings eklenir
 * - BLOCK: 12 keşif call — response'a _DISCOVERY_BUDGET_EXCEEDED_BLOCKING flag
 * - Reset: ilk mutation call (figma_execute non-read-only, validate, scan) veya yeni server process
 *
 * Discovery tool classification:
 * - figma_get_* (file_data, design_context, metadata, styles, variables, library_variables, screenshot)
 * - figma_search_* (components, assets)
 * - figma_list_*
 * - figma_capture_screenshot (read-only visual)
 * - figma_execute (kod pattern tespiti — findAll, getNodeByIdAsync ... read-only pattern)
 *
 * Build tool classification (sayılmaz):
 * - figma_instantiate_component, figma_bind_variable, figma_clone_screen_to_device
 * - figma_validate_screen, figma_scan_ds_compliance (read-only audit ama üretim sonrası)
 * - figma_execute (mutation pattern: createFrame, createText, setFills, appendChild, ...)
 */
export type DiscoveryBudgetResult = {
    count: number;
    warnings?: string[];
    _DISCOVERY_BUDGET_EXCEEDED_BLOCKING?: boolean;
};
export declare class DiscoveryCounter {
    private count;
    private readonly WARN_THRESHOLD;
    private readonly BLOCK_THRESHOLD;
    constructor(warnThreshold?: number, blockThreshold?: number);
    /**
     * Record a tool call. Returns budget metadata to inject into response.
     * @param toolName - MCP tool name (e.g. "figma_get_file_data")
     * @param executeCode - For figma_execute, the code string (pattern analysis)
     */
    track(toolName: string, executeCode?: string): DiscoveryBudgetResult;
    /**
     * Peek at current budget without tracking (useful for response injection).
     */
    snapshot(): DiscoveryBudgetResult;
    /** Manual reset (e.g. new session or explicit build transition) */
    reset(): void;
    getCount(): number;
    /**
     * Classify a tool call as "discovery", "build", or "neutral" (not counted).
     */
    private classify;
}
/** Singleton counter for the server process lifetime */
export declare const discoveryCounter: DiscoveryCounter;
//# sourceMappingURL=discovery-counter.d.ts.map