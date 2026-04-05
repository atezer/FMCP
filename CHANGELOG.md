# Changelog

Bu dosya [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) bicimine uygundur. Surum numaralari [`package.json`](package.json) ile uyumludur.

**Surum takibi (kullanicilar icin):**

| Kanal | Aciklama |
|-------|----------|
| [GitHub Releases](https://github.com/atezer/FMCP/releases) | Surum etiketleri ve (yayimlandiginda) derlenmis notlar |
| [npm - @atezer/figma-mcp-bridge](https://www.npmjs.com/package/@atezer/figma-mcp-bridge) | Yayinlanan paket surumu; `npm view @atezer/figma-mcp-bridge version` ile kontrol |
| Bu dosya | Repoda her surum icin ozet degisiklik listesi |

Bu changelog'a ekleme oncesi surumlerin tam ayrintilari icin `git log` kullanilabilir.

## [1.7.8] - 2026-04-05

### Fix
- **CI version consistency:** Kaynak dosyalardaki (local.ts, local-plugin-only.ts, plugin-bridge-server.ts) versiyon stringleri package.json ile senkronize edildi. CI "Version consistency check" artik basarili.

## [1.7.6] - 2026-04-05

### component-documentation Skill (YENi — 18. skill)

- **Format secimi zorunlu:** Standard (~2400px) ve Compact (~1300px) secenekleri kullaniciya sunulur, onay olmadan frame olusturulmaz
- **Gorsel Do/Dont ornekleri:** Gercek component instance'lariyla dogru/yanlis cift kartlar (hiyerarsi, etiket, variant kullanimi)
- **Endustri standartlari referansi:** `reference_industry_design_standards.md` hafiza dosyasi (14 bolum: M3, HIG, WCAG 2.2, shadcn/ui, Tailwind, Radix, Lucide, DTCG)
- **Yillik guncelleme:** Standart kontrolu 1 yildan eskiyse kullaniciya guncelleme onerisi (9 kaynak)
- **SKILL_INDEX.md:** 17→18 skill, "Dokumantasyon" kategorisi eklendi

### generate-figma-library Skill (Zenginlestirme)

- **Token baglama tablosu:** fill, text fill, stroke, strokeWeight, radius, padding, gap, minHeight, fontSize — tum degerlerin variable'a bagli olmasi zorunlu
- **Text hizalama kurali:** Bilesen tipine gore textAlignHorizontal tablosu (Button=CENTER, Input=LEFT vb.)
- **Bilesen sizing kurali:** Button/Tag=HUG, Input=FILL — Fixed width butonlarda yazi ortalanmaz
- **Code only props:** `layoutPositioning = "ABSOLUTE"` zorunlu — auto-layout gap'te bosluk yaratmayi onler
- **Component set olusturma:** `figma_arrange_component_set` + sonrasinda `figma_execute` ile stroke/auto-layout/rename

### Plugin Bug Fix

- **`figma_arrange_component_set`:** `getNodeById` → `getNodeByIdAsync` duzeltildi (documentAccess: dynamic-page hatasi)

### FUTURE.md

- P2: Component documentation skill'inin diger bilesen tiplerinde testi (Input, Card, Modal, Nav)

## [1.7.4] - 2026-04-04

### Graceful Port Takeover — Oturum Gecisi Sorunu Cozuldu

**Bridge (plugin-bridge-server.ts):**
- **Graceful shutdown endpoint (`POST /shutdown`):** HTTP server'a `/shutdown` endpoint'i eklendi. Yeni bridge instance'i eskisine shutdown istegi gonderir, eski bridge gracefully kapanir.
- **`requestShutdownAndRetry()` metodu (YENi):** Port mesgulse ve baska bir F-MCP bridge tespit edilirse, otomatik olarak shutdown istegi gonderir + ayni portu devralir. Plugin port degisikligi gerektirmez.
- **Port stratejisi guncellendi:** "no auto-scanning" → "graceful takeover". Eski oturum kapandiginda yeni oturum ayni portu (varsayilan 5454) devralir, plugin otomatik baglanir.
- **Eski davranis (kaldirildi):** Port mesgulse hata verip kullanicidan `figma_set_port` cagrisi bekliyordu. Artik otomatik devralma yapiyor.

**Etki:** Claude Code / Cursor'da yeni oturum baslatildiginda eski oturumun bridge'i portu tutuyordu. Kullanicinin plugin'de portu elle degistirmesi gerekiyordu. Artik yeni bridge eskisini otomatik kapatip portu devralir.

## [1.7.2] - 2026-04-04

### Kapsamli Entegrasyon Testi + 11 Skill Guncelleme + Code-Only Props

**Test:**
- Uctan uca entegrasyon testi: 46 arac, 17 skill, 11 faz
- 120 token (Primitives + Primitives Dark + Semantic), 6 ekran (3 boyut x 2 tema), 1 component set (5 variant)
- 10 dosya uretildi: 3 kod (React/Swift/Kotlin), 5 token (CSS/Tailwind/Swift/Kotlin/JSON), 1 handoff
- WCAG AA erisebilirlik: tum renk ciftleri PASS, tum touch target >= 44px

**Skill duzeltmeleri (9):**
- `audit/apply-figma-design-system`: figma_take_screenshot → figma_capture_screenshot
- `ai-handoff-export`: figma_get_component_details → figma_get_component_for_development
- `implement-design`: componentId → nodeId
- `figma-screen-analyzer`: DS compliance formulu duzeltildi
- `ds-impact-analysis`: sayfa limiti 5→20, transitif bagimlilik eklendi
- `fix-figma-design-system-finding`: 3 remediasyon modu kod ornegi
- `generate-figma-library`: batch hata yonetimi pattern

**Skill zenginlestirmeleri (20):**
- Token description + code syntax (Web/Android/iOS) zorunlu adimi
- Semantic Token = Alias zorunlu kurali
- Breakpoint / ekran boyut token'lari
- Dark mode token stratejisi (Pro+ native vs Free workaround)
- Code-Only Props katmani (Nathan Curtis yaklasimi)
- Responsive boyut presetleri (3 boyut + dark = 6 ekran zorunlu)
- MinHeight token binding zorunlu adimi
- A11y annotation frame (baslik hiyerarsisi, form iliskilendirme, odak sirasi, alt text, dinamik icerik)
- Erisebilirlik-tasarim tutarlilik kontrolu (7 kural)
- Code-Only Props spec data cikarma (handoff)

**FUTURE.md eklemeleri:**
- P0: Figma Make entegrasyonu + canli prototip sureci
- P0: Figma prototip baglantilari + animasyonlar
- P1: Figma Dev Mode entegrasyonu

## [1.7.0] - 2026-04-04 (guncelleme)

### Claude Code Destegi ve Test Raporu (YENi)

- **README: Claude Code kurulum bolumu eklendi.** `.mcp.json` dosyasi ile NPX tabanli config. `~/.claude/settings.json`'in MCP icin calismadigina dair uyari notu.
- **`.mcp.json` guncellendi:** Cursor'a ozel bash script yerine evrensel NPX config (hem Claude Code hem Cursor ile uyumlu).
- **`docs/TEST_REPORT.md` (YENi):** 46 aracin tamami test edildi (40 PASS, 4 beklenen Figma kisiti, 2 guvenlik nedeniyle SKIP). Free/Pro/Org/Enterprise plan bazli yetenek matrisi. Adim adim test rehberi.

## [1.7.0] - 2026-04-03

### Coklu Port + Otomatik AI Araci Tespiti (YENi)

- **Plugin coklu port baglantisi:** 5454-5470 arasini periyodik tarar (10s), bulunan tum bridge'lere sessizce baglanir.
- **AI araci otomatik tespiti:** Bridge parent process'ten (Claude, Cursor, Claude Code, Windsurf) veya `FIGMA_MCP_CLIENT_NAME` env var'dan otomatik tespit. Welcome mesajinda `clientName` gonderilir.
- **Port gecis UI:** ◀▶ ok tuslariyla bagli portlar arasi gecis. Status bar'da "Ready" + aktif port etiketi.
- **(i) info paneli:** Tiklaninca bagli portlar listesi acilir (● aktif ○ digerleri).
- **"Otomatik tara" butonu kaldirildi:** Coklu port bunu otomatik yapar.
- **SVG/PNG export duzeltmesi:** `batchExportNodes` handler + result case eklendi (timeout sorunu cozuldu).
- **Token disabled:** Token girildikten sonra input + sure secici disabled (sadece sil + yeniden ekle).
- **Responsive layout:** Icerik tasma onlendi, sabit genislik sadece yukseklik dinamik.
- **Plugin max height:** 420→700 (icerik kesilmez).

## [1.6.3] - 2026-04-03

### Dokumantasyon temizligi

- **28→21 aktif dokuman:** 10 dosya arsivlendi (OAUTH_SETUP, SELF_HOSTING, DEPLOYMENT_COMPARISON, CLAUDE_DESKTOP_CONFIG, FIGMA_USE, FMCP_AGENT_CANVAS_COMPAT, RECONSTRUCTION_FORMAT, PUBLISH-PLUGIN, DEPENDENCY_LAYERS, RELEASE_NOTES_TEMPLATE + root: SECURITY_FIXES_ANALYSIS, HANDOFF_TEMPLATE)
- **Kirik link: 0** — tum referanslar guncellendi veya kaldirildi
- **README sadeleştirildi:** Dokuman tablosu kullanici odakli, gereksiz satirlar kaldirildi
- **TOOLS.md:** Agent Canvas referanslari v1.6 araclariyla guncellendi

## [1.6.2] - 2026-04-02

### Dokumantasyon duzeltmeleri

- README: 5 kirik archived link duzeltildi, figma_export_nodes eklendi, REST_API_GUIDE + CONTRIBUTING referanslari eklendi
- README: "33 arac" → "46 arac", tekrar eden satirlar kaldirildi
- FUTURE.md: 9 tamamlanan P0-P3 maddesi isaretlendi
- KURULUM.md: versiyon 1.2.0 → 1.6.2

## [1.6.1] - 2026-04-02

### Batch Export (YENi — 1 tool)

- **`figma_export_nodes`**: SVG/PNG/JPG/PDF batch export (1-50 node). Plugin exportAsync kullanir, REST token gerektirmez. Base64 ciktisi, olceklendirilebilir (0.5-4x). SVG vektorel koruma, outline text ve node ID options.
- **`BATCH_EXPORT_NODES`** plugin handler eklendi (code.js). Promise.all ile paralel export, node basina hata yonetimi.
- **Connector**: `batchExportNodes()` metodu eklendi.
- **Tip tanimlari**: `PluginExportResult`, `PluginBatchExportPayload` (types/figma.ts).

### Toplam: 46 arac (onceki: 45)

## [1.6.0] - 2026-04-02

### Tasarim Olusturma Araclari (YENi — 4 tool)

- **`figma_create_frame`**: Yeni frame olusturma (x, y, boyut, renk, parentId)
- **`figma_create_text`**: Yeni metin node'u (font, boyut, renk)
- **`figma_create_rectangle`**: Dikdortgen olusturma (boyut, renk, cornerRadius)
- **`figma_create_group`**: Mevcut node'lari gruplama

### Kutüphane ve Tanilama (YENi — 2 tool)

- **`figma_search_assets`**: Takim kutuphanesi variable collection arama (plugin teamLibrary API)
- **`figma_plugin_diagnostics`**: Plugin saglik kontrolu (uptime, bellek, baglanti, port, rate limit)

### Dokumantasyon

- **CONTRIBUTING.md**: Yerel kurulum, test, tool ekleme, versiyon guncelleme rehberi
- **docs/REST_API_GUIDE.md**: Token kurulumu, ornek cagrilar, hibrit akis, rate limit yonetimi
- **npm keywords**: design-system, design-tokens, ui-automation, zero-trust, cursor, agent eklendi

### Toplam: 45 arac (onceki: 39)

## [1.5.2] - 2026-04-02

### Test altyapisi

- **36 test:** response-guard.ts (18 test) + figma-url.ts (16 test) + basic (2 test)
- **CI'a test adimi eklendi:** `npm test` her push/PR'da otomatik calisir
- **Coverage config:** Plugin-only modula odakli; tam mod dosyalari haric tutuldu
- **Test dosyalari:** `tests/core/response-guard.test.ts`, `tests/core/figma-url.test.ts`

## [1.5.1] - 2026-04-02

### TypeScript tip guvenligi

- **Yeni tip dosyasi:** `src/core/types/figma.ts` — RGBColor, FigmaVariable, FigmaVariableCollection, FigmaPaintStyle, FigmaTextStyle, FigmaComponent, PluginVariablesPayload, PluginStylesPayload, PluginComponentPayload vb.
- **Plugin-only `any` azaltma:** 34 → 5 (%85 azalma). Kalan 5: Zod sema (z.any) ve resolvedType cast.
- **Connector `any` azaltma:** 46 → 1 (%98 azalma). Tum Promise<any> donusleri tipli hale getirildi.
- **Bridge server `any` azaltma:** 3 → 1 (%67). WebSocket mesaj tipleri iyilestirildi.
- **Plugin minify geri alindi:** esbuild minify Figma sandbox'inda "Syntax error" olusturuyordu. Orijinal code.js geri yuklendi.

## [1.5.0] - 2026-04-02

### Plugin optimizasyonu

- **Plugin minify:** `f-mcp-plugin/code.js` esbuild ile minify (101KB→65KB, %37 kucuk). `build:plugin` script eklendi; `prepublishOnly` otomatik minify.

### CI/CD guclendirme

- **TypeScript tip kontrolu:** `tsc --noEmit` CI'a eklendi — derleme hatalari artik otomatik yakalaniyor.
- **Build dogrulama:** `npm run build:local` CI'da calistirilir.
- **Versiyon tutarlilik kontrolu:** CI, `package.json` versiyonunun `src/` dosyalariyla eslesip eslesmedigini otomatik kontrol ediyor.
- **Guvenlik taramas:**: `npm audit` CI'a eklendi.

### Temizlik

- **Archive silindi:** 8.1 MB gereksiz dosya (eski zip, gorseller, eski surum dosyalari) — git gecmisinde mevcut.
- **Belgeler arsivlendi:** 6 tekrar eden / eski belge `docs/archived/` klasorune tasinarak aktif belge sayisi 30→24'e indirildi.
- **TODO'lar temizlendi:** `enrichment-service.ts` ve `style-resolver.ts`'deki 6 TODO/FIXME notu aciklayici yorumlarla degistirildi. Kaynak kodda sifir TODO.

## [1.4.4] - 2026-04-02

### Versiyon tutarliligi (kesin duzeltme)

- Tum kaynak kod, dokuman, config ve dist dosyalarindaki versiyon string'leri 1.4.4 olarak senkronize.
- npm paketi guncel dist ile yeniden yayinlandi (onceki 1.4.3 npm'de eski dist icerebiliyordu).
- NPX ornekleri @latest kullanacak sekilde guncellendi.

## [1.4.3] - 2026-04-02 [NOT: npm paketi eski dist icerebilir, 1.4.4 kullanin]

### Versiyon tutarliligi

- Tum kaynak kod, dokuman ve config dosyalarindaki versiyon referanslari senkronize edildi.

## [1.4.2] - 2026-04-02

### Kritik duzeltme

- **dist/browser pakete geri eklendi:** v1.4.1'de tam mod (local.js) `dist/browser/local.js`'i import ediyordu ama dosya paketten cikarilmisti → MODULE_NOT_FOUND hatasi. `dist/cloudflare/` haric tutuldu (bu kullanilmiyor).

## [1.4.1] - 2026-04-02 [YANLIS — tam mod kirik, 1.4.2 kullanin]

### npm paket optimizasyonu

- **Paket boyutu:** 284 KB → 230 KB (%19 kucuk), acik 1.7 MB → 1.2 MB (%30 kucuk)
- **Dosya sayisi:** 128 → 96 (32 gereksiz dosya cikarildi)
- **Cikarilan:** `dist/cloudflare/` (440 KB), `dist/browser/` (44 KB) — plugin-only modda kullanilmiyordu
- **Korunan:** `dist/local.js` (tam mod), `dist/core/` (paylasimli), `f-mcp-plugin/`

## [1.4.0] - 2026-04-02

### Figma REST API entegrasyonu (YENi)

- **`figma_set_rest_token`**: Figma REST API token girisi (figd_... formati). Token dogrulama (/v1/me), 10s timeout.
- **`figma_rest_api`**: Direkt REST API cagrisi (export, comments, versions, teams). Endpoint-bazli akilli kirpma, 429 retry (3 deneme, exponential backoff), rate limit on kontrolu.
- **`figma_get_rest_token_status`**: Token durumu, rate limit bilgisi, dusuk limit uyarisi.
- **`figma_clear_rest_token`**: Token temizleme.

### Response Guard — Context korumasi

- **`response-guard.ts`**: Paylasimli cevap kirpma modulu. AI context penceresi tasmamasini onler.
- **Endpoint-bazli kirpma**: comments → son 20, versions → son 10, files → ilk 20 sayfa (children stripped).
- **Boyut limitleri**: 200KB ustu otomatik kirpma. Gercek test: 237KB → 10KB (comments), 533KB → 1KB (file).
- **AI bilgilendirme**: Kirpilan cevaplara `_truncated` ve `_responseGuard` metadata eklenir.

### 429 Rate Limit korumalari

- **Otomatik retry**: 429 durumunda 3 deneme, Retry-After header veya exponential backoff (5s→10s→20s), max 45s.
- **On kontrol**: remaining=0 → kisa devre hata; remaining<10 → cevaba uyari blogu.
- **Rate limit broadcast**: Her REST cagrisindan sonra guncellenen limitler tum plugin'lere bildirilir.

### Plugin UI — Token ve limit yonetimi

- **Token girisi**: Advanced panelinde sifrelenmis input + sure secici (1/7/30/90 gun).
- **Kalici depolama**: `figma.clientStorage` ile token plugin kapatilip acilsa bile kalir. Sure dolunca otomatik temizlenir.
- **Otomatik restore**: Plugin acildiginda → clientStorage → UI + bridge otomatik gonderi.
- **Rate limit gostergesi**: Kullanim bar'i (yesil/sari/kirmizi), dusuk limit uyarisi (%20), kritik uyari (%5, nabiz animasyonu), doldu mesaji.
- **Token suresi**: Kalan gun sayaci + bitis tarihi; ≤7 gun sari uyari, dolmus → kirmizi + otomatik silme.

### Kod kalitesi

- **`response-guard.ts`** yeni modul: `estimateTokens()`, `calculateSizeKB()`, `truncateResponse()`, `truncateRestResponse()`.
- **Port degisiminde token koruma**: `restart()` token'i save/restore eder.
- **Token reconnect**: WebSocket yeniden baglandiginda kaydedilmis token otomatik gonderilir.

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
