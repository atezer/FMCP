"""
WebSocket server for plugin connection and thread-safe request/response bridge.
Plugin connects to ws://127.0.0.1:port; MCP tools call request(method, params) and block until response.
"""
import asyncio
import json
import os
import socket
import sys
import time
import uuid
from urllib.request import urlopen
from urllib.error import URLError

try:
    import websockets
except ImportError:
    print("Install with: pip install websockets", file=sys.stderr)
    raise

PORT_MIN = 5454
PORT_MAX = 5470
REQUEST_TIMEOUT_MS = 120000


def _log(msg: str) -> None:
    print(f"[fmcp_bridge] {msg}", file=sys.stderr, flush=True)


class BridgeClient:
    """Thread-safe bridge: MCP tools (main thread) call request(); asyncio thread sends to plugin and sets result."""

    def __init__(self) -> None:
        self._pending: dict[str, asyncio.Future] = {}
        self._loop: asyncio.AbstractEventLoop | None = None
        self._ws = None
        self._port: int = PORT_MIN

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def set_ws(self, ws) -> None:
        self._ws = ws

    def is_connected(self) -> bool:
        return self._ws is not None and self._ws.open

    def request(self, method: str, params: dict | None = None, timeout_ms: int = REQUEST_TIMEOUT_MS) -> dict:
        """Blocking call from MCP tool thread. Sends request to plugin and waits for response."""
        params = params or {}
        req_id = f"req_{int(time.time() * 1000)}_{uuid.uuid4().hex[:7]}"
        if self._loop is None:
            raise RuntimeError("Bridge loop not set")
        try:
            result = asyncio.run_coroutine_threadsafe(
                self._async_request(req_id, method, params, timeout_ms),
                self._loop,
            ).result(timeout=(timeout_ms / 1000) + 5)
            return result
        except Exception as e:
            if "timed out" in str(e).lower():
                raise TimeoutError(str(e)) from e
            raise

    async def _async_request(
        self, req_id: str, method: str, params: dict, timeout_ms: int
    ) -> dict:
        if not self._ws or not self._ws.open:
            raise ConnectionError(
                "F-MCP ATezer Bridge plugin not connected. Open Figma, run the F-MCP ATezer Bridge plugin, and ensure it shows 'ready'."
            )
        payload = {"id": req_id, "method": method, "params": params}
        fut: asyncio.Future = self._loop.create_future()
        self._pending[req_id] = fut
        try:
            await self._ws.send(json.dumps(payload))
            try:
                return await asyncio.wait_for(fut, timeout=timeout_ms / 1000)
            except asyncio.TimeoutError:
                raise TimeoutError(
                    f"Plugin bridge request '{method}' timed out after {timeout_ms}ms"
                )
        finally:
            self._pending.pop(req_id, None)

    def on_message(self, data: str) -> None:
        """Called from asyncio when plugin sends a message."""
        try:
            msg = json.loads(data)
        except json.JSONDecodeError:
            return
        if msg.get("type") == "ready":
            _log("Plugin sent ready — sending welcome handshake")
            if self._ws and self._ws.open:
                welcome = json.dumps({"type": "welcome", "bridgeVersion": "1.0.0", "port": self._port})
                asyncio.ensure_future(self._ws.send(welcome))
            return
        req_id = msg.get("id")
        if not req_id:
            return
        fut = self._pending.get(req_id)
        if fut and not fut.done():
            if "error" in msg:
                fut.set_exception(Exception(msg["error"]))
            else:
                fut.set_result(msg.get("result"))


def _check_port_conflict(port: int) -> None:
    """Check if port is already in use; fail loudly with helpful message."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    try:
        sock.connect(("127.0.0.1", port))
        sock.close()
    except (ConnectionRefusedError, OSError):
        return

    is_fmcp = False
    try:
        resp = urlopen(f"http://127.0.0.1:{port}", timeout=2)
        body = resp.read().decode("utf-8", errors="replace")
        is_fmcp = "F-MCP" in body
    except (URLError, OSError):
        pass

    hint = f"netstat -ano | findstr :{port}" if sys.platform == "win32" else f"lsof -i :{port}"
    if is_fmcp:
        print(
            f"\n❌ Port {port} is already used by another F-MCP bridge instance.\n"
            f"   Find it: {hint}\n"
            f"   Kill it and retry, or set FIGMA_PLUGIN_BRIDGE_PORT to a different port.\n"
            f"   ⚠️  Cursor/Claude starts the bridge automatically — do NOT also run 'npm run dev:local'.\n",
            file=sys.stderr,
        )
    else:
        print(
            f"\n❌ Port {port} is already in use by another application.\n"
            f"   Find it: {hint}\n"
            f"   Free the port and retry, or set FIGMA_PLUGIN_BRIDGE_PORT to a different port.\n",
            file=sys.stderr,
        )
    sys.exit(1)


async def run_websocket_server(port: int, bridge: BridgeClient, host: str = "127.0.0.1") -> None:
    """Run WebSocket server on host:port; accept single plugin client; handle messages."""
    _check_port_conflict(port)

    bridge._port = port
    loop = asyncio.get_event_loop()
    bridge.set_loop(loop)

    async def handler(ws) -> None:
        _log(f"Plugin connected ({host}:{port})")
        bridge.set_ws(ws)
        try:
            async for raw in ws:
                if isinstance(raw, bytes):
                    raw = raw.decode("utf-8")
                bridge.on_message(raw)
        finally:
            bridge.set_ws(None)
            _log("Plugin disconnected")

    async def serve() -> None:
        async with websockets.serve(
            handler,
            host,
            port,
            ping_interval=15,
            ping_timeout=10,
        ) as server:
            _log(f"Plugin bridge server listening on ws://{host}:{port}")
            await asyncio.Future()

    await serve()


def get_host() -> str:
    return os.environ.get("FIGMA_BRIDGE_HOST", "127.0.0.1")


def get_port() -> int:
    p = os.environ.get("FIGMA_PLUGIN_BRIDGE_PORT")
    if p:
        try:
            return int(p)
        except ValueError:
            pass
    return PORT_MIN
