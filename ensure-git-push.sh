#!/bin/bash
# Tum degisiklikleri commit edip GitHub'a push et; sonucu dosyaya yaz.
set -e
cd "$(dirname "$0")"
RESULT="git-push-result.txt"
{
  echo "=== $(date) ==="
  echo "=== git status (before) ==="
  git status --short
  echo ""
  echo "=== git add -A ==="
  git add -A
  echo "=== git status (after add) ==="
  git status --short
  echo ""
  if git diff --cached --quiet 2>/dev/null; then
    echo "=== Nothing to commit (working tree clean or already committed) ==="
  else
    echo "=== git commit ==="
    git commit -m "Docs + repo: README 32 arac tablosu, tum docs guncel; Token Browser satir duzeltmesi"
    echo ""
  fi
  echo "=== git push origin main ==="
  git push origin main
  echo ""
  echo "=== git status (final) ==="
  git status --short
  echo ""
  echo "=== git log -1 ==="
  git log -1 --oneline
  echo ""
  echo "=== DONE ==="
} 2>&1 | tee "$RESULT"
