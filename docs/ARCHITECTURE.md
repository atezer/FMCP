# F-MCP ATezer — Architecture

> The pre-v1.4 browser/CDP architecture (Puppeteer, a browser `navigate` tool, debug port 9222) is gone; its description lives in [archived/ARCHITECTURE-legacy.md](archived/ARCHITECTURE-legacy.md).

## Components

```
 AI client (Claude Code / Desktop, Cursor)
        │  MCP over stdio
        ▼
 MCP server ─ dist/local-plugin-only.js  (src/local-plugin-only.ts)
        │  63 figma_* tools · response guard · 60 s read cache · audit log
        │
        │  PluginBridgeServer (src/core/plugin-bridge-server.ts)
        │  HTTP + WebSocket on 127.0.0.1:5454 (→ 5455…5470 if busy)
        ▼
 Figma plugin UI ─ f-mcp-plugin/ui.html   (sandboxed iframe, Origin "null")
        │  postMessage
        ▼
 Figma plugin main ─ f-mcp-plugin/code.js (Figma Plugin API: read / write the document)
```

- **One process per MCP client.** The MCP server and the WebSocket bridge live in the same Node process; the client starts it and it exits when the client disconnects (stdin/transport close).
- **No Figma REST token needed.** All document access goes through the Plugin API. The optional REST token (`figma_set_rest_token` / `FIGMA_REST_TOKEN`) is only for `figma_rest_api` and version history, and is only ever sent to `https://api.figma.com`.

## Request flow

1. A tool handler builds a connector: `getConnector(bridge, fileKey, { mutating })`.
2. `PluginBridgeServer.request()` picks the client for that `fileKey`, sends `{ id, method, params }` over its WebSocket and waits (120 s).
3. `ui.html` maps the method to a plugin command and posts it to `code.js`; the result comes back the same way and is matched by `id` — only the client the request was sent to may answer.
4. The handler shapes the result; large payloads pass through the **response guard** (80 KB budget: node trees are pruned, everything else truncated progressively, always with a `_truncated` marker).

## Multiple files and routing

Each Figma file running the plugin is a separate client, identified by the `fileKey` it sends in its `ready` handshake.

- `fileKey` / `figmaUrl` route a call to that file; an unknown `fileKey` is an error (no fallback).
- Without a target, reads use the most recently connected file. **Writes** (including `figma_execute` code that mutates — see `src/core/mutation-detect.ts`) fail with `TARGET_REQUIRED` when more than one file is connected.

## Several MCP clients on one machine

Each client's server binds its own port in 5454–5470. On startup a server probes busy ports via `GET /status`:

- a port with connected plugins is left alone,
- a bridge idle (0 clients) for ≥ 30 s is asked to move via `POST /shutdown` (it rebinds elsewhere rather than dying),
- anything else is skipped.

Servers announce each other (`activeBridges`), and the plugin keeps a connection to each one, so every client can reach every open file.

## Security model

- Bridge binds to `127.0.0.1` only (unless `FIGMA_BRIDGE_HOST` is changed).
- WebSocket connections are accepted only from the Figma plugin (`Origin: null`), non-browser clients and `*.figma.com`; web pages are refused. `/shutdown` refuses any browser request; no CORS headers are sent.
- REST token and plugin data stay in memory; nothing is written to disk except the optional audit log (`FIGMA_MCP_AUDIT_LOG_PATH`).
- `figma_execute` runs arbitrary Plugin API code by design — it is the tool's purpose. It is never re-sent automatically once delivered (`EXECUTION_STATE_UNKNOWN`), so a dropped connection can't apply a change twice.

## Source map

| Path | Role |
|---|---|
| `src/local-plugin-only.ts` | MCP server entry, all tool definitions |
| `src/core/plugin-bridge-server.ts` | WebSocket bridge, routing, port strategy |
| `src/core/plugin-bridge-connector.ts` | Typed request helpers per plugin command |
| `src/core/response-guard.ts`, `response-cache.ts` | Response size protection, read cache |
| `src/core/contract-extractor.ts` | `figma_extract_contract` scripts + assembly |
| `src/core/embedded-skills.ts` | Generated — skill essentials sent with the first `figma_get_status` |
| `f-mcp-plugin/` | Figma plugin (`manifest.json`, `ui.html`, `code.js`) |
| `skills/`, `commands/`, `agents/`, `hooks/` | Claude Code / Cursor plugin content |
