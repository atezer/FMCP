/**
 * Color / token value helpers shared by MCP tools (v1.9.16: moved out of
 * local-plugin-only.ts so they can be unit-tested).
 */
/** Figma RGB (0–1 channels) → #rrggbb. Missing/invalid channels become 0 (never NaN). */
export function rgbaToHex(color) {
    if (!color || typeof color !== "object")
        return "";
    const channel = (v) => {
        const n = Number(v ?? 0);
        return Number.isFinite(n)
            ? Math.min(255, Math.max(0, Math.round(n * 255)))
            : 0;
    };
    return ("#" +
        [color.r, color.g, color.b]
            .map((x) => channel(x).toString(16).padStart(2, "0"))
            .join(""));
}
/**
 * Validate a hex color (#rgb or #rrggbb) and return a JS object literal for
 * code generation. Throws on invalid input instead of injecting it raw.
 */
export function hexToRgbLiteral(hex) {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
    if (!m)
        throw new Error(`Invalid fillColor "${hex}" — expected hex like #1464FF or #fff.`);
    const h = m[1].length === 3
        ? m[1]
            .split("")
            .map((c) => c + c)
            .join("")
        : m[1];
    const ch = (i) => +(parseInt(h.slice(i, i + 2), 16) / 255).toFixed(4);
    return `{ r: ${ch(0)}, g: ${ch(2)}, b: ${ch(4)} }`;
}
/** Normalize a variable value for parity comparison. Aliases become `alias:<id>`. */
export function normalizeTokenValue(value, _resolvedType) {
    if (value === undefined || value === null)
        return "";
    if (typeof value === "object" &&
        value.type === "VARIABLE_ALIAS") {
        return `alias:${String(value.id ?? "")}`;
    }
    if (typeof value === "object" && "r" in value)
        return rgbaToHex(value);
    if (typeof value === "number")
        return String(value);
    if (typeof value === "boolean")
        return value ? "true" : "false";
    return String(value).trim();
}
//# sourceMappingURL=color-utils.js.map