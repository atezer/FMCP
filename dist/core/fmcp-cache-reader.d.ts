/**
 * FMCP DS Cache Reader (v3.1+)
 *
 * Server-side reader for the user-local DS cache at
 *   ~/.claude/data/fcm-ds/active.md
 *   ~/.claude/data/fcm-ds/<file-key>/{tokens,components,_meta}.md
 *
 * Surfaces three async resolvers consumed by the new MCP tools:
 *   - resolveActiveDs()
 *   - getLibraryComponents(libraryName, filter?)
 *   - getLibraryTokens(libraryName, filter?)
 *
 * Eliminates the round-trip through the Figma plugin / REST API for cache
 * hits and bypasses the fmcp-filesystem MCP allowedDirectories restriction
 * (Claude no longer needs FS access — the server reads on its behalf).
 */
export type CacheStatus = "fresh" | "stale" | "missing";
export interface ActiveDsContext {
    libraryName: string | null;
    fileKey: string | null;
    cacheRoot: string | null;
    status: CacheStatus;
    lastSync: string | null;
    source: "fmcp_cache";
    notes?: string;
}
export interface LibraryComponent {
    name: string;
    key: string;
    role: string | null;
    source: string | null;
    /**
     * Phase G (v3.1.4+): specific library this component was published from
     * (e.g. "❖ SUI Mobil" vs "❖ SUI"). Remote library keys are library-scoped,
     * so importComponentByKeyAsync requires the TARGET file to subscribe to
     * *this* library. When omitted the caller should assume the primary DS.
     */
    sourceLibrary: string | null;
    /**
     * Phase H (v3.1.5+): distinguishes a single COMPONENT from a COMPONENT_SET
     * (variant container). Agents MUST call the matching import API —
     * `importComponentByKeyAsync` fails with "Could not find a published
     * component with the key" when invoked with a SET key. Variant-bearing
     * components (Button, NavigationTopBar …) are always COMPONENT_SET.
     */
    kind: "COMPONENT" | "COMPONENT_SET";
}
export interface LibraryToken {
    name: string;
    key: string;
    type: string;
    collection: string | null;
}
export declare function resolveActiveDs(): Promise<ActiveDsContext>;
/**
 * Components.md is a hybrid: top-level UI components live under `### N. Name`
 * headings followed by `- **componentKey:** \`<key>\`` bullets. Icons sit in a
 * single `| Icon | componentKey | Props | Usage |` table. The "Eksik" table
 * lists components that have no key yet — skipped.
 */
export declare function getLibraryComponents(libraryName: string, filter?: string): Promise<LibraryComponent[]>;
/**
 * Tokens.md hosts multiple `## <Type> Tokens` tables, each with a 2- or 3-column
 * shape ending in `variableKey`. The section heading carries the type
 * (Spacing, Radius, Surface Backgrounds, Component Backgrounds...).
 * The "Collection Info" table is metadata, not bindable tokens — skipped.
 */
export declare function getLibraryTokens(libraryName: string, filter?: string): Promise<LibraryToken[]>;
//# sourceMappingURL=fmcp-cache-reader.d.ts.map