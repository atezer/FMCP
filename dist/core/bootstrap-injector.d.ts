/**
 * v1.9.7: Bootstrap Injector — response-level zero-click enforcement.
 *
 * Plan'daki Katman 5 implementasyonu.
 *
 * Amaç: Claude Desktop'ta kullanıcı hiç setup yapmadan ("figma linki + ödeme
 * ekranı tasarla" gibi genel prompt ile) tüm agent/skill chain'in otomatik
 * devreye girmesi için plugin MCP response'larında gömülü directive göndermek.
 *
 * Strateji:
 * - İlk `figma_get_status` çağrısında FULL bootstrap (critical_rules + embedded
 *   skills) ~6K token gönderilir. Claude okur, oturum boyunca bellekte tutar.
 * - Sonraki çağrılarda sadece kısa reminder (~100 token).
 * - Her tool response'a `_nextStep` hint eklenir — Claude'u bir sonraki doğru
 *   adıma yönlendirir.
 */
/**
 * v2.0+ Typed next-step hint. Emitted as `_nextStepObj` alongside the legacy
 * `_nextStep` string. Agents (Desktop + sub-agents via Claude Code) should
 * prefer the typed form; string is kept for one version of compatibility.
 */
export type NextStep = {
    tool: string;
    args_hint?: Record<string, unknown>;
    reason: string;
};
export type BootstrapPayload = {
    version: string;
    self_instruction: string;
    critical_rules?: string[];
    anti_patterns?: string[];
    embedded_skills?: string;
    embedded_instructions_token_estimate?: number;
    skill_cache_hint?: string;
    reference_docs?: string;
    reminder?: string;
    session_tool_count?: number;
};
/**
 * Bootstrap injector — session-level state.
 */
export declare class BootstrapInjector {
    private firstCallMade;
    private toolCallCount;
    /**
     * Get bootstrap payload for a figma_get_status call.
     * First call: full directives + embedded skills.
     * Subsequent: short reminder.
     */
    getBootstrap(): BootstrapPayload;
    /**
     * v2.0+ Typed _nextStepObj — structured next-call hint for Claude/sub-agents.
     * Wraps the existing string hint into an object with explicit tool name +
     * optional args hint + reason. String variant (`injectNextStep`) is kept
     * for backward compat — both may appear on a response during the 1-version
     * transition.
     */
    injectNextStepObj(toolName: string, result: unknown): NextStep | undefined;
    /**
     * Generate _nextStep hint for a given tool + result.
     * Claude-facing string directing the next logical action.
     */
    injectNextStep(toolName: string, result: unknown): string | undefined;
    reset(): void;
}
/** Singleton for server process lifetime */
export declare const bootstrapInjector: BootstrapInjector;
//# sourceMappingURL=bootstrap-injector.d.ts.map