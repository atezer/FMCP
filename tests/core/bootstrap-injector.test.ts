/**
 * Unit tests for BootstrapInjector.injectNextStep (string next-step hint).
 *
 * Not: injectNextStepObj ve NextStep tipi v1.9.13 temizliğinde kaldırıldı —
 * üretimden hiç çağrılmıyordu ve tüm case'leri v3.3'te kaldırılan cache
 * tool'larına (figma_resolve_active_ds vb.) aitti.
 */

import { BootstrapInjector } from "../../src/core/bootstrap-injector";

describe("injectNextStep — string hint", () => {
	const inj = new BootstrapInjector();

	it("figma_execute with BLOCKING returns string hint", () => {
		const s = inj.injectNextStep("figma_execute", { _POST_EXECUTE_SCAN_BLOCKING: true });
		expect(typeof s).toBe("string");
		expect(s).toMatch(/BLOCKING|fix/i);
	});

	it("null result → undefined", () => {
		expect(inj.injectNextStep("figma_execute", null)).toBeUndefined();
	});

	it("non-object result → undefined", () => {
		expect(inj.injectNextStep("figma_execute", "string-result")).toBeUndefined();
	});
});

describe("getBootstrap — first call vs reminder", () => {
	it("first call returns full directives, subsequent calls return reminder", () => {
		const inj = new BootstrapInjector();
		const first = inj.getBootstrap();
		expect(first.critical_rules).toBeDefined();
		expect(first.embedded_skills).toBeDefined();
		const second = inj.getBootstrap();
		expect(second.reminder).toBeDefined();
		expect(second.embedded_skills).toBeUndefined();
	});
});
