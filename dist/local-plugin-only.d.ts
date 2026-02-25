#!/usr/bin/env node
/**
 * F-MCP ATezer Bridge – Plugin-only MCP relay
 *
 * Minimal MCP server: NO Figma REST API, NO FIGMA_ACCESS_TOKEN, NO CDP.
 * All data comes from the F-MCP ATezer Bridge plugin via WebSocket (port 5454).
 * Claude connects to this process; plugin in Figma connects to the same process.
 *
 * Usage: node dist/local-plugin-only.js
 * Claude config: "args": ["/path/to/figma-mcp-bridge/dist/local-plugin-only.js"]
 */
export declare function main(): Promise<void>;
//# sourceMappingURL=local-plugin-only.d.ts.map