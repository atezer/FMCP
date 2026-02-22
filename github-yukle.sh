#!/bin/bash
# GitHub'a eksiksiz yükleme - tek script
# Kullanım: ./github-yukle.sh
# İsteğe bağlı: ./github-yukle.sh https://github.com/KULLANICI/REPO.git

set -e
cd "$(dirname "$0")"

echo "=== F-MCP Bridge → GitHub ==="

if [ ! -d .git ]; then
  git init
  git branch -M main
  echo "Git repo oluşturuldu."
else
  echo "Mevcut repo kullanılıyor."
fi

git add .
N=$(git status --short | wc -l | tr -d ' ')
echo "Staged: $N dosya"

if git diff --cached --quiet 2>/dev/null; then
  echo "Commit edilecek değişiklik yok (zaten güncel)."
else
  git commit -m "F-MCP ATezer Bridge: MCP sunucusu ve Figma plugin (eksiksiz)"
  echo "Commit yapıldı."
fi

if [ -n "$1" ]; then
  URL="$1"
  if git remote get-url origin 2>/dev/null; then
    git remote set-url origin "$URL"
  else
    git remote add origin "$URL"
  fi
  echo "Remote: $URL"
  git push -u origin main
  echo "Push tamamlandı."
else
  echo ""
  echo "Push için scripti URL ile çalıştırın:"
  echo "  ./github-yukle.sh https://github.com/atezer/FMCP.git"
  echo ""
fi
