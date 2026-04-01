# Changelog

Bu dosya [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) bicimine uygundur. Surum numaralari [`package.json`](package.json) ile uyumludur.

**Surum takibi (kullanicilar icin):**

| Kanal | Aciklama |
|-------|----------|
| [GitHub Releases](https://github.com/atezer/FMCP/releases) | Surum etiketleri ve (yayimlandiginda) derlenmis notlar |
| [npm - @atezer/figma-mcp-bridge](https://www.npmjs.com/package/@atezer/figma-mcp-bridge) | Yayinlanan paket surumu; `npm view @atezer/figma-mcp-bridge version` ile kontrol |
| Bu dosya | Repoda her surum icin ozet degisiklik listesi |

Bu changelog'a ekleme oncesi surumlerin tam ayrintilari icin `git log` kullanilabilir.

## [Unreleased]

(Yaklasan degisiklikler buraya.)

## [1.2.2] - 2026-04-01

GitHub Release: [v1.2.2](https://github.com/atezer/FMCP/releases/tag/v1.2.2); govde: [docs/releases/v1.2.2-body.md](docs/releases/v1.2.2-body.md).

### Plugin (F-MCP Bridge)

- **Multi-client `fileKey`:** UI WebSocket `onopen` bazen plugin ana iş parçacığından gelen `FILE_IDENTITY` mesajından önce çalışıyordu; ilk `ready` `fileKey`/`fileName` olmadan gidince köprü (`PluginBridgeServer`) o client’ı `null` anahtarla listeliyordu. `pushBridgeFileIdentity()` eklendi: kimlik geldikten sonra açık soket varsa `ready` yeniden gönderiliyor; `figma_list_connected_files` ve `fileKey` ile yönlendirme tüm pencerelerde (FigJam + birden fazla Figma tarayıcı sekmesi) tutarlı çalışır.

### Dokumantasyon

- [README.md](README.md): Multi-client bölümünde kimlik zamanlaması notu (1.2.2+).
- [FUTURE.md](FUTURE.md): Sürüm satırı ve tamamlanan madde özeti.

## [1.2.1] - 2026-04-01

GitHub Release: [v1.2.1](https://github.com/atezer/FMCP/releases/tag/v1.2.1); govde: [docs/releases/v1.2.1-body.md](docs/releases/v1.2.1-body.md).

### Bridge

- **`figma_search_components`:** Cikti ozetine bileşen **`key`** alani eklendi; `figma_instantiate_component(componentKey)` akisi ile uyum.
- **`prepublishOnly`:** `npm publish` oncesi `build:local` + `validate:fmcp-skills` (Worker `build:cloudflare` ayri; npm paketi bin'leri `dist/local*.js`).

### Dokumantasyon

- **`docs/TOOLS.md`**, **`docs/TOOLS_FULL_LIST.md`:** `dist/local-plugin-only.js` ile parite; `figma_search_assets` / `figma_get_code_connect` / `figma_use` bu build'de kayitli degildir notu; `figma_search_components` + `key` aciklamasi.
- **`docs/FMCP_AGENT_CANVAS_COMPAT.md`:** Bolum 3 guncel envanter / planlanan ayrimi.
- **`docs/FIGMA_USE_STRUCTURED_INTENT.md`:** `figma_use` taslak; canli araç `figma_execute` notu.

## [1.2.0] - 2026-03-27

### Dokumantasyon

- Surum takibi ve guncelleme adimlari: [README.md](README.md#surum-ve-guncellemeler), [KURULUM.md](KURULUM.md#surum-takibi-ve-guncelleme-notlari).
- Bu changelog dosyasi eklendi; GitHub Releases ve npm ile birlikte tek referans olarak kullanilmalidir.
- GitHub [Release v1.2.0](https://github.com/atezer/FMCP/releases/tag/v1.2.0); govde: [docs/releases/v1.2.0-body.md](docs/releases/v1.2.0-body.md). Bakimci akisi: [docs/RELEASE_NOTES_TEMPLATE.md](docs/RELEASE_NOTES_TEMPLATE.md).

### Bakim ve dogrulama (2026-03)

- [FUTURE.md](FUTURE.md) kod taramasi: npm `@atezer/figma-mcp-bridge@1.2.0` dogrulandi; `dist/` ile `docs/TOOLS.md` Agent Canvas uclusu uyumsuzlugu not edildi (dokuman duzeltmesi S7'de acik).
- Figma Organization private plugin yayini tamamlandi (FUTURE S5).

### Not

Bu surum, npm paketi `@atezer/figma-mcp-bridge@1.2.0` ve depo kokundeki `package.json` ile hizalidir. Onceki surumlerin ayrintili kaydi bu dosyada baslamaktadir.
