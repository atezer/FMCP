#!/usr/bin/env bash
# FCM v1.9.5 — Port cleanup script
# Yeni Claude Desktop chat öncesi veya plugin bağlantı sorunları için çalıştır.
# 5454-5470 aralığındaki zombie FMCP process'lerini temizler.

set -euo pipefail

PORTS=(5454 5455 5456 5457 5458 5459 5460 5461 5462 5463 5464 5465 5466 5467 5468 5469 5470)
KILLED=0
SKIPPED=0

for p in "${PORTS[@]}"; do
  pid=$(lsof -ti ":$p" 2>/dev/null || true)
  if [[ -z "$pid" ]]; then
    continue
  fi
  # Match on process name/command — only kill FMCP-related
  cmd=$(ps -p "$pid" -o command= 2>/dev/null || true)
  if [[ "$cmd" =~ (figma-mcp-bridge|local-plugin-only|figma.mcp|@atezer) ]]; then
    echo "Killing FMCP process on port $p — PID $pid"
    kill -9 "$pid" 2>/dev/null || true
    KILLED=$((KILLED + 1))
  else
    echo "Skipping port $p — PID $pid is not FMCP (cmd: $(echo "$cmd" | head -c 60))"
    SKIPPED=$((SKIPPED + 1))
  fi
done

echo ""
echo "Cleanup done. Killed: $KILLED, Skipped: $SKIPPED"
echo "Now you can safely restart Claude Desktop."
