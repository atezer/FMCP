# Changelog

Bu dosya [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) bicimine uygundur. Surum numaralari [`package.json`](package.json) ile uyumludur.

**Surum takibi (kullanicilar icin):**

| Kanal | Aciklama |
|-------|----------|
| [GitHub Releases](https://github.com/atezer/FMCP/releases) | Surum etiketleri ve (yayimlandiginda) derlenmis notlar |
| [npm - @atezer/figma-mcp-bridge](https://www.npmjs.com/package/@atezer/figma-mcp-bridge) | Yayinlanan paket surumu; `npm view @atezer/figma-mcp-bridge version` ile kontrol |
| Bu dosya | Repoda her surum icin ozet degisiklik listesi |

Bu changelog'a ekleme oncesi surumlerin tam ayrintilari icin `git log` kullanilabilir.

## [1.3.2] - 2026-04-02

### Bridge (hata duzeltmeleri)

- **Hafiza sizintisi duzeltmesi:** `tryListenAsync()` timeout yolunda `_listenResolve` temizlenmiyordu; tekrarlanan port degisikliklerinde bellek sisiyordu.
- **bridgeVersion:** Plugin welcome mesajinda `"1.1.0"` → `"1.3.2"` olarak guncellendi.
- **Versiyon tutarliligi:** McpServer version, `.cursor-plugin/plugin.json`, `package-lock.json` hepsi senkronize edildi.
- **Stale dist temizligi:** Silinen `figma-style-extractor` kaynak dosyasinin artik dist/ kopyalari kaldirildi.

## [1.3.1] - 2026-04-02

### Bridge (hata duzeltmeleri)

- **`restart()` race condition duzeltmesi:** `tryListenSync()` fire-and-forget yaklasimi yerine async Promise tabanli `tryListenAsync()` — port bind sonucu kesin olarak beklenir (500ms sabit delay kaldirildi).
- **`figma_set_port` concurrent koruma:** Mutex flag ile esanli cagrilarda "devam ediyor" hatasi; ikinci cagri onceki tamamlanmadan baslamaz.
- **`probePort().then()` eksik `.catch()`:** Probe hatalarinda `startError` set edilir, sessiz hata onlenir.
- **`_listenResolve` callback:** Basarili/basarisiz bind sonrasi async restart akisini bilgilendirir.

### Versiyon tutarliligi

- McpServer version: `"1.1.2"` → `"1.3.0"` (`local-plugin-only.ts`, `local.ts`)
- `.cursor-plugin/plugin.json`: `"1.2.1"` → `"1.3.0"`
- `package-lock.json` senkronize edildi

### Dokumantasyon

- `docs/TOOLS_FULL_LIST.md`: `figma_set_port` eklendi; arac sayisi 34 → 35

### Temizlik

- **Atil kod:** `figma-style-extractor.ts` (hic import edilmiyor) silindi; `extractVariant()` (hic cagrilmiyor) silindi
- **Orphan script'ler:** `launch-figma-debug.ps1/.sh`, `launch-figma-with-plugin.sh`, `plugin-ac.py` silindi
- **Archive duplicate:** `archive/skills-root-duplicate/` silindi (`.cursor/skills/f-mcp/` ile ayni)

## [1.3.0] - 2026-04-02

### Bridge (port yonetimi)

- **`figma_set_port` araci (YENi):** Runtime'da WebSocket bridge portunu degistirme. Port mesgulse AI araci (Claude/Cursor) `figma_set_port(5456)` cagirarak baska bir porta gecer; Figma plugin'de ayni portu secince baglanti kurulur. Aralik: 5454-5470.
- **Port catismasi artik oldurucu degil:** Port mesgulse `process.exit(1)` yerine MCP stdio sunucusu ayakta kalir ve `figma_get_status` uzerinden hata mesaji doner. Kullanici `figma_set_port` ile farkli porta gecebilir.
- **`figma_get_status` genisledi:** `bridgeListening`, `startError` alanlari eklendi; bridge dinlemiyorsa net hata mesaji ve port degistirme yonlendirmesi.
- **`PluginBridgeServer` yeni API'ler:** `restart(port)`, `getPort()`, `isListening()`, `getStartError()` metodlari eklendi.

### Coklu AI araci (ayni anda Claude + Cursor)

- Claude Desktop ve Cursor ayni anda calistiginda port catismasini cozen akis: ilk acilan varsayilan portu (5454) alir, ikinci acilan `figma_set_port` ile farkli porta gecer. Her AI araci kendi bridge'i uzerinden bagimsiz calisir.

### Bridge (onceki unreleased)

- **Sabit port stratejisi:** Otomatik port taramasi (5454-5470 sirali deneme) kaldirildi. Bridge artik yapilandirilan porta dogrudan baglanir; port mesgulse HTTP health-check ile canli F-MCP / olu surec / farkli servis ayirt edilir; olu port icin kisa gecikmeli tek retry.
- **Graceful shutdown:** `local-plugin-only.ts`'e SIGINT/SIGTERM handler eklendi -- IDE veya Claude kapandiginda `bridge.stop()` cagrilarak port aninda serbest birakilir (olu port sorununun ana duzeltmesi).
- **probePort edge case:** `FIGMA_BRIDGE_HOST=0.0.0.0` durumunda port probe'u `127.0.0.1` uzerinden yapilir.

### Dokumantasyon

- [docs/MULTI_INSTANCE.md](docs/MULTI_INSTANCE.md): "Tek MCP = tum pencereler ayni oturum" bolumu, **"Paralel gorevler (Claude + Cursor + ikinci hat)"** bolumu (mimari, port tablosu, plugin Advanced uyarisi, Cursor paylasimli MCP notu, audit log cakisma notu).
- [docs/CLAUDE_DESKTOP_CONFIG.md](docs/CLAUDE_DESKTOP_CONFIG.md): coklu `mcpServers` ornegi (5455 + 5470 farkli sunucu adlariyla).
- [KURULUM.md](KURULUM.md): Claude config "sik gorulen hatalar" ozeti.
- [README.md](README.md): Port catismasi uyarisi guncellemesi.

### Araclar

- `npm run check-ports` -- [`scripts/check-ports.sh`](scripts/check-ports.sh): 5454-5470 arasinda LISTEN durumundaki surecleri listeler (paralel gorev dogrulamasi ve sorun giderme icin).

### Cursor skills (F-MCP)

- Yeni skill'ler: `audit-figma-design-system`, `fix-figma-design-system-finding`, `apply-figma-design-system` (tuval ici design system audit/fix/apply; F-MCP Bridge arac eslemesi).
- Mevcut F-MCP skill'lerine karsilikli **F-MCP skill koordinasyonu** bolumleri eklendi.
- Tuval skill'lerinde `figma_get_metadata` kaldirildi; Bridge ile uyum icin `figma_get_file_data` / `figma_get_component` / `figma_get_design_context` eslemesi; **design-drift-detector** koordinasyonunda tipik sira (implement - drift) netlestirildi; **audit** icinde zincir performans notlari.
- [.cursor/skills/f-mcp/SKILL_INDEX.md](.cursor/skills/f-mcp/SKILL_INDEX.md): tum skill'lerin dizini, workspace koku (FCM) notu, ozet akis.
- `npm run validate:fmcp-skills` -- [`scripts/validate-fmcp-skills-tools.mjs`](scripts/validate-fmcp-skills-tools.mjs): skill `.md` icindeki `figma_*` adlarini `src/local.ts`, `src/local-plugin-only.ts`, `src/core/figma-tools.ts` icindeki `registerTool` birlesimne gore dogrular.
- GitHub Actions: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) -- `master` / `main` icin PR ve push'ta `npm run validate:fmcp-skills` zorunlu.

### Plugin (F-MCP Bridge)

- Gelismis panel: **Otomatik tara** dugmesi -- port alaniyla tek porta kilitlenmeyi kaldirip 5454-5470 taramasini yeniden baslatir.
- Advanced panel kapatildiginda ayni kilit kalkar (ilk yuklemede cift baglanti tetiklenmez).

### Surec (bakimcilar)

- Sonraki surum: `CHANGELOG.md` guncelle - `docs/releases/vX.Y.Z-body.md` olustur - [RELEASE_NOTES_TEMPLATE.md](docs/RELEASE_NOTES_TEMPLATE.md) icindeki `gh release create` / `gh release edit` ile GitHub Release ac veya guncelle.

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
