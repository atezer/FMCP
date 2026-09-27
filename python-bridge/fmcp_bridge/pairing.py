"""
Pairing secret — only a paired F-MCP plugin may talk to the bridge.

Mirror of src/core/pairing.ts: same file, same format, same rules, so the Node and the Python
bridge on one machine accept the same code. See that file for the reasoning.
"""
from __future__ import annotations

import errno
import hmac
import os
import re
import secrets
from pathlib import Path
from typing import Mapping, Optional
from urllib.parse import urlparse

SECRET_RE = re.compile(r"^[A-Za-z0-9_-]{16,128}$")

# What an unpaired plugin is told. Static on purpose: the connection is not trusted yet, so it is not
# told the real file path (which carries the user name). Same text as plugin-bridge-server.ts, except
# for the command: this bridge runs where Node may not exist.
PAIRING_REQUIRED_MESSAGE = (
    "Pairing code required. Copy it from ~/.config/fmcp/pairing (or run "
    "`python -m fmcp_bridge --print-pairing`) and paste it into the plugin: Advanced → Pairing code."
)
PAIRING_MISMATCH_MESSAGE = (
    "Pairing code does not match this bridge. Copy the current code from ~/.config/fmcp/pairing "
    "(or run `python -m fmcp_bridge --print-pairing`) and paste it into the plugin again."
)


def pairing_file_path() -> Path:
    """Where the pairing secret lives: FMCP_PAIRING_FILE, else ~/.config/fmcp/pairing."""
    custom = os.environ.get("FMCP_PAIRING_FILE")
    return Path(custom) if custom else Path.home() / ".config" / "fmcp" / "pairing"


def pairing_required(env: Optional[Mapping[str, str]] = None) -> bool:
    """On unless FMCP_PAIRING is "off" / "0" / "false" — the transitional switch for a plugin that cannot be updated yet."""
    value = (env if env is not None else os.environ).get("FMCP_PAIRING", "").strip().lower()
    return value not in ("off", "0", "false")


class PairingFileError(RuntimeError):
    """The pairing file could not be read or created, or does not hold a valid code. The message says how to fix it."""


def _read_secret(path: Path) -> str:
    value = path.read_text(encoding="utf-8").strip()
    if not SECRET_RE.match(value):
        raise PairingFileError(
            f"F-MCP pairing file is not valid: {path} — delete it and restart the bridge to create a new code."
        )
    return value


def _file_error(err: OSError, path: Path, action: str) -> PairingFileError:
    # A sandboxed shell may read the home directory but not write to it: the first run belongs in a normal terminal.
    code = errno.errorcode.get(err.errno or 0, "unknown")
    return PairingFileError(
        f"F-MCP could not {action} the pairing file {path} ({code}). Create it once from a normal terminal with "
        "`python -m fmcp_bridge --print-pairing`, or point FMCP_PAIRING_FILE at a writable file."
    )


def load_or_create_pairing_secret(path: Optional[Path] = None) -> str:
    """Read the pairing secret, creating it on first use. Two instances starting at once agree on one value."""
    path = path or pairing_file_path()
    try:
        return _read_secret(path)
    except FileNotFoundError:
        pass
    except OSError as err:
        raise _file_error(err, path, "read") from err
    value = secrets.token_urlsafe(24)  # 32 characters, 192 bits — the same shape as the Node bridge
    try:
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        fd = os.open(str(path), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except OSError as err:
        # Another instance created it between our read and our write: use theirs.
        if err.errno == errno.EEXIST:
            try:
                return _read_secret(path)
            except OSError as again:
                raise _file_error(again, path, "read") from again
        raise _file_error(err, path, "create") from err
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        fh.write(value + "\n")
    return value


def pairing_matches(expected: str, candidate: object) -> bool:
    """Constant-time comparison of a presented code with the expected secret."""
    if not isinstance(candidate, str) or not expected:
        return False
    return hmac.compare_digest(expected.encode("utf-8"), candidate.strip().encode("utf-8"))


def is_allowed_bridge_origin(origin: Optional[str]) -> bool:
    """The Figma plugin iframe sends Origin: null; a non-browser client none; Figma's pages https figma.com."""
    if not origin or origin == "null":
        return True
    try:
        url = urlparse(origin)
    except ValueError:
        return False
    host = (url.hostname or "").lower()
    return url.scheme == "https" and (host == "figma.com" or host.endswith(".figma.com"))
