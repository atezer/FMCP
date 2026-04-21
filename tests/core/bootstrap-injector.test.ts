/**
 * Unit tests for BootstrapInjector.injectNextStepObj (v2.0+ typed next-step).
 * Covers: cache resolver tools (resolve_active_ds, get_library_components,
 * get_library_tokens) + backward compat (unknown tool → undefined).
 */

import { BootstrapInjector } from "../../src/core/bootstrap-injector";

function fresh() {
	return { success: true, libraryName: "❖ SUI", fileKey: "ABC123", cacheRoot: "/tmp", status: "fresh" as const, lastSync: "2026-04-17T00:00:00Z", source: "fmcp_cache" as const };
}

function stale() {
	return { ...fresh(), status: "stale" as const };
}

function missing() {
	return { success: true, libraryName: null, fileKey: null, cacheRoot: null, status: "missing" as const, lastSync: null, source: "fmcp_cache" as const };
}

describe("injectNextStepObj — figma_resolve_active_ds", () => {
	const inj = new BootstrapInjector();

	it("fresh → routes to figma_get_library_components with libraryName", () => {
		const step = inj.injectNextStepObj("figma_resolve_active_ds", fresh());
		expect(step).toBeDefined();
		expect(step?.tool).toBe("figma_get_library_components");
		expect(step?.args_hint).toEqual({ libraryName: "❖ SUI" });
		expect(step?.reason).toMatch(/fresh/i);
	});

	it("stale → routes to figma_get_library_components (no args_hint)", () => {
		const step = inj.injectNextStepObj("figma_resolve_active_ds", stale());
		expect(step?.tool).toBe("figma_get_library_components");
		expect(step?.args_hint).toBeUndefined();
	});

	it("missing → routes to figma_get_design_system_summary (classic flow)", () => {
		const step = inj.injectNextStepObj("figma_resolve_active_ds", missing());
		expect(step?.tool).toBe("figma_get_design_system_summary");
		expect(step?.reason).toMatch(/missing|classic|discovery/i);
	});
});

describe("injectNextStepObj — figma_get_library_components", () => {
	const inj = new BootstrapInjector();

	it("success → routes to figma_get_library_tokens", () => {
		const step = inj.injectNextStepObj("figma_get_library_components", {
			success: true,
			libraryName: "❖ SUI",
			items: [{ name: "Button", key: "xxx", role: null, source: "❖ SUI" }],
			_metrics: { count: 1, source: "fmcp_cache", cacheStatus: "fresh" },
		});
		expect(step?.tool).toBe("figma_get_library_tokens");
		expect(step?.args_hint).toEqual({ libraryName: "❖ SUI" });
	});

	it("failure → no next step (caller decides)", () => {
		const step = inj.injectNextStepObj("figma_get_library_components", {
			success: false,
			error: "cache missing",
		});
		expect(step).toBeUndefined();
	});
});

describe("injectNextStepObj — figma_get_library_tokens", () => {
	const inj = new BootstrapInjector();

	it("success → routes to figma_execute (seed + Adım 1.6)", () => {
		const step = inj.injectNextStepObj("figma_get_library_tokens", {
			success: true,
			items: [{ name: "spacing-100", key: "k", type: "spacing", collection: "Spacing" }],
		});
		expect(step?.tool).toBe("figma_execute");
		expect(step?.reason).toMatch(/seed|text style|Adım 1.6|font/i);
	});

	it("failure → no next step", () => {
		const step = inj.injectNextStepObj("figma_get_library_tokens", { success: false });
		expect(step).toBeUndefined();
	});
});

describe("injectNextStepObj — unknown / invalid inputs", () => {
	const inj = new BootstrapInjector();

	it("unknown tool → undefined", () => {
		expect(inj.injectNextStepObj("figma_made_up_tool", fresh())).toBeUndefined();
	});

	it("null result → undefined", () => {
		expect(inj.injectNextStepObj("figma_resolve_active_ds", null)).toBeUndefined();
	});

	it("non-object result → undefined", () => {
		expect(inj.injectNextStepObj("figma_resolve_active_ds", "string-result")).toBeUndefined();
	});
});

describe("backward compat — injectNextStep string still works", () => {
	const inj = new BootstrapInjector();

	it("figma_execute with BLOCKING still returns string hint", () => {
		const s = inj.injectNextStep("figma_execute", { _POST_EXECUTE_SCAN_BLOCKING: true });
		expect(typeof s).toBe("string");
		expect(s).toMatch(/BLOCKING|fix/i);
	});
});
