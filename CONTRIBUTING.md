# Contributing to F-MCP Bridge

## Quick Setup

```bash
git clone https://github.com/atezer/FMCP.git
cd FMCP
npm install
npm run build
npm test
```

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | TypeScript derleme |
| `npm test` | Jest testleri calistir |
| `npm run test:watch` | Test izleme modu |
| `npm run validate:fmcp-skills` | Skill/tool isim eslesmesi |

## Project Structure

```
src/
  local-plugin-only.ts  — Plugin-only MCP giris noktasi (onerilen)
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
4. `npm run build && npm test` ile dogrula
5. `npm run validate:fmcp-skills` ile skill uyumunu kontrol et

## Version Bump Checklist

1. `package.json` surumunu degistir (`npm version <surum> --no-git-tag-version`; `package-lock.json` da guncellenir)
2. `npm run sync-version` calistir: `src/core/version.ts`, `f-mcp-plugin/code.js` + `ui.html`, `manifest.json`, `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `KURULUM.md`, `docs/TOOLS.md` damgalarini ve arac/skill/komut sayilarini esitler
3. Elle: `README.md` surum rozeti ve "Guncel surum" satiri, `CHANGELOG.md` yeni giris

CI `npm run check:versions` ile tutarliligi denetler. Eklenti manifestlerindeki `version` alani sabitleyicidir: degismezse eklenti kullanicilari yeni skill ve komutlari almaz.

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
3. `npm run build && npm test` basarili olsun
4. CHANGELOG.md'ye not ekle
5. PR olustur → CI otomatik calisir
