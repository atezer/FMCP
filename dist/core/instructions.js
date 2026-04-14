/**
 * MCP Server Instructions — sent to AI clients during initialization.
 * Helps Claude/Cursor distinguish F-MCP Bridge from the official Figma MCP,
 * teaches the context-safe workflow, and enforces design system continuity.
 *
 * No Node.js dependencies — safe for Cloudflare Workers.
 */
export const FMCP_INSTRUCTIONS = `F-MCP ATezer Bridge — Plugin-based Figma MCP (WebSocket, no REST token).
Tool namespace: "figma_*". Server name: "figma-mcp-bridge".

═══════════════════════════════════════════════════════════════════
CONTEXT-SAFE PROTOCOL (REQUIRED for Claude chat — v1.8.0+)
═══════════════════════════════════════════════════════════════════

Tool responses are expensive. Follow this order, prefer the cheapest
verbosity that answers the question, and reuse cached results.

Step 1 — Plugin discovery
  figma_get_status()
  figma_list_connected_files()    (only if multi-file)

Step 2 — Structural overview (cheap, cached 60s)
  figma_get_file_data(depth=1, verbosity="summary")
  or figma_get_design_system_summary()

Step 3 — Target ONE node with the lowest verbosity that answers the
question. All read tools are cached for 60s within a session:
  • identity only            → depth=0, verbosity="summary"
  • text + structure         → depth=1, verbosity="summary"  ← new default
  • layout/visual detail     → depth=1, verbosity="standard"
  • everything               → depth=2, verbosity="full"
  Do NOT call verbosity="full" on the document root.

Step 4 — Screenshots only when visual confirmation is needed.
  v1.8.0 defaults: JPG, scale=1, jpegQuality=70 (~80% smaller than
  PNG@2x). Use PNG scale=2 only when pixel-perfect asset export is
  required.

Step 5 — Caching: within a session, repeated identical read calls
  return instantly from cache. Pass debug=true on a tool to bypass
  the cache and include _responseGuard/_metrics fields.

═══════════════════════════════════════════════════════════════════
TOOL SELECTION (F-MCP Bridge vs Official Figma MCP)
═══════════════════════════════════════════════════════════════════

If figma_get_status() returns ready=true, the F-MCP plugin is
connected to a specific file. Prefer F-MCP Bridge tools for that
file — DO NOT call official Figma MCP tools that read the same file.

  Official Figma MCP tool         →   F-MCP Bridge equivalent
  ─────────────────────────────       ──────────────────────────────
  search_design_system            →   figma_search_assets
                                       + figma_get_library_variables
                                       + figma_get_library_components
  get_metadata                    →   figma_get_file_data
  get_design_context              →   figma_get_design_context
  get_screenshot                  →   figma_capture_screenshot
  get_variable_defs               →   figma_get_variables
  use_figma                       →   figma_execute

The official search_design_system often fails with "Resource links
are not supported" or "file could not be accessed" — fall back to
figma_search_assets / figma_get_library_components immediately
(F-MCP plugin reads directly via Plugin API).

WHEN TO PREFER OFFICIAL FIGMA MCP:
- Code Connect mappings (add_code_connect_map, get_code_connect_map)
- Creating new Figma files (create_new_file)
- FigJam diagram generation (generate_diagram)
- When the F-MCP plugin is NOT connected to the target file

COEXISTENCE: Both servers run simultaneously. Choose by capability.

═══════════════════════════════════════════════════════════════════
DESIGN SYSTEM CONTEXT (REQUIRED for screen/component creation)
═══════════════════════════════════════════════════════════════════

When the user asks to create a screen, alternative design, or new
component, the FIRST step is ALWAYS to confirm which design system
to use. NEVER create UI without a confirmed DS context.

Step A — Check for an existing DS preference:
  1. Read .claude/libraries/active-ds.md (or .fmcp-brand-profile.json)
  2. If present and mentions a DS (e.g. "❖ SUI"), use it directly
  3. If absent, ask the user: "Hangi tasarım sistemi ile ilerleyelim?
     (Örn: ❖ SUI, Material Design, Apple HIG, kendi DS'iniz)"

Step B — Once the DS is confirmed:
  1. Persist the choice to .claude/libraries/active-ds.md so future
     turns reuse it without asking again
  2. Load DS variable keys via figma_get_library_variables({libraryName: "..."})
  3. Load DS component keys via figma_get_library_components({libraryName: "..."})
  4. Cache results in .claude/libraries/<ds-name>.md for 24h

Step C — Token Binding is MANDATORY:
  Every node you create must bind its visual properties to DS tokens:
    • fills/strokes        → setBoundVariableForPaint(...)
    • padding/gap/radius   → setBoundVariable("paddingLeft", v)
    • text typography      → setTextStyleIdAsync(styleId)  (never
                              setBoundVariable("fontSize", ...))
    • effects (shadows)    → setEffectStyleIdAsync(styleId)

  Hardcoded hex colors, pixel padding, or font sizes are FORBIDDEN
  in code that creates Figma nodes. If a token does not exist for a
  needed value, ASK the user how to proceed — do not silently
  hardcode.

Step D — Component instances over hand-built shapes:
  When you need a button, input, card, or other UI element that
  exists in the DS, ALWAYS use figma_instantiate_component with the
  library componentKey. NEVER hand-build it from rectangles + text
  unless the DS has no equivalent.

═══════════════════════════════════════════════════════════════════
COMMON GOTCHAS (Plugin API)
═══════════════════════════════════════════════════════════════════

1. layoutSizing & layoutPositioning ordering: appendChild MUST be
   called BEFORE setting layoutSizingHorizontal/Vertical = "FILL"
   or layoutPositioning = "ABSOLUTE". Setting these on an unparented
   node fails with "parent node has layoutMode !== NONE".

2. Font weights are not universal: do NOT assume a DS font has
   "Medium". Call figma.listAvailableFontsAsync() first and use a
   pickStyle() fallback ("Medium" → "Semi Bold" → "Regular").

3. layoutSizing = "FILL" before appendChild — same gotcha as #1.

4. setCurrentPageAsync, not figma.currentPage = page (sync setter
   throws in dynamic-page mode).

5. import is a reserved word — never use it as a function/var name
   in figma_execute code.

For full guidance, load the figma-canvas-ops skill before any
figma_execute write operation.`;
//# sourceMappingURL=instructions.js.map