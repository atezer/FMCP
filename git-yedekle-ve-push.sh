#!/bin/bash
# Tüm projeyi Git'e yedekle ve GitHub'a (atezer/FMCP) push et - eksiksiz
# Tek seferde: init, add, commit, remote, push

set -e
cd "$(dirname "$0")"
REPO_URL="https://github.com/atezer/FMCP.git"

echo "=== F-MCP Bridge → Git yedek + GitHub push ==="

if [ ! -d .git ]; then
  git init
  git branch -M main
  echo "[OK] Git repo oluşturuldu."
fi

git add -A
echo "[OK] Tüm dosyalar stage edildi (.gitignore hariç)."

if git diff --cached --quiet 2>/dev/null; then
  echo "[OK] Zaten commit edilmiş, değişiklik yok."
else
  git commit -m "F-MCP ATezer Bridge: MCP sunucusu ve Figma plugin (eksiksiz yedek)"
  echo "[OK] Commit yapıldı."
fi

if git remote get-url origin 2>/dev/null; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi
echo "[OK] Remote: $REPO_URL"

echo "Push ediliyor..."
git push -u origin main
echo ""
echo "=== Bitti. Proje yedeklendi ve https://github.com/atezer/FMCP adresine push edildi. ==="
