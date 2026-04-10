# FMCP araç envanteri (tek doğruluk kaynağı)

Kaynak: `dist/local-plugin-only.js` içindeki `registerTool("figma_*")` çağrıları. Sürüm değişince bu dosya güncellenmeli.

## Mimari

F-MCP yalnızca **plugin-only** modunu destekler:
- **Giriş:** `dist/local-plugin-only.js` (46 araç)
- **Bağlantı:** WebSocket plugin bridge (port 5454)
- **Gereksinim:** F-MCP ATezer Bridge plugin Figma’da çalışıyor olmalı
- **REST token:** Zorunlu değil (opsiyonel `figma_set_rest_token` ile ayarlanabilir)

## `local-plugin-only.js` — Tüm `figma_*` araçları

- **Bağlantı / durum:** `figma_list_connected_files`, `figma_get_status`, `figma_plugin_diagnostics`, `figma_set_port`
- **Dosya / yapı:** `figma_get_file_data`, `figma_get_design_context`
- **Bileşenler:** `figma_get_component`, `figma_get_component_image`, `figma_get_component_for_development`, `figma_search_components`, `figma_search_assets`, `figma_instantiate_component`, `figma_arrange_component_set`, `figma_set_instance_properties`, `figma_set_description`
- **Değişkenler:** `figma_get_variables`, `figma_create_variable`, `figma_create_variable_collection`, `figma_update_variable`, `figma_delete_variable`, `figma_delete_variable_collection`, `figma_rename_variable`, `figma_add_mode`, `figma_rename_mode`, `figma_refresh_variables`, `figma_batch_create_variables`, `figma_batch_update_variables`, `figma_setup_design_tokens`, `figma_get_token_browser`
- **Stiller:** `figma_get_styles`
- **Tasarım oluşturma:** `figma_execute`, `figma_create_frame`, `figma_create_text`, `figma_create_rectangle`, `figma_create_group`
- **Konsol:** `figma_get_console_logs`, `figma_watch_console`, `figma_clear_console`
- **Export / görsel:** `figma_capture_screenshot`, `figma_export_nodes`
- **Parity:** `figma_check_design_parity`
- **REST API:** `figma_rest_api`, `figma_set_rest_token`, `figma_get_rest_token_status`, `figma_clear_rest_token`

Tam liste: [TOOLS_FULL_LIST.md](./TOOLS_FULL_LIST.md).

## Şeffaf sınırlar

- **Published library bileşen envanteri:** Plugin API, etkin kütüphanelerdeki değişken koleksiyonlarını `figma.teamLibrary` ile listeler. Bileşen araması `figma_search_components` ile dosyadaki yerel / içe aktarılabilir bileşenler üzerinden yapılır.
- **Code Connect:** Bridge’de ayrı bir `figma_get_code_connect` aracı yoktur. İpuçları için `figma_get_component`, `figma_get_component_for_development` veya `figma_execute` kullanılır.

---

# Available Tools - Detailed Documentation

Bu rehber her araç için **detaylı kullanım** (parametreler, örnekler, best practice) içerir. **Kısa liste (46 araç, tek sayfa):** [TOOLS_FULL_LIST.md](TOOLS_FULL_LIST.md).

## Çalışma modu

F-MCP yalnızca **plugin-only / WebSocket** modunu destekler:
- Figma’yı **normal** açarsınız; **F-MCP ATezer Bridge** plugin’ini çalıştırırsınız
- Plugin, MCP sunucusuna WebSocket (port 5454) ile bağlanır
- `--remote-debugging-port=9222` **gerekmez**, `FIGMA_ACCESS_TOKEN` **zorunlu değildir**

## Quick Reference

| Category | Tool | Purpose |
|----------|------|---------|
| **Bağlantı / Durum** | `figma_get_status` | Check plugin bridge connection status |
| | `figma_list_connected_files` | List connected Figma files |
| | `figma_plugin_diagnostics` | Plugin connection health diagnostics |
| | `figma_set_port` | Change WebSocket bridge port |
| **Konsol** | `figma_get_console_logs` | Retrieve console logs with filters |
| | `figma_watch_console` | Stream logs in real-time |
| | `figma_clear_console` | Clear log buffer |
| **Tasarım Sistemi** | `figma_get_variables` | Extract design tokens/variables |
| | `figma_get_styles` | Get color, text, effect styles |
| | `figma_get_component` | Get component data |
| | `figma_get_component_for_development` | Component + visual reference |
| | `figma_get_component_image` | Just the component image |
| | `figma_get_file_data` | File structure with verbosity control |
| | `figma_get_design_context` | Design context for a node or file |
| **Tasarım Oluşturma** | `figma_execute` | Run Figma Plugin API code |
| | `figma_create_frame` | Create a frame node |
| | `figma_create_text` | Create a text node |
| | `figma_create_rectangle` | Create a rectangle node |
| | `figma_create_group` | Group existing nodes |
| **Değişkenler** | `figma_create_variable_collection` | Create collections with modes |
| | `figma_create_variable` | Create new variables |
| | `figma_update_variable` | Update variable values |
| | `figma_rename_variable` | Rename variables |
| | `figma_delete_variable` | Delete variables |
| | `figma_delete_variable_collection` | Delete collections |
| | `figma_add_mode` | Add modes to collections |
| | `figma_rename_mode` | Rename modes |
| | `figma_refresh_variables` | Refresh variables from file |
| | `figma_batch_create_variables` | Batch create variables |
| | `figma_batch_update_variables` | Batch update variables |
| | `figma_setup_design_tokens` | Atomically create collection + tokens |
| **Bileşenler** | `figma_search_components` | Search local components |
| | `figma_search_assets` | Search published library assets |
| | `figma_instantiate_component` | Create component instance |
| | `figma_arrange_component_set` | Combine into component set |
| | `figma_set_instance_properties` | Set instance properties |
| | `figma_set_description` | Set component description |
| **Design–Code Parity** | `figma_check_design_parity` | Compare Figma vs code tokens |
| **Token Browser** | `figma_get_token_browser` | Hierarchical variables + styles browse |
| **Export / Görsel** | `figma_capture_screenshot` | Capture node screenshot |
| | `figma_export_nodes` | Export nodes as SVG/PNG/JPG/PDF |
| **REST API** | `figma_rest_api` | Call Figma REST API directly |
| | `figma_set_rest_token` | Set REST API token |
| | `figma_get_rest_token_status` | Check REST token status |
| | `figma_clear_rest_token` | Clear REST token |

---

## Bağlantı & Durum Araçları

### `figma_get_status`

Plugin bridge bağlantı durumunu kontrol eder: plugin’in WebSocket ile bağlı olup olmadığını ve veri alınıp alınamayacağını gösterir.

**Usage:**
```javascript
figma_get_status()
```

**Returns:**
- Plugin bridge bağlantısı (port 5454), plugin "ready" durumu, mevcut dosya bilgisi
- Bağlı dosya sayısı

**Example Response:**
```json
{
  "mode": "local",
  "pluginBridge": "connected",
  "message": "Plugin connected via WebSocket"
}
```

**Best Practice:**
- Önce bu aracı çağırın; plugin bridge bağlantı durumunu görün.
- Figma’yı normal açın, F-MCP ATezer Bridge plugin’ini çalıştırın; `figma_get_status` bridge bağlantısını doğrular.

---

## 📋 Console Tools (Plugin Debugging)

### `figma_get_console_logs`

> **Plugin geliştiriciler için:** Bu araç hemen çalışır — navigasyon gerekmez!
> Log'ları kontrol edin, plugin'inizi Figma Desktop'ta çalıştırın, tekrar kontrol edin. Tüm `[Main]`, `[Swapper]` vb. plugin log'ları anında görünür.

Retrieve console logs with filters.

**Usage:**
```javascript
figma_get_console_logs({
  count: 50,           // Number of logs to retrieve (default: 100)
  level: 'error',      // Filter by level: 'log', 'info', 'warn', 'error', 'debug', 'all'
  since: 1234567890    // Unix timestamp (ms) - only logs after this time
})
```

**Parameters:**
- `count` (optional): Number of recent logs to retrieve (default: 100)
- `level` (optional): Filter by log level (default: 'all')
- `since` (optional): Unix timestamp in milliseconds - only logs after this time

**Returns:**
- Array of console log entries with:
  - `timestamp`: Unix timestamp (ms)
  - `level`: 'log', 'info', 'warn', 'error', 'debug'
  - `message`: The log message
  - `args`: Additional arguments passed to console method
  - `stackTrace`: Stack trace (for errors)

**Example:**
```javascript
// Get last 20 error logs
figma_get_console_logs({ count: 20, level: 'error' })

// Get all logs from last 30 seconds
const thirtySecondsAgo = Date.now() - (30 * 1000);
figma_get_console_logs({ since: thirtySecondsAgo })
```

---

### `figma_watch_console`

Stream console logs in real-time for a specified duration.

**Usage:**
```javascript
figma_watch_console({
  duration: 30,        // Watch for 30 seconds (default: 30, max: 300)
  level: 'all'         // Filter by level (default: 'all')
})
```

**Parameters:**
- `duration` (optional): How long to watch in seconds (default: 30, max: 300)
- `level` (optional): Filter by log level (default: 'all')

**Returns:**
- Real-time stream of console logs captured during the watch period
- Summary of total logs captured by level

**Use case:** Perfect for monitoring console output while you test your plugin manually.

---

### `figma_clear_console`

Clear the console log buffer.

**Usage:**
```javascript
figma_clear_console()
```

**Returns:**
- Confirmation of buffer cleared
- Number of logs that were cleared

---

## Tasarım Sistemi Araçları

> **Token gerekmez.** Plugin açık ve MCP’ye bağlı olsun; variables, components, file data plugin üzerinden alınır. Opsiyonel olarak `figma_set_rest_token` ile REST API token ayarlanabilir.

### `figma_get_variables`

Extract design tokens/variables from a Figma file.

**Usage:**
```javascript
figma_get_variables({
  fileUrl: 'https://figma.com/design/abc123',
  includePublished: true,                        // Include published library variables
  enrich: true,                                  // Add CSS/Tailwind exports
  export_formats: ['css', 'tailwind', 'sass'],   // Export formats
  include_usage: true,                           // Show where variables are used
  include_dependencies: true                     // Show variable dependencies
})
```

**Parameters:**
- `fileUrl` (optional): Figma file URL (uses current if navigated)
- `includePublished` (optional): Include published variables (default: true)
- `enrich` (optional): Add exports and usage analysis (default: false)
- `export_formats` (optional): Code formats to generate
- `include_usage` (optional): Include usage in styles/components
- `include_dependencies` (optional): Include dependency graph

**Returns:**
- Variable collections
- Variables with modes and values
- Summary statistics
- Export code (if `enrich: true`)
- Usage information (if `include_usage: true`)

**Note:** Figma Variables API requires Enterprise plan. If unavailable, the tool automatically falls back to Styles API or console-based extraction.

---

### `figma_get_styles`

Get all styles (color, text, effects) from a Figma file.

**Usage:**
```javascript
figma_get_styles({
  fileUrl: 'https://figma.com/design/abc123',
  enrich: true,                                  // Add code exports
  export_formats: ['css', 'tailwind'],           // Export formats
  include_usage: true,                           // Show component usage
  include_exports: true                          // Include code examples
})
```

**Parameters:**
- `fileUrl` (optional): Figma file URL
- `enrich` (optional): Add exports and usage (default: false)
- `export_formats` (optional): Code formats to generate
- `include_usage` (optional): Show where styles are used
- `include_exports` (optional): Include code examples

**Returns:**
- All styles (color, text, effect, grid)
- Style metadata and properties
- Export code (if `enrich: true`)
- Usage information (if requested)

---

### `figma_get_component`

Get component data in two export formats: metadata (default) or reconstruction specification.

**Usage:**
```javascript
// Metadata format (default) - for documentation and style guides
figma_get_component({
  fileUrl: 'https://figma.com/design/abc123',
  nodeId: '123:456',
  format: 'metadata',  // or omit for default
  enrich: true         // Add token coverage analysis
})

// Reconstruction format - for programmatic component creation
figma_get_component({
  fileUrl: 'https://figma.com/design/abc123',
  nodeId: '123:456',
  format: 'reconstruction'  // Compatible with Figma Component Reconstructor plugin
})
```

**Parameters:**
- `fileUrl` (optional): Figma file URL
- `nodeId` (required): Component node ID (e.g., '123:456')
- `format` (optional): Export format - `'metadata'` (default) or `'reconstruction'`
- `enrich` (optional): Add quality metrics (default: false, only for metadata format)

**Export Formats:**

**Metadata Format** (default):
- Component metadata and documentation
- Properties and variants
- Bounds and layout info
- Token coverage (if `enrich: true`)
- Use for: Documentation, style guides, design system references

**Reconstruction Format**:
- Complete node tree specification
- All visual properties (fills, strokes, effects)
- Layout properties (auto-layout, padding, spacing)
- Text properties with font information
- Color values in 0-1 normalized RGB format
- Validation of spec against plugin requirements
- Use for: Programmatic component creation, version control, component migration
- Compatible with: Figma Component Reconstructor plugin

---

### `figma_get_component_for_development`

Get component data optimized for UI implementation, with visual reference.

**Usage:**
```javascript
figma_get_component_for_development({
  fileUrl: 'https://figma.com/design/abc123',
  nodeId: '695:313',
  includeImage: true   // Include rendered image (default: true)
})
```

**Parameters:**
- `fileUrl` (optional): Figma file URL
- `nodeId` (required): Component node ID
- `includeImage` (optional): Include rendered image (default: true)

**Returns:**
- Component image (rendered at 2x scale)
- Filtered component data with:
  - Layout properties (auto-layout, padding, spacing)
  - Visual properties (fills, strokes, effects)
  - Typography
  - Component properties and variants
  - Bounds and positioning

**Excludes:** Plugin data, document metadata (optimized for UI implementation)

---

### `figma_get_component_image`

Render a component as an image only.

**Usage:**
```javascript
figma_get_component_image({
  fileUrl: 'https://figma.com/design/abc123',
  nodeId: '695:313',
  scale: 2,              // Image scale (0.01-4, default: 2)
  format: 'png'          // 'png', 'jpg', 'svg', 'pdf'
})
```

**Parameters:**
- `fileUrl` (optional): Figma file URL
- `nodeId` (required): Node ID to render
- `scale` (optional): Scale factor (default: 2)
- `format` (optional): Image format (default: 'png')

**Returns:**
- Image URL (expires after 30 days)
- Image metadata

---

### `figma_get_file_data`

Get file structure with verbosity control.

**Usage:**
```javascript
figma_get_file_data({
  fileUrl: 'https://figma.com/design/abc123',
  depth: 2,                  // Levels of children (0-3, default: 1)
  verbosity: 'standard',     // 'summary', 'standard', 'full'
  nodeIds: ['123:456'],      // Specific nodes only (optional)
  enrich: true               // Add file statistics and health metrics
})
```

**Parameters:**
- `fileUrl` (optional): Figma file URL
- `depth` (optional): Depth of children tree (max: 3)
- `verbosity` (optional): Data detail level
  - `'summary'`: IDs, names, types only (~90% smaller)
  - `'standard'`: Essential properties (~50% smaller)
  - `'full'`: Everything
- `nodeIds` (optional): Retrieve specific nodes only
- `enrich` (optional): Add statistics and metrics

**Returns:**
- File metadata
- Document tree (filtered by verbosity)
- Component/style counts
- Statistics (if `enrich: true`)

---

## Tool Comparison

### When to Use Each Tool

**For Component Development:**
- `figma_get_component_for_development` - Best for implementing UI components (includes image + layout data)
- `figma_get_component_image` - Just need a visual reference
- `figma_get_component` - Need full component metadata

**For Plugin Development:**
- `figma_get_console_logs` - Debug plugin code
- `figma_watch_console` - Monitor plugin execution

**For Design System Extraction:**
- `figma_get_variables` - Design tokens with code exports
- `figma_get_styles` - Traditional styles with code exports
- `figma_get_file_data` - Full file structure with verbosity control

**For Debugging:**
- `figma_get_console_logs` - Retrieve specific logs
- `figma_watch_console` - Live monitoring
- `figma_capture_screenshot` - Visual debugging
- `figma_get_status` - Check connection health

---

---

## Tasarım Oluşturma Araçları

> **F-MCP ATezer Bridge Plugin gerektirir**: Bu araçlar Figma'da F-MCP ATezer Bridge plugin'i çalışırken kullanılır.

### `figma_execute`

**The Power Tool** - Execute any Figma Plugin API code to create designs, modify elements, or perform complex operations.

**When to Use:**
- Creating UI components (buttons, cards, modals, notifications)
- Building frames with auto-layout
- Adding text with specific fonts and styles
- Creating shapes (rectangles, ellipses, vectors)
- Applying effects, fills, and strokes
- Creating pages or organizing layers
- Any operation that requires the full Figma Plugin API

**Usage:**
```javascript
figma_execute({
  code: `
    // Create a button component
    const button = figma.createFrame();
    button.name = "Button";
    button.resize(120, 40);
    button.cornerRadius = 8;
    button.fills = [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96 } }];

    // Add auto-layout
    button.layoutMode = "HORIZONTAL";
    button.primaryAxisAlignItems = "CENTER";
    button.counterAxisAlignItems = "CENTER";

    // Add text
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    const text = figma.createText();
    text.characters = "Click me";
    text.fontName = { family: "Inter", style: "Medium" };
    text.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    button.appendChild(text);

    // Position and select
    button.x = figma.viewport.center.x;
    button.y = figma.viewport.center.y;
    figma.currentPage.selection = [button];

    return { nodeId: button.id, name: button.name };
  `,
  timeout: 10000  // Optional: max execution time in ms (default: 5000)
})
```

**Parameters:**
- `code` (required): JavaScript code to execute. Has access to `figma` global object.
- `timeout` (optional): Execution timeout in ms (default: 5000, max: 30000)

**Returns:**
- Whatever the code returns (use `return` statement)
- Execution success/failure status

**Best Practices:**
1. **Always use `await` for async operations** (loadFontAsync, getNodeByIdAsync)
2. **Return useful data** (node IDs, names) for follow-up operations
3. **Position elements** relative to viewport center for visibility
4. **Select created elements** so users can see them immediately
5. **Use try/catch** for error handling in complex operations

**Common Patterns:**

```javascript
// Create a page
const page = figma.createPage();
page.name = "My New Page";
await figma.setCurrentPageAsync(page);

// Find and modify existing node
const node = await figma.getNodeByIdAsync("123:456");
node.name = "New Name";

// Create component from frame
const component = figma.createComponent();
// ... add children

// Apply auto-layout
frame.layoutMode = "VERTICAL";
frame.itemSpacing = 8;
frame.paddingTop = 16;
frame.paddingBottom = 16;
frame.paddingLeft = 16;
frame.paddingRight = 16;
```

---

## Değişken Yönetimi Araçları

> **F-MCP ATezer Bridge Plugin gerektirir**: Bu araçlar Figma'da F-MCP ATezer Bridge plugin'i çalışırken kullanılır.

### `figma_create_variable_collection`

Create a new variable collection with optional modes.

**When to Use:**
- Setting up a new design system
- Creating themed variable sets (colors, spacing, typography)
- Organizing variables into logical groups

**Usage:**
```javascript
figma_create_variable_collection({
  name: "Brand Colors",
  initialModeName: "Light",        // Optional: rename default mode
  additionalModes: ["Dark", "High Contrast"]  // Optional: add more modes
})
```

**Parameters:**
- `name` (required): Collection name
- `initialModeName` (optional): Name for the default mode (otherwise "Mode 1")
- `additionalModes` (optional): Array of additional mode names to create

**Returns:**
- Created collection with ID, name, modes, and mode IDs

---

### `figma_create_variable`

Create a new variable in a collection.

**When to Use:**
- Adding design tokens to your system
- Creating colors, spacing values, text strings, or boolean flags
- Setting up multi-mode variable values

**Usage:**
```javascript
figma_create_variable({
  name: "colors/primary/500",
  collectionId: "VariableCollectionId:123:456",
  resolvedType: "COLOR",
  valuesByMode: {
    "1:0": "#3B82F6",    // Light mode
    "1:1": "#60A5FA"     // Dark mode
  },
  description: "Primary brand color",  // Optional
  scopes: ["ALL_FILLS"]                 // Optional
})
```

**Parameters:**
- `name` (required): Variable name (use `/` for grouping)
- `collectionId` (required): Target collection ID
- `resolvedType` (required): `"COLOR"`, `"FLOAT"`, `"STRING"`, or `"BOOLEAN"`
- `valuesByMode` (optional): Object mapping mode IDs to values
- `description` (optional): Variable description
- `scopes` (optional): Where variable can be applied

**Value Formats:**
- **COLOR**: Hex string `"#FF0000"` or `"#FF0000FF"` (with alpha)
- **FLOAT**: Number `16` or `1.5`
- **STRING**: Text `"Hello World"`
- **BOOLEAN**: `true` or `false`

---

### `figma_update_variable`

Update a variable's value in a specific mode.

**When to Use:**
- Changing existing token values
- Updating theme-specific values
- Modifying design system tokens

**Usage:**
```javascript
figma_update_variable({
  variableId: "VariableID:123:456",
  modeId: "1:0",
  value: "#10B981"  // New color value
})
```

**Parameters:**
- `variableId` (required): Variable ID to update
- `modeId` (required): Mode ID to update value in
- `value` (required): New value (format depends on variable type)

---

### `figma_rename_variable`

Rename a variable while preserving all its values.

**When to Use:**
- Reorganizing variable naming conventions
- Fixing typos in variable names
- Moving variables to different groups

**Usage:**
```javascript
figma_rename_variable({
  variableId: "VariableID:123:456",
  newName: "colors/brand/primary"
})
```

**Parameters:**
- `variableId` (required): Variable ID to rename
- `newName` (required): New name (can include `/` for grouping)

---

### `figma_delete_variable`

Delete a variable.

**When to Use:**
- Removing unused tokens
- Cleaning up design system
- Removing deprecated variables

**Usage:**
```javascript
figma_delete_variable({
  variableId: "VariableID:123:456"
})
```

**⚠️ Warning:** This action cannot be undone programmatically. Use Figma's Undo if needed.

---

### `figma_delete_variable_collection`

Delete a collection and ALL its variables.

**When to Use:**
- Removing entire token sets
- Cleaning up unused collections
- Resetting design system sections

**Usage:**
```javascript
figma_delete_variable_collection({
  collectionId: "VariableCollectionId:123:456"
})
```

**⚠️ Warning:** This deletes ALL variables in the collection. Cannot be undone programmatically.

---

### `figma_add_mode`

Add a new mode to an existing collection.

**When to Use:**
- Adding theme variants (Dark mode, High Contrast)
- Adding responsive breakpoints (Mobile, Tablet, Desktop)
- Adding brand variants

**Usage:**
```javascript
figma_add_mode({
  collectionId: "VariableCollectionId:123:456",
  modeName: "Dark"
})
```

**Parameters:**
- `collectionId` (required): Collection to add mode to
- `modeName` (required): Name for the new mode

**Returns:**
- Updated collection with new mode ID

**Note:** Figma has limits on the number of modes per collection (varies by plan).

---

### `figma_rename_mode`

Rename an existing mode in a collection.

**When to Use:**
- Fixing mode names
- Updating naming conventions
- Making mode names more descriptive

**Usage:**
```javascript
figma_rename_mode({
  collectionId: "VariableCollectionId:123:456",
  modeId: "1:0",
  newName: "Light Theme"
})
```

**Parameters:**
- `collectionId` (required): Collection containing the mode
- `modeId` (required): Mode ID to rename
- `newName` (required): New name for the mode

---

## AI Decision Guide: Which Tool to Use?

### For Design Creation

| Task | Tool | Example |
|------|------|---------|
| Create UI components | `figma_execute` | Buttons, cards, modals |
| Create frames/layouts | `figma_execute` | Auto-layout containers |
| Add text | `figma_execute` | Labels, headings, paragraphs |
| Create shapes | `figma_execute` | Icons, decorations |
| Modify existing elements | `figma_execute` | Change colors, resize |
| Create pages | `figma_execute` | Organize file structure |

### For Variable Management

| Task | Tool |
|------|------|
| Create new token collection | `figma_create_variable_collection` |
| Add design tokens | `figma_create_variable` |
| Change token values | `figma_update_variable` |
| Reorganize token names | `figma_rename_variable` |
| Remove tokens | `figma_delete_variable` |
| Add themes (Light/Dark) | `figma_add_mode` |
| Rename themes | `figma_rename_mode` |

### Ön Koşullar

Araçları kullanmadan önce:
1. **F-MCP ATezer Bridge plugin** Figma’da çalışıyor olmalı (Plugins → Development → F-MCP ATezer Bridge)
2. Plugin, MCP sunucusuna WebSocket (port 5454) ile bağlı olmalı: `figma_get_status` bağlantıyı doğrular

---

## Error Handling

All tools return structured error responses:

```json
{
  "error": "Error message",
  "message": "Human-readable description",
  "hint": "Suggestion for resolution"
}
```

Common errors:
- `"FIGMA_ACCESS_TOKEN not configured"` - Token zorunlu değildir. REST API kullanmak istiyorsanız `figma_set_rest_token` ile ayarlayın.
- `"Invalid Figma URL"` - Check URL format
- `"Node not found"` - Verify node ID is correct
- `"F-MCP ATezer Bridge plugin not found"` - Ensure plugin is running in Figma
- `"Invalid hex color"` - Check hex format (use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA)

See [Troubleshooting Guide](TROUBLESHOOTING.md) for detailed solutions.
