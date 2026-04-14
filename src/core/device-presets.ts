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
export const DEVICE_PRESETS: DevicePreset[] = [
	// ── Phone ─────────────────────────────────────────────────────────
	{ name: "iPhone 17", width: 402, height: 874, category: "phone" },
	{
		name: "iPhone 16 & 17 Pro",
		width: 402,
		height: 874,
		category: "phone",
		aliases: ["iPhone 16 Pro", "iPhone 17 Pro"],
	},
	{ name: "iPhone 16", width: 393, height: 852, category: "phone" },
	{
		name: "iPhone 16 & 17 Pro Max",
		width: 440,
		height: 956,
		category: "phone",
		aliases: ["iPhone 16 Pro Max", "iPhone 17 Pro Max"],
	},
	{ name: "iPhone 16 Plus", width: 430, height: 932, category: "phone" },
	{ name: "iPhone Air", width: 420, height: 912, category: "phone" },
	{
		name: "iPhone 14 & 15 Pro Max",
		width: 430,
		height: 932,
		category: "phone",
		aliases: ["iPhone 14 Pro Max", "iPhone 15 Pro Max"],
	},
	{
		name: "iPhone 14 & 15 Pro",
		width: 393,
		height: 852,
		category: "phone",
		aliases: ["iPhone 14 Pro", "iPhone 15 Pro"],
	},
	{
		name: "iPhone 13 & 14",
		width: 390,
		height: 844,
		category: "phone",
		aliases: ["iPhone 13", "iPhone 14"],
	},
	{ name: "iPhone 14 Plus", width: 428, height: 926, category: "phone" },
	{ name: "Android Compact", width: 412, height: 917, category: "phone" },
	{ name: "Android Medium", width: 700, height: 840, category: "phone" },

	// ── Tablet ────────────────────────────────────────────────────────
	{ name: "iPad Pro 13", width: 1024, height: 1366, category: "tablet" },
	{ name: "iPad Pro 11", width: 834, height: 1194, category: "tablet" },
	{ name: "iPad Mini", width: 744, height: 1133, category: "tablet" },
	{ name: "Surface Pro 9", width: 1440, height: 960, category: "tablet" },

	// ── Desktop ───────────────────────────────────────────────────────
	{ name: "MacBook Pro 16", width: 1728, height: 1117, category: "desktop" },
	{ name: "MacBook Pro 14", width: 1512, height: 982, category: "desktop" },
	{
		name: "Desktop",
		width: 1440,
		height: 1024,
		category: "desktop",
		aliases: ["Desktop 1440"],
	},
	{ name: "Desktop HD", width: 1920, height: 1080, category: "desktop" },

	// ── Watch ─────────────────────────────────────────────────────────
	{ name: "Apple Watch 45mm", width: 198, height: 242, category: "watch" },
	{ name: "Apple Watch 41mm", width: 176, height: 215, category: "watch" },
];

/**
 * Look up a device preset by name or alias (case-insensitive).
 * Returns undefined if no match found.
 */
export function findPreset(name: string): DevicePreset | undefined {
	if (!name) return undefined;
	const normalized = name.trim().toLowerCase();

	// Direct name match
	for (const preset of DEVICE_PRESETS) {
		if (preset.name.toLowerCase() === normalized) return preset;
	}

	// Alias match
	for (const preset of DEVICE_PRESETS) {
		if (preset.aliases) {
			for (const alias of preset.aliases) {
				if (alias.toLowerCase() === normalized) return preset;
			}
		}
	}

	// Partial match (contains substring)
	for (const preset of DEVICE_PRESETS) {
		if (preset.name.toLowerCase().includes(normalized)) return preset;
	}

	return undefined;
}

/**
 * Parse a custom device dimension string like "1200x800" or "1200×800".
 * Returns undefined if the string is not a valid dimension pair.
 */
export function parseCustomDimension(
	input: string,
): { width: number; height: number } | undefined {
	if (!input) return undefined;
	const match = input.trim().match(/^(\d+)\s*[x×]\s*(\d+)$/i);
	if (!match) return undefined;
	const width = Number.parseInt(match[1], 10);
	const height = Number.parseInt(match[2], 10);
	if (width < 100 || height < 100 || width > 10000 || height > 10000) {
		return undefined;
	}
	return { width, height };
}

/**
 * Resolve a device string (name, alias, or custom "WxH") to concrete
 * dimensions. Used by figma_clone_screen_to_device before sending the
 * request to the plugin handler.
 */
export function resolveDevice(
	input: string,
): { name: string; width: number; height: number } | undefined {
	// Try preset first
	const preset = findPreset(input);
	if (preset) {
		return { name: preset.name, width: preset.width, height: preset.height };
	}

	// Try custom dimension
	const custom = parseCustomDimension(input);
	if (custom) {
		return { name: `Custom ${custom.width}×${custom.height}`, width: custom.width, height: custom.height };
	}

	return undefined;
}
