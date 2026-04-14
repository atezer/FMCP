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
INTENT ROUTER ENTRY (ALWAYS FIRST — v1.8.1+)
═══════════════════════════════════════════════════════════════════

BEFORE executing ANY figma_* write tool (figma_execute, figma_create_*,
figma_update_*, figma_clone_*, figma_instantiate_*, figma_set_*, etc.),
you MUST follow the Intent Router protocol:

Step 1 — Load router skill
  Read skills/fmcp-intent-router/SKILL.md for the routing logic.

Step 2 — Check state files
  - .claude/design-systems/active-ds.md
  - .claude/design-systems/last-intent.md
  - .claude/design-systems/intent-history.md

Step 3 — Decide target skill
  Map user request to ONE of the 8 entry-point skills:
  generate-figma-screen, apply-figma-design-system,
  audit-figma-design-system, generate-figma-library,
  implement-design, code-design-mapper, visual-qa-compare,
  design-token-pipeline.
  If ambiguous, ask the user with AskUserQuestion.

Step 4 — Read target skill's required_inputs metadata
  Parse the YAML frontmatter block "required_inputs".

Step 5 — Gather missing inputs (smart skipping)
  Apply in order:
  (a) Use value from last-intent.md if default_source matches
  (b) Use parsed value from user's original request
  (c) Apply skip_if conditions (e.g., reference_benchmark given → skip
      screen_type, sections)
  (d) Ask ONE AskUserQuestion with max 4 remaining inputs
  (e) If 5+ still needed, do a second AskUserQuestion

Step 6 — Summary + explicit confirmation (separate AskUserQuestion)
  Show ALL gathered inputs + approach summary + estimated outcome.
  Options: [✅ Evet başla] [✏️ Değiştir] [❌ İptal]
  DO NOT proceed without explicit confirmation.

Step 7 — Execute target skill
  Run the target skill's own Step 0-N (DS check, work, self-audit).

Step 8 — Persist outcome
  Update .claude/design-systems/last-intent.md
  Prepend entry to .claude/design-systems/intent-history.md (LRU 5)

FAST PATH: If the user's request contains all required inputs
(e.g., "clone 139:3407 to iPhone 17 with SUI"), skip Step 5.
Go directly to Step 6 (confirmation), then Step 7.

REPEAT PATH: If last-intent.md matches the new request, ask a
single question: "Öncekiyle aynı mı devam edeyim?"
Options: [✅ Aynı] [✏️ Değiştir] [❌ İptal]

FORBIDDEN:
- DO NOT skip Step 6 (explicit confirmation gate)
- DO NOT assume default values when input is required
- DO NOT execute figma_execute / figma_create_* without routing

═══════════════════════════════════════════════════════════════════
CLONE vs BUILD DECISION (v1.8.2+ — CRITICAL)
═══════════════════════════════════════════════════════════════════

figma_clone_screen_to_device is a NARROW-USE tool. Use it ONLY when:
  • Same design system
  • Same layout structure
  • Only the screen size changes (e.g. iPhone 13 → iPhone 17 migration)

For ALL of these cases, use figma_execute with build-from-scratch pattern
(generate-figma-screen SKILL Step 4-5 — search_assets → instantiate_component
→ setBoundVariable → auto-layout FILL):

  "3 alternatif tasarım yap"       → build, NOT clone
  "Hero Card varyasyonu"           → build, NOT clone
  "Farklı layout"                  → build, NOT clone
  "Yeni ekran tasarla"             → build, NOT clone
  "Bu ekranı daha iyi yap"         → build, NOT clone
  "Benchmark'tan ilham al"         → build (benchmark = inspiration only)
  "Redesign" / "iyileştir"         → build, NOT clone

RULE: If the user says ANY of {alternatif, varyasyon, farklı, yeni,
tasarla, iyileştir, redesign}, DO NOT suggest figma_clone_screen_to_device.
Default to build-from-scratch via figma_execute + Step 4-5 pattern.

Benchmark is ALWAYS inspiration, never a copy source for alternatives.
Clone copies the benchmark's existing mistakes (hardcoded rectangles,
missing token bindings, non-responsive layouts) into the new screen.

═══════════════════════════════════════════════════════════════════
TOOL FAILURE RECOVERY (v1.8.2+)
═══════════════════════════════════════════════════════════════════

If a tool call fails (timeout, error, unexpected result):

1. Retry ONCE with different parameters (smaller scope, different device,
   chunked code, lower minScore, etc.)
2. If second failure: STOP. Do orphan cleanup. Report to user.
3. NEVER retry same tool + same params 3+ times (infinite loop).
4. After any write-tool failure: check for orphan nodes with
   figma_get_file_data. List them to the user. Delete only with consent.

Multi-output turn budget:
- Each alternative/output = separate turn
- Max 90s per turn (hard limit)
- Max 2 failed tool calls per turn
- If budget exhausted → Turn FAILED → orphan cleanup → user checkpoint

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
