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
| `npm run dev` | Derlenmis sunucuyu calistir (`dist/local-plugin-only.js`) |

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

## Yerel Gelistirme Ayarlari

`scripts/setup.sh` bu makinenin mutlak yoluyla `.mcp.json` ve `.cursor/mcp.json` yazar; ikisi de `.gitignore`'da, repoya girmez. Depoda calisirken skill/komut/ajanlari proje duzeyinde gormek isterseniz `.claude/{skills,commands,agents}` altina kendi sembolik baglarinizi kurun (bunlar da yok sayilir); FMCP eklenti olarak da kuruluysa ayni adlar iki kez listelenir.

Eklenti manifestine (`.claude-plugin/plugin.json`) dokunduysaniz: `claude plugin validate .`

## Adding a New Tool

1. `src/local-plugin-only.ts` icinde `server.registerTool(...)` ekle
2. `docs/TOOLS_FULL_LIST.md` tablosuna yeni araci ekle
3. README.md arac sayisini guncelle
4. `npm run build && npm test` ile dogrula
5. `npm run validate:fmcp-skills` ile skill uyumunu kontrol et

## Version Bump Checklist

Versiyon degistirirken bu dosyalari guncelle:
- `package.json` version
- `src/core/version.ts` `FMCP_VERSION` (sunucu ve kopru surumu buradan okur)
- `f-mcp-plugin/code.js` ve `f-mcp-plugin/ui.html` `FMCP_PLUGIN_VERSION`
- `.claude-plugin/plugin.json` ve `.cursor-plugin/plugin.json` version — eklenti kullanicilari guncellemeyi bu alandan anlar; degismezse yeni skill/komutlar onlara ulasmaz
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
3. `npm run build && npm test` basarili olsun
4. CHANGELOG.md'ye not ekle
5. PR olustur → CI otomatik calisir
