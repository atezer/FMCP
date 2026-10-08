/**
 * Color / token value helpers shared by MCP tools (v1.9.16: moved out of
 * local-plugin-only.ts so they can be unit-tested).
 */
import type { RGBColor } from "./types/figma.js";
/** Figma RGB (0–1 channels) → #rrggbb. Missing/invalid channels become 0 (never NaN). */
export declare function rgbaToHex(color: RGBColor): string;
/**
 * Validate a hex color (#rgb or #rrggbb) and return a JS object literal for
 * code generation. Throws on invalid input instead of injecting it raw.
 */
export declare function hexToRgbLiteral(hex: string): string;
/** Normalize a variable value for parity comparison. Aliases become `alias:<id>`. */
export declare function normalizeTokenValue(value: unknown, _resolvedType?: string): string;
//# sourceMappingURL=color-utils.d.ts.map