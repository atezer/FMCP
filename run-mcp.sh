#!/bin/bash
# MCP sunucusunu proje dizininden çalıştırır (Cursor/Claude config'te kullanılabilir)
cd "$(dirname "$0")"
exec node dist/local.js
