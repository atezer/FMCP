#!/bin/bash
set -euo pipefail

# F-MCP ATezer Bridge — Otomatik Guncelleme
# Mevcut kurulumu tespit eder, gunceller, dogrular.

echo "=== F-MCP ATezer Bridge Guncelleme ==="
echo ""

# 1. OS kontrolu
OS="$(uname -s)"
if [[ "$OS" != "Darwin" && "$OS" != "Linux" ]]; then
  echo "❌ Bu script macOS ve Linux icin. Windows: docs/WINDOWS-INSTALLATION.md"
  exit 1
fi

# 2. Node.js kontrolu
if ! command -v node &>/dev/null; then
  echo "❌ Node.js bulunamadi. Once kurulum yapin: bash scripts/setup.sh"
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  echo "❌ Node.js 18+ gerekli. Mevcut: $(node -v)"
  echo "   Guncelleme: brew upgrade node (macOS) veya nodejs.org"
  exit 1
fi
echo "✓ Node.js $(node -v)"

# 3. Repo kok kontrolu
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ ! -f "$REPO_ROOT/package.json" ]]; then
  echo "❌ package.json bulunamadi. Bu script'i FMCP repo icinden calistirin."
  exit 1
fi

PKG_NAME=$(node -e "console.log(require('$REPO_ROOT/package.json').name)" 2>/dev/null || echo "")
if [[ "$PKG_NAME" != "@atezer/figma-mcp-bridge" ]]; then
  echo "❌ Bu FMCP reposu degil."
  exit 1
fi

cd "$REPO_ROOT"

# 4. Mevcut surum
OLD_VERSION=$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "?")
echo "✓ Mevcut surum: v$OLD_VERSION"

# 5. Yerel degisiklik kontrolu
if ! git diff --quiet 2>/dev/null; then
  echo ""
  echo "⚠ Yerel degisiklikler var. Stash yapiliyor..."
  git stash
  STASHED=true
else
  STASHED=false
fi

# 6. git pull
echo ""
echo "📥 Guncellemeler indiriliyor..."
git pull origin main 2>&1

# 7. npm install
echo ""
echo "📦 Bagimliliklar guncelleniyor..."
npm install --loglevel=warn

# 8. Build
echo ""
echo "🔨 Build aliniyor..."
npm run build:local
echo "✓ Build tamamlandi"

# 9. Stash geri al
if [[ "$STASHED" == "true" ]]; then
  echo ""
  echo "📂 Yerel degisiklikler geri yukleniyor..."
  git stash pop 2>&1 || echo "⚠ Stash pop conflict — elle cozmeniz gerekebilir: git stash pop"
fi

# 10. NPX cache temizle (kullanici ayni zamanda npx ile de kullaniyorsa)
echo ""
echo "🧹 NPX cache temizleniyor..."
if [[ -d "$HOME/.npm/_npx" ]]; then
  rm -rf "$HOME/.npm/_npx"
  echo "  ✓ NPX cache temizlendi"
else
  echo "  ℹ NPX cache bulunamadi (zaten temiz)"
fi

# 11. Yeni surum
NEW_VERSION=$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "?")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "$OLD_VERSION" == "$NEW_VERSION" ]]; then
  echo "✅ Zaten guncel: v$NEW_VERSION"
else
  echo "✅ Guncellendi: v$OLD_VERSION → v$NEW_VERSION"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  → AI aracinizi yeniden baslatin (Claude/Cursor)"
echo "  → Figma'da plugin'i kapatin ve tekrar acin"
echo "  → AI aracinizdan: 'figma_get_status' ile dogrulayin"
echo ""
