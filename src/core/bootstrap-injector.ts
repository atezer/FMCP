/**
 * v1.9.7: Bootstrap Injector — response-level zero-click enforcement.
 *
 * Plan'daki Katman 5 implementasyonu.
 *
 * Amaç: Claude Desktop'ta kullanıcı hiç setup yapmadan ("figma linki + ödeme
 * ekranı tasarla" gibi genel prompt ile) tüm agent/skill chain'in otomatik
 * devreye girmesi için plugin MCP response'larında gömülü directive göndermek.
 *
 * Strateji:
 * - İlk `figma_get_status` çağrısında FULL bootstrap (critical_rules + embedded
 *   skills) ~6K token gönderilir. Claude okur, oturum boyunca bellekte tutar.
 * - Sonraki çağrılarda sadece kısa reminder (~100 token).
 * - Her tool response'a `_nextStep` hint eklenir — Claude'u bir sonraki doğru
 *   adıma yönlendirir.
 */

import { EMBEDDED_SKILLS_SUMMARY, EMBEDDED_SKILLS_TOKEN_ESTIMATE } from "./embedded-skills.js";

/** Critical rules (Katman 5 — 8 direktif) */
const CRITICAL_RULES = [
	"1. FIRST: figma_get_design_system_summary cagir, DS state kontrol et",
	"2. BLANK FILE: 0 component/0 variable tespit edilirse 4 secenek sun: (a) team library import, (b) figma_create_mini_ds, (c) template kopyala, (d) linter-off — secim yapilmadan createFrame YASAK",
	"3. POST-EXECUTE: Her figma_execute sonrasi _POST_EXECUTE_SCAN_BLOCKING flag'i kontrol, varsa kodu duzelt ve retry — 'dosyada DS yok, gecerli degil' diye SKIP ETME",
	"4. SCREENSHOT: returnMode 'file'/'summary'/'regions' kullan, 'base64' sadece kullanici explicit isterse",
	"5. DISCOVERY: maks 12 figma_get_* cagrisi sonra plan sun",
	"6. SCAN: Ekran tamamlandiginda figma_scan_ds_compliance(threshold=85) ZORUNLU, skor <85 ise duzelt",
	"7. NEGATIVE INTENT: Kullanici 'X atla', 'X'e bakma', 'X disinda' dediyse exclude_references state'e yaz",
	"8. SUPPRESSION: BLOCKING flag'i 'bu projede gecerli degil', 'simdilik skip' gibi rasyonellestirme YASAK — kok nedeni duzelt. Aksi halde server HARD_ERROR doner.",
];

const ANTI_PATTERNS = [
	"Ham createFrame + hardcoded fill/padding/fontSize — DS'siz uretim denemesi",
	"BLOCKING flag'i 'bu projede yok' diye skip etme",
	"base64 screenshot default kullanma (~30K token context)",
	"Discovery 12+ call (plan sunmadan)",
	"ask_user_input_v0 3+ soru ust uste",
];

export type BootstrapPayload = {
	version: string;
	self_instruction: string;
	critical_rules?: string[];
	anti_patterns?: string[];
	embedded_skills?: string;
	embedded_instructions_token_estimate?: number;
	skill_cache_hint?: string;
	reference_docs?: string;
	// Reminder mode
	reminder?: string;
	session_tool_count?: number;
};

/**
 * Bootstrap injector — session-level state.
 */
export class BootstrapInjector {
	private firstCallMade = false;
	private toolCallCount = 0;

	/**
	 * Get bootstrap payload for a figma_get_status call.
	 * First call: full directives + embedded skills.
	 * Subsequent: short reminder.
	 */
	getBootstrap(): BootstrapPayload {
		this.toolCallCount++;
		if (!this.firstCallMade) {
			this.firstCallMade = true;
			return {
				version: "1.9.7",
				self_instruction:
					"Bu directives'i bir kere oku ve oturum boyunca uygula. Kullanici explicit aksini soylemedikce sapma.",
				critical_rules: CRITICAL_RULES,
				anti_patterns: ANTI_PATTERNS,
				embedded_skills: EMBEDDED_SKILLS_SUMMARY,
				embedded_instructions_token_estimate: EMBEDDED_SKILLS_TOKEN_ESTIMATE,
				skill_cache_hint:
					"Bu embedded_skills oturum boyunca etkili. Sadece ilk figma_get_status'ta gelir, sonraki call'larda _bootstrap.reminder doner (~100 token). LLM prompt cache ile 5 dk icinde yeniden enjeksiyon bedavadir.",
				reference_docs:
					"MCP resources: fmcp://skills/master-instructions, fmcp://skills/blank-file-workflow. MCP prompts: fmcp-start-session, fmcp-design-screen, fmcp-audit-screen.",
			};
		}
		return {
			version: "1.9.7",
			self_instruction: CRITICAL_RULES.slice(0, 3).join(" | "),
			reminder:
				"Rules from first figma_get_status call still in effect. See critical_rules in initial _bootstrap response.",
			session_tool_count: this.toolCallCount,
		};
	}

	/**
	 * Generate _nextStep hint for a given tool + result.
	 * Claude-facing string directing the next logical action.
	 */
	injectNextStep(toolName: string, result: unknown): string | undefined {
		if (!result || typeof result !== "object") return undefined;
		const r = result as Record<string, unknown>;

		switch (toolName) {
			case "figma_get_status": {
				if (r.pluginConnected) return "verify_ds_state_with_figma_get_design_system_summary";
				return "plugin_not_connected_ask_user_to_open_figma_plugin";
			}
			case "figma_get_design_system_summary": {
				const comps = (r.components as number | undefined) ?? 0;
				const sets = (r.componentSets as number | undefined) ?? 0;
				const vars = (r.variableCollections as unknown[] | undefined)?.length ?? 0;
				if (comps === 0 && sets === 0 && vars === 0) {
					return "BLANK_FILE_DIALOG_REQUIRED: 4 secenek sun (a) library import (b) figma_create_mini_ds (c) template (d) linter-off — secim yapmadan createFrame YASAK";
				}
				return "load_components_and_variables_via_team_library_api";
			}
			case "figma_execute": {
				if (r._POST_EXECUTE_SCAN_BLOCKING || r._DESIGN_SYSTEM_VIOLATIONS_BLOCKING) {
					return "BLOCKING_detected — fix_unbound_nodes_and_retry — DO NOT rationalize or skip";
				}
				if (r._DISCOVERY_BUDGET_EXCEEDED_BLOCKING) {
					return "discovery_budget_exceeded — plan_sun_to_user_and_await_approval";
				}
				return "continue_with_next_section_or_call_figma_scan_ds_compliance_when_done";
			}
			case "figma_scan_ds_compliance":
			case "figma_validate_screen": {
				if (r.passed === false) {
					return "bind_violations_listed_in_samples_then_rescan";
				}
				return "ready_to_report_to_user_with_coverage_summary";
			}
			case "figma_capture_screenshot": {
				const mode = (r.mode as string | undefined) ?? "unknown";
				if (mode === "base64") {
					return "next_time_prefer_returnMode_file_or_summary_to_save_context";
				}
				return "continue_with_design_or_validation_flow";
			}
			case "figma_create_mini_ds": {
				if (r.success) {
					return "mini_ds_ready — call_figma_execute_to_build_screen_using_new_components_and_variables";
				}
				return "mini_ds_failed — report_error_to_user";
			}
			default:
				return undefined;
		}
	}

	reset(): void {
		this.firstCallMade = false;
		this.toolCallCount = 0;
	}
}

/** Singleton for server process lifetime */
export const bootstrapInjector = new BootstrapInjector();
