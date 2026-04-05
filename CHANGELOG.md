# Changelog

Bu dosya [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) biçimine uygundur. Sürüm numaraları [`package.json`](package.json) ile uyumludur.

**Sürüm takibi (kullanıcılar için):**

| Kanal | Açıklama |
|-------|----------|
| [GitHub Releases](https://github.com/atezer/FMCP/releases) | Sürüm etiketleri ve (yayımlandığında) derlenmiş notlar |
| [npm - @atezer/figma-mcp-bridge](https://www.npmjs.com/package/@atezer/figma-mcp-bridge) | Yayınlanan paket sürümü; `npm view @atezer/figma-mcp-bridge version` ile kontrol |
| Bu dosya | Repoda her sürüm için özet değişiklik listesi |

Bu changelog'a ekleme öncesi sürümlerin tam ayrıntıları için `git log` kullanılabilir.

## [1.7.9] - 2026-04-05

### Türkçe Karakter Düzeltmesi (Kapsamlı)

**Kök neden düzeltmesi:**
- **7 skill'e Türkçe Karakter Kuralı eklendi:** generate-figma-screen, generate-figma-library, implement-design, ai-handoff-export, component-documentation, figma-a11y-audit, figma-screen-analyzer. Tüm Türkçe metin üretiminde doğru Unicode karakter kullanımı artık zorunlu.

**Skill iç düzeltmeleri:**
- **component-documentation/SKILL.md:** Dosyanın tamamı (~52 satır) ASCII Türkçe → doğru Unicode'a dönüştürüldü
- **generate-figma-library/SKILL.md:** Satır 166-425 arası Kritik Kurallar bölümü (~35 satır) düzeltildi

**Test output dosyaları:**
- **HANDOFF.md:** ~37 düzeltme (Geliştirici → Geliştirici, Şifre, Bileşen, Erişebilirlik vb.)
- **LoginScreen.tsx:** 2 düzeltme ("Sifre" → "Şifre")
- **LoginView.swift:** 3 düzeltme ("Sifre" → "Şifre", "Hesabiniz" → "Hesabınız")
- **LoginScreen.kt:** 2 düzeltme ("Sifre" → "Şifre", "Hesabiniz" → "Hesabınız")

**Figma tasarım dosyası:**
- 48+ text node ve frame ismi düzeltildi (A11y Annotations panel, component documentation frame dahil)
- İteratif doğrulama döngüsü: 3 tur tarama ile 327 text node'da 0 kalan hata

**Dokümantasyon:**
- TEST_REPORT.md, FUTURE.md, CHANGELOG.md — tüm ASCII Türkçe düzeltildi

**Yanlış pozitif koruması:** "Şifremi unuttum" (6 instance korundu), kod identifier'ları ve token isimleri değişmedi.

## [1.7.8] - 2026-04-05

### Fix
- **CI version consistency:** Kaynak dosyalardaki (local.ts, local-plugin-only.ts, plugin-bridge-server.ts) versiyon stringleri package.json ile senkronize edildi. CI "Version consistency check" artık başarılı.

## [1.7.6] - 2026-04-05

### component-documentation Skill (YENİ — 18. skill)

- **Format seçimi zorunlu:** Standard (~2400px) ve Compact (~1300px) seçenekleri kullanıcıya sunulur, onay olmadan frame oluşturulmaz
- **Görsel Do/Dont örnekleri:** Gerçek component instance'larıyla doğru/yanlış çift kartlar (hiyerarşi, etiket, variant kullanımı)
- **Endüstri standartları referansı:** `reference_industry_design_standards.md` hafıza dosyası (14 bölüm: M3, HIG, WCAG 2.2, shadcn/ui, Tailwind, Radix, Lucide, DTCG)
- **Yıllık güncelleme:** Standart kontrolü 1 yıldan eskiyse kullanıcıya güncelleme önerisi (9 kaynak)
- **SKILL_INDEX.md:** 17→18 skill, "Dokümantasyon" kategorisi eklendi

### generate-figma-library Skill (Zenginleştirme)

- **Token bağlama tablosu:** fill, text fill, stroke, strokeWeight, radius, padding, gap, minHeight, fontSize — tüm değerlerin variable'a bağlı olması zorunlu
- **Text hizalama kuralı:** Bileşen tipine göre textAlignHorizontal tablosu (Button=CENTER, Input=LEFT vb.)
- **Bileşen sizing kuralı:** Button/Tag=HUG, Input=FILL — Fixed width butonlarda yazı ortalanmaz
- **Code only props:** `layoutPositioning = "ABSOLUTE"` zorunlu — auto-layout gap'te boşluk yaratmayı önler
- **Component set oluşturma:** `figma_arrange_component_set` + sonrasında `figma_execute` ile stroke/auto-layout/rename

### Plugin Bug Fix

- **`figma_arrange_component_set`:** `getNodeById` → `getNodeByIdAsync` düzeltildi (documentAccess: dynamic-page hatası)

### FUTURE.md

- P2: Component documentation skill'inin diğer bileşen tiplerinde testi (Input, Card, Modal, Nav)

## [1.7.4] - 2026-04-04

### Graceful Port Takeover — Oturum Geçişi Sorunu Çözüldü

**Bridge (plugin-bridge-server.ts):**
- **Graceful shutdown endpoint (`POST /shutdown`):** HTTP server'a `/shutdown` endpoint'i eklendi. Yeni bridge instance'ı eskisine shutdown isteği gönderir, eski bridge gracefully kapanır.
- **`requestShutdownAndRetry()` metodu (YENİ):** Port meşgulse ve başka bir F-MCP bridge tespit edilirse, otomatik olarak shutdown isteği gönderir + aynı portu devralır. Plugin port değişikliği gerektirmez.
- **Port stratejisi güncellendi:** "no auto-scanning" → "graceful takeover". Eski oturum kapandığında yeni oturum aynı portu (varsayılan 5454) devralır, plugin otomatik bağlanır.
- **Eski davranış (kaldırıldı):** Port meşgulse hata verip kullanıcıdan `figma_set_port` çağrısı bekliyordu. Artık otomatik devralma yapıyor.

**Etki:** Claude Code / Cursor'da yeni oturum başlatıldığında eski oturumun bridge'i portu tutuyordu. Kullanıcının plugin'de portu elle değiştirmesi gerekiyordu. Artık yeni bridge eskisini otomatik kapatıp portu devralır.

## [1.7.2] - 2026-04-04

### Kapsamlı Entegrasyon Testi + 11 Skill Güncelleme + Code-Only Props

**Test:**
- Uçtan uca entegrasyon testi: 46 araç, 17 skill, 11 faz
- 120 token (Primitives + Primitives Dark + Semantic), 6 ekran (3 boyut x 2 tema), 1 component set (5 variant)
- 10 dosya üretildi: 3 kod (React/Swift/Kotlin), 5 token (CSS/Tailwind/Swift/Kotlin/JSON), 1 handoff
- WCAG AA erişebilirlik: tüm renk çiftleri PASS, tüm touch target >= 44px

**Skill düzeltmeleri (9):**
- `audit/apply-figma-design-system`: figma_take_screenshot → figma_capture_screenshot
- `ai-handoff-export`: figma_get_component_details → figma_get_component_for_development
- `implement-design`: componentId → nodeId
- `figma-screen-analyzer`: DS compliance formülü düzeltildi
- `ds-impact-analysis`: sayfa limiti 5→20, transitif bağımlılık eklendi
- `fix-figma-design-system-finding`: 3 remediasyon modu kod örneği
- `generate-figma-library`: batch hata yönetimi pattern

**Skill zenginleştirmeleri (20):**
- Token description + code syntax (Web/Android/iOS) zorunlu adımı
- Semantic Token = Alias zorunlu kuralı
- Breakpoint / ekran boyut token'ları
- Dark mode token stratejisi (Pro+ native vs Free workaround)
- Code-Only Props katmanı (Nathan Curtis yaklaşımı)
- Responsive boyut presetleri (3 boyut + dark = 6 ekran zorunlu)
- MinHeight token binding zorunlu adımı
- A11y annotation frame (başlık hiyerarşisi, form ilişkilendirme, odak sırası, alt text, dinamik içerik)
- Erişebilirlik-tasarım tutarlılık kontrolü (7 kural)
- Code-Only Props spec data çıkarma (handoff)

**FUTURE.md eklemeleri:**
- P0: Figma Make entegrasyonu + canlı prototip süreci
- P0: Figma prototip bağlantıları + animasyonlar
- P1: Figma Dev Mode entegrasyonu

## [1.7.0] - 2026-04-04 (güncelleme)

### Claude Code Desteği ve Test Raporu (YENİ)

- **README: Claude Code kurulum bölümü eklendi.** `.mcp.json` dosyası ile NPX tabanlı config. `~/.claude/settings.json`'in MCP için çalışmadığına dair uyarı notu.
- **`.mcp.json` güncellendi:** Cursor'a özel bash script yerine evrensel NPX config (hem Claude Code hem Cursor ile uyumlu).
- **`docs/TEST_REPORT.md` (YENİ):** 46 aracın tamamı test edildi (40 PASS, 4 beklenen Figma kısıtı, 2 güvenlik nedeniyle SKIP). Free/Pro/Org/Enterprise plan bazlı yetenek matrisi. Adım adım test rehberi.

## [1.7.0] - 2026-04-03

### Çoklu Port + Otomatik AI Aracı Tespiti (YENİ)

- **Plugin çoklu port bağlantısı:** 5454-5470 arasını periyodik tarar (10s), bulunan tüm bridge'lere sessizce bağlanır.
- **AI aracı otomatik tespiti:** Bridge parent process'ten (Claude, Cursor, Claude Code, Windsurf) veya `FIGMA_MCP_CLIENT_NAME` env var'dan otomatik tespit. Welcome mesajında `clientName` gönderilir.
- **Port geçiş UI:** ◀▶ ok tuşlarıyla bağlı portlar arası geçiş. Status bar'da "Ready" + aktif port etiketi.
- **(i) info paneli:** Tıklanınca bağlı portlar listesi açılır (● aktif ○ diğerleri).
- **"Otomatik tara" butonu kaldırıldı:** Çoklu port bunu otomatik yapar.
- **SVG/PNG export düzeltmesi:** `batchExportNodes` handler + result case eklendi (timeout sorunu çözüldü).
- **Token disabled:** Token girildikten sonra input + süre seçici disabled (sadece sil + yeniden ekle).
- **Responsive layout:** İçerik taşma önlendi, sabit genişlik sadece yükseklik dinamik.
- **Plugin max height:** 420→700 (içerik kesilmez).

## [1.6.3] - 2026-04-03

### Dokümantasyon temizliği

- **28→21 aktif doküman:** 10 dosya arşivlendi (OAUTH_SETUP, SELF_HOSTING, DEPLOYMENT_COMPARISON, CLAUDE_DESKTOP_CONFIG, FIGMA_USE, FMCP_AGENT_CANVAS_COMPAT, RECONSTRUCTION_FORMAT, PUBLISH-PLUGIN, DEPENDENCY_LAYERS, RELEASE_NOTES_TEMPLATE + root: SECURITY_FIXES_ANALYSIS, HANDOFF_TEMPLATE)
- **Kırık link: 0** — tüm referanslar güncellendi veya kaldırıldı
- **README sadeleştirildi:** Doküman tablosu kullanıcı odaklı, gereksiz satırlar kaldırıldı
- **TOOLS.md:** Agent Canvas referansları v1.6 araçlarıyla güncellendi

## [1.6.2] - 2026-04-02

### Dokümantasyon düzeltmeleri

- README: 5 kırık archived link düzeltildi, figma_export_nodes eklendi, REST_API_GUIDE + CONTRIBUTING referansları eklendi
- README: "33 araç" → "46 araç", tekrar eden satırlar kaldırıldı
- FUTURE.md: 9 tamamlanan P0-P3 maddesi işaretlendi
- KURULUM.md: versiyon 1.2.0 → 1.6.2

## [1.6.1] - 2026-04-02

### Batch Export (YENİ — 1 tool)

- **`figma_export_nodes`**: SVG/PNG/JPG/PDF batch export (1-50 node). Plugin exportAsync kullanır, REST token gerektirmez. Base64 çıktısı, ölçeklendirilebilir (0.5-4x). SVG vektörel koruma, outline text ve node ID options.
- **`BATCH_EXPORT_NODES`** plugin handler eklendi (code.js). Promise.all ile paralel export, node başına hata yönetimi.
- **Connector**: `batchExportNodes()` metodu eklendi.
- **Tip tanımları**: `PluginExportResult`, `PluginBatchExportPayload` (types/figma.ts).

### Toplam: 46 araç (önceki: 45)

## [1.6.0] - 2026-04-02

### Tasarım Oluşturma Araçları (YENİ — 4 tool)

- **`figma_create_frame`**: Yeni frame oluşturma (x, y, boyut, renk, parentId)
- **`figma_create_text`**: Yeni metin node'u (font, boyut, renk)
- **`figma_create_rectangle`**: Dikdörtgen oluşturma (boyut, renk, cornerRadius)
- **`figma_create_group`**: Mevcut node'ları gruplama

### Kütüphane ve Tanılama (YENİ — 2 tool)

- **`figma_search_assets`**: Takım kütüphanesi variable collection arama (plugin teamLibrary API)
- **`figma_plugin_diagnostics`**: Plugin sağlık kontrolü (uptime, bellek, bağlantı, port, rate limit)

### Dokümantasyon

- **CONTRIBUTING.md**: Yerel kurulum, test, tool ekleme, versiyon güncelleme rehberi
- **docs/REST_API_GUIDE.md**: Token kurulumu, örnek çağrılar, hibrit akış, rate limit yönetimi
- **npm keywords**: design-system, design-tokens, ui-automation, zero-trust, cursor, agent eklendi

### Toplam: 45 araç (önceki: 39)

## [1.5.2] - 2026-04-02

### Test altyapısı

- **36 test:** response-guard.ts (18 test) + figma-url.ts (16 test) + basic (2 test)
- **CI'a test adımı eklendi:** `npm test` her push/PR'da otomatik çalışır
- **Coverage config:** Plugin-only modüla odaklı; tam mod dosyaları hariç tutuldu
- **Test dosyaları:** `tests/core/response-guard.test.ts`, `tests/core/figma-url.test.ts`

## [1.5.1] - 2026-04-02

### TypeScript tip güvenliği

- **Yeni tip dosyası:** `src/core/types/figma.ts` — RGBColor, FigmaVariable, FigmaVariableCollection, FigmaPaintStyle, FigmaTextStyle, FigmaComponent, PluginVariablesPayload, PluginStylesPayload, PluginComponentPayload vb.
- **Plugin-only `any` azaltma:** 34 → 5 (%85 azalma). Kalan 5: Zod şema (z.any) ve resolvedType cast.
- **Connector `any` azaltma:** 46 → 1 (%98 azalma). Tüm Promise<any> dönüşleri tipli hale getirildi.
- **Bridge server `any` azaltma:** 3 → 1 (%67). WebSocket mesaj tipleri iyileştirildi.
- **Plugin minify geri alındı:** esbuild minify Figma sandbox'ında "Syntax error" oluşturuyordu. Orijinal code.js geri yüklendi.

## [1.5.0] - 2026-04-02

### Plugin optimizasyonu

- **Plugin minify:** `f-mcp-plugin/code.js` esbuild ile minify (101KB→65KB, %37 küçük). `build:plugin` script eklendi; `prepublishOnly` otomatik minify.

### CI/CD güçlendirme

- **TypeScript tip kontrolü:** `tsc --noEmit` CI'a eklendi — derleme hataları artık otomatik yakalanıyor.
- **Build doğrulama:** `npm run build:local` CI'da çalıştırılır.
- **Versiyon tutarlılık kontrolü:** CI, `package.json` versiyonunun `src/` dosyalarıyla eşleşip eşleşmediğini otomatik kontrol ediyor.
- **Güvenlik taraması:** `npm audit` CI'a eklendi.

### Temizlik

- **Archive silindi:** 8.1 MB gereksiz dosya (eski zip, görseller, eski sürüm dosyaları) — git geçmişinde mevcut.
- **Belgeler arşivlendi:** 6 tekrar eden / eski belge `docs/archived/` klasörüne taşınarak aktif belge sayısı 30→24'e indirildi.
- **TODO'lar temizlendi:** `enrichment-service.ts` ve `style-resolver.ts`'deki 6 TODO/FIXME notu açıklayıcı yorumlarla değiştirildi. Kaynak kodda sıfır TODO.

## [1.4.4] - 2026-04-02

### Versiyon tutarlılığı (kesin düzeltme)

- Tüm kaynak kod, doküman, config ve dist dosyalarındaki versiyon string'leri 1.4.4 olarak senkronize.
- npm paketi güncel dist ile yeniden yayınlandı (önceki 1.4.3 npm'de eski dist içerebiliyordu).
- NPX örnekleri @latest kullanacak şekilde güncellendi.

## [1.4.3] - 2026-04-02 [NOT: npm paketi eski dist içerebilir, 1.4.4 kullanın]

### Versiyon tutarlılığı

- Tüm kaynak kod, doküman ve config dosyalarındaki versiyon referansları senkronize edildi.

## [1.4.2] - 2026-04-02

### Kritik düzeltme

- **dist/browser pakete geri eklendi:** v1.4.1'de tam mod (local.js) `dist/browser/local.js`'i import ediyordu ama dosya paketten çıkarılmıştı → MODULE_NOT_FOUND hatası. `dist/cloudflare/` hariç tutuldu (bu kullanılmıyor).

## [1.4.1] - 2026-04-02 [YANLIŞ — tam mod kırık, 1.4.2 kullanın]

### npm paket optimizasyonu

- **Paket boyutu:** 284 KB → 230 KB (%19 küçük), açık 1.7 MB → 1.2 MB (%30 küçük)
- **Dosya sayısı:** 128 → 96 (32 gereksiz dosya çıkarıldı)
- **Çıkarılan:** `dist/cloudflare/` (440 KB), `dist/browser/` (44 KB) — plugin-only modda kullanılmıyordu
- **Korunan:** `dist/local.js` (tam mod), `dist/core/` (paylaşımlı), `f-mcp-plugin/`

## [1.4.0] - 2026-04-02

### Figma REST API entegrasyonu (YENİ)

- **`figma_set_rest_token`**: Figma REST API token girişi (figd_... formatı). Token doğrulama (/v1/me), 10s timeout.
- **`figma_rest_api`**: Direkt REST API çağrısı (export, comments, versions, teams). Endpoint-bazlı akıllı kırpma, 429 retry (3 deneme, exponential backoff), rate limit ön kontrolü.
- **`figma_get_rest_token_status`**: Token durumu, rate limit bilgisi, düşük limit uyarısı.
- **`figma_clear_rest_token`**: Token temizleme.

### Response Guard — Context koruması

- **`response-guard.ts`**: Paylaşımlı cevap kırpma modülü. AI context penceresi taşmasını önler.
- **Endpoint-bazlı kırpma**: comments → son 20, versions → son 10, files → ilk 20 sayfa (children stripped).
- **Boyut limitleri**: 200KB üstü otomatik kırpma. Gerçek test: 237KB → 10KB (comments), 533KB → 1KB (file).
- **AI bilgilendirme**: Kırpılan cevaplara `_truncated` ve `_responseGuard` metadata eklenir.

### 429 Rate Limit korumaları

- **Otomatik retry**: 429 durumunda 3 deneme, Retry-After header veya exponential backoff (5s→10s→20s), max 45s.
- **Ön kontrol**: remaining=0 → kısa devre hata; remaining<10 → cevaba uyarı bloğu.
- **Rate limit broadcast**: Her REST çağrısından sonra güncellenen limitler tüm plugin'lere bildirilir.

### Plugin UI — Token ve limit yönetimi

- **Token girişi**: Advanced panelinde şifrelenmiş input + süre seçici (1/7/30/90 gün).
- **Kalıcı depolama**: `figma.clientStorage` ile token plugin kapatılıp açılsa bile kalır. Süre dolunca otomatik temizlenir.
- **Otomatik restore**: Plugin açıldığında → clientStorage → UI + bridge otomatik gönderi.
- **Rate limit göstergesi**: Kullanım bar'ı (yeşil/sarı/kırmızı), düşük limit uyarısı (%20), kritik uyarı (%5, nabız animasyonu), doldu mesajı.
- **Token süresi**: Kalan gün sayacı + bitiş tarihi; ≤7 gün sarı uyarı, dolmuş → kırmızı + otomatik silme.

### Kod kalitesi

- **`response-guard.ts`** yeni modül: `estimateTokens()`, `calculateSizeKB()`, `truncateResponse()`, `truncateRestResponse()`.
- **Port değişiminde token koruma**: `restart()` token'ı save/restore eder.
- **Token reconnect**: WebSocket yeniden bağlandığında kaydedilmiş token otomatik gönderilir.

## [1.3.2] - 2026-04-02

### Bridge (hata düzeltmeleri)

- **Hafıza sızıntısı düzeltmesi:** `tryListenAsync()` timeout yolunda `_listenResolve` temizlenmiyordu; tekrarlanan port değişikliklerinde bellek şişiyordu.
- **bridgeVersion:** Plugin welcome mesajında `"1.1.0"` → `"1.3.2"` olarak güncellendi.
- **Versiyon tutarlılığı:** McpServer version, `.cursor-plugin/plugin.json`, `package-lock.json` hepsi senkronize edildi.
- **Stale dist temizliği:** Silinen `figma-style-extractor` kaynak dosyasının artık dist/ kopyaları kaldırıldı.

## [1.3.1] - 2026-04-02

### Bridge (hata düzeltmeleri)

- **`restart()` race condition düzeltmesi:** `tryListenSync()` fire-and-forget yaklaşımı yerine async Promise tabanlı `tryListenAsync()` — port bind sonucu kesin olarak beklenir (500ms sabit delay kaldırıldı).
- **`figma_set_port` concurrent koruma:** Mutex flag ile eşanlı çağrılarda "devam ediyor" hatası; ikinci çağrı önceki tamamlanmadan başlamaz.
- **`probePort().then()` eksik `.catch()`:** Probe hatalarında `startError` set edilir, sessiz hata önlenir.
- **`_listenResolve` callback:** Başarılı/başarısız bind sonrası async restart akışını bilgilendirir.

### Versiyon tutarlılığı

- McpServer version: `"1.1.2"` → `"1.3.0"` (`local-plugin-only.ts`, `local.ts`)
- `.cursor-plugin/plugin.json`: `"1.2.1"` → `"1.3.0"`
- `package-lock.json` senkronize edildi

### Dokümantasyon

- `docs/TOOLS_FULL_LIST.md`: `figma_set_port` eklendi; araç sayısı 34 → 35

### Temizlik

- **Atıl kod:** `figma-style-extractor.ts` (hiç import edilmiyor) silindi; `extractVariant()` (hiç çağrılmıyor) silindi
- **Orphan script'ler:** `launch-figma-debug.ps1/.sh`, `launch-figma-with-plugin.sh`, `plugin-ac.py` silindi
- **Archive duplicate:** `archive/skills-root-duplicate/` silindi (`.cursor/skills/f-mcp/` ile aynı)

## [1.3.0] - 2026-04-02

### Bridge (port yönetimi)

- **`figma_set_port` aracı (YENİ):** Runtime'da WebSocket bridge portunu değiştirme. Port meşgulse AI aracı (Claude/Cursor) `figma_set_port(5456)` çağırarak başka bir porta geçer; Figma plugin'de aynı portu seçince bağlantı kurulur. Aralık: 5454-5470.
- **Port çatışması artık öldürücü değil:** Port meşgulse `process.exit(1)` yerine MCP stdio sunucusu ayakta kalır ve `figma_get_status` üzerinden hata mesajı döner. Kullanıcı `figma_set_port` ile farklı porta geçebilir.
- **`figma_get_status` genişledi:** `bridgeListening`, `startError` alanları eklendi; bridge dinlemiyorsa net hata mesajı ve port değiştirme yönlendirmesi.
- **`PluginBridgeServer` yeni API'ler:** `restart(port)`, `getPort()`, `isListening()`, `getStartError()` metodları eklendi.

### Çoklu AI aracı (aynı anda Claude + Cursor)

- Claude Desktop ve Cursor aynı anda çalıştığında port çatışmasını çözen akış: ilk açılan varsayılan portu (5454) alır, ikinci açılan `figma_set_port` ile farklı porta geçer. Her AI aracı kendi bridge'i üzerinden bağımsız çalışır.

### Bridge (önceki unreleased)

- **Sabit port stratejisi:** Otomatik port taraması (5454-5470 sıralı deneme) kaldırıldı. Bridge artık yapılandırılan porta doğrudan bağlanır; port meşgulse HTTP health-check ile canlı F-MCP / ölü süreç / farklı servis ayırt edilir; ölü port için kısa gecikmeli tek retry.
- **Graceful shutdown:** `local-plugin-only.ts`'e SIGINT/SIGTERM handler eklendi -- IDE veya Claude kapandığında `bridge.stop()` çağrılarak port anında serbest bırakılır (ölü port sorununun ana düzeltmesi).
- **probePort edge case:** `FIGMA_BRIDGE_HOST=0.0.0.0` durumunda port probe'u `127.0.0.1` üzerinden yapılır.

### Dokümantasyon

- [docs/MULTI_INSTANCE.md](docs/MULTI_INSTANCE.md): "Tek MCP = tüm pencereler aynı oturum" bölümü, **"Paralel görevler (Claude + Cursor + ikinci hat)"** bölümü (mimari, port tablosu, plugin Advanced uyarısı, Cursor paylaşımlı MCP notu, audit log çakışma notu).
- [docs/CLAUDE_DESKTOP_CONFIG.md](docs/CLAUDE_DESKTOP_CONFIG.md): çoklu `mcpServers` örneği (5455 + 5470 farklı sunucu adlarıyla).
- [KURULUM.md](KURULUM.md): Claude config "sık görülen hatalar" özeti.
- [README.md](README.md): Port çatışması uyarısı güncellemesi.

### Araçlar

- `npm run check-ports` -- [`scripts/check-ports.sh`](scripts/check-ports.sh): 5454-5470 arasında LISTEN durumundaki süreçleri listeler (paralel görev doğrulaması ve sorun giderme için).

### Cursor skills (F-MCP)

- Yeni skill'ler: `audit-figma-design-system`, `fix-figma-design-system-finding`, `apply-figma-design-system` (tuval içi design system audit/fix/apply; F-MCP Bridge araç eşlemesi).
- Mevcut F-MCP skill'lerine karşılıklı **F-MCP skill koordinasyonu** bölümleri eklendi.
- Tuval skill'lerinde `figma_get_metadata` kaldırıldı; Bridge ile uyum için `figma_get_file_data` / `figma_get_component` / `figma_get_design_context` eşlemesi; **design-drift-detector** koordinasyonunda tipik sıra (implement - drift) netleştirildi; **audit** içinde zincir performans notları.
- [.cursor/skills/f-mcp/SKILL_INDEX.md](.cursor/skills/f-mcp/SKILL_INDEX.md): tüm skill'lerin dizini, workspace kökü (FCM) notu, özet akış.
- `npm run validate:fmcp-skills` -- [`scripts/validate-fmcp-skills-tools.mjs`](scripts/validate-fmcp-skills-tools.mjs): skill `.md` içindeki `figma_*` adlarını `src/local.ts`, `src/local-plugin-only.ts`, `src/core/figma-tools.ts` içindeki `registerTool` birleşimine göre doğrular.
- GitHub Actions: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) -- `master` / `main` için PR ve push'ta `npm run validate:fmcp-skills` zorunlu.

### Plugin (F-MCP Bridge)

- Gelişmiş panel: **Otomatik tara** düğmesi -- port alanıyla tek porta kilitlenmeyi kaldırıp 5454-5470 taramasını yeniden başlatır.
- Advanced panel kapatıldığında aynı kilit kalkar (ilk yüklemede çift bağlantı tetiklenmez).

### Süreç (bakımcılar)

- Sonraki sürüm: `CHANGELOG.md` güncelle - `docs/releases/vX.Y.Z-body.md` oluştur - [RELEASE_NOTES_TEMPLATE.md](docs/RELEASE_NOTES_TEMPLATE.md) içindeki `gh release create` / `gh release edit` ile GitHub Release aç veya güncelle.

## [1.2.1] - 2026-04-01

GitHub Release: [v1.2.1](https://github.com/atezer/FMCP/releases/tag/v1.2.1); gövde: [docs/releases/v1.2.1-body.md](docs/releases/v1.2.1-body.md).

### Bridge

- **`figma_search_components`:** Çıktı özetine bileşen **`key`** alanı eklendi; `figma_instantiate_component(componentKey)` akışı ile uyum.
- **`prepublishOnly`:** `npm publish` öncesi `build:local` + `validate:fmcp-skills` (Worker `build:cloudflare` ayrı; npm paketi bin'leri `dist/local*.js`).

### Dokümantasyon

- **`docs/TOOLS.md`**, **`docs/TOOLS_FULL_LIST.md`:** `dist/local-plugin-only.js` ile parite; `figma_search_assets` / `figma_get_code_connect` / `figma_use` bu build'de kayıtlı değildir notu; `figma_search_components` + `key` açıklaması.
- **`docs/FMCP_AGENT_CANVAS_COMPAT.md`:** Bölüm 3 güncel envanter / planlanan ayrımı.
- **`docs/FIGMA_USE_STRUCTURED_INTENT.md`:** `figma_use` taslak; canlı araç `figma_execute` notu.

## [1.2.0] - 2026-03-27

### Dokümantasyon

- Sürüm takibi ve güncelleme adımları: [README.md](README.md#surum-ve-guncellemeler), [KURULUM.md](KURULUM.md#surum-takibi-ve-guncelleme-notlari).
- Bu changelog dosyası eklendi; GitHub Releases ve npm ile birlikte tek referans olarak kullanılmalıdır.
- GitHub [Release v1.2.0](https://github.com/atezer/FMCP/releases/tag/v1.2.0); gövde: [docs/releases/v1.2.0-body.md](docs/releases/v1.2.0-body.md). Bakımcı akışı: [docs/RELEASE_NOTES_TEMPLATE.md](docs/RELEASE_NOTES_TEMPLATE.md).

### Bakım ve doğrulama (2026-03)

- [FUTURE.md](FUTURE.md) kod taraması: npm `@atezer/figma-mcp-bridge@1.2.0` doğrulandı; `dist/` ile `docs/TOOLS.md` Agent Canvas üçlüsü uyumsuzluğu not edildi (doküman düzeltmesi S7'de açık).
- Figma Organization private plugin yayını tamamlandı (FUTURE S5).

### Not

Bu sürüm, npm paketi `@atezer/figma-mcp-bridge@1.2.0` ve depo kökündeki `package.json` ile hizalıdır. Önceki sürümlerin ayrıntılı kaydı bu dosyada başlamaktadır.
