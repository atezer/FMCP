/**
 * MCP Server Instructions — sent to AI clients during initialization.
 * Helps Claude/Cursor distinguish F-MCP Bridge from the official Figma MCP.
 * No Node.js dependencies — safe for Cloudflare Workers.
 */
export const FMCP_INSTRUCTIONS = `F-MCP ATezer Bridge — Plugin-based Figma MCP server.

WHAT IT IS:
F-MCP connects directly to the Figma Plugin API via WebSocket bridge (ports 5454-5470).
It reads real-time state from open Figma files without needing a REST API token.
All F-MCP tool names start with "figma_" and belong to the "figma-mcp-bridge" MCP server.

WHEN TO PREFER F-MCP BRIDGE (figma-mcp-bridge tools):
- Reading live plugin state: variables, styles, components, document structure
- Running Plugin API code (figma_execute) for custom queries or mutations
- Capturing screenshots without a REST token (figma_capture_screenshot)
- Creating/modifying nodes directly: frames, text, rectangles, groups
- Variable CRUD (create, update, delete variables and collections)
- Design token browsing and design-code parity checks
- Multi-file targeting via fileKey or figmaUrl params
- Batch export (SVG/PNG/JPG/PDF) via plugin exportAsync
- When no Figma REST API token is available

WHEN TO PREFER OFFICIAL FIGMA MCP:
- Code Connect mappings and suggestions
- Design system search across team libraries (search_design_system)
- Creating new Figma files (create_new_file)
- Running Plugin API code through official channel (use_figma)
- Generating diagrams in FigJam (generate_diagram)
- When official Figma Cloud API OAuth integration is needed

COEXISTENCE:
Both servers run simultaneously on different ports with different namespaces.
F-MCP tools are prefixed "figma_" in the figma-mcp-bridge server.
Official tools use their own names in separate MCP server namespaces.
Choose based on the capability needed.`;
//# sourceMappingURL=instructions.js.map