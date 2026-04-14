/**
 * Unit tests for analyzeCodeForWarnings — v1.8.1 DS discipline enforcement
 *
 * Verifies that the static analyzer:
 * 1. Correctly flags SEVERE design-system discipline violations
 *    (hardcoded colors, no-instance usage, hardcoded typography, hardcoded
 *    spacing, hand-built separators, missing auto-layout).
 * 2. Does NOT produce false positives when Claude uses correct patterns
 *    (setBoundVariableForPaint, importComponentByKeyAsync, setTextStyleIdAsync,
 *    setBoundVariable).
 * 3. Preserves the pre-v1.8.1 ADVISORY gotchas (FILL-before-appendChild,
 *    sync API usage, missing loadFontAsync, sync currentPage assignment).
 */

import { analyzeCodeForWarnings, type CodeWarning } from "../../src/core/code-warnings";

function findByCategory(warnings: CodeWarning[], category: string): CodeWarning | undefined {
	return warnings.find((w) => w.category === category);
}

function hasCategory(warnings: CodeWarning[], category: string): boolean {
	return warnings.some((w) => w.category === category);
}

// ────────────────────────────────────────────────────────────────────────────
// SEVERE — Design System Discipline Violations
// ────────────────────────────────────────────────────────────────────────────

describe("analyzeCodeForWarnings — SEVERE: HARDCODED_COLOR", () => {
	it("flags hardcoded SOLID color without setBoundVariableForPaint", () => {
		const code = `node.fills = [{type:'SOLID',color:{r:0.5,g:0.5,b:0.5}}];`;
		const warnings = analyzeCodeForWarnings(code);
		const w = findByCategory(warnings, "HARDCODED_COLOR");
		expect(w).toBeDefined();
		expect(w?.severity).toBe("SEVERE");
		expect(w?.message).toContain("setBoundVariableForPaint");
	});

	it("flags hardcoded SOLID even with multiline formatting", () => {
		const code = `
			node.fills = [{
				type: 'SOLID',
				color: { r: 0.2, g: 0.4, b: 0.8 }
			}];
		`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "HARDCODED_COLOR")).toBe(true);
	});

	it("does NOT flag when setBoundVariableForPaint is present", () => {
		const code = `
			const v = await figma.variables.importVariableByKeyAsync("abc");
			const fills = [{type:'SOLID', color:{r:1,g:1,b:1}}];
			const bound = figma.variables.setBoundVariableForPaint(fills[0], 'color', v);
			node.fills = [bound];
		`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "HARDCODED_COLOR")).toBe(false);
	});

	it("does NOT flag code with no fills assignment", () => {
		const code = `const f = figma.createFrame(); f.name = "test";`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "HARDCODED_COLOR")).toBe(false);
	});
});

describe("analyzeCodeForWarnings — SEVERE: NO_INSTANCE_USAGE", () => {
	it("flags code with 3+ createFrame and no component instantiation", () => {
		const code = `
			const f1 = figma.createFrame();
			const f2 = figma.createFrame();
			const f3 = figma.createFrame();
			f1.layoutMode = "VERTICAL";
		`;
		const warnings = analyzeCodeForWarnings(code);
		const w = findByCategory(warnings, "NO_INSTANCE_USAGE");
		expect(w).toBeDefined();
		expect(w?.severity).toBe("SEVERE");
	});

	it("does NOT flag when importComponentByKeyAsync is used", () => {
		const code = `
			const wrapper = figma.createFrame();
			const w2 = figma.createFrame();
			const w3 = figma.createFrame();
			const btnComp = await figma.importComponentByKeyAsync("abc");
			const btn = btnComp.createInstance();
			wrapper.appendChild(btn);
		`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "NO_INSTANCE_USAGE")).toBe(false);
	});

	it("does NOT flag when createInstance() is called on an existing component", () => {
		const code = `
			const f1 = figma.createFrame();
			const f2 = figma.createFrame();
			const f3 = figma.createFrame();
			const comp = figma.root.findOne(n => n.type === "COMPONENT");
			const inst = comp.createInstance();
		`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "NO_INSTANCE_USAGE")).toBe(false);
	});

	it("does NOT flag 2 createFrames (threshold is 3+)", () => {
		const code = `
			const f1 = figma.createFrame();
			const f2 = figma.createFrame();
		`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "NO_INSTANCE_USAGE")).toBe(false);
	});
});

describe("analyzeCodeForWarnings — SEVERE: HARDCODED_FONT_SIZE", () => {
	it("flags .fontSize = <number> without setTextStyleIdAsync", () => {
		const code = `text.fontSize = 16;`;
		const warnings = analyzeCodeForWarnings(code);
		const w = findByCategory(warnings, "HARDCODED_FONT_SIZE");
		expect(w).toBeDefined();
		expect(w?.severity).toBe("SEVERE");
	});

	it("does NOT flag when setTextStyleIdAsync is used", () => {
		const code = `
			const style = await figma.importStyleByKeyAsync("abc");
			text.fontSize = 16;
			await text.setTextStyleIdAsync(style.id);
		`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "HARDCODED_FONT_SIZE")).toBe(false);
	});
});

describe("analyzeCodeForWarnings — SEVERE: HARDCODED_SPACING", () => {
	it("flags hardcoded paddingTop", () => {
		const code = `frame.paddingTop = 16;`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "HARDCODED_SPACING")).toBe(true);
	});

	it("flags hardcoded itemSpacing", () => {
		const code = `frame.itemSpacing = 12;`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "HARDCODED_SPACING")).toBe(true);
	});

	it("flags hardcoded cornerRadius", () => {
		const code = `frame.cornerRadius = 8;`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "HARDCODED_SPACING")).toBe(true);
	});

	it("does NOT flag when setBoundVariable is used", () => {
		const code = `
			const v = await figma.variables.importVariableByKeyAsync("abc");
			frame.paddingTop = 16;
			frame.setBoundVariable("paddingTop", v);
		`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "HARDCODED_SPACING")).toBe(false);
	});
});

describe("analyzeCodeForWarnings — SEVERE: NO_AUTO_LAYOUT", () => {
	it("flags createFrame without layoutMode assignment", () => {
		const code = `const f = figma.createFrame(); f.name = "test";`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "NO_AUTO_LAYOUT")).toBe(true);
	});

	it("does NOT flag when layoutMode is set", () => {
		const code = `
			const f = figma.createFrame();
			f.layoutMode = "VERTICAL";
		`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "NO_AUTO_LAYOUT")).toBe(false);
	});
});

describe("analyzeCodeForWarnings — SEVERE: HAND_BUILT_SEPARATORS", () => {
	it("flags 2+ createRectangle without instance creation", () => {
		const code = `
			const r1 = figma.createRectangle();
			const r2 = figma.createRectangle();
		`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "HAND_BUILT_SEPARATORS")).toBe(true);
	});

	it("does NOT flag when using setBoundVariableForPaint for stroke binding", () => {
		const code = `
			const r1 = figma.createRectangle();
			const r2 = figma.createRectangle();
			const v = await figma.variables.importVariableByKeyAsync("abc");
			figma.variables.setBoundVariableForPaint(r1.strokes[0], 'color', v);
		`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "HAND_BUILT_SEPARATORS")).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// ADVISORY — Legacy API gotchas
// ────────────────────────────────────────────────────────────────────────────

describe("analyzeCodeForWarnings — ADVISORY: ORDERING (pre-v1.8.1 behavior)", () => {
	it("flags layoutSizingHorizontal=FILL before appendChild", () => {
		const code = `
			child.layoutSizingHorizontal = "FILL";
			parent.appendChild(child);
		`;
		const warnings = analyzeCodeForWarnings(code);
		const w = findByCategory(warnings, "ORDERING");
		expect(w).toBeDefined();
		expect(w?.severity).toBe("ADVISORY");
	});

	it("flags layoutPositioning=ABSOLUTE before appendChild (v1.8.1 new)", () => {
		const code = `
			child.layoutPositioning = "ABSOLUTE";
			parent.appendChild(child);
		`;
		const warnings = analyzeCodeForWarnings(code);
		const w = findByCategory(warnings, "ORDERING");
		expect(w).toBeDefined();
		expect(w?.severity).toBe("ADVISORY");
	});

	it("does NOT flag layoutPositioning=ABSOLUTE after appendChild", () => {
		const code = `
			parent.appendChild(child);
			child.layoutPositioning = "ABSOLUTE";
		`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "ORDERING")).toBe(false);
	});
});

describe("analyzeCodeForWarnings — ADVISORY: SYNC_API", () => {
	it("flags getLocalPaintStyles without Async suffix", () => {
		const code = `const styles = figma.getLocalPaintStyles();`;
		const warnings = analyzeCodeForWarnings(code);
		const w = findByCategory(warnings, "SYNC_API");
		expect(w).toBeDefined();
		expect(w?.severity).toBe("ADVISORY");
	});

	it("flags figma.currentPage = assignment", () => {
		const code = `figma.currentPage = page;`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "SYNC_API")).toBe(true);
	});

	it("does NOT flag Async variants", () => {
		const code = `
			const styles = await figma.getLocalPaintStylesAsync();
			await figma.setCurrentPageAsync(page);
		`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "SYNC_API")).toBe(false);
	});

	// v1.8.2: new dynamic-page sync API patterns
	it("flags figma.getNodeById (v1.8.2)", () => {
		const code = `const n = figma.getNodeById("1:2");`;
		const warnings = analyzeCodeForWarnings(code);
		const w = findByCategory(warnings, "SYNC_API");
		expect(w).toBeDefined();
		expect(w?.message).toContain("getNodeByIdAsync");
	});

	it("does NOT flag figma.getNodeByIdAsync (v1.8.2)", () => {
		const code = `const n = await figma.getNodeByIdAsync("1:2");`;
		const warnings = analyzeCodeForWarnings(code);
		// Should have NO SYNC_API warning for getNodeById specifically
		const nodeByIdWarnings = warnings.filter((w) => w.message.includes("getNodeById"));
		expect(nodeByIdWarnings.length).toBe(0);
	});

	it("flags figma.getStyleById without Async (v1.8.2)", () => {
		const code = `const s = figma.getStyleById("S:1");`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "SYNC_API")).toBe(true);
	});

	it("flags figma.variables.getVariableById without Async (v1.8.2)", () => {
		const code = `const v = figma.variables.getVariableById("V:1");`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "SYNC_API")).toBe(true);
	});

	it("flags figma.variables.getVariableCollectionById without Async (v1.8.2)", () => {
		const code = `const col = figma.variables.getVariableCollectionById("VC:1");`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "SYNC_API")).toBe(true);
	});

	it("flags figma.importComponentByKey without Async (v1.8.2)", () => {
		const code = `const c = figma.importComponentByKey("abc123");`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "SYNC_API")).toBe(true);
	});
});

describe("analyzeCodeForWarnings — ADVISORY: FONT_LOAD", () => {
	it("flags .characters= assignment without loadFontAsync", () => {
		const code = `text.characters = "Hello";`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "FONT_LOAD")).toBe(true);
	});

	it("does NOT flag when loadFontAsync precedes character assignment", () => {
		const code = `
			await figma.loadFontAsync(text.fontName);
			text.characters = "Hello";
		`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "FONT_LOAD")).toBe(false);
	});
});

// ────────────────────────────────────────────────────────────────────────────
// Structural invariants
// ────────────────────────────────────────────────────────────────────────────

describe("analyzeCodeForWarnings — structural invariants", () => {
	it("returns an array for empty code", () => {
		const warnings = analyzeCodeForWarnings("");
		expect(Array.isArray(warnings)).toBe(true);
		expect(warnings.length).toBe(0);
	});

	it("returns multiple warnings when multiple violations coexist", () => {
		const code = `
			const f1 = figma.createFrame();
			const f2 = figma.createFrame();
			const f3 = figma.createFrame();
			f1.fills = [{type:'SOLID', color:{r:0.5,g:0.5,b:0.5}}];
			f1.paddingTop = 16;
		`;
		const warnings = analyzeCodeForWarnings(code);
		expect(hasCategory(warnings, "NO_INSTANCE_USAGE")).toBe(true);
		expect(hasCategory(warnings, "HARDCODED_COLOR")).toBe(true);
		expect(hasCategory(warnings, "HARDCODED_SPACING")).toBe(true);
		expect(hasCategory(warnings, "NO_AUTO_LAYOUT")).toBe(true);
	});

	it("every warning has severity, category, and message fields", () => {
		const code = `
			const f1 = figma.createFrame();
			const f2 = figma.createFrame();
			const f3 = figma.createFrame();
		`;
		const warnings = analyzeCodeForWarnings(code);
		for (const w of warnings) {
			expect(w.severity).toMatch(/^(SEVERE|ADVISORY)$/);
			expect(typeof w.category).toBe("string");
			expect(typeof w.message).toBe("string");
			expect(w.message.length).toBeGreaterThan(10);
		}
	});

	it("SEVERE warnings come from design-system discipline categories", () => {
		const code = `
			const f1 = figma.createFrame();
			const f2 = figma.createFrame();
			const f3 = figma.createFrame();
			f1.fills = [{type:'SOLID', color:{r:0.5,g:0.5,b:0.5}}];
			f1.fontSize = 16;
			f1.paddingTop = 16;
		`;
		const warnings = analyzeCodeForWarnings(code);
		const severeCategories = warnings
			.filter((w) => w.severity === "SEVERE")
			.map((w) => w.category);
		const knownSevere = [
			"HARDCODED_COLOR",
			"NO_INSTANCE_USAGE",
			"HARDCODED_FONT_SIZE",
			"HARDCODED_SPACING",
			"HAND_BUILT_SEPARATORS",
			"NO_AUTO_LAYOUT",
		];
		for (const cat of severeCategories) {
			expect(knownSevere).toContain(cat);
		}
	});
});
