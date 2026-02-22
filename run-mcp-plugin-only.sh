#!/bin/bash
# Plugin-only MCP (Puppeteer yok, sadece WebSocket 5454)
cd "$(dirname "$0")"
exec node dist/local-plugin-only.js
