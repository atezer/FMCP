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

from .pairing import (
    PAIRING_MISMATCH_MESSAGE,
    PAIRING_REQUIRED_MESSAGE,
    is_allowed_bridge_origin,
    load_or_create_pairing_secret,
    pairing_file_path,
    pairing_matches,
    pairing_required,
)

PORT_MIN = 5454
PORT_MAX = 5470
REQUEST_TIMEOUT_MS = 120000
# A connection must send a "ready" handshake with the pairing secret within this time or it is closed.
PAIRING_TIMEOUT_S = 10.0


def _log(msg: str) -> None:
    print(f"[fmcp_bridge] {msg}", file=sys.stderr, flush=True)


def _is_open(ws) -> bool:
    """Open check for both websockets implementations: legacy `.open` (< 14) and `.state` (>= 14, the default)."""
    if ws is None:
        return False
    legacy_open = getattr(ws, "open", None)
    if isinstance(legacy_open, bool):
        return legacy_open
    return getattr(getattr(ws, "state", None), "name", None) == "OPEN"


def _request_origin(ws):
    """The handshake's Origin header (None when absent). `.request.headers` in websockets >= 14, `.request_headers` before."""
    request = getattr(ws, "request", None)
    headers = getattr(request, "headers", None) if request is not None else None
    if headers is None:
        headers = getattr(ws, "request_headers", None)
    # Headers that cannot be read count as "no Origin": the pairing check below is what authenticates.
    return headers.get("Origin") if headers is not None else None


async def _close(ws, code: int, reason: str) -> None:
    try:
        await ws.close(code, reason)
    except Exception:
        pass


async def _await_pairing(ws, secret: str, on_refused=None):
    """
    Wait for the plugin's "ready" handshake carrying the pairing secret. Returns that raw message once the
    plugin has paired; otherwise refuses (error message + close 4401) or times out and returns None.
    Nothing but the handshake is read from an unpaired connection. on_refused(code) hears every refusal.
    """
    loop = asyncio.get_running_loop()
    deadline = loop.time() + PAIRING_TIMEOUT_S
    while True:
        remaining = deadline - loop.time()
        if remaining <= 0:
            break
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        except asyncio.TimeoutError:
            break
        except Exception:
            return None  # closed before pairing
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8", errors="replace")
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if not isinstance(msg, dict) or msg.get("type") != "ready":
            continue
        if pairing_matches(secret, msg.get("pairing")):
            return raw
        code = "pairing-mismatch" if msg.get("pairing") else "pairing-required"
        _log(f"Refused a plugin without a valid pairing code ({code})")
        if on_refused is not None:
            on_refused(code)
        message = PAIRING_MISMATCH_MESSAGE if code == "pairing-mismatch" else PAIRING_REQUIRED_MESSAGE
        try:
            await ws.send(json.dumps({"type": "error", "code": code, "message": message}))
        except Exception:
            pass
        await _close(ws, 4401, code)
        return None
    _log("Closed a connection that did not pair in time")
    await _close(ws, 4401, "pairing-required")
    return None


class BridgeClient:
    """Thread-safe bridge: MCP tools (main thread) call request(); asyncio thread sends to plugin and sets result."""

    def __init__(self) -> None:
        self._pending: dict[str, asyncio.Future] = {}
        self._loop: asyncio.AbstractEventLoop | None = None
        self._ws = None
        self._port: int = PORT_MIN
        # The last handshake refused for pairing: (code, monotonic time). Cleared when a plugin pairs.
        self._last_refusal: tuple[str, float] | None = None

    def note_pairing_refusal(self, code: str | None) -> None:
        self._last_refusal = (code, time.monotonic()) if code else None

    def pairing_hint(self) -> str:
        """Appended to "plugin not connected": when the plugin DID try but was refused for pairing, say so."""
        if not self._last_refusal:
            return ""
        code, at = self._last_refusal
        age = time.monotonic() - at
        if age > 600:
            return ""
        why = (
            "it sent no pairing code (a plugin older than pairing, or the code was never entered)"
            if code == "pairing-required"
            else "its pairing code does not match this bridge (the code changed)"
        )
        return (
            f" A plugin tried to connect {round(age)}s ago but was refused: {why}. Paste the code from "
            "~/.config/fmcp/pairing into the plugin: Advanced → Pairing code (an older plugin must first be "
            "re-imported from f-mcp-plugin/manifest.json)."
        )

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def set_ws(self, ws) -> None:
        self._ws = ws

    def is_connected(self) -> bool:
        return _is_open(self._ws)

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
        if not _is_open(self._ws):
            raise ConnectionError(
                "F-MCP ATezer Bridge plugin not connected. Open Figma, run the F-MCP ATezer Bridge plugin, and ensure it shows 'ready'."
                + self.pairing_hint()
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
            if _is_open(self._ws):
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


async def run_websocket_server(port: int, bridge: BridgeClient, host: str = "127.0.0.1", secret: str | None = None) -> None:
    """Run WebSocket server on host:port; accept single plugin client; handle messages."""
    _check_port_conflict(port)

    bridge._port = port
    loop = asyncio.get_event_loop()
    bridge.set_loop(loop)

    # Created on first use; every bridge on this machine (Node or Python) reads the same file.
    # __main__ loads it before this thread starts, so a failure stops the bridge instead of a silent dead thread.
    secret = secret or load_or_create_pairing_secret()
    require_pairing = pairing_required()

    async def handler(ws) -> None:
        # Defence in depth: refuse browser pages that are not the Figma plugin iframe (see pairing.py).
        if not is_allowed_bridge_origin(_request_origin(ws)):
            _log("Refused a connection from a web page that is not the Figma plugin")
            await _close(ws, 4403, "origin-not-allowed")
            return
        # A connection is not the plugin until its "ready" handshake carries the pairing secret: until then it
        # never becomes bridge._ws, so it receives no request and cannot replace the paired plugin.
        paired_ready = None
        if require_pairing:
            paired_ready = await _await_pairing(ws, secret, bridge.note_pairing_refusal)
            if paired_ready is None:
                return
            bridge.note_pairing_refusal(None)
        _log(f"Plugin connected ({host}:{port}){' (paired)' if require_pairing else ' (pairing off)'}")
        bridge.set_ws(ws)
        try:
            if paired_ready is not None:
                bridge.on_message(paired_ready)  # the handshake that paired → welcome
            async for raw in ws:
                if isinstance(raw, bytes):
                    raw = raw.decode("utf-8")
                bridge.on_message(raw)
        finally:
            # A newer paired connection may have replaced this one; only clear our own.
            if bridge._ws is ws:
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
            if require_pairing:
                # The code itself is never logged; only where to get it.
                _log(
                    f"The Figma plugin must be paired once: copy the code from {pairing_file_path()} "
                    "(or run `python -m fmcp_bridge --print-pairing`) into the plugin: Advanced → Pairing code."
                )
            else:
                _log(
                    "⚠️  FMCP_PAIRING=off — plugins connect without the pairing code, so any web page open in your "
                    "browser can connect to this bridge as well. Use it only until the plugin is updated."
                )
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
