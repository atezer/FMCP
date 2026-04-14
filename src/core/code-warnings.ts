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
export function analyzeCodeForWarnings(code: string): CodeWarning[] {
	const warnings: CodeWarning[] = [];

	// ────────────────────────────────────────────────────────────────────
	// SECTION 1 — Plugin API gotchas (ADVISORY)
	// ────────────────────────────────────────────────────────────────────

	// 1a. FILL before appendChild — must set FILL *after* node is in auto-layout parent
	if (/layoutSizing(?:Horizontal|Vertical)\s*=\s*['"]FILL['"]/i.test(code)) {
		const fillIdx = code.search(/layoutSizing(?:Horizontal|Vertical)\s*=\s*['"]FILL['"]/i);
		const appendIdx = code.indexOf("appendChild");
		if (appendIdx === -1 || fillIdx < appendIdx) {
			warnings.push({
				severity: "ADVISORY",
				category: "ORDERING",
				message:
					"layoutSizingHorizontal/Vertical = 'FILL' appendChild'dan ONCE ayarlanmis. " +
					"Oncesinde hata verir. FILL'i appendChild SONRASINA tasi.",
			});
		}
	}

	// 1b. layoutPositioning = ABSOLUTE before appendChild (v1.8.1: added)
	if (/layoutPositioning\s*=\s*['"]ABSOLUTE['"]/i.test(code)) {
		const absIdx = code.search(/layoutPositioning\s*=\s*['"]ABSOLUTE['"]/i);
		const appendIdx = code.indexOf("appendChild");
		if (appendIdx === -1 || absIdx < appendIdx) {
			warnings.push({
				severity: "ADVISORY",
				category: "ORDERING",
				message:
					"layoutPositioning = 'ABSOLUTE' appendChild'dan ONCE ayarlanmis. " +
					"Parent layoutMode !== NONE kontrolu basarisiz olur. appendChild SONRA ayarla.",
			});
		}
	}

	// 1c. Sync API usage — should use Async versions
	// v1.8.2: expanded to include node/style/variable lookup APIs that fail
	// in dynamic-page mode (causing "Cannot call with documentAccess: dynamic-page" errors)
	const syncApis = [
		{ sync: "getLocalPaintStyles(", async: "getLocalPaintStylesAsync(" },
		{ sync: "getLocalTextStyles(", async: "getLocalTextStylesAsync(" },
		{ sync: "getLocalEffectStyles(", async: "getLocalEffectStylesAsync(" },
		{ sync: "getLocalGridStyles(", async: "getLocalGridStylesAsync(" },
		// v1.8.2: dynamic-page mode fixes
		{ sync: "figma.getNodeById(", async: "figma.getNodeByIdAsync(" },
		{ sync: "figma.getStyleById(", async: "figma.getStyleByIdAsync(" },
		{ sync: "figma.variables.getVariableById(", async: "figma.variables.getVariableByIdAsync(" },
		{ sync: "figma.variables.getVariableCollectionById(", async: "figma.variables.getVariableCollectionByIdAsync(" },
		{ sync: "figma.importComponentByKey(", async: "figma.importComponentByKeyAsync(" },
	];
	for (const api of syncApis) {
		if (code.includes(api.sync) && !code.includes(api.async)) {
			warnings.push({
				severity: "ADVISORY",
				category: "SYNC_API",
				message: `Sync API '${api.sync.slice(0, -1)}' tespit edildi. 'await ${api.async.slice(0, -1)}' kullanin — dynamic-page modunda sync API'ler calismaz.`,
			});
		}
	}

	// 1d. Font not loaded before text modification
	if (
		(/\.characters\s*=/.test(code) || code.includes(".insertCharacters") || code.includes(".deleteCharacters")) &&
		!code.includes("loadFontAsync")
	) {
		warnings.push({
			severity: "ADVISORY",
			category: "FONT_LOAD",
			message:
				"Text icerik degisikligi (characters) tespit edildi, ancak loadFontAsync cagrisi yok. " +
				"Metin degistirmeden once 'await figma.loadFontAsync(node.fontName)' ekleyin.",
		});
	}

	// 1e. Sync page assignment — does not work
	if (/figma\.currentPage\s*=/.test(code) && !code.includes("setCurrentPageAsync")) {
		warnings.push({
			severity: "ADVISORY",
			category: "SYNC_API",
			message:
				"'figma.currentPage = ...' calismaz. 'await figma.setCurrentPageAsync(page)' kullanin.",
		});
	}

	// ────────────────────────────────────────────────────────────────────
	// SECTION 2 — Design System Discipline (SEVERE — v1.8.1+)
	// These warnings indicate Claude is bypassing DS tokens and instance reuse,
	// producing hand-built UI that ignores the configured design system.
	// ────────────────────────────────────────────────────────────────────

	// 2a. Hardcoded solid color literal — fills = [{type:'SOLID',color:{r:...,g:...,b:...}}]
	// Matches any code that constructs a SOLID paint with inline RGB values.
	const hardcodedSolidRegex = /type\s*:\s*['"]SOLID['"][\s\S]{0,200}?color\s*:\s*\{\s*r\s*:\s*[\d.]+/;
	if (hardcodedSolidRegex.test(code)) {
		// If the code ALSO uses setBoundVariableForPaint, it's probably binding the
		// variable and using the solid as a structure scaffold — allow it.
		if (!code.includes("setBoundVariableForPaint")) {
			warnings.push({
				severity: "SEVERE",
				category: "HARDCODED_COLOR",
				message:
					"❌ TOKEN DISIPLINI IHLALI: Hardcoded SOLID color tespit edildi ama setBoundVariableForPaint cagrisi yok. " +
					"Design system token binding ZORUNLUDUR. Once 'figma_get_library_variables' ile variable key'leri al, " +
					"sonra 'importVariableByKeyAsync' + 'setBoundVariableForPaint' kullan. " +
					"Ornek: const v = await figma.variables.importVariableByKeyAsync('KEY'); " +
					"const bound = figma.variables.setBoundVariableForPaint(fills[0], 'color', v); node.fills = [bound];",
			});
		}
	}

	// 2b. No-instance usage — 3+ createFrame but 0 component instantiation
	const createFrameCount = (code.match(/figma\.createFrame\(\)/g) || []).length;
	const hasInstanceCreation =
		code.includes("importComponentByKeyAsync") ||
		code.includes("createInstance()") ||
		code.includes(".createInstance(") ||
		code.includes("importComponentSetByKeyAsync");
	if (createFrameCount >= 3 && !hasInstanceCreation) {
		warnings.push({
			severity: "SEVERE",
			category: "NO_INSTANCE_USAGE",
			message:
				`❌ DS BILESEN KULLANIMI EKSIK: ${createFrameCount} adet createFrame() cagrisi tespit edildi ama ` +
				"hicbir component instance olusturulmamis (importComponentByKeyAsync / createInstance yok). " +
				"Design system bilesenleri varsa SIFIRDAN CIZME - once figma_search_assets ile mevcut DS " +
				"bileseni ara, sonra figma_instantiate_component veya importComponentByKeyAsync kullan. " +
				"Hesapkart, Button, NavigationTopBar, BottomNav, PillTabs gibi DS bilesenleri zaten library'de var.",
		});
	}

	// 2c. Hardcoded fontSize without setTextStyleIdAsync
	if (/\.fontSize\s*=\s*\d/.test(code) && !code.includes("setTextStyleIdAsync")) {
		warnings.push({
			severity: "SEVERE",
			category: "HARDCODED_FONT_SIZE",
			message:
				"❌ TIPOGRAFI DISIPLINI IHLALI: Hardcoded fontSize tespit edildi ama setTextStyleIdAsync cagrisi yok. " +
				"DS text style'lari ZORUNLUDUR. figma_import_style ile text style import et veya " +
				"getLocalTextStylesAsync() ile bul, sonra 'await textNode.setTextStyleIdAsync(style.id)' kullan. " +
				"Bu font family + size + weight + line-height'i TEK seferde bagllar. " +
				"Uyari: setBoundVariable('fontSize', v) YANLIS - sadece size bagllar, style bagllmaz.",
		});
	}

	// 2d. Hardcoded padding/gap/radius without setBoundVariable
	const spacingAssignRegex = /\.(?:paddingTop|paddingBottom|paddingLeft|paddingRight|itemSpacing|counterAxisSpacing|topLeftRadius|topRightRadius|bottomLeftRadius|bottomRightRadius|cornerRadius)\s*=\s*\d/;
	if (spacingAssignRegex.test(code) && !code.includes("setBoundVariable")) {
		warnings.push({
			severity: "SEVERE",
			category: "HARDCODED_SPACING",
			message:
				"❌ SPACING DISIPLINI IHLALI: Hardcoded padding/itemSpacing/cornerRadius tespit edildi ama " +
				"setBoundVariable cagrisi yok. DS spacing token'lari ZORUNLUDUR. " +
				"figma_get_library_variables ile spacing variable key'lerini al, importVariableByKeyAsync ile import et, " +
				"'node.setBoundVariable(\"paddingLeft\", variable)' kullan. " +
				"Yaygin DS spacing token'lari: spacing/100, spacing/200, spacing/300, spacing/400.",
		});
	}

	// 2e. Rectangle as separator without DS reference (often indicates hand-built dividers)
	const rectCount = (code.match(/figma\.createRectangle\(\)/g) || []).length;
	if (rectCount >= 2 && !hasInstanceCreation && !code.includes("setBoundVariableForPaint")) {
		warnings.push({
			severity: "SEVERE",
			category: "HAND_BUILT_SEPARATORS",
			message:
				`❌ ${rectCount} adet createRectangle() cagrisi tespit edildi (muhtemelen divider/separator icin). ` +
				"DS'de Divider/Separator bileseni varsa onu kullan, elle rectangle cizme. " +
				"Alternatif: frame border + setBoundVariableForPaint ile stroke token binding.",
		});
	}

	// 2f. No auto-layout — createFrame without layoutMode assignment
	if (createFrameCount >= 1 && !code.includes("layoutMode")) {
		warnings.push({
			severity: "SEVERE",
			category: "NO_AUTO_LAYOUT",
			message:
				`❌ RESPONSIVE EKSIK: ${createFrameCount} adet createFrame() cagrisi var ama hicbir layoutMode atamasi yok. ` +
				"Auto-layout olmayan frame'ler responsive degildir, icerige gore boyutlanmaz. " +
				"Her frame icin 'frame.layoutMode = \"VERTICAL\"' (veya HORIZONTAL) + primaryAxisSizingMode ekle.",
		});
	}

	return warnings;
}
