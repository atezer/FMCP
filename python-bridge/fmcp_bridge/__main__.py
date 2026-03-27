"""
F-MCP Bridge — Python entry point.
Runs WebSocket server (for plugin) in a background thread and MCP stdio server (for Claude) in main thread.
"""
import sys
import threading

# Use stderr for logs so stdout is reserved for MCP JSON-RPC
def _log(msg: str) -> None:
    print(f"[fmcp_bridge] {msg}", file=sys.stderr, flush=True)


def main() -> None:
    from .bridge import BridgeClient, get_host, get_port, run_websocket_server

    host = get_host()
    port = get_port()
    bridge = BridgeClient()

    def run_ws() -> None:
        import asyncio
        asyncio.run(run_websocket_server(port, bridge, host))

    ws_thread = threading.Thread(target=run_ws, daemon=True)
    ws_thread.start()

    # Give server time to bind
    import time
    time.sleep(0.5)

    # Build MCP server and register tools that forward to bridge
    from mcp.server.fastmcp import FastMCP
    mcp = FastMCP(
        "F-MCP ATezer Bridge (Plugin-only)",
        version="1.0.0",
    )

    def _req(method: str, params: dict | None = None) -> dict:
        if not bridge.is_connected():
            raise RuntimeError(
                "F-MCP ATezer Bridge plugin not connected. Open Figma, run the F-MCP ATezer Bridge plugin, and ensure it shows 'ready'."
            )
        return bridge.request(method, params or {})

    # --- Critical tools (map MCP tool -> bridge method + params) ---
    @mcp.tool()
    def figma_get_status() -> str:
        """Check if the Figma plugin is connected. Returns status."""
        if bridge.is_connected():
            return "Plugin connected (ready)."
        return "Plugin not connected. Open Figma, run F-MCP ATezer Bridge plugin, ensure it shows 'ready'."

    @mcp.tool()
    def figma_get_variables() -> str:
        """Get all variable collections and variables from the open Figma file. No REST API."""
        r = _req("getVariablesFromPluginUI")
        return str(r) if r is not None else "{}"

    @mcp.tool()
    def figma_get_file_data(
        depth: int = 1,
        verbosity: str = "summary",
    ) -> str:
        """Get file structure and document tree. Use depth=1 and verbosity=summary for minimal tokens."""
        r = _req("getDocumentStructure", {"depth": depth, "verbosity": verbosity})
        return str(r) if r is not None else "{}"

    @mcp.tool()
    def figma_get_styles(verbosity: str = "summary") -> str:
        """Get local paint, text, and effect styles."""
        r = _req("getLocalStyles", {"verbosity": verbosity})
        return str(r) if r is not None else "{}"

    @mcp.tool()
    def figma_get_design_system_summary(
        current_page_only: bool = True,
        limit: int = 0,
    ) -> str:
        """Get design system overview: variable collections and component counts. Uses current page by default."""
        vars_r = _req("getVariablesFromPluginUI")
        comp_r = _req("getLocalComponents", {"currentPageOnly": current_page_only, "limit": limit or 0})
        import json
        return json.dumps({"variables": vars_r, "components": comp_r}, default=str)

    @mcp.tool()
    def figma_search_components(
        query: str,
        current_page_only: bool = True,
        limit: int = 0,
    ) -> str:
        """Search local components by name. Returns nodeIds and names."""
        r = _req("getLocalComponents", {"currentPageOnly": current_page_only, "limit": limit or 0})
        if not r or not isinstance(r, dict):
            return "{}"
        data = r.get("data") or {}
        components = (data.get("components") or []) + (data.get("componentSets") or [])
        matches = [c for c in components if query.lower() in (c.get("name") or "").lower()]
        import json
        return json.dumps({"matches": matches[: limit or 50], "total": len(matches)}, default=str)

    @mcp.tool()
    def figma_get_design_context(
        node_id: str,
        depth: int = 2,
        verbosity: str = "standard",
        output_hint: str | None = None,
    ) -> str:
        """Get design context for a node: type, variant props, layout, colors, typography."""
        params = {"nodeId": node_id, "depth": depth, "verbosity": verbosity}
        if output_hint:
            params["outputHint"] = output_hint
        r = _req("getNodeContext", params)
        return str(r) if r is not None else "{}"

    @mcp.tool()
    def figma_execute(code: str, timeout: int = 5000) -> str:
        """Run JavaScript in the Figma plugin API (figma.root, figma.currentPage, etc.)."""
        r = _req("executeCodeViaUI", {"code": code, "timeout": timeout})
        return str(r) if r is not None else "{}"

    @mcp.tool()
    def figma_get_metadata(node_id: str) -> str:
        """Get node metadata: id, type, name, position, size (XML-style)."""
        r = _req("getNodeContext", {"nodeId": node_id, "depth": 1, "verbosity": "summary"})
        return str(r) if r is not None else "{}"

    @mcp.tool()
    def figma_capture_screenshot(node_id: str | None = None, format: str = "png", scale: float = 1.0) -> str:
        """Capture screenshot of a node (or current selection). Returns base64 or URL."""
        r = _req("captureScreenshot", {"nodeId": node_id, "options": {"format": format, "scale": scale}})
        return str(r) if r is not None else "{}"

    _log(f"Starting MCP stdio server (plugin bridge on {host}:{port})")
    mcp.run()


if __name__ == "__main__":
    main()
