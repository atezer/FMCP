/**
 * Figma device frame presets — canonical dimensions used in Figma's
 * built-in "Frame" picker (matches the iPhone/Android/iPad preset list).
 *
 * v1.8.1+: Used by figma_clone_screen_to_device to adapt a source
 * screen to a target device size while preserving auto-layout and
 * library instance bindings.
 */
export interface DevicePreset {
    /** Canonical name shown in Figma UI */
    name: string;
    /** Width in points (Figma uses px but logical points) */
    width: number;
    /** Height in points */
    height: number;
    /** Platform category for grouping */
    category: "phone" | "tablet" | "desktop" | "watch" | "custom";
    /** Additional aliases that resolve to this preset */
    aliases?: string[];
}
/**
 * Built-in device presets — matches Figma's Frame picker as of 2025-2026.
 * Values verified against the user-provided screenshot of Figma's frame panel.
 */
export declare const DEVICE_PRESETS: DevicePreset[];
/**
 * Look up a device preset by name or alias (case-insensitive).
 * Returns undefined if no match found.
 */
export declare function findPreset(name: string): DevicePreset | undefined;
/**
 * Parse a custom device dimension string like "1200x800" or "1200×800".
 * Returns undefined if the string is not a valid dimension pair.
 */
export declare function parseCustomDimension(input: string): {
    width: number;
    height: number;
} | undefined;
/**
 * Resolve a device string (name, alias, or custom "WxH") to concrete
 * dimensions. Used by figma_clone_screen_to_device before sending the
 * request to the plugin handler.
 */
export declare function resolveDevice(input: string): {
    name: string;
    width: number;
    height: number;
} | undefined;
//# sourceMappingURL=device-presets.d.ts.map