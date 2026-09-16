/**
 * fmcp CLI — MCP client config inspection (.mcp.json, Claude Desktop, Cursor). Dependency-free.
 */
export interface McpServerEntry {
    /** Config file the entry came from. */
    file: string;
    /** Key under mcpServers. */
    name: string;
    command?: string;
    args: string[];
    url?: string;
    env: Record<string, string>;
}
/** Does this entry look like FMCP? Match on name or on the script it launches. */
export declare function isFmcpEntry(entry: {
    name: string;
    command?: string;
    args: string[];
    url?: string;
}): boolean;
/** Parse a config file and return FMCP-looking server entries. Throws on invalid JSON. */
export declare function readFmcpEntries(file: string): McpServerEntry[];
export type EntryVerdict = {
    level: "ok";
    detail: string;
} | {
    level: "warn";
    detail: string;
    fix: string;
} | {
    level: "fail";
    detail: string;
    fix: string;
};
/**
 * Judge whether an entry will actually start on this machine.
 * `installRoot` is where the current dist/ lives; used to spot second installs.
 */
export declare function judgeEntry(entry: McpServerEntry, installRoot: string, opts?: {
    fileExists?: (p: string) => boolean;
}): EntryVerdict;
//# sourceMappingURL=configs.d.ts.map