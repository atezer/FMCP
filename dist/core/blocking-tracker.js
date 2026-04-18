/**
 * v1.9.7: BLOCKING Suppression Prevention — session-level state.
 *
 * Plan'daki Katman 3 implementasyonu. Amaç: Claude BLOCKING flag'i gördükten
 * sonra aynı nodeId üzerinde ikinci bir mutation execute'ı denerse, server
 * tarafında HARD_ERROR dönerek rasyonalize ederek skip'i engelle.
 *
 * Tespit mekanizması:
 * - Her figma_execute sonrasında _designSystemViolations veya _postExecuteScan
 *   döndüyse, response'dan nodeId'leri ayıkla ve `recordBlocking()` çağır.
 * - Sonraki figma_execute öncesi `checkSuppression(code)` çağırılır.
 * - Kod aynı nodeId'yi içeriyorsa ve explicit `// FORCE_OVERRIDE` comment yoksa
 *   error döndürülür — tool fail olur, Claude skip edemez.
 *
 * Override escape hatch:
 * - Kod başına `// FORCE_OVERRIDE` comment (`/^\s*\/\/\s*FORCE_OVERRIDE\b/m`)
 *   eklendiğinde suppression check bypass edilir. Kullanıcı explicit onay ile
 *   override edebilir, Claude sessizce atlayamaz.
 *
 * TTL: 5 dakika. Aynı oturumda yeni intent geldiğinde BLOCKING state zamanla
 * temizlenir (false positive engellenir).
 */
/** Explicit override regex — multiline, start-of-line // FORCE_OVERRIDE comment */
const FORCE_OVERRIDE_REGEX = /^\s*\/\/\s*FORCE_OVERRIDE\b/m;
/** 5 dakika TTL — aynı oturumda state expiration */
const BLOCKING_TTL_MS = 5 * 60 * 1000;
export class BlockingTracker {
    constructor() {
        this.lastBlockingTimestamp = 0;
        this.lastBlockingNodeIds = new Set();
        this.lastBlockingCategories = [];
    }
    /**
     * Record a BLOCKING event from a figma_execute response.
     * Call this after figma_execute if _designSystemViolations or _postExecuteScan had violations.
     */
    recordBlocking(nodeIds, categories = []) {
        this.lastBlockingTimestamp = Date.now();
        for (const id of nodeIds) {
            if (id && typeof id === "string")
                this.lastBlockingNodeIds.add(id);
        }
        this.lastBlockingCategories = categories;
    }
    /**
     * Check if an incoming figma_execute code is attempting to suppress a prior BLOCKING.
     * Returns error if suppression detected, empty object if clean.
     */
    checkSuppression(executeCode) {
        // TTL expiration
        const timeSince = Date.now() - this.lastBlockingTimestamp;
        if (timeSince > BLOCKING_TTL_MS) {
            this.reset();
            return {};
        }
        // No recorded blocking — clean pass
        if (this.lastBlockingNodeIds.size === 0)
            return {};
        // Explicit override — user/Claude asked to force
        if (FORCE_OVERRIDE_REGEX.test(executeCode)) {
            return { forceOverride: true };
        }
        // Scan code for tracked nodeIds
        const matched = [];
        for (const id of this.lastBlockingNodeIds) {
            if (executeCode.includes(id))
                matched.push(id);
        }
        if (matched.length === 0)
            return {};
        const preview = matched.slice(0, 3).join(", ");
        const categoryHint = this.lastBlockingCategories.length > 0
            ? ` Onceki BLOCKING kategorileri: ${this.lastBlockingCategories.slice(0, 3).join(", ")}.`
            : "";
        return {
            matchedNodeIds: matched,
            error: `❌ BLOCKING_SUPPRESSION_DETECTED: Node${matched.length > 1 ? "'lar" : ""} ${preview} icin son figma_execute'ta BLOCKING flag donmustu.${categoryHint} ` +
                `Ayni nodeId'ye yeni mutation denendi — rasyonalize ederek skip ediyor olabilirsin. ` +
                `Kok nedeni cozmeden devam edilemez:\n` +
                `  1. BLOCKING sebebini duzelt (unbound fill/padding/radius/textStyle bind et).\n` +
                `  2. Eger gercekten bypass gerekli ise kullaniciya acikca sor: "BLOCKING'i override etmek istiyor musun?"\n` +
                `  3. Kullanici onayi ile kod basina "// FORCE_OVERRIDE" comment ekleyerek tekrar calistir.`,
        };
    }
    /**
     * Manual reset (e.g. new intent, explicit clear).
     */
    reset() {
        this.lastBlockingNodeIds.clear();
        this.lastBlockingCategories = [];
        this.lastBlockingTimestamp = 0;
    }
    /**
     * Introspection (for _nextStep hint generation, debugging).
     */
    getState() {
        return {
            nodeCount: this.lastBlockingNodeIds.size,
            categories: [...this.lastBlockingCategories],
            timestamp: this.lastBlockingTimestamp,
        };
    }
}
/**
 * Extract nodeIds from figma_execute response (for recordBlocking).
 * Checks _postExecuteScan.violations and _designSystemViolations.
 */
export function extractBlockingNodeIds(response) {
    const nodeIds = [];
    const categories = [];
    if (!response || typeof response !== "object")
        return { nodeIds, categories };
    const r = response;
    // v1.9.6 _postExecuteScan.violations
    const scan = r._postExecuteScan;
    if (scan?.violations) {
        for (const v of scan.violations) {
            if (v.nodeId)
                nodeIds.push(v.nodeId);
            if (v.category)
                categories.push(v.category);
        }
    }
    // Also _postExecuteViolations (server-side wrapper, v1.9.6)
    const postViol = r._postExecuteViolations;
    if (postViol?.violations) {
        for (const v of postViol.violations) {
            if (v.nodeId)
                nodeIds.push(v.nodeId);
            if (v.category)
                categories.push(v.category);
        }
    }
    // v1.8.1 _designSystemViolations (static code analysis; node IDs usually embedded in messages)
    const dsViol = r._designSystemViolations;
    if (dsViol?.violations) {
        for (const v of dsViol.violations) {
            if (v.category)
                categories.push(v.category);
            // Regex: extract node IDs like "241:11896" from message text
            if (v.message) {
                const matches = v.message.match(/\d+:\d+/g);
                if (matches)
                    nodeIds.push(...matches);
            }
        }
    }
    return { nodeIds: Array.from(new Set(nodeIds)), categories: Array.from(new Set(categories)) };
}
/** Singleton for server process lifetime */
export const blockingTracker = new BlockingTracker();
//# sourceMappingURL=blocking-tracker.js.map