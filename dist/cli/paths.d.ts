/**
 * fmcp CLI — path helpers. Dependency-free (node builtins only) so the CLI and the
 * degraded status server run even when node_modules is missing (e.g. cloud sessions).
 */
/** Install root = directory that contains dist/. `moduleUrl` is import.meta.url of a file in dist/cli/. */
export declare function installRootFrom(moduleUrl: string): string;
/** ~/.fmcp — CLI state (pidfile, logs). Screenshots already live here (v1.9.5+). */
export declare function fmcpHome(home?: string): string;
export declare function pidFilePath(home?: string): string;
export declare function logFilePath(home?: string): string;
/** Claude Desktop config location per platform (null if platform unknown). */
export declare function claudeDesktopConfigPath(platform?: NodeJS.Platform, home?: string, env?: NodeJS.ProcessEnv): string | null;
/** Cursor global MCP config. */
export declare function cursorGlobalConfigPath(home?: string): string;
/** Candidate MCP config files for a given project dir + user home. Only existing files are returned. */
export declare function candidateMcpConfigs(projectDir: string, opts?: {
    platform?: NodeJS.Platform;
    home?: string;
    env?: NodeJS.ProcessEnv;
}): {
    label: string;
    file: string;
}[];
/**
 * Cloud / remote session detection. In these environments the Figma plugin runs on the
 * user's own computer and can never reach this process, so the full bridge is pointless.
 */
export declare function isCloudEnv(env?: NodeJS.ProcessEnv): {
    cloud: boolean;
    reason: string | null;
};
//# sourceMappingURL=paths.d.ts.map