#!/bin/bash
set -euo pipefail

# F-MCP ATezer Bridge — Otomatik Kurulum
# Bu script: Node.js kontrol, build, MCP config ayarı yapar.
# Kullanıcının yapması gereken tek şey: gerekirse bilgisayar şifresini girmek.

echo "=== F-MCP ATezer Bridge Kurulum ==="
echo ""

# 1. OS kontrolü
OS="$(uname -s)"
if [[ "$OS" != "Darwin" && "$OS" != "Linux" ]]; then
  echo "❌ Bu script macOS ve Linux için. Windows: docs/WINDOWS-INSTALLATION.md"
  exit 1
fi

# 2. Node.js kontrolü — yoksa otomatik kur (Homebrew ile, macOS)
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
    # macOS: Homebrew ile kur
    if ! command -v brew &>/dev/null; then
      echo ""
      echo "Node.js kurmak için Homebrew gerekli. Homebrew kurulsun mu?"
      echo "(Bu adım yönetici şifresi isteyebilir)"
      read -p "Homebrew kursun mu? [e/h]: " BREW_CONFIRM
      if [[ "$BREW_CONFIRM" =~ ^[eEyY]$ ]]; then
        echo "📦 Homebrew kuruluyor..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        # Homebrew path'i ekle (Apple Silicon veya Intel)
        if [[ -f "/opt/homebrew/bin/brew" ]]; then
          eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [[ -f "/usr/local/bin/brew" ]]; then
          eval "$(/usr/local/bin/brew shellenv)"
        fi
        echo "✓ Homebrew kuruldu"
      else
        echo "❌ Homebrew olmadan Node.js kurulamıyor."
        echo "   Manuel çözüm: https://nodejs.org adresinden LTS indirin."
        exit 1
      fi
    fi

    echo "📦 Node.js kuruluyor (Homebrew ile)..."
    brew install node
    echo "✓ Node.js $(node -v) kuruldu"
  else
    # Linux: kullanıcıyı yönlendir
    echo "❌ Node.js 18+ gerekli."
    echo "   Çözüm: https://nodejs.org adresinden LTS sürümünü indirin."
    echo "   veya: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -"
    exit 1
  fi
}

install_node_if_missing

# 3. npm kontrolü
if ! command -v npm &>/dev/null; then
  echo "❌ npm bulunamadı. Node.js ile birlikte gelir — Node.js'i yeniden kurun."
  exit 1
fi
echo "✓ npm $(npm -v)"

# 4. Repo kök kontrolü
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ ! -f "$REPO_ROOT/package.json" ]]; then
  echo "❌ package.json bulunamadı. Bu script'i FMCP repo kökünden çalıştırın."
  exit 1
fi

PKG_NAME=$(node -e "console.log(require('$REPO_ROOT/package.json').name)" 2>/dev/null || echo "")
if [[ "$PKG_NAME" != "@atezer/figma-mcp-bridge" ]]; then
  echo "❌ Bu FMCP reposu değil. Script'i FMCP klasörü içindeki scripts/ dizininden çalıştırın."
  exit 1
fi
echo "✓ FMCP reposu: $REPO_ROOT"

# 5. npm install
echo ""
echo "📦 Bağımlılıklar yükleniyor..."
cd "$REPO_ROOT"
npm install --loglevel=warn

# 6. Build
echo ""
echo "🔨 Build alınıyor..."
npm run build:local
echo "✓ Build tamamlandı"

# 7. MCP config ayarı — TÜM bulunan AI araçlarına otomatik ekle
DIST_PATH="$REPO_ROOT/dist/local-plugin-only.js"
CONFIGS_UPDATED=0

setup_config() {
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
    config.mcpServers['figma-mcp-bridge'] = {
      command: 'node',
      args: ['$DIST_PATH']
    };
    fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
  "
  echo "  ✓ $TOOL_NAME config ayarlandı: $CONFIG_PATH"
  CONFIGS_UPDATED=$((CONFIGS_UPDATED + 1))
}

echo ""
echo "🔗 MCP config ayarlanıyor (bulunan AI araçları)..."

# Claude Desktop (macOS)
if [[ "$OS" == "Darwin" ]]; then
  CLAUDE_DIR="$HOME/Library/Application Support/Claude"
  if [[ -d "$CLAUDE_DIR" ]] || ls /Applications/Claude.app &>/dev/null 2>&1; then
    setup_config "$CLAUDE_DIR/claude_desktop_config.json" "Claude Desktop"
  fi
fi

# Claude Code (.mcp.json — repo kökü)
setup_config "$REPO_ROOT/.mcp.json" "Claude Code"

# Cursor
if command -v cursor &>/dev/null || ls /Applications/Cursor.app &>/dev/null 2>&1 || [[ -d "$REPO_ROOT/.cursor" ]]; then
  mkdir -p "$REPO_ROOT/.cursor"
  setup_config "$REPO_ROOT/.cursor/mcp.json" "Cursor"
fi

if [[ "$CONFIGS_UPDATED" -eq 0 ]]; then
  echo "  ℹ Hiçbir AI aracı bulunamadı. Config'i kendiniz ayarlayın: docs/ONBOARDING.md"
fi

# 8. Figma plugin talimatı
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📌 Son adım: Figma'da plugin'i açın"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. Figma'yı açın → herhangi bir dosyayı açın"
echo "  2. Plugins → Development → Import plugin from manifest"
echo "  3. Şu dosyayı seçin: $REPO_ROOT/f-mcp-plugin/manifest.json"
echo "  4. Plugins → Development → F-MCP ATezer Bridge"
echo "  5. 'ready' yazısını görene kadar bekleyin"
echo ""
echo "  Kurumsal: Plugin organizasyonda yayınlandıysa Import gerekmez,"
echo "  Plugins menüsünden doğrudan çalıştırın."

# 9. Başarı mesajı
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
echo "  Sonra AI aracınıza şunu söyleyin:"
echo "  → 'Figma'daki değişkenleri listele'"
echo ""
echo "  Bağlantı otomatik kurulur — port ayarı gerekmez."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
