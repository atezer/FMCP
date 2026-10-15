# F-MCP ATezer (Figma MCP Bridge) — Setup Guide

F-MCP runs **locally**: an MCP server (`dist/local-plugin-only.js`) talks to the **F-MCP ATezer Bridge** Figma plugin over a WebSocket on `127.0.0.1` (ports 5454–5470). No Figma REST token, no debug port and no Enterprise plan are needed.

> Turkish step-by-step guide: [KURULUM.md](../KURULUM.md). Problems: [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Prerequisites

- Node.js 18+
- Figma Desktop (or Figma in the browser)
- Git

## 1. Install and build

```bash
git clone https://github.com/atezer/FMCP.git
cd FMCP
npm install
npm run build
```

## 2. Configure your MCP client

All clients start the same server. Use the **absolute path** to `dist/local-plugin-only.js` (forward slashes, also on Windows).

**Claude Code** — copy the template in the repo root and adjust if needed:

```bash
cp .mcp.json.example .mcp.json
```

`.mcp.json` is git-ignored, so machine-specific paths (e.g. a custom `node` binary) never end up in the repo.

**Claude Desktop** — `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "node",
      "args": ["/absolute/path/to/FMCP/dist/local-plugin-only.js"]
    }
  }
}
```

**Cursor** — same block in `.cursor/mcp.json`. Ready-made templates: [`install/`](../install/).

## 3. Import and run the plugin

1. Figma → **Plugins → Development → Import plugin from manifest…** → `f-mcp-plugin/manifest.json`
2. Open the file you want to work on and run **F-MCP ATezer Bridge**.
3. **Pair once (v1.11.0+).** The plugin says "eşleştirme gerekli" (pairing required) on first run. Copy the code and paste it into the plugin: **Advanced → Eşleştirme → Kaydet**. Wait for "Bridge active".
   ```bash
   cat ~/.config/fmcp/pairing          # Windows: type %USERPROFILE%\.config\fmcp\pairing
   node dist/local-plugin-only.js --print-pairing   # creates the code if it does not exist yet
   ```
   The code is created on the first start (file mode 0600) and is shared by every bridge on this machine (all ports, Node and Python). The plugin stores it; you enter it once.
4. Restart your MCP client and ask: *"Check Figma status"*.

## Bridge security: two layers, two switches

| Layer | What it stops | Switch (escape hatch only) |
|---|---|---|
| Origin check on the WebSocket upgrade | Ordinary web pages (`https://…`). A page can still send `Origin: null` from a sandboxed iframe, so this is the first line only. | `FMCP_BRIDGE_ALLOW_ANY_ORIGIN=1` |
| Pairing code in the plugin's `ready` handshake | Anything that does not know the code: it is never registered, receives no request, cannot set the REST token and is closed after 10 s. | `FMCP_PAIRING=off` |

Each switch relaxes only its own layer, and the bridge prints a warning on every start while one is set. `/shutdown` (used between bridge instances) always needs the pairing code in `X-FMCP-Pairing` and refuses any request that carries an `Origin`; CORS headers are never sent. `FMCP_PAIRING=off` exists for one case: a plugin that cannot be updated yet. Remove it once the plugin is updated.

## Several files open

The plugin can be running in several files at once; each one connects separately.

- Read tools without a target use the most recently connected file.
- **Write tools need a target when more than one file is connected** — pass `fileKey` (or `figmaUrl`). Otherwise they return `TARGET_REQUIRED` with the list of connected files. `figma_list_connected_files` shows them.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `FIGMA_PLUGIN_BRIDGE_PORT` | `5454` | Preferred bridge port (5454–5470; the next free one is used if busy) |
| `FIGMA_BRIDGE_HOST` | `127.0.0.1` | Bind address. `0.0.0.0` exposes the bridge to your network — avoid |
| `FIGMA_MCP_AUDIT_LOG_PATH` | — | Write an audit log of tool calls |
| `FMCP_REQUIRE_TARGET` | on | `0` disables the "write needs a target when several files are open" rule |
| `FMCP_POST_SCAN_MODE` | `warn` | `block` makes post-execute DS violations blocking |
| `FMCP_BRIDGE_ALLOW_ANY_ORIGIN` | off | `1` disables the WebSocket origin check (escape hatch only; pairing still applies) |
| `FMCP_PAIRING` | on | `off` (or `0`/`false`) accepts plugins without the pairing code — transition only, see above |
| `FMCP_PAIRING_FILE` | `~/.config/fmcp/pairing` | Where the pairing code lives (all bridges on the machine must read the same file) |
| `FIGMA_REST_TOKEN` | — | Optional; only for the REST tools (`figma_rest_api`, version history) |

## Troubleshooting (short)

- **Plugin shows "no server"** — the MCP client isn't running the server. Check the path in your config and that `dist/local-plugin-only.js` exists (`npm run build`).
- **"Module not found"** — run `npm install` and `npm run build` again.
- **Port busy** — the server automatically moves to the next free port (up to 5470) and the plugin scans the whole range.

More: [TROUBLESHOOTING.md](TROUBLESHOOTING.md) · tool reference: [TOOLS.md](TOOLS.md) · examples: [USE_CASES.md](USE_CASES.md)
