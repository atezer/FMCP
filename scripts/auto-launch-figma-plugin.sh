#!/bin/bash
#
# Auto-Launch Figma Desktop with Remote Debugging + Desktop Bridge Plugin
# Non-interactive version - automatically restarts Figma and launches plugin
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
echo -e "${BLUE}  Figma Otomatik Başlatıcı + Desktop Bridge Plugin${NC}"
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

# Kill Figma if running
if pgrep -x "Figma" > /dev/null; then
    echo -e "${YELLOW}→ Mevcut Figma instance kapatılıyor...${NC}"
    killall Figma 2>/dev/null || osascript -e 'quit app "Figma"' 2>/dev/null
    sleep 3
fi

# Launch Figma with remote debugging
echo -e "${GREEN}→ Figma Desktop debug moduyla başlatılıyor...${NC}"
echo -e "  Debug Port: ${BLUE}$DEBUG_PORT${NC}"
echo

open -a "Figma" --args --remote-debugging-port="$DEBUG_PORT"

# Wait for Figma to start
echo -e "${YELLOW}→ Figma'nın başlaması bekleniyor (10 saniye)...${NC}"
sleep 10

# Verify debugging is enabled
echo -e "${YELLOW}→ Debug portu kontrol ediliyor...${NC}"
RETRY_COUNT=0
MAX_RETRIES=15

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

# Auto-start plugin using AppleScript
echo -e "${BLUE}→ Desktop Bridge plugin otomatik başlatılıyor...${NC}"
echo -e "${CYAN}  (Plugin menüsü açılacak - bir dosya açtıysanız)${NC}"
echo

sleep 2

# AppleScript to open plugin via menu
osascript <<EOF 2>/dev/null
tell application "Figma"
    activate
end tell

delay 2

tell application "System Events"
    tell process "Figma"
        try
            -- Open quick search / plugin menu (Cmd+/)
            keystroke "/" using {command down}
            delay 1
            
            -- Type plugin name
            keystroke "$PLUGIN_NAME"
            delay 0.5
            
            -- Press Enter to run plugin
            keystroke return
            delay 1
            
            return true
        on error errMsg
            return false
        end try
    end tell
end tell
EOF

APPLESCRIPT_RESULT=$?

if [ $APPLESCRIPT_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Plugin başlatma komutu gönderildi!${NC}"
    echo
    echo -e "${CYAN}Plugin penceresi açılmalı ve şunu göreceksiniz:${NC}"
    echo -e "  ${GREEN}✓ Desktop Bridge active${NC}"
    echo -e "  ${GREEN}Variables: X in Y collections${NC}"
    echo
    echo -e "${YELLOW}⚠ Not: Plugin sadece bir Figma dosyası açıksa çalışır${NC}"
else
    echo -e "${YELLOW}⚠ Plugin otomatik başlatılamadı${NC}"
    echo
    echo -e "${CYAN}Manuel olarak başlatın:${NC}"
    echo "  1. Bir Figma dosyası açın"
    echo "  2. Cmd+/ tuşlayın (veya sağ tıklayın)"
    echo "  3. 'Figma Desktop Bridge' yazın"
    echo "  4. Enter tuşlayın"
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
echo -e "${GREEN}Script tamamlandı!${NC}"
