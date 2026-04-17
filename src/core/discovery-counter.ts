/**
 * v1.9.5: Discovery Budget Enforcement — session-level counter.
 *
 * Her MCP server oturumunda keşif (read-only) tool çağrılarını sayar.
 * Amaç: Claude'un aşırı keşif fazı yapıp üretime geçmemesini engellemek.
 *
 * Threshold'lar:
 * - WARN: 8 keşif call — response'a _warnings eklenir
 * - BLOCK: 12 keşif call — response'a _DISCOVERY_BUDGET_EXCEEDED_BLOCKING flag
 * - Reset: ilk mutation call (figma_execute non-read-only, validate, scan) veya yeni server process
 *
 * Discovery tool classification:
 * - figma_get_* (file_data, design_context, metadata, styles, variables, library_variables, screenshot)
 * - figma_search_* (components, assets)
 * - figma_list_*
 * - figma_capture_screenshot (read-only visual)
 * - figma_execute (kod pattern tespiti — findAll, getNodeByIdAsync ... read-only pattern)
 *
 * Build tool classification (sayılmaz):
 * - figma_instantiate_component, figma_bind_variable, figma_clone_screen_to_device
 * - figma_validate_screen, figma_scan_ds_compliance (read-only audit ama üretim sonrası)
 * - figma_execute (mutation pattern: createFrame, createText, setFills, appendChild, ...)
 */

/** Read-only kod pattern'leri — bu pattern'ler tespit edilirse figma_execute DISCOVERY sayılır */
const READ_ONLY_PATTERNS = [
	/\bfindAll\b/,
	/\bfindAllWithCriteria\b/,
	/\bgetNodeByIdAsync\b/,
	/\bchildren\.map\b/,
	/\bchildren\.length\b/,
	/\bfigma\.root\.children/,
	/\bcurrentPage\.children/,
];

/** Mutation pattern'leri — bu pattern'ler figma_execute'u BUILD sayar */
const MUTATION_PATTERNS = [
	/\bcreateFrame\s*\(/,
	/\bcreateText\s*\(/,
	/\bcreateRectangle\s*\(/,
	/\bcreateEllipse\s*\(/,
	/\bcreateComponent\s*\(/,
	/\bsetBoundVariable/,
	/\bsetTextStyleIdAsync/,
	/\bsetProperties\s*\(/,
	/\bappendChild\s*\(/,
	/\bimportComponentByKeyAsync/,
	/\bimportVariableByKeyAsync/,
	/\bnode\.remove\s*\(/,
	/\.fills\s*=/,
	/\.strokes\s*=/,
];

export type DiscoveryBudgetResult = {
	count: number;
	warnings?: string[];
	_DISCOVERY_BUDGET_EXCEEDED_BLOCKING?: boolean;
};

export class DiscoveryCounter {
	private count = 0;
	private readonly WARN_THRESHOLD: number;
	private readonly BLOCK_THRESHOLD: number;

	constructor(warnThreshold = 8, blockThreshold = 12) {
		this.WARN_THRESHOLD = warnThreshold;
		this.BLOCK_THRESHOLD = blockThreshold;
	}

	/**
	 * Record a tool call. Returns budget metadata to inject into response.
	 * @param toolName - MCP tool name (e.g. "figma_get_file_data")
	 * @param executeCode - For figma_execute, the code string (pattern analysis)
	 */
	track(toolName: string, executeCode?: string): DiscoveryBudgetResult {
		const category = this.classify(toolName, executeCode);
		if (category === "build") {
			// Reset on first build call — this signals transition from discovery to build phase
			if (this.count > 0) this.count = 0;
			return { count: 0 };
		}
		if (category === "discovery") {
			this.count++;
		}
		return this.snapshot();
	}

	/**
	 * Peek at current budget without tracking (useful for response injection).
	 */
	snapshot(): DiscoveryBudgetResult {
		const out: DiscoveryBudgetResult = { count: this.count };
		if (this.count >= this.BLOCK_THRESHOLD) {
			out._DISCOVERY_BUDGET_EXCEEDED_BLOCKING = true;
			out.warnings = [
				`❌ DISCOVERY_BUDGET_EXCEEDED: ${this.count}/${this.BLOCK_THRESHOLD} kesif cagrisi yapildi. STOP — plan sun, kullanici onayi al, uretime gec (figma_execute mutation). Skip edemezsin.`,
			];
		} else if (this.count >= this.WARN_THRESHOLD) {
			out.warnings = [
				`⚠️ DISCOVERY_BUDGET_WARNING: ${this.count}/${this.BLOCK_THRESHOLD} kesif cagrisi yapildi. Yakinda uretime gec — daha fazla kesif context'i yer.`,
			];
		}
		return out;
	}

	/** Manual reset (e.g. new session or explicit build transition) */
	reset(): void {
		this.count = 0;
	}

	getCount(): number {
		return this.count;
	}

	/**
	 * Classify a tool call as "discovery", "build", or "neutral" (not counted).
	 */
	private classify(toolName: string, executeCode?: string): "discovery" | "build" | "neutral" {
		// Validate/scan are post-build audits — neutral (don't count, don't reset)
		if (toolName === "figma_validate_screen" || toolName === "figma_scan_ds_compliance") {
			return "neutral";
		}

		// Build tools — explicit mutations
		if (
			toolName === "figma_instantiate_component" ||
			toolName === "figma_bind_variable" ||
			toolName === "figma_clone_screen_to_device" ||
			toolName === "figma_set_instance_properties"
		) {
			return "build";
		}

		// Discovery patterns (tool name prefix)
		if (
			/^figma_get_/.test(toolName) ||
			/^figma_search_/.test(toolName) ||
			/^figma_list_/.test(toolName) ||
			toolName === "figma_capture_screenshot"
		) {
			return "discovery";
		}

		// figma_execute — pattern analysis
		if (toolName === "figma_execute") {
			if (!executeCode) return "discovery"; // default to discovery if no code (conservative)
			const isMutation = MUTATION_PATTERNS.some((p) => p.test(executeCode));
			if (isMutation) return "build";
			const isReadOnly = READ_ONLY_PATTERNS.some((p) => p.test(executeCode));
			if (isReadOnly) return "discovery";
			// Unknown pattern — conservative: count as discovery
			return "discovery";
		}

		return "neutral";
	}
}

/** Singleton counter for the server process lifetime */
export const discoveryCounter = new DiscoveryCounter();
