#!/bin/bash
#
# Launch Figma Desktop with Remote Debugging + Auto-start Desktop Bridge Plugin
# This script starts Figma with debugging enabled and automatically runs the Desktop Bridge plugin
#

set -e

# Configuration
DEBUG_PORT="${FIGMA_DEBUG_PORT:-9222}"
FIGMA_APP="/Applications/Figma.app"
PLUGIN_NAME="Figma Desktop Bridge"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Figma Desktop Debug Launcher + Auto Plugin${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Check if Figma is installed
if [ ! -d "$FIGMA_APP" ]; then
    echo -e "${RED}✗ Figma Desktop bulunamadı: $FIGMA_APP${NC}"
    echo
    echo "Figma Desktop'ı şuradan indirin:"
    echo "  https://www.figma.com/downloads/"
    exit 1
fi

# Check if Figma is already running
if pgrep -x "Figma" > /dev/null; then
    echo -e "${YELLOW}⚠ Figma zaten çalışıyor${NC}"
    echo
    echo "Debug modunu etkinleştirmek için Figma'yı kapatıp yeniden başlatmalıyız."
    echo
    read -p "Figma'yı kapatıp debug moduyla başlatmak istiyor musunuz? (e/h) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[EeYy]$ ]]; then
        echo -e "${YELLOW}→ Figma kapatılıyor...${NC}"
        killall Figma 2>/dev/null || osascript -e 'quit app "Figma"'
        sleep 3
    else
        echo -e "${RED}✗ İptal edildi${NC}"
        exit 1
    fi
fi

# Launch Figma with remote debugging
echo -e "${GREEN}→ Figma Desktop debug moduyla başlatılıyor...${NC}"
echo -e "  Debug Port: ${BLUE}$DEBUG_PORT${NC}"
echo

open -a "Figma" --args --remote-debugging-port="$DEBUG_PORT"

# Wait for Figma to start
echo -e "${YELLOW}→ Figma'nın başlaması bekleniyor...${NC}"
sleep 5

# Verify debugging is enabled
echo -e "${YELLOW}→ Debug portu kontrol ediliyor...${NC}"
RETRY_COUNT=0
MAX_RETRIES=10

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s "http://localhost:$DEBUG_PORT/json/version" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Debug portu erişilebilir: http://localhost:$DEBUG_PORT${NC}"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo -e "${YELLOW}  Deneme $RETRY_COUNT/$MAX_RETRIES...${NC}"
        sleep 1
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}✗ Debug portuna erişilemedi${NC}"
    echo
    echo "Manuel olarak kontrol edin:"
    echo "  curl http://localhost:$DEBUG_PORT/json/version"
    exit 1
fi

echo
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Figma Desktop hazır!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Wait for user to open a file
echo -e "${CYAN}⚠ Lütfen Figma'da bir dosya açın ve Enter'a basın...${NC}"
read -p ""

# Auto-start plugin using AppleScript
echo
echo -e "${BLUE}→ Desktop Bridge plugin otomatik başlatılıyor...${NC}"
echo

# AppleScript to open plugin via menu
osascript <<EOF
tell application "Figma"
    activate
end tell

delay 1

tell application "System Events"
    tell process "Figma"
        -- Try to open plugin menu
        -- Method 1: Using keyboard shortcut (Option+Cmd+P for plugins menu)
        keystroke "p" using {command down, option down}
        delay 0.5
        
        -- Type plugin name to search
        keystroke "$PLUGIN_NAME"
        delay 0.3
        
        -- Press Enter to run plugin
        keystroke return
        delay 0.5
    end tell
end tell
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Plugin başlatma komutu gönderildi!${NC}"
    echo
    echo -e "${CYAN}Plugin penceresi açılmalı ve şunu göreceksiniz:${NC}"
    echo -e "  ${GREEN}✓ Desktop Bridge active${NC}"
    echo -e "  ${GREEN}Variables: X in Y collections${NC}"
else
    echo -e "${YELLOW}⚠ Plugin otomatik başlatılamadı${NC}"
    echo
    echo -e "${CYAN}Manuel olarak başlatın:${NC}"
    echo "  Sağ tıklayın → Plugins → Development → Figma Desktop Bridge"
fi

echo
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Kurulum Tamamlandı!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo -e "${GREEN}✓${NC} Debug port: ${BLUE}http://localhost:$DEBUG_PORT${NC}"
echo -e "${GREEN}✓${NC} Plugin: ${BLUE}$PLUGIN_NAME${NC}"
echo
echo -e "${CYAN}MCP sunucusu ile test etmek için:${NC}"
echo "  Claude Desktop'ı yeniden başlatın"
echo "  veya"
echo "  npm run dev:local"
echo
