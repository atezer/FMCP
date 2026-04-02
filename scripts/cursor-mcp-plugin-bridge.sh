#!/usr/bin/env bash
# Cursor MCP: nvm ile kurulu Node'u yükle, sonra yerel plugin-only bridge'i çalıştır.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
	# shellcheck source=/dev/null
	. "$NVM_DIR/nvm.sh"
fi
exec node "$ROOT/dist/local-plugin-only.js"
