#!/usr/bin/env node
/**
 * fmcp — F-MCP Bridge command line.
 *
 *   fmcp serve              MCP server (stdio). Full bridge when possible, degraded otherwise.
 *   fmcp doctor [--fix]     10 checks with one-line fixes.  --json for machines.
 *   fmcp fix                = doctor --fix
 *   fmcp status [--json]    Which bridges run on 5454–5470, who owns them, which files are connected.
 *   fmcp start [--port N]   Standalone bridge in the background (for testing the plugin). --foreground to stay attached.
 *   fmcp stop [--all|--port N]
 *   fmcp restart
 *   fmcp versions [--check] Version strings across manifests; --check exits 1 on drift.
 *   fmcp version | help
 *
 * This file and everything under src/cli/ must stay dependency-free (node builtins only):
 * `serve` has to answer the MCP client even when node_modules is missing.
 */
export {};
//# sourceMappingURL=fmcp.d.ts.map