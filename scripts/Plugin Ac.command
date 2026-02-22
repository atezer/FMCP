#!/bin/bash
# Çift tıkla: Figma açıksa F-MCP ATezer Bridge plugin'ini açar
# İlk seferde: System Settings > Privacy > Accessibility → "Terminal" ekleyin

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
osascript "$SCRIPT_DIR/autorun-bridge.applescript"
echo ""
echo "Bitti. Plugin penceresini kontrol edin."
sleep 2
