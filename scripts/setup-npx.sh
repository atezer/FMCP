#!/bin/bash
set -euo pipefail

# F-MCP ATezer Bridge — NPX ile Kurulum (repo indirmeden)
# Kullanıcının yapması gereken tek şey: gerekirse bilgisayar şifresini girmek.

echo "=== F-MCP ATezer Bridge — NPX Kurulum ==="
echo ""

# 1. OS kontrolü
OS="$(uname -s)"
if [[ "$OS" != "Darwin" && "$OS" != "Linux" ]]; then
  echo "❌ Bu script macOS ve Linux için. Windows: docs/WINDOWS-INSTALLATION.md"
  exit 1
fi

# 2. Node.js >= 18 kontrolü — yoksa otomatik kur (macOS: Homebrew)
install_node_if_missing() {
  if command -v node &>/dev/null; then
    NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
    if [[ "$NODE_MAJOR" -ge 18 ]]; then
      echo "✓ Node.js $(node -v)"
      return 0
    fi
    echo "⚠ Node.js $(node -v) eski — 18+ gerekli."
  else
    echo "⚠ Node.js bulunamadı."
  fi

  if [[ "$OS" == "Darwin" ]]; then
    if ! command -v brew &>/dev/null; then
      echo "Node.js kurmak için Homebrew gerekli."
      echo "(Bu adım yönetici şifresi isteyebilir)"
      read -p "Homebrew kursun mu? [e/h]: " BREW_CONFIRM
      if [[ "$BREW_CONFIRM" =~ ^[eEyY]$ ]]; then
        echo "📦 Homebrew kuruluyor..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        if [[ -f "/opt/homebrew/bin/brew" ]]; then
          eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [[ -f "/usr/local/bin/brew" ]]; then
          eval "$(/usr/local/bin/brew shellenv)"
        fi
        echo "✓ Homebrew kuruldu"
      else
        echo "❌ https://nodejs.org adresinden LTS indirin."
        exit 1
      fi
    fi
    echo "📦 Node.js kuruluyor (Homebrew ile)..."
    brew install node
    echo "✓ Node.js $(node -v) kuruldu"
  else
    echo "❌ Node.js 18+ gerekli: https://nodejs.org"
    exit 1
  fi
}

install_node_if_missing

# 3. npx kontrolü
if ! command -v npx &>/dev/null; then
  echo "❌ npx bulunamadı. Node.js ile birlikte gelir — Node.js'i yeniden kurun."
  exit 1
fi
echo "✓ npx mevcut"

# 4. MCP config — TÜM bulunan AI araçlarına otomatik ekle
NPX_CONFIG='{"command":"npx","args":["-y","@atezer/figma-mcp-bridge@latest","figma-mcp-bridge-plugin"]}'
CONFIGS_UPDATED=0

setup_npx_config() {
  local CONFIG_PATH="$1"
  local TOOL_NAME="$2"
  local CONFIG_DIR
  CONFIG_DIR="$(dirname "$CONFIG_PATH")"

  mkdir -p "$CONFIG_DIR"

  if [[ -f "$CONFIG_PATH" ]]; then
    cp "$CONFIG_PATH" "$CONFIG_PATH.bak.$(date +%s)"
  fi

  node -e "
    const fs = require('fs');
    const path = '$CONFIG_PATH';
    let config = {};
    try { config = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
    if (!config.mcpServers) config.mcpServers = {};
    config.mcpServers['figma-mcp-bridge'] = $NPX_CONFIG;
    fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
  "
  echo "  ✓ $TOOL_NAME config ayarlandı: $CONFIG_PATH"
  CONFIGS_UPDATED=$((CONFIGS_UPDATED + 1))
}

echo ""
echo "🔗 MCP config ayarlanıyor..."

# Claude Desktop (macOS)
if [[ "$OS" == "Darwin" ]]; then
  CLAUDE_DIR="$HOME/Library/Application Support/Claude"
  if [[ -d "$CLAUDE_DIR" ]] || ls /Applications/Claude.app &>/dev/null 2>&1; then
    setup_npx_config "$CLAUDE_DIR/claude_desktop_config.json" "Claude Desktop"
  fi
fi

# Claude Code (.mcp.json — çalışma dizini)
setup_npx_config "$(pwd)/.mcp.json" "Claude Code"

# Cursor
if command -v cursor &>/dev/null || ls /Applications/Cursor.app &>/dev/null 2>&1 || [[ -d "$(pwd)/.cursor" ]]; then
  mkdir -p "$(pwd)/.cursor"
  setup_npx_config "$(pwd)/.cursor/mcp.json" "Cursor"
fi

# 5. Figma plugin talimatı + başarı mesajı
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ F-MCP ATezer Bridge kurulumu tamamlandı!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Yapmanız gereken son 2 adım:"
echo ""
echo "  1️⃣  AI aracınızı yeniden başlatın (Claude/Cursor)"
echo "  2️⃣  Figma'da plugin'i açın → yeşil 'ready' yazısını görün"
echo ""
echo "  Plugin kuruluysa: Plugins → F-MCP ATezer Bridge"
echo "  Kurulu değilse: Organizasyon plugin listesinden ekleyin"
echo ""
echo "  Bağlantı otomatik kurulur — port ayarı gerekmez."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
