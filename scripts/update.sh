#!/bin/bash
set -euo pipefail

# F-MCP ATezer Bridge — Otomatik Güncelleme
# Mevcut kurulumu tespit eder, günceller, doğrular.

echo "=== F-MCP ATezer Bridge Güncelleme ==="
echo ""

# 1. OS kontrolü
OS="$(uname -s)"
if [[ "$OS" != "Darwin" && "$OS" != "Linux" ]]; then
  echo "❌ Bu script macOS ve Linux için. Windows: docs/WINDOWS-INSTALLATION.md"
  exit 1
fi

# 2. Node.js kontrolü
if ! command -v node &>/dev/null; then
  echo "❌ Node.js bulunamadı. Önce kurulum yapın: bash scripts/setup.sh"
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  echo "❌ Node.js 18+ gerekli. Mevcut: $(node -v)"
  echo "   Güncelleme: brew upgrade node (macOS) veya nodejs.org"
  exit 1
fi
echo "✓ Node.js $(node -v)"

# 3. Repo kök kontrolü
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ ! -f "$REPO_ROOT/package.json" ]]; then
  echo "❌ package.json bulunamadı. Bu script'i FMCP repo içinden çalıştırın."
  exit 1
fi

PKG_NAME=$(node -e "console.log(require('$REPO_ROOT/package.json').name)" 2>/dev/null || echo "")
if [[ "$PKG_NAME" != "@atezer/figma-mcp-bridge" ]]; then
  echo "❌ Bu FMCP reposu değil."
  exit 1
fi

cd "$REPO_ROOT"

# 4. Mevcut sürüm
OLD_VERSION=$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "?")
echo "✓ Mevcut sürüm: v$OLD_VERSION"

# 5. Yerel değişiklik kontrolü
if ! git diff --quiet 2>/dev/null; then
  echo ""
  echo "⚠ Yerel değişiklikler var. Stash yapılıyor..."
  git stash
  STASHED=true
else
  STASHED=false
fi

# 6. git pull
echo ""
echo "📥 Güncellemeler indiriliyor..."
git pull origin main 2>&1

# 7. npm install
echo ""
echo "📦 Bağımlılıklar güncelleniyor..."
npm install --loglevel=warn

# 8. Build
echo ""
echo "🔨 Build alınıyor..."
npm run build:local
echo "✓ Build tamamlandı"

# 9. Stash geri al
if [[ "$STASHED" == "true" ]]; then
  echo ""
  echo "📂 Yerel değişiklikler geri yükleniyor..."
  git stash pop 2>&1 || echo "⚠ Stash pop conflict — elle çözmeniz gerekebilir: git stash pop"
fi

# 10. NPX cache temizle
echo ""
echo "🧹 NPX cache temizleniyor..."
if [[ -d "$HOME/.npm/_npx" ]]; then
  rm -rf "$HOME/.npm/_npx"
  echo "  ✓ NPX cache temizlendi"
else
  echo "  ℹ NPX cache bulunamadı (zaten temiz)"
fi

# 11. Yeni sürüm
NEW_VERSION=$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "?")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "$OLD_VERSION" == "$NEW_VERSION" ]]; then
  echo "✅ Zaten güncel: v$NEW_VERSION"
else
  echo "✅ Güncellendi: v$OLD_VERSION → v$NEW_VERSION"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  → AI aracınızı yeniden başlatın (Claude/Cursor)"
echo "  → Figma'da plugin'i kapatın ve tekrar açın"
echo "  → AI aracınızdan: 'figma_get_status' ile doğrulayın"
echo ""
