# F-MCP ATezer Bridge

A Figma plugin that bridges the Variables API and Component descriptions to MCP (Model Context Protocol) clients without requiring an Enterprise plan.

## Overview

This plugin enables AI assistants like Claude Code and Claude Desktop to access your Figma variables AND component descriptions through the MCP protocol. It bypasses both Figma's plugin sandbox restrictions and the REST API's component description bug.

## Architecture

**For Variables (pre-loaded):**
```
Figma Plugin Worker → postMessage → Plugin UI Iframe → window object → Puppeteer → MCP Server
```

**For Components (on-demand):**
```
MCP Request → Plugin UI → postMessage → Plugin Worker → figma.getNodeByIdAsync() → Returns with description
```

**Key Features:**
- ✅ No Enterprise plan required for variables
- ✅ Access all local variables and collections
- ✅ Reliable component descriptions (bypasses REST API bug)
- ✅ Supports multiple variable modes
- ✅ On-demand component data retrieval
- ✅ Persistent connection (stays open until closed)
- ✅ Clean, minimal UI
- ✅ Real-time data updates

### Design Mode vs Dev Mode (no design seat required)

The plugin runs in **both** Figma Design and Dev Mode (`"editorType": ["figma", "dev"]` in manifest). **You do not need a design seat** to use it with MCP.

| | Design mode | Dev mode (no design seat) |
|--|-------------|---------------------------|
| **MCP connection** | ✅ Works | ✅ Works |
| **Read** (variables, components, logs, screenshot) | ✅ Works | ✅ Works |
| **Write** (variable update, create nodes, `figma_execute` that edits doc) | ✅ Works | ⚠️ May be restricted by Figma (Dev Mode is read-only for document edits) |

So: Design vs Dev mode does **not** block MCP. Users with only Dev Mode access can run the plugin and use all read-only MCP tools.

### Plugin Bridge (no Figma debug port)

You can use MCP **without** launching Figma with a debug port. When the plugin runs, it connects to the MCP server over WebSocket (`ws://127.0.0.1:5454`). No `--remote-debugging-port=9222` needed.

1. Start Claude (or your MCP client) so the MCP server is running (it starts the bridge server on port 5454).
2. Open Figma **normally** (no special launch args).
3. Run the **F-MCP ATezer Bridge** plugin (Plugins → Development → F-MCP ATezer Bridge).
4. The plugin connects to the MCP server automatically; status shows "ready" when connected.

Port is configurable via `FIGMA_PLUGIN_BRIDGE_PORT` or config `local.pluginBridgePort` (default 5454).

### Plugin-only mode (recommended: no REST API, no token)

You can run **without** the full MCP server (figma-mcp-bridge) and **without** any Figma REST API token:

1. Use the **plugin-only MCP relay**: `node dist/local-plugin-only.js` (or add it to Claude as the only MCP server).
2. All data comes from the plugin: variables, file structure, components, styles, execute, screenshot. No `FIGMA_ACCESS_TOKEN` needed.
3. Token use is minimized: tools default to `verbosity=summary` and compact responses.
4. Claude config: point `args` to `.../f-mcp-bridge/dist/local-plugin-only.js` and you only need the plugin running in Figma.

## Installation

### Quick Install (Recommended)

1. **Open Figma Desktop**
2. **Go to Plugins → Development → Import plugin from manifest...**
3. **Navigate to:** `/path/to/f-mcp-bridge/f-mcp-plugin/manifest.json`
4. **Click "Open"**

The plugin will appear in your Development plugins list as "F-MCP ATezer Bridge".

### Manual Installation

Alternatively, you can install from the plugin directory:

```bash
# From the project root (f-mcp-bridge)
cd f-mcp-plugin

# Figma will use these files:
# - manifest.json (plugin configuration)
# - code.js (plugin worker logic)
# - ui.html (plugin UI interface)
```

## Usage

### Running the Plugin

1. **Open your Figma file** with variables and/or components
2. **Run the plugin:** Right-click → Plugins → Development → F-MCP ATezer Bridge
3. **Wait for confirmation:** Plugin UI will show "✓ F-MCP ATezer Bridge active"

The plugin will:
- Fetch all local variables and collections on startup
- Display counts in the UI (e.g., "Variables: 404 in 2 collections")
- Store variables in `window.__figmaVariablesData`
- Provide on-demand component data via `window.requestComponentData(nodeId)`
- Keep running until manually closed

### Connecting Claude App (plugin-only, no token)

1. **Build** (once): `cd f-mcp-bridge && npm run build:local`
2. **Claude config** (macOS): `~/Library/Application Support/Claude/claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "figma": {
         "command": "node",
         "args": ["/ABSOLUTE/PATH/TO/f-mcp-bridge/dist/local-plugin-only.js"]
       }
     }
   }
   ```
3. **Restart Claude.** Then open Figma, run **Plugins → Development → F-MCP ATezer Bridge**. When the plugin shows "ready", ask Claude e.g. "Figma'daki variable'ları listele" or "design system özetini ver".

No Figma REST API token or debug port required.

### Accessing Data via MCP

Once the plugin is running, MCP clients can access both variables and components:

**Variables (pre-loaded):**
```typescript
// From Claude Code or Claude Desktop
figma_get_variables({
  format: "summary"  // or "filtered" or "full"
})
```

**Components (on-demand):**
```typescript
// Request component with description
figma_get_component({
  fileUrl: "https://figma.com/design/YOUR_FILE_KEY",
  nodeId: "279:2861"
})
```

**Important:** Keep the plugin running while querying. Variables are pre-loaded, but component data is fetched on-demand when requested.

## How It Works

### Plugin Worker (code.js)

**On Startup (Variables):**
1. Uses Figma's Variables API to fetch all local variables
2. Formats data with full mode values
3. Sends to UI via `postMessage`

**On Request (Components):**
1. Listens for component requests via `figma.ui.onmessage`
2. Uses `figma.getNodeByIdAsync(nodeId)` to fetch component
3. Extracts description, descriptionMarkdown, and metadata
4. Sends response back to UI via `postMessage` with requestId

### Plugin UI (ui.html)

**Variables Flow:**
1. Listens for `VARIABLES_DATA` message from worker
2. Stores data on `window.__figmaVariablesData`
3. Sets `window.__figmaVariablesReady = true`
4. Displays status to user

**Components Flow:**
1. Exposes `window.requestComponentData(nodeId)` function
2. Returns a Promise that resolves when worker responds
3. Sends request to worker via `parent.postMessage()`
4. Resolves promise when `COMPONENT_DATA` message received
5. Includes 10-second timeout and error handling

### MCP connection: WebSocket (default) or CDP

**WebSocket (plugin-only, no debug port):**
1. Plugin UI connects to MCP server at `ws://127.0.0.1:5454`
2. MCP sends RPCs (getVariables, getComponent, execute, etc.) over the WebSocket
3. No Figma debug port or token required

**CDP (optional, for console logs):**
1. When using `local.js` and Figma started with `--remote-debugging-port=9222`, MCP can connect via Puppeteer
2. Enumerates plugin UI iframes and reads `window.__figmaVariablesData` / calls `window.requestComponentData(nodeId)`
3. Returns variables and component data to MCP tools

## Troubleshooting

### Plugin doesn't appear in menu
- Make sure Figma Desktop is running (not browser)
- Check that manifest.json path is correct
- Try **Plugins → Development → Refresh plugin list**

### "No plugin UI found with variables data" or "No plugin UI found with requestComponentData"
- Ensure plugin is running (check for open plugin window showing "✓ F-MCP ATezer Bridge active" or "ready")
- Try closing and reopening the plugin
- **Plugin-only (WebSocket):** Ensure MCP server is running and nothing else is using port 5454; open Figma normally (debug port not required)
- **CDP mode:** If using debug port, verify Figma was launched with `--remote-debugging-port=9222`

### Variables not updating
- Close and reopen the plugin to refresh data
- Use `refreshCache: true` parameter in MCP call
- Check that you're viewing the correct Figma file

### Component descriptions are empty or missing
- **First, verify in Figma:** Check if the component actually has a description set
- If using REST API fallback (not F-MCP ATezer Bridge), descriptions may be missing due to known Figma API bug
- Ensure the plugin is running - component data requires active plugin connection
- Check that the nodeId is correct (format: "123:456")

### Component request times out
- Ensure plugin is running and shows "F-MCP ATezer Bridge active"
- Check that the component exists in the current file
- Verify nodeId format is correct
- Timeout is set to 10 seconds - complex files may take longer

### Empty or outdated data
- Plugin fetches variables on load - rerun plugin after making variable changes
- Component data is fetched on-demand - always returns current state
- Cache TTL is 5 minutes for variables - use `refreshCache: true` for immediate updates
- Ensure you're in the correct file (plugin reads current file's data)

## Development

### File Structure
```
f-mcp-plugin/
├── manifest.json    # Plugin configuration
├── code.js          # Plugin worker (accesses Figma API)
├── ui.html          # Plugin UI (stores/requests data for MCP access)
└── README.md        # This file
```

### Console Logging

The plugin logs to Figma's console:

**Variables (startup):**
```
🌉 [F-MCP ATezer Bridge] Plugin loaded and ready
🌉 [F-MCP ATezer Bridge] Fetching variables...
🌉 [F-MCP ATezer Bridge] Found 404 variables in 2 collections
🌉 [F-MCP ATezer Bridge] Variables data sent to UI successfully
🌉 [F-MCP ATezer Bridge] UI iframe now has variables data accessible via window.__figmaVariablesData
```

**Components (on-demand):**
```
🌉 [F-MCP ATezer Bridge] Fetching component: 279:2861
🌉 [F-MCP ATezer Bridge] Component data ready. Has description: true
```

**Ready state:**
```
🌉 [F-MCP ATezer Bridge] Ready to handle component requests
🌉 [F-MCP ATezer Bridge] Plugin will stay open until manually closed
```

View logs: **Plugins → Development → Open Console** (Cmd+Option+I on Mac)

## Security

- Plugin requires **no network access** (allowedDomains: ["none"])
- Data never leaves Figma Desktop
- Uses standard Figma Plugin API (no unofficial APIs)
- Variable and component **read** via MCP; **write** (variable CRUD, `figma_execute`) available when using the plugin bridge
- Component requests are scoped to current file only

## Why F-MCP ATezer Bridge for Components?

Figma's REST API has a known bug where component `description` and `descriptionMarkdown` fields are often missing or outdated. This is particularly problematic for:

- **Local project components** (not published to team libraries)
- **Unpublished components** in active development
- **Team collaboration** where descriptions contain important usage guidelines

The F-MCP ATezer Bridge plugin bypasses this limitation by using the Figma Plugin API (`figma.getNodeByIdAsync()`), which has reliable, real-time access to all component fields including descriptions. This makes it ideal for teams working with local components in shared project files.

## License

Part of the F-MCP ATezer (figma-mcp-bridge) project.
