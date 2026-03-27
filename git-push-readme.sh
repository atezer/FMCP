#!/bin/bash
# Tüm doküman ve proje değişikliklerini commit + push et
set -e
cd "$(dirname "$0")"
git add -A
git status --short
git commit -m "Docs: README 32 araç tablosu, tüm docs güncel; ONBOARDING, TROUBLESHOOTING, TOOLS_FULL_LIST, Dev Mode; ROADMAP kaldırıldı; docs tablosu PORT/GITHUB_YUKLEME eklendi"
git push origin main
echo "GitHub güncellendi."
