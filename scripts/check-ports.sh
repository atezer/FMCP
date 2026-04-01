#!/usr/bin/env bash
# F-MCP Bridge port durumu: 5454-5470 arasinda LISTEN eden surecleri gosterir.
# Kullanim: npm run check-ports  veya  bash scripts/check-ports.sh

set -euo pipefail

PORT_MIN=5454
PORT_MAX=5470
FOUND=0

echo "F-MCP Bridge port taramasi ($PORT_MIN-$PORT_MAX)"
echo "================================================"

for port in $(seq $PORT_MIN $PORT_MAX); do
  line=$(lsof -i ":$port" -sTCP:LISTEN -P -n 2>/dev/null | grep -v "^COMMAND" || true)
  if [ -n "$line" ]; then
    pid=$(echo "$line" | awk '{print $2}' | head -1)
    cmd=$(echo "$line" | awk '{print $1}' | head -1)
    echo "  :$port  PID=$pid  ($cmd)"
    FOUND=$((FOUND + 1))
  fi
done

if [ "$FOUND" -eq 0 ]; then
  echo "  (hicbir portta dinleyen surec yok)"
fi

echo ""
echo "Toplam: $FOUND aktif bridge portu"
