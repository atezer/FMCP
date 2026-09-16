/**
 * fmcp CLI — version consistency across the repo's manifests. Dependency-free.
 *
 * FMCP ships one version string in seven places; when they drift, `figma_get_status`
 * reports a bogus "plugin version mismatch" and marketplaces show stale numbers.
 */
export interface VersionSource {
    /** Repo-relative path. */
    file: string;
    /** Extracted version or null when the file is missing / unparsable. */
    version: string | null;
    /** True for files that must match; false for informational ones (e.g. dist). */
    required: boolean;
    note?: string;
}
/** Collect versions from all known places under `root`. Missing optional files are skipped. */
export declare function collectVersions(root: string): VersionSource[];
export interface VersionReport {
    ok: boolean;
    /** package.json version (the source of truth). */
    expected: string | null;
    mismatches: VersionSource[];
    missing: VersionSource[];
}
export declare function checkVersions(sources: VersionSource[]): VersionReport;
//# sourceMappingURL=versions.d.ts.map