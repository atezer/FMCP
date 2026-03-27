# F-MCP ATezer (Figma MCP Bridge) - Setup Guide

Complete setup instructions for connecting F-MCP ATezer to various AI clients (Claude Desktop, Cursor, Windsurf, etc.).

> **Quick Start:** For most users, we recommend [Remote Mode](#remote-mode-setup-recommended) with the UI-based setup method - just paste a URL, no config files needed.

---

## 🚀 Remote Mode Setup (Recommended)

### Prerequisites
- None! Just Claude Desktop installed

### Method 1: UI-Based Setup (Recommended)

This is the new, easier way to add MCP servers in Claude Desktop.

**Steps:**

1. **Open Claude Desktop Settings**
   - **macOS:** Claude menu → Settings
   - **Windows:** File menu → Settings

2. **Navigate to Connectors**
   - Click "Connectors" in the left sidebar

3. **Add Custom Connector**
   - Click "Add Custom Connector" button
   - You'll see a dialog with two fields

4. **Enter Connection Details**
   - **Name:** `F-MCP ATezer` (or any name you prefer)
   - **URL:** Your deployment URL + `/sse` (e.g. `https://your-worker.workers.dev/sse`)
   - Click "Add"

5. **Verify Connection**
   - Look for "F-MCP ATezer" in your connectors list
   - Status should show "Connected" or "CUSTOM" badge

**That's it!** ✅

The MCP server is now connected. All 14 Figma tools are available.

---

### Method 2: JSON Config File (Legacy Method)

> **Note:** This method still works but is more complex. Use Method 1 (UI) unless you have a specific reason to edit the config file.

**For advanced users who prefer config file editing:**

1. **Locate config file:**
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. **Edit the file:**
   ```json
   {
     "mcpServers": {
       "figma-mcp-bridge": {
         "command": "npx",
         "args": ["-y", "mcp-remote", "https://your-worker.workers.dev/sse"]
       }
     }
   }
   ```

3. **Save and restart Claude Desktop**

4. **Verify:** Look for 🔌 icon in bottom-right showing "figma-mcp-bridge: connected"

---

## 🔧 Local Mode Setup (Advanced)

Local mode offers two options: **Plugin-only** (no debug port, no token) or **Full local** (optional debug port for console logs).

### Option A: Plugin-Only (recommended – no debug port, no token)

1. **Install and build** (same as below): clone repo, `npm install`, `npm run build:local`.
2. **Configure Claude** with **`dist/local-plugin-only.js`** (no `FIGMA_ACCESS_TOKEN`):
   ```json
   "figma-mcp-bridge": {
     "command": "node",
     "args": ["/absolute/path/to/figma-mcp-bridge/dist/local-plugin-only.js"]
   }
   ```
3. **Open Figma normally** (no special launch). Run **Plugins → Development → F-MCP ATezer Bridge**; wait until the plugin shows "ready" / "Bridge active".
4. Restart Claude; use tools. Data flows via WebSocket (port 5454); **debug port 9222 is not required.**

### Option B: Full Local (optional debug port for console logs)

Use **`dist/local.js`** in config. If you want **console log** tools, restart Figma with the debug flag (see Step 4 below). Otherwise you can still use plugin-only behavior with `local.js` (it will try WebSocket bridge first).

### Prerequisites
- Node.js 18+ installed
- Figma Desktop installed
- Git installed
- Terminal access

### Installation Steps

#### 1. Install the MCP Server

```bash
# Clone the repository
git clone https://github.com/atezer/FMCP.git
cd FMCP

# Install dependencies
npm install

# Build local mode
npm run build:local
```

#### 2. Figma Personal Access Token (optional for plugin-only)

**If using `local-plugin-only.js`:** Token is **not** required; skip to Step 3 and use the plugin-only config above.

**If using `local.js` and REST fallback:** Get a token from https://www.figma.com/developers/api#access-tokens (description e.g. "F-MCP ATezer Local") and add it to `env.FIGMA_ACCESS_TOKEN` in config.

#### 3. Configure Claude Desktop (JSON Method Only)

> **Note:** Local mode uses JSON config; the UI method only works for remote URLs.

1. **Locate config file:**
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2. **Edit the file** – use **`local-plugin-only.js`** (no token) or **`local.js`** (token optional; see Step 2):
   ```json
   {
     "mcpServers": {
       "figma-mcp-bridge-local": {
         "command": "node",
         "args": ["/absolute/path/to/figma-mcp-bridge/dist/local-plugin-only.js"]
       }
     }
   }
   ```
   For full local with optional token/console: use `dist/local.js` and add `"env": { "FIGMA_ACCESS_TOKEN": "figd_..." }` if desired.

   **Important:**
   - Replace `/absolute/path/to/figma-mcp-bridge` with actual absolute path
   - Use forward slashes `/` even on Windows

3. **Save the file**

#### 4. Figma: Normal or with debug port (optional)

**Plugin-only:** Open Figma **normally**; no debug port needed.

**Console log tools:** Restart Figma with the debug flag so MCP can connect via CDP (port 9222):

**macOS:**
```bash
# Quit Figma completely first (Cmd+Q)
# Then run:
open -a "Figma" --args --remote-debugging-port=9222
```

**Windows (CMD or PowerShell):**
```
# Close Figma completely first (Alt+F4)
# Then run:
cmd /c "%LOCALAPPDATA%\Figma\Figma.exe" --remote-debugging-port=9222
```

#### 5. Verify Setup

1. **Plugin-only:** Open Figma, run the plugin; status in Claude should show plugin/bridge connected (no 9222 check).
2. **With debug port:** Open Chrome, visit http://localhost:9222; you should see inspectable Figma pages.
3. **Restart Claude Desktop** (quit completely and relaunch).
4. **Test:** Ask Claude "Check Figma status"; you should see connection OK (plugin bridge or Figma Desktop via 9222).

---

## What You Get With Each Mode

### Remote Mode (UI Setup)
- ✅ **All 14 MCP tools**
- ✅ **OAuth authentication** (automatic, no token needed)
- ✅ **Design system extraction** (variables*, components, styles)
- ✅ **Console logs and screenshots**
- ✅ **Zero maintenance**
- ❌ **No F-MCP ATezer Bridge plugin** (can't access local variables without Enterprise)

*Variables require Figma Enterprise plan

### Local Mode (JSON Setup)
- ✅ **All 14 MCP tools**
- ✅ **F-MCP ATezer Bridge plugin support** (access local variables, no Enterprise needed)
- ✅ **Plugin-only option:** No debug port, no token; plugin connects via WebSocket (5454)
- ✅ **Reliable component descriptions** (bypasses API bugs)
- ✅ **Optional:** Debug port (9222) for console log tools; token optional when using plugin for variables

**See [MODE_COMPARISON.md](MODE_COMPARISON.md) for detailed feature breakdown.**

---

## Troubleshooting

### Remote Mode Issues

**"Connection failed" in UI:**
- ✅ Check internet connection
- ✅ Try removing and re-adding the connector
- ✅ Restart Claude Desktop

**"OAuth authentication required" error:**
- ✅ This is normal for first design system tool use
- ✅ Your browser will open automatically
- ✅ Click "Allow" to authorize

**"Variables API requires Enterprise" error:**
- ✅ Expected if you don't have Enterprise plan
- ✅ Solution: Switch to Local Mode + F-MCP ATezer Bridge plugin
- ✅ See [MODE_COMPARISON.md](MODE_COMPARISON.md) for details

### Local Mode Issues

**"Failed to connect to Figma Desktop" / "Plugin not found":**
- ✅ **Plugin-only:** Use `local-plugin-only.js`; open Figma normally and run the plugin; ensure nothing else uses port 5454.
- ✅ **With console tools:** Verify Figma was restarted with `--remote-debugging-port=9222`; visit http://localhost:9222 in Chrome; if blank, quit Figma and relaunch with debug flag.

**"FIGMA_ACCESS_TOKEN not configured":**
- ✅ When using **plugin-only** (`local-plugin-only.js`), token is **not** required; omit `env.FIGMA_ACCESS_TOKEN`.
- ✅ If using `local.js` and REST fallback, set token in `claude_desktop_config.json` under `env`; verify it starts with `figd_`.

**"Command not found: node":**
- ✅ Install Node.js 18+ from https://nodejs.org
- ✅ Restart terminal/Claude Desktop after install
- ✅ Verify with: `node --version`

**"Module not found" errors:**
- ✅ Run `npm install` in the figma-mcp-bridge directory
- ✅ Run `npm run build:local` again
- ✅ Check that `dist/local.js` file exists

**"Port 9222 already in use":**
- ✅ Kill other Chrome/Figma processes using that port
- ✅ Run: `lsof -i :9222` (macOS) or check Task Manager (Windows)
- ✅ Restart Figma with debug flag

---

## Switching Between Modes

### Remote → Local

1. Remove remote connector from Claude Desktop
2. Follow Local Mode setup steps above
3. Restart Claude Desktop

### Local → Remote

1. Remove local MCP config from `claude_desktop_config.json`
2. Use UI method to add remote connector
3. Restart Claude Desktop

**You can have both configured simultaneously** (with different names like "figma-mcp-bridge-remote" and "figma-mcp-bridge-local"), but be aware they'll both appear in Claude's tool list.

---

## Next Steps

**After connecting:**

1. **Test basic tools:**
   - "Navigate to https://www.figma.com and check status"
   - "Get design variables from [your Figma file URL]"

2. **For Local Mode users - Install F-MCP ATezer Bridge plugin:**
   - See [F-MCP ATezer Bridge README](../f-mcp-plugin/README.md)
   - Enables variables without Enterprise API

3. **Read tool documentation:**
   - See [TOOLS.md](TOOLS.md) for all 14 available tools
   - See [USE_CASES.md](USE_CASES.md) for example workflows

---

## Support

- 📖 [Full Documentation](../README.md)
- 🐛 [Report Issues](https://github.com/atezer/FMCP/issues)
- 💬 [Discussions](https://github.com/atezer/FMCP/discussions)
- 📊 [Mode Comparison](MODE_COMPARISON.md)
