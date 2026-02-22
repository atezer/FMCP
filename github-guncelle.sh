#!/bin/bash
# Tüm değişiklikleri commit edip GitHub'a push eder.
set -e
cd "$(dirname "$0")"
echo "=== Git durumu ==="
git status
echo ""
echo "=== Tüm dosyalar ekleniyor ==="
git add -A
echo ""
if git diff --cached --quiet; then
  echo "Commit edilecek yeni değişiklik yok. GitHub zaten güncel olabilir."
  git log -1 --oneline
else
  echo "=== Commit atılıyor ==="
  git commit -m "docs: README ve BITBUCKET-README güncellemesi - projeyi birebir yansıtıyor, kırık linkler düzeltildi"
  echo ""
  echo "=== GitHub'a push ediliyor ==="
  git push origin main
  echo ""
  echo "GitHub güncellendi."
fi
