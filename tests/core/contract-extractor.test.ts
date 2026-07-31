/**
 * contract-extractor birim testleri.
 *
 * Fixture TAMAMEN SENTETİKTİR: hex değerleri, token yolları, node ID'leri ve
 * prop hash'leri hiçbir gerçek tasarım sisteminden alınmamıştır (repo politikası:
 * kurum verisi repoya girmez). Kontrast beklentileri WCAG 2.1 formülüyle bu
 * sentetik palet üzerinden bağımsız hesaplandı; davranışsal invaryantlar
 * (AA sınırı, alpha-blend'in opak varsayımından düşük oran vermesi) korunur.
 */

import {
	assembleContract,
	buildOverridesScript,
	buildStructureScript,
	buildTokensScript,
	collectVariableIds,
	computeContrastRatio,
	dedupeName,
	fieldToCss,
	inferElement,
	isBooleanLikeOptions,
	parseHexColor,
	parseScriptResult,
	parseVariantCombo,
	semanticPartName,
	stripPropHash,
	toCamelCase,
	toKebabCase,
	toPascalCase,
	tokenRef,
	type RawNode,
	type RawOverrides,
	type RawStructure,
	type RawTokens,
} from "../../src/core/contract-extractor";

// ============================================================================
// Fixture — Badge benzeri sentetik set
// ============================================================================

const ICON_CHILD = (fillVar: string): RawNode => ({
	name: "icon",
	type: "VECTOR",
	visible: true,
	w: 12,
	h: 12,
	bound: { fills: fillVar },
});

const TREE: RawNode = {
	name: "Style=Custom, Size=Large, State=Default, Selected=False",
	type: "COMPONENT",
	visible: true,
	w: 61,
	h: 24,
	layoutMode: "HORIZONTAL",
	primaryAxisAlignItems: "CENTER",
	counterAxisAlignItems: "CENTER",
	primaryAxisSizingMode: "AUTO",
	counterAxisSizingMode: "FIXED",
	paddingTop: 0,
	paddingRight: 8,
	paddingBottom: 0,
	paddingLeft: 8,
	itemSpacing: 4,
	radius: [9999, 9999, 9999, 9999],
	fillHex: "#ff5a36",
	bound: {
		itemSpacing: "V:gap",
		paddingLeft: "V:pad",
		paddingRight: "V:pad",
		topLeftRadius: "V:rad",
		topRightRadius: "V:rad",
		bottomLeftRadius: "V:rad",
		bottomRightRadius: "V:rad",
		fills: "V:bg-custom",
	},
	children: [
		{
			name: "plus_circle",
			type: "INSTANCE",
			visible: false,
			w: 16,
			h: 16,
			layoutGrow: 0,
			layoutAlign: "INHERIT",
			mainComponent: { id: "30:200", name: "version=v2", parentName: "plus_circle" },
			propRefs: { visible: "Icon (L)#21:3", mainComponent: "↳ Change (L)#22:20" },
			children: [ICON_CHILD("V:fg-custom")],
		},
		{
			name: "Badge",
			type: "TEXT",
			visible: true,
			w: 33,
			h: 20,
			layoutGrow: 1,
			layoutAlign: "INHERIT",
			fillHex: "#ffffff",
			bound: { fills: "V:fg-custom", fontSize: "V:fs", fontFamily: "V:ff", fontStyle: "V:fw" },
			characters: "Badge",
			textStyleName: "text/body",
			fontFamily: "TestFont",
			fontStyle: "Regular",
			fontSize: 14,
			lineHeight: "auto",
			letterSpacing: 0,
			letterSpacingUnit: "PIXELS",
			textAlign: "CENTER",
			textAutoResize: "HEIGHT",
			propRefs: { characters: "↳  Value Text#23:0", visible: "Text#24:0" },
		},
		{
			name: "plus_circle",
			type: "INSTANCE",
			visible: false,
			w: 16,
			h: 16,
			layoutGrow: 0,
			layoutAlign: "INHERIT",
			mainComponent: { id: "30:200", name: "version=v2", parentName: "plus_circle" },
			propRefs: { visible: "Icon (R)#21:2", mainComponent: "↳ Change (R)#22:16" },
			children: [ICON_CHILD("V:fg-custom")],
		},
	],
};

const STRUCTURE: RawStructure = {
	ok: true,
	kind: "COMPONENT_SET",
	set: { id: "20:100", name: "Badge", key: "abc123" },
	fileKey: "FILEKEY",
	defaultVariant: { id: "20:101", name: "Style=Custom, Size=Large, State=Default, Selected=False" },
	props: [
		{ key: "Icon (R)#21:2", type: "BOOLEAN", defaultValue: false, variantOptions: null },
		{ key: "Icon (L)#21:3", type: "BOOLEAN", defaultValue: false, variantOptions: null },
		{
			key: "↳ Change (R)#22:16", type: "INSTANCE_SWAP", defaultValue: "30:200",
			variantOptions: null, defaultComponentName: "version=v2", defaultComponentId: "30:200",
		},
		{ key: "↳  Value Text#23:0", type: "TEXT", defaultValue: "Badge", variantOptions: null },
		{ key: "Text#24:0", type: "BOOLEAN", defaultValue: true, variantOptions: null },
		{ key: "Orphan#1:1", type: "BOOLEAN", defaultValue: false, variantOptions: null },
		{
			key: "Style", type: "VARIANT", defaultValue: "Custom",
			variantOptions: ["Default", "Primary", "Secondary", "Ghost", "Clear", "Custom"],
		},
		{ key: "Size", type: "VARIANT", defaultValue: "Large", variantOptions: ["Large", "Medium", "Small"] },
		{ key: "State", type: "VARIANT", defaultValue: "Default", variantOptions: ["Default", "Hover", "Pressed", "Disabled"] },
		{ key: "Selected", type: "VARIANT", defaultValue: "False", variantOptions: ["True", "False"] },
	],
	variantGroupProperties: {
		Style: { values: ["Default", "Primary", "Secondary", "Ghost", "Clear", "Custom"] },
		Size: { values: ["Large", "Medium", "Small"] },
		State: { values: ["Default", "Hover", "Pressed", "Disabled"] },
		Selected: { values: ["True", "False"] },
	},
	tree: TREE,
};

const OVERRIDES: RawOverrides = {
	ok: true,
	overrides: {
		Style: {
			Primary: [
				{ p: "", n: "", t: "COMPONENT", f: "fills", a: { id: "V:bg-custom" }, b: { id: "V:bg-primary" } },
				{ p: "0/0", n: "plus_circle/icon", t: "VECTOR", f: "fills", a: { id: "V:fg-custom" }, b: { id: "V:fg-primary" } },
				{ p: "1", n: "Badge", t: "TEXT", f: "fills", a: { id: "V:fg-custom" }, b: { id: "V:fg-primary" } },
				{ p: "2/0", n: "plus_circle/icon", t: "VECTOR", f: "fills", a: { id: "V:fg-custom" }, b: { id: "V:fg-primary" } },
			],
			Ghost: [
				{ p: "", n: "", t: "COMPONENT", f: "fills", a: { id: "V:bg-custom" }, b: null },
				{ p: "", n: "", t: "COMPONENT", f: "strokes", a: null, b: { id: "V:border-ghost" } },
				{ p: "", n: "", t: "COMPONENT", f: "strokeWeight", a: null, b: { id: "V:bw" } },
				{ p: "1", n: "Badge", t: "TEXT", f: "fills", a: { id: "V:fg-custom" }, b: { id: "V:fg-ghost" } },
			],
			Clear: [
				{ p: "", n: "", t: "COMPONENT", f: "fills", a: { id: "V:bg-custom" }, b: null },
				{ p: "", n: "", t: "COMPONENT", f: "paddingLeft", a: { id: "V:pad" }, b: null },
				{ p: "", n: "", t: "COMPONENT", f: "paddingRight", a: { id: "V:pad" }, b: null },
				{ p: "", n: "", t: "COMPONENT", f: "topLeftRadius", a: { id: "V:rad" }, b: null },
				{ p: "1", n: "Badge", t: "TEXT", f: "fills", a: { id: "V:fg-custom" }, b: { id: "V:fg-ghost" } },
			],
		},
		Size: {
			Medium: [
				{ p: "", n: "", t: "COMPONENT", f: "itemSpacing", a: { id: "V:gap" }, b: { id: "V:gap-sm" } },
				{ p: "1", n: "Badge", t: "TEXT", f: "fontSize", a: { id: "V:fs" }, b: { id: "V:fs-sm" } },
				{
					p: "1", n: "Badge", t: "TEXT", f: "textStyle",
					a: { id: "S:1", styleName: "text/body" },
					b: { id: "S:2", styleName: "text/body-sm" },
				},
			],
		},
	},
};

const colorToken = (name: string, light: string, dark: string) => ({
	name,
	collection: "Colors",
	type: "COLOR" as const,
	values: { Light: light, Dark: dark },
	aliasChain: { Light: [], Dark: [] },
});

const floatToken = (name: string, value: number) => ({
	name,
	collection: "Sizes",
	type: "FLOAT" as const,
	values: { Mobile: value, Desktop: value },
	aliasChain: { Mobile: [], Desktop: [] },
});

const TOKENS: RawTokens = {
	ok: true,
	tokens: {
		"V:bg-custom": colorToken("Color/badge/custom/background", "#ff5a36", "#ff8d75"),
		"V:fg-custom": colorToken("Color/badge/custom/contents", "#ffffff", "#ffffffe0"),
		"V:bg-primary": colorToken("Color/badge/primary/background", "#1d4ed8", "#1d4ed8"),
		"V:fg-primary": colorToken("Color/badge/primary/contents", "#ffffff", "#ffffffe0"),
		"V:border-ghost": colorToken("Color/badge/ghost/border", "#1d4ed8", "#7c9cd8"),
		"V:fg-ghost": colorToken("Color/badge/ghost/contents", "#1d4ed8", "#7c9cd8"),
		"V:gap": floatToken("Spacing/sm", 4),
		"V:gap-sm": floatToken("Spacing/xs", 2),
		"V:pad": floatToken("Spacing/md", 8),
		"V:rad": floatToken("Radius/pill", 9999),
		"V:bw": floatToken("Border/width-sm", 1),
		"V:fs": floatToken("Font/body/size", 14),
		"V:fs-sm": floatToken("Font/body-sm/size", 12),
		"V:ff": {
			name: "Font/body/family", collection: "Sizes", type: "STRING",
			values: { Mobile: "TestFont", Desktop: "TestFont" }, aliasChain: { Mobile: [], Desktop: [] },
		},
		"V:fw": {
			name: "Font/body/weight", collection: "Sizes", type: "STRING",
			values: { Mobile: "regular", Desktop: "regular" }, aliasChain: { Mobile: [], Desktop: [] },
		},
	},
};

// ============================================================================
// İsimlendirme yardımcıları
// ============================================================================

describe("naming helpers", () => {
	it("stripPropHash drops trailing hash and leading arrows", () => {
		expect(stripPropHash("Icon (R)#21:2")).toBe("Icon (R)");
		expect(stripPropHash("↳  Value Text#23:0")).toBe("Value Text");
		expect(stripPropHash("Style")).toBe("Style");
	});

	it("case conversions", () => {
		expect(toCamelCase("Icon (R)")).toBe("iconR");
		expect(toCamelCase("Value Text")).toBe("valueText");
		expect(toKebabCase("Left Full")).toBe("left-full");
		expect(toKebabCase("plus_circle")).toBe("plus-circle");
		expect(toPascalCase("badge")).toBe("Badge");
	});

	it("isBooleanLikeOptions detects True/False pairs only", () => {
		expect(isBooleanLikeOptions(["True", "False"])).toBe(true);
		expect(isBooleanLikeOptions(["true", "false"])).toBe(true);
		expect(isBooleanLikeOptions(["Yes", "No"])).toBe(false);
		expect(isBooleanLikeOptions(["True", "False", "Maybe"])).toBe(false);
		expect(isBooleanLikeOptions(null)).toBe(false);
	});

	it("semanticPartName resolves instances, generics and dividers", () => {
		expect(semanticPartName({ name: "plus_circle", type: "INSTANCE", w: 16, h: 16, mainComponent: { id: "1", name: "version=v2", parentName: "plus_circle" } })).toBe("plus-circle");
		expect(semanticPartName({ name: "Frame 3", type: "FRAME", w: 100, h: 40 })).toBe("content");
		expect(semanticPartName({ name: "Rectangle 2", type: "RECTANGLE", w: 200, h: 1 })).toBe("divider");
		expect(semanticPartName({ name: "Text 1", type: "TEXT", w: 40, h: 16 })).toBe("label");
	});

	it("dedupeName appends numeric suffixes", () => {
		const used = new Set<string>();
		expect(dedupeName("plus-circle", used)).toBe("plus-circle");
		expect(dedupeName("plus-circle", used)).toBe("plus-circle-2");
		expect(dedupeName("plus-circle", used)).toBe("plus-circle-3");
	});

	it("fieldToCss maps fills by node type", () => {
		expect(fieldToCss("fills", "TEXT")).toBe("color");
		expect(fieldToCss("fills", "FRAME")).toBe("background-color");
		expect(fieldToCss("itemSpacing", "FRAME")).toBe("gap");
		expect(fieldToCss("topLeftRadius", "FRAME")).toBe("border-top-left-radius");
	});

	it("tokenRef converts slashes to dots", () => {
		expect(tokenRef("Spacing/md")).toBe("{Spacing.md}");
	});

	it("parseVariantCombo parses name pairs", () => {
		expect(parseVariantCombo("Style=Custom, Size=Large")).toEqual({ Style: "Custom", Size: "Large" });
	});

	it("parseVariantCombo edge cases: comboless name, empty value, double equals", () => {
		// Combo'suz ad (tekil COMPONENT): hiç çift üretmez
		expect(parseVariantCombo("Badge")).toEqual({});
		// Boş değer: anahtar boş string'e eşlenir (davranış sabitlenir)
		expect(parseVariantCombo("Style=")).toEqual({ Style: "" });
		// Çift eşittir: geçersiz segment sessizce atlanır
		expect(parseVariantCombo("a=b=c")).toEqual({});
		expect(parseVariantCombo("a=b=c, Size=Large")).toEqual({ Size: "Large" });
	});

	it("inferElement guesses semantic elements", () => {
		expect(inferElement("Badge")).toBe("div");
		expect(inferElement("Primary Button")).toBe("button");
		expect(inferElement("Checkbox")).toBe("input");
	});
});

// ============================================================================
// Kontrast (beklenen değerler sentetik palet için WCAG 2.1 ile hesaplandı)
// ============================================================================

describe("WCAG contrast", () => {
	it("parses 3/6/8 digit hex", () => {
		expect(parseHexColor("#fff")).toEqual({ r: 1, g: 1, b: 1, a: 1 });
		expect(parseHexColor("#000000")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
		expect(parseHexColor("#ffffffe0")?.a).toBeCloseTo(224 / 255, 5);
		expect(parseHexColor("nope")).toBeNull();
	});

	it("computes expected ratios for opaque pairs", () => {
		expect(computeContrastRatio("#ffffff", "#1d4ed8")).toBeCloseTo(6.7, 2);
		expect(computeContrastRatio("#ffffff", "#ff5a36")).toBeCloseTo(3.1, 2);
		expect(computeContrastRatio("#1d4ed8", "#dbeafe")).toBeCloseTo(5.49, 2);
		expect(computeContrastRatio("#7c9cd8", "#cfdcf0")).toBeCloseTo(1.99, 2);
	});

	it("alpha-blends translucent foregrounds over the background", () => {
		// %88 beyaz, opak beyaz varsayımından (2.25) daha düşük oran vermeli
		expect(computeContrastRatio("#ffffffe0", "#ff8d75")).toBeCloseTo(2.05, 2);
		expect(computeContrastRatio("#ffffffe0", "#ff8d75")).toBeLessThan(
			computeContrastRatio("#ffffff", "#ff8d75") as number,
		);
		expect(computeContrastRatio("#ffffffe0", "#1d4ed8")).toBeCloseTo(5.55, 2);
	});

	it("is symmetric in polarity (light-on-dark == dark-on-light)", () => {
		expect(computeContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
		expect(computeContrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
	});
});

// ============================================================================
// Assembly — tam contract
// ============================================================================

describe("assembleContract", () => {
	const { contract, report } = assembleContract(STRUCTURE, OVERRIDES, TOKENS);
	const c = contract as any;

	it("metadata and anchors", () => {
		expect(c.id).toBe("ds.badge");
		expect(c.name).toBe("Badge");
		expect(c.status).toBe("draft");
		expect(c.semantics.element).toBe("div");
		expect(c.anchors.figma).toEqual({ fileKey: "FILEKEY", componentSetKey: "abc123", nodeId: "20:100" });
		expect(c.anchors.code).toEqual({ importPath: "@ds/components/Badge", export: "Badge" });
	});

	it("normalizes props: BOOLEAN, TEXT, INSTANCE_SWAP, VARIANT enum", () => {
		const byName = Object.fromEntries(c.props.map((p: any) => [p.name, p]));
		expect(byName.iconR.type).toBe("boolean");
		expect(byName.iconR.bindings.figma).toEqual({ kind: "BOOLEAN", property: "Icon (R)#21:2" });
		expect(byName.valueText.type).toBe("text");
		expect(byName.valueText.required).toBe(true);
		expect(byName.valueText.default).toBe("Badge");
		expect(byName.changeR.type).toBe("slot");
		expect(byName.changeR.default).toBe("version=v2");
		expect(byName.changeR.bindings.figma.defaultComponentId).toBe("30:200");
		expect(byName.style.type).toEqual({ enum: ["default", "primary", "secondary", "ghost", "clear", "custom"] });
		expect(byName.style.default).toBe("custom");
		expect(byName.style.bindings.figma.values.primary).toBe("Primary");
		expect(byName.size.default).toBe("large");
	});

	it("boolean-like variant becomes isX boolean prop with option-derived values", () => {
		const selected = c.props.find((p: any) => p.name === "isSelected");
		expect(selected).toBeDefined();
		expect(selected.type).toBe("boolean");
		expect(selected.default).toBe(false);
		expect(selected.bindings.figma.kind).toBe("VARIANT");
		// values gerçek variant string'lerinden gelir (sabit "True"/"False" değil)
		expect(selected.bindings.figma.values).toEqual({ true: "True", false: "False" });
	});

	it("detects states from State variant prop", () => {
		expect(c.states).toEqual(["hover", "active", "disabled"]);
	});

	it("reports orphan props", () => {
		expect(report.orphanProps).toEqual(["Orphan#1:1"]);
		expect(report.notes.some((n) => n.includes("Orphan#1:1"))).toBe(true);
	});

	it("anatomy layout and root tokens", () => {
		expect(c.anatomy.layout).toEqual({ display: "flex", direction: "row", align: "center", justify: "center" });
		expect(c.anatomy.tokens.gap).toBe("{Spacing.sm}");
		expect(c.anatomy.tokens["padding-left"]).toBe("{Spacing.md}");
		expect(c.anatomy.tokens["border-top-left-radius"]).toBe("{Radius.pill}");
		expect(c.anatomy.tokens["background-color"]).toBe("{Color.badge.custom.background}");
	});

	it("anatomy parts: slots, text tokens, dedupe", () => {
		const parts = c.anatomy.parts;
		expect(Object.keys(parts)).toEqual(["plus-circle", "badge", "plus-circle-2"]);
		expect(parts["plus-circle"].slot).toMatchObject({
			name: "plus-circle", acceptsMode: "open", figmaName: "plus_circle", defaultComponentId: "30:200",
		});
		expect(parts.badge.tokens).toMatchObject({
			color: "{Color.badge.custom.contents}",
			"font-size": "{Font.body.size}",
			"font-weight": "{Font.body.weight}",
			"font-family": "{Font.body.family}",
			"text-style": "text/body",
		});
	});

	it("variantOverrides: style group with nested instance paths", () => {
		const primary = c.variantOverrides.styleOverrides.primary;
		expect(primary.root.tokens["background-color"]).toBe("{Color.badge.primary.background}");
		expect(primary.children.tokens["plus-circle/icon/background-color"]).toBe("{Color.badge.primary.contents}");
		expect(primary.children.tokens["badge/color"]).toBe("{Color.badge.primary.contents}");
		expect(primary.children.tokens["plus-circle-2/icon/background-color"]).toBe("{Color.badge.primary.contents}");
	});

	it("variantOverrides: ghost expands border width and drops fill", () => {
		const ghost = c.variantOverrides.styleOverrides.ghost;
		expect(ghost.root.tokens["background-color"]).toBe("(none)");
		expect(ghost.root.tokens["border-color"]).toBe("{Color.badge.ghost.border}");
		for (const side of ["top", "bottom", "left", "right"]) {
			expect(ghost.root.tokens[`border-${side}-width`]).toBe("{Border.width-sm}");
		}
	});

	it("variantOverrides: clear drops paddings and radius", () => {
		const clear = c.variantOverrides.styleOverrides.clear;
		expect(clear.root.tokens["padding-left"]).toBe("(none)");
		expect(clear.root.tokens["padding-right"]).toBe("(none)");
		expect(clear.root.tokens["border-top-left-radius"]).toBe("(none)");
		expect(clear.root.tokens["background-color"]).toBe("(none)");
	});

	it("variantOverrides: size group with text-style name", () => {
		const medium = c.variantOverrides.sizeOverrides.medium;
		expect(medium.root.tokens.gap).toBe("{Spacing.xs}");
		expect(medium.children.tokens["badge/font-size"]).toBe("{Font.body-sm.size}");
		expect(medium.children.tokens["badge/text-style"]).toBe("text/body-sm");
	});

	it("resolvedTokens keyed by dotted variable name", () => {
		const bg = c.resolvedTokens["Color.badge.custom.background"];
		expect(bg.type).toBe("COLOR");
		expect(bg.values.Light).toBe("#ff5a36");
		expect(c.resolvedTokens["Spacing.sm"].values.Mobile).toBe(4);
	});

	it("baseSpecs root and children", () => {
		expect(c.baseSpecs.root.width).toBe("hug");
		expect(c.baseSpecs.root.height).toBe(24);
		expect(c.baseSpecs.root.gap).toBe(4);
		expect(c.baseSpecs.root.fillHex).toBe("#ff5a36");
		expect(c.baseSpecs.children.badge.fontSize).toBe(14);
		expect(c.baseSpecs.children["plus-circle"].visible).toBe(false);
		expect(c.baseSpecs.children["plus-circle"].componentId).toBe("30:200");
	});

	it("a11y: contrast pairs per style with per-mode ratios", () => {
		const pairs = c.a11y.contrastPairs as any[];
		const byStyle = Object.fromEntries(pairs.map((p) => [p.style, p]));

		expect(byStyle.primary.ratios.Light).toBeCloseTo(6.7, 2);
		expect(byStyle.primary.ratios.Dark).toBeCloseTo(5.55, 2);
		expect(byStyle.primary.wcagAA).toBe(true);
		expect(byStyle.primary.wcagAAA).toBe(false);

		// Default stil (custom) da çift üretir
		expect(byStyle.custom.ratios.Light).toBeCloseTo(3.1, 2);
		expect(byStyle.custom.wcagAA).toBe(false);

		// Şeffaf zeminli stiller (ghost/clear) atlanır
		expect(byStyle.ghost).toBeUndefined();
		expect(byStyle.clear).toBeUndefined();
	});

	it("report summarizes extraction", () => {
		expect(report.propsExtracted).toBe(c.props.length);
		expect(report.tokensResolved).toBe(Object.keys(TOKENS.tokens!).length);
		expect(report.suggestedFileName).toBe("badge-spec.json");
		expect(report.a11yFailCount).toBeGreaterThanOrEqual(1);
		expect(report.notes[0]).toContain("draft");
	});
});

// ============================================================================
// Kenar durumlar: dikey layout, küçük harfli boolean, tekil COMPONENT, a11y fallback
// ============================================================================

describe("assembleContract — VERTICAL layout axis mapping", () => {
	it("maps hug/fixed by layout direction (primary axis = height when VERTICAL)", () => {
		const structure: RawStructure = {
			ok: true,
			kind: "COMPONENT",
			set: { id: "60:1", name: "Stack", key: null },
			fileKey: "F",
			defaultVariant: { id: "60:1", name: "Stack" },
			props: [],
			tree: {
				name: "Stack", type: "COMPONENT", visible: true, w: 100, h: 50,
				layoutMode: "VERTICAL",
				primaryAxisSizingMode: "AUTO",
				counterAxisSizingMode: "FIXED",
				bound: {},
			},
		};
		const { contract } = assembleContract(structure, { ok: true, overrides: {} }, { ok: true, tokens: {} });
		const specs = (contract as any).baseSpecs.root;
		// VERTICAL: primary = height → AUTO = hug; counter = width → FIXED = sayısal
		expect(specs.width).toBe(100);
		expect(specs.height).toBe("hug");
		// HORIZONTAL fixture'ın tersi olmadığı ayrıca ana testte sabitlenir
	});
});

describe("assembleContract — lowercase boolean-like variant", () => {
	it("derives binding values from the actual option strings", () => {
		const structure: RawStructure = {
			ok: true,
			kind: "COMPONENT_SET",
			set: { id: "70:1", name: "Toggle", key: null },
			fileKey: "F",
			defaultVariant: { id: "70:2", name: "checked=false" },
			props: [
				{ key: "checked", type: "VARIANT", defaultValue: "false", variantOptions: ["true", "false"] },
			],
			tree: { name: "checked=false", type: "COMPONENT", visible: true, w: 40, h: 24, bound: {} },
		};
		const { contract } = assembleContract(structure, { ok: true, overrides: {} }, { ok: true, tokens: {} });
		const prop = (contract as any).props[0];
		expect(prop.name).toBe("isChecked");
		expect(prop.type).toBe("boolean");
		// Küçük harfli set'te sabit "True"/"False" yazılsaydı setProperties kırılırdı
		expect(prop.bindings.figma.values).toEqual({ true: "true", false: "false" });
	});
});

describe("assembleContract — standalone COMPONENT (variant'sız)", () => {
	const structure: RawStructure = {
		ok: true,
		kind: "COMPONENT",
		set: { id: "50:1", name: "Tag", key: null },
		fileKey: "F2",
		defaultVariant: { id: "50:1", name: "Tag" }, // combo'suz ad
		props: [
			{ key: "Closable#51:1", type: "BOOLEAN", defaultValue: false, variantOptions: null },
			{ key: "Label#51:2", type: "TEXT", defaultValue: "Tag", variantOptions: null },
		],
		tree: {
			name: "Tag", type: "COMPONENT", visible: true, w: 48, h: 20,
			layoutMode: "HORIZONTAL",
			primaryAxisSizingMode: "AUTO", counterAxisSizingMode: "FIXED",
			bound: { fills: "V:tag-bg" },
			children: [
				{
					name: "Label", type: "TEXT", visible: true, w: 30, h: 16,
					bound: { fills: "V:tag-fg" },
					propRefs: { characters: "Label#51:2", visible: "Closable#51:1" },
				},
			],
		},
	};
	const tokens: RawTokens = {
		ok: true,
		tokens: {
			"V:tag-bg": colorToken("Color/tag/background", "#1d4ed8", "#1d4ed8"),
			"V:tag-fg": colorToken("Color/tag/contents", "#ffffff", "#ffffff"),
		},
	};
	const { contract, report } = assembleContract(structure, { ok: true, overrides: {} }, tokens);
	const c = contract as any;

	it("produces a contract without variantOverrides", () => {
		expect(c.id).toBe("ds.tag");
		expect(c.variantOverrides).toBeUndefined();
		expect(c.states).toBeUndefined();
		// key null → componentSetKey set id'sine düşer
		expect(c.anchors.figma.componentSetKey).toBe("50:1");
	});

	it("normalizes props and reports no orphans", () => {
		const byName = Object.fromEntries(c.props.map((p: any) => [p.name, p]));
		expect(byName.closable.type).toBe("boolean");
		expect(byName.label.type).toBe("text");
		expect(report.orphanProps).toEqual([]);
	});

	it("falls back to a single default a11y pair", () => {
		const pairs = c.a11y.contrastPairs as any[];
		expect(pairs).toHaveLength(1);
		expect(pairs[0].style).toBe("default");
		expect(pairs[0].ratios.Light).toBeCloseTo(6.7, 2);
		expect(pairs[0].wcagAA).toBe(true);
	});
});

describe("assembleContract — a11y fg first-mode fallback", () => {
	it("uses the foreground token's first mode when mode names do not match", () => {
		const structure: RawStructure = {
			ok: true,
			kind: "COMPONENT",
			set: { id: "80:1", name: "Pill", key: null },
			fileKey: "F3",
			defaultVariant: { id: "80:1", name: "Pill" },
			props: [],
			tree: {
				name: "Pill", type: "COMPONENT", visible: true, w: 40, h: 20,
				layoutMode: "HORIZONTAL",
				bound: { fills: "V:pill-bg" },
				children: [
					{ name: "Txt", type: "TEXT", visible: true, w: 20, h: 14, bound: { fills: "V:pill-fg" } },
				],
			},
		};
		const tokens: RawTokens = {
			ok: true,
			tokens: {
				"V:pill-bg": colorToken("Color/pill/background", "#1d4ed8", "#1d4ed8"),
				// fg tek-mode farklı eksende ("Base") — bg'nin Light/Dark eksenine
				// fg'nin ilk (tek) değeriyle katılmalı
				"V:pill-fg": {
					name: "Color/pill/contents", collection: "Base Colors", type: "COLOR",
					values: { Base: "#ffffff" }, aliasChain: { Base: [] },
				},
			},
		};
		const { contract } = assembleContract(structure, { ok: true, overrides: {} }, tokens);
		const pairs = (contract as any).a11y.contrastPairs as any[];
		expect(pairs).toHaveLength(1);
		expect(pairs[0].ratios.Light).toBeCloseTo(6.7, 2);
		expect(pairs[0].ratios.Dark).toBeCloseTo(6.7, 2);
	});
});

// ============================================================================
// collectVariableIds + parseScriptResult + script builders
// ============================================================================

describe("collectVariableIds", () => {
	it("collects tree + override ids, skips textStyle ids", () => {
		const ids = collectVariableIds(STRUCTURE, OVERRIDES);
		expect(ids).toContain("V:bg-custom");
		expect(ids).toContain("V:fg-primary");
		expect(ids).toContain("V:gap-sm");
		expect(ids).not.toContain("S:1");
		expect(ids).not.toContain("S:2");
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("parseScriptResult", () => {
	it("parses JSON string results", () => {
		const out = parseScriptResult<{ ok: boolean }>({ success: true, result: '{"ok":true}' }, "structure");
		expect(out.ok).toBe(true);
	});

	it("passes through object results", () => {
		const out = parseScriptResult<{ ok: boolean }>({ success: true, result: { ok: true } }, "structure");
		expect(out.ok).toBe(true);
	});

	it("throws on plugin failure", () => {
		expect(() => parseScriptResult({ success: false, error: "boom" }, "structure")).toThrow(/boom/);
	});

	it("throws on invalid JSON", () => {
		expect(() => parseScriptResult({ success: true, result: "{nope" }, "tokens")).toThrow(/not valid JSON/);
	});
});

describe("script builders", () => {
	it("embed parameters safely", () => {
		expect(buildStructureScript("1:2")).toContain('"1:2"');
		expect(buildStructureScript()).toContain("null");
		expect(buildOverridesScript("20:100")).toContain('"20:100"');
		expect(buildTokensScript(["V:1", "V:2"])).toContain('["V:1","V:2"]');
	});

	it("scripts return JSON.stringify payloads", () => {
		for (const script of [buildStructureScript("1:1"), buildOverridesScript("1:1"), buildTokensScript(["V:1"])]) {
			expect(script).toContain("JSON.stringify");
			expect(script).toContain("return");
		}
	});
});

describe("assembleContract error handling", () => {
	it("throws on invalid structure payload", () => {
		expect(() => assembleContract({ ok: false, error: "NO_SELECTION" }, { ok: true }, { ok: true })).toThrow(/NO_SELECTION/);
	});
});
