# Contributing to F-MCP Bridge

## Quick Setup

```bash
git clone https://github.com/atezer/FMCP.git
cd FMCP
npm install
npm run build:local
npm test
```

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run build:local` | TypeScript derleme |
| `npm test` | Jest testleri calistir |
| `npm run test:watch` | Test izleme modu |
| `npm run validate:fmcp-skills` | Skill/tool isim eslesmesi |
| `npm run dev:plugin-only` | Plugin-only modu calistir |

## Project Structure

```
src/
  local-plugin-only.ts  — Plugin-only MCP giris noktasi (onerilen)
  local.ts              — Tam mod (CDP + REST)
  core/
    plugin-bridge-server.ts   — WebSocket sunucusu
    plugin-bridge-connector.ts — Plugin iletisimi
    response-guard.ts          — Cevap kirpma (context korumasi)
    types/figma.ts            — Tip tanimlari
f-mcp-plugin/
  code.js     — Figma plugin kodu
  ui.html     — Plugin UI
  manifest.json
tests/
  core/       — Birim testler
```

## Adding a New Tool

1. `src/local-plugin-only.ts` icinde `server.registerTool(...)` ekle
2. `docs/TOOLS_FULL_LIST.md` tablosuna yeni araci ekle
3. README.md arac sayisini guncelle
4. `npm run build:local && npm test` ile dogrula
5. `npm run validate:fmcp-skills` ile skill uyumunu kontrol et

## Version Bump Checklist

Versiyon degistirirken bu dosyalari guncelle:
- `package.json` version
- `src/local-plugin-only.ts` McpServer version
- `src/local.ts` McpServer version
- `src/core/plugin-bridge-server.ts` bridgeVersion
- `.cursor-plugin/plugin.json` version
- `README.md` ornek versiyon
- `FUTURE.md` paket surumu
- `CHANGELOG.md` yeni giris

CI otomatik versiyon tutarliligi kontrol eder.

## Testing

```bash
npm test                    # Tum testler
npm run test:coverage       # Coverage raporu
npm run test:watch          # Izleme modu
```

Test dosyalari: `tests/core/` altinda. Saf fonksiyonlar (response-guard, figma-url) test edilir.

## Pull Request

1. Yeni branch olustur
2. Degisiklikleri yap
3. `npm run build:local && npm test` basarili olsun
4. CHANGELOG.md'ye not ekle
5. PR olustur → CI otomatik calisir
