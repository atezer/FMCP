/**
 * Static analyzer for figma_execute code — detects Plugin API gotchas AND
 * design-system discipline violations.
 *
 * v1.8.1+: Emits structured CodeWarning objects with SEVERE vs ADVISORY
 * severity. SEVERE warnings surface as _designSystemViolations in the
 * execute response (prominent, Claude-readable); ADVISORY warnings stay
 * in _warnings (legacy gotchas).
 *
 * Never blocks execution — the analyzer is advisory-only by design.
 * Claude reads the warnings and self-corrects on the next turn.
 */
/** Warning severity — SEVERE violates DS discipline; ADVISORY is a gotcha hint. */
export type WarningSeverity = "SEVERE" | "ADVISORY";
export interface CodeWarning {
    severity: WarningSeverity;
    category: string;
    message: string;
}
/**
 * Analyze figma_execute code for common mistakes AND design-system discipline
 * violations. Returns an array of structured warnings.
 *
 * SEVERE categories (v1.8.1+):
 *   HARDCODED_COLOR        — SOLID fills without setBoundVariableForPaint
 *   NO_INSTANCE_USAGE      — 3+ createFrame without component instantiation
 *   HARDCODED_FONT_SIZE    — .fontSize without setTextStyleIdAsync
 *   HARDCODED_SPACING      — padding/itemSpacing/cornerRadius without setBoundVariable
 *   HAND_BUILT_SEPARATORS  — 2+ createRectangle without instance/binding
 *   NO_AUTO_LAYOUT         — createFrame without layoutMode
 *
 * ADVISORY categories (pre-v1.8.1 legacy gotchas):
 *   ORDERING               — FILL/ABSOLUTE set before appendChild
 *   SYNC_API               — sync style APIs in dynamic-page mode
 *   FONT_LOAD              — .characters= without loadFontAsync
 */
export declare function analyzeCodeForWarnings(code: string): CodeWarning[];
//# sourceMappingURL=code-warnings.d.ts.map