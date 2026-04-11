# Changelog

Bu dosya [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) biçimine uygundur. Sürüm numaraları [`package.json`](package.json) ile uyumludur.

**Sürüm takibi (kullanıcılar için):**

| Kanal | Açıklama |
|-------|----------|
| [GitHub Releases](https://github.com/atezer/FMCP/releases) | Sürüm etiketleri ve (yayımlandığında) derlenmiş notlar |
| [npm - @atezer/figma-mcp-bridge](https://www.npmjs.com/package/@atezer/figma-mcp-bridge) | Yayınlanan paket sürümü; `npm view @atezer/figma-mcp-bridge version` ile kontrol |
| Bu dosya | Repoda her sürüm için özet değişiklik listesi |

Bu changelog'a ekleme öncesi sürümlerin tam ayrıntıları için `git log` kullanılabilir.

## [1.7.27] - 2026-04-11

### figma_execute Hatasiz Calisma — Kok Neden Analizi ve Cozum

9 kok neden tespit edildi ve tumu duzeltildi. figma_execute artik hata kategorisi, cozum onerisi ve execution metrikleri donuyor.

**Timeout Zinciri Duzeltmesi (En sik hata kaynagi):**
- Default timeout 5000ms → 15000ms (tum 3 katman: MCP handler, UI, plugin)
- Timeout clamping: min 3s, max 120s — asiri kisa/uzun degerler engellenir
- UI deadline margin 2s → 5s — round-trip icin yeterli sure

**Sonuc Serializasyon Guvenligi:**
- `safeSerialize()` fonksiyonu: Figma node objeleri → `{id, type, name}`, circular ref korunakli, array >500 truncate
- WebSocket sessiz catch kaldirild — response kaybi artik `console.error` ile loglanir, `SERIALIZATION_ERROR` mesaji donuyor
- JSON.stringify basarisiz olursa sessizce yutmak yerine acik hata raporu

**Hata Kategorilendirme:**
- `categorizeExecuteError()`: TIMEOUT, SYNTAX, RUNTIME, CONNECTION, SERIALIZATION, FONT_NOT_LOADED, VALIDATION
- `getErrorHint()`: Her kategori icin kullaniciya ozel Turkce cozum onerisi
- Plugin `success: false` sonuclari da kategorilendiriliyor (onceden sadece throw edilen hatalar icin calisiyor)

**Otomatik Retry:**
- Connector'da 1 kez retry: sadece transient hatalar (WebSocket disconnect, send_failed)
- Timeout ve runtime hatalari retry edilmez

**Execution Metrikleri:**
- Plugin: `executionMs` (kod calisma suresi)
- MCP handler: `_metrics: { durationMs, timeoutMs }` (toplam sure + timeout limiti)
- `resultAnalysis`: sonuc tipi, bos/null/undefined uyarilari

**Hook ve Skill:**
- PreToolUse hook: 6 maddelik kontrol listesi (font, sayfa reset, return formati, timeout, findAll, DS)
- `PluginExecuteResult` tipi genisletildi: errorCategory, hint, executionMs, resultAnalysis, _metrics

**Savunmaci Enrichment Fix (canli test sonrasi):**
- `categorizeExecuteError()` null-safety: `(message ?? "").toLowerCase()`
- figma_execute handler'indaki 3 code path'e (success, plugin-error, catch) ic try-catch eklendi — `safeToolHandler` dis catch'ine kacan hatalar artik enrichment kaybetmez
- `.claude-plugin/plugin.json` versiyon senkronizasyonu (1.7.25 → 1.7.27)
- 6/6 canli test GECTI: errorCategory (SYNTAX/RUNTIME/TIMEOUT), _metrics, hint, safeSerialize

## [1.7.26] - 2026-04-11

### Performans ve Stabilite Optimizasyonu

Satirsatir kod taramasi ile tespit edilen 5 kritik bug, 6 performans sorunu ve 6 stabilite riski duzeltildi.

**Bug Duzeltmeleri:**
- `local-plugin-only.ts`, `plugin-bridge-server.ts` — Versiyon uyumsuzlugu: hardcoded `"1.7.24"` yerine `FMCP_VERSION` sabiti
- `response-guard.ts` — Agresif truncation ikinci pasi etkisizdi, parametrik `truncate()` ile duzeltildi
- `local-plugin-only.ts` — `figma_search_assets` dead code: `getAvailableLibraryComponentsAsync` cagirilmiyordu
- `local-plugin-only.ts` — `figma_watch_console` busy-loop: 120 WebSocket istegi yerine backoff + early exit
- `f-mcp-plugin/manifest.json` — Trailing comma gecersiz JSON, Figma plugin yuklenemiyordu

**Performans:**
- `safeToolHandler()` wrapper ile tum tool handler'lara try-catch (30+ handler)
- `JSON.stringify(x, null, 0)` gereksiz parametreler kaldirildi (25 yer)
- `ResponseCache` sinifi: read-only tool'lar icin TTL cache (5-10s), LRU eviction (yeni dosya: `src/core/response-cache.ts`)
- `figma_check_design_parity` tek-pas optimizasyonu (`codeMap.delete` ile cift dongu kaldirildi)
- Heartbeat `setInterval` -> recursive `setTimeout` (overlap riski yok)
- Process tree walk async: constructor'daki `execSync` bloklama kaldirildi

**Stabilite:**
- `closeAuditLog()` eklendi, shutdown handler'da cagirilir (`audit-log.ts`)
- `getConfig()` ilk load sonrasi cache'ler (`config.ts`)
- `figma_execute` 50,000 karakter limiti
- Mutating tool'lar (`create_*`, `update_*`, `delete_*`, `execute`) cache invalidation

**Tip Guvenligi:**
- `PluginBridgeConnector`: 15+ method `Promise<unknown>` -> tipli return
- `as any` cast'ler kaldirildi
- `BridgeResponse` bos result uyari logu

**Skill/Agent:**
- 6 skill'e standart Hata Yonetimi bolumu eklendi
- 3 agent'a Hata Kurtarma dokumantasyonu eklendi
- `validate-fmcp-skills-tools.mjs`: YAML frontmatter ve hata bolumu yapisal kontrolu

## [1.7.23] - 2026-04-11

### Refactor: Local Full + Cloudflare Modları Kaldırıldı

Proje artık yalnızca **plugin-only** modunu destekliyor. CDP debug port (9222), Figma REST API ve Cloudflare Workers modları kaldırıldı. ~15.000+ satır kod temizlendi.

**Kaldırılan:**
- `src/local.ts` — Full local server (CDP + REST + Puppeteer)
- `src/index.ts` — Cloudflare Workers entry point
- `src/browser/` — Tüm browser modülleri (Puppeteer, Cloudflare Browser Rendering)
- `src/cloud-*.ts` — Cloudflare cloud-specific modüller
- `src/core/figma-tools.ts` — REST API araç kaydı (3,564 satır)
- `src/core/figma-desktop-connector.ts` — CDP connector (1,391 satır)
- `src/core/figma-api.ts`, `console-monitor.ts`, `snippet-injector.ts`, `design-system-manifest.ts`, `figma-reconstruction-spec.ts`
- `src/core/enrichment/` — Tüm enrichment modülleri
- `tsconfig.cloudflare.json`, `wrangler.jsonc`, `worker-configuration.d.ts`
- Bağımlılıklar: `@cloudflare/puppeteer`, `agents`, `puppeteer-core`, `wrangler`

**Güncellenen:**
- `package.json` — main/types → local-plugin-only, bin sadeleştirildi, 3 runtime + 1 dev bağımlılık kaldırıldı
- `tsconfig.local.json` — Sadece plugin-only + core
- `scripts/validate-fmcp-skills-tools.mjs` — Kaynak: sadece local-plugin-only.ts
- `.github/workflows/ci.yml` — local.ts version check kaldırıldı
- `KURULUM.md`, `CONTRIBUTING.md`, `f-mcp-plugin/README.md`, `f-mcp-plugin/manifest.json`
- `.cursor/skills/f-mcp/TOOL_MAPPING.md` — 19 kaldırılan araç temizlendi
- `src/core/types/index.ts` — Kullanılmayan tipler kaldırıldı
- `src/core/config.ts` — Browser/console/screenshot config kaldırıldı

**Korunan:** 46 MCP aracı, 19 skill, plugin bridge (WebSocket 5454), audit log

## [1.7.19] - 2026-04-10

### Fix: `figma_create_frame` Otomatik Pozisyonlama

Frame'ler x parametresi verilmeden oluşturulduğunda (0,0)'da üst üste biniyordu. Artık x belirtilmezse `figma.currentPage.children` taranarak mevcut içeriğin sağına +100px boşlukla otomatik konumlandırma yapılır.

- `x` parametresi opsiyonel, default değer kaldırıldı — verilmezse auto-position
- `parentId` kullanıldığında veya explicit x verildiğinde eski davranış korunur
- Response'a `x` ve `y` bilgisi eklendi

## [1.7.18] - 2026-04-10

### Fix: P3.6 MCP Bridge Araç Sorunları Düzeltmesi

Canlı Figma testi sırasında tespit edilen 4 araç sorunu düzeltildi. Plugin kodu + sunucu tarafı + skill dokümantasyonu güncellendi.

**C1. `figma_setup_design_tokens` mode name → mode ID mapping** (`f-mcp-plugin/code.js`)
- Mode name'leri (`"Light"`, `"Dark"`) mode ID'ye çeviren `modeNameToId` haritası eklendi
- İlk mod `renameMode()` ile kullanıcının istediği isme yeniden adlandırılıyor ("Mode 1" → "Light")
- COLOR tipi token'lar için `hexToFigmaRGB()` dönüşümü eklendi
- Geriye uyumlu: ham mode ID geçilirse de çalışır (`modeNameToId[mid] || mid`)

**C2. ALL_FILLS scope çakışma doğrulaması** (`f-mcp-plugin/code.js` + `src/core/plugin-bridge-connector.ts`)
- Plugin tarafı: scope atamadan önce ALL_FILLS mutual exclusion kontrolü
- Sunucu tarafı: `createVariable()` metoduna erken doğrulama (defense in depth)
- Net hata mesajı: "Scope conflict: ALL_FILLS cannot be combined with..."

**C3. FigJam `shapeWithText` font dokümantasyonu** (2 skill dosyası)
- `figma-canvas-ops/SKILL.md` Kural 8'e FigJam özel durumu eklendi
- `figjam-diagram-builder/SKILL.md`'ye FigJam Font Kuralı bölümü eklendi
- Kural: varsayılan font "Inter Medium" (Regular DEĞİL)

**C4. FigJam timeout limiti dokümantasyonu** (2 skill dosyası)
- `figma-canvas-ops/SKILL.md` Kural 5'e timeout yapılandırması eklendi
- `figjam-diagram-builder/SKILL.md` Common Issues'a timeout bölümü eklendi
- Güvenli limitler: 1-6 node → 5sn | 7-12 → 10sn | 13+ → böl veya 15-30sn

**Canlı Figma Doğrulama:** Tüm düzeltmeler Skill Test dosyasında birebir test edildi ve PASS aldı.

## [1.7.17] - 2026-04-08

### Skill: P3.5 Hata Düzeltmeleri + Dış Kaynak İyileştirmeleri + Canlı Figma Testi

19 F-MCP skill'i canlı Figma dosyasında satır satır test edildi. Tespit edilen 10 hata düzeltmesi (A1-A10) + 12 iyileştirme (B1-B12) uygulandı. Test sonuçları: **18 PASS, 1 PARTIAL, 0 SKIP**.

**Hata düzeltmeleri (A1-A10):**
- **A1** `ai-handoff-export`: Duplike Step 6 numaralama düzeltildi (6→10 kaydırma + cross-ref güncellemesi)
- **A2** `figma-a11y-audit`: "Salt okunur" iddiası → "Okuma + Yazma" (Step 7 annotation oluşturuyor)
- **A3** `figma-a11y-audit`: `h1Count <= 2` → `<= 1` (kural "max 1 H1")
- **A4** `figma-a11y-audit`: Body text filtresi mantık hatası düzeltildi (`>= 12 && < 14`)
- **A5** `figma-screen-analyzer`: Duplike `figma_get_design_context` çağrısı silindi
- **A7** `figma-a11y-audit`: WCAG versiyon tutarlılığı (2.1 → 2.1/2.2)
- **A8** `component-documentation`: Compact formatta Copy Spec eksikliği belirtildi
- **A9** `generate-figma-library`: Faz 1 çıkış kriteri STRING/FLOAT scope ayrımı
- **A10** `SKILL_INDEX.md`: DesignOps akışına `ux-copy-guidance` eklendi

**İyileştirmeler (B1-B12):**
- **B1** `audit-figma-design-system`: CI ortam tespiti (JSON default)
- **B2** `apply-figma-design-system`: İki giriş modu (`review-then-apply` + `apply-known-scope`)
- **B3** `apply-figma-design-system`: %80 uyum eşiği kapısı
- **B4** `fix-figma-design-system-finding`: 3 girdi formatı otomatik algılama
- **B5** `generate-figma-screen`: Loading state karar ağacı (skeleton/spinner/progress)
- **B7** `generate-figma-library`: 60-30-10 renk kuralı (palette + kullanım rehberi)
- **B8** `figma-a11y-audit`: Gesture a11y kontrolleri (7a)
- **B10** `audit-figma-design-system`: Nielsen 10 sezgisel (`--heuristic` flag)
- **B11** `component-documentation`: State machine geçiş diyagramı (Mermaid)
- **B12** `implement-design`: Gesture platform mapping tablosu (iOS/Android/Web)

**Canlı Figma Testi (feedback için):**
- Test dosyası: [Figma Design](https://www.figma.com/design/QNtXuQ5PshxcbkiyMc0YlA/Untitled?node-id=0-1) — 20 sayfa, her skill için görsel doğrulama
- FigJam testi: [Design System JIRA Backlog Süreci](https://www.figma.com/board/roQjK1YgnJBHOTLbtjqFck/Design-System-JIRA-backlog-süreci?node-id=0-1) — `figjam-diagram-builder` swimlane testi
- 6/7 bug gerçek Figma dosyasında düzeltildi (Button touch target, placeholder kontrast, variable bağlama, Türkçe karakter)

**Versiyon tutarlılığı düzeltmesi:**
- `.cursor-plugin/plugin.json`: 1.7.14 → 1.7.17 (v1.7.15/v1.7.16'da atlanmıştı)
- `KURULUM.md`: 1.7.14 → 1.7.17 (v1.7.15/v1.7.16'da atlanmıştı)

**P3.6 plan (sonraki sürümde):** 4 araç sorunu FUTURE.md'de plan halinde — `figma_setup_design_tokens` mode name mapping, `ALL_FILLS` scope validation, FigJam `shapeWithText` font dokümantasyonu, FigJam timeout limiti. Plugin kodu bu sürümde dokunulmadı.

## [1.7.15] - 2026-04-08

### Skill: Anthropic Design Skill Entegrasyonu + Marka Profili + UX Copy

Anthropic built-in design skill'leri (accessibility-review, design-handoff, design-critique, design-system-management, ux-writing, frontend-design) ile F-MCP skill'leri satır satır karşılaştırıldı. Eksik tasarım prensipleri, yapısal çerçeveler, estetik yönlendirme ve kişiselleştirme mekanizmaları entegre edildi.

**Yeni dosyalar:**
- **ux-copy-guidance/SKILL.md (YENİ):** UX yazarlık rehberi — 5 temel prensip, 6 copy kalıbı (CTA, hata, boş durum, onay, başarı, yükleme), ses/ton rehberi, marka profili kişiselleştirmesi, çok dilli/i18n kuralları, Figma text node entegrasyonu (19. skill)
- **BRAND_PROFILE_SCHEMA.md (YENİ):** `.fmcp-brand-profile.json` şema tanımı — tüm skill'lerin kişiselleştirilebilmesi için merkezi yapılandırma (ses/ton, tipografi, estetik yön, copy kuralları, i18n)

**Genişletilen skill'ler (10):**
- **figma-a11y-audit:** WCAG 2.1 AA hızlı referans (12 kriter), yaygın sorunlar listesi (8), test yaklaşımı sırası (5 aşama), Step 5'e WCAG referansı, Step 8'e 3 yeni kontrol (fokus göstergesi, hata ilişkilendirme, UI bileşen kontrastı)
- **ai-handoff-export:** Handoff prensipleri (4), etkileşim spesifikasyonları, içerik spesifikasyonları, uç durumlar tablosu, erişilebilirlik spesifikasyonları, marka profili entegrasyonu
- **audit-figma-design-system:** DS eksiksizlik çerçevesi (token kategorileri, bileşen durum kapsamı, pattern katmanı), DS prensipleri, JSON şemasına `dsCompleteness`
- **figma-screen-analyzer:** İlk İzlenim Analizi (2sn testi), görsel hiyerarşi 4 yeni soru, geri bildirim prensipleri (5), marka profili entegrasyonu
- **generate-figma-screen:** Tasarım Yönü Belirleme (Step 2.5), tipografi stratejisi, görsel derinlik (Step 5.5), anti-pattern kontrolü, marka profili entegrasyonu
- **component-documentation:** Durumlar bölümü ve Copy Spec bölümü eklendi (Standard format 8→10 bölüm), marka profili entegrasyonu
- **implement-design:** Step 7d durum/etkileşim kapsamı kontrolü (6 kontrol), marka profili entegrasyonu
- **generate-figma-library:** Faz 1'e motion token (1f) ve shadow token (1g), Faz 3'e durum kapsamı kontrolü (3d), marka profili entegrasyonu
- **design-system-rules:** DS prensipleri (Step 3.5), pattern katmanı kuralları (Step 3.6)
- **design-drift-detector:** Motion token drift kontrolü (Step 5.5)

**Güncellenen referans dosyalar:**
- **SKILL_INDEX.md:** Kişiselleştirme bölümü, skill sayısı 18→19, persona akışları güncellenmiş, uçtan uca akış güncellenmiş
- **FUTURE.md:** P3 tüm maddeler [TAMAMLANDI], sürüm referansları güncellenmiş

## [1.7.14] - 2026-04-07

### Kurulum Deneyimi İyileştirmesi

Kaynak: `fmcp-feedback.md` — terminal bilgisi olmayan kullanıcının kurulum zorluğu feedback'i.

- **`scripts/setup.sh`** eklendi: Node.js kontrolü, build, MCP config otomatik ayarı — tek komutla kurulum
- **`scripts/setup-npx.sh`** eklendi: NPX ile kurulum — repo indirmeden, config otomatik
- **`scripts/update.sh`** eklendi: Tek komutla otomatik güncelleme
- **Plugin UI:** "auto port" → "otomatik bağlantı aktif" mesajı; port input title'ları daha açıklayıcı
- **README.md** sadeleştirildi: Teknik bilgisi olmayan kullanıcı için net kurulum akışı
- **ONBOARDING.md** güncellendi: Tek komutluk kurulum referansı
- **KURULUM.md** güncellendi: Script referansı, sürüm güncelleme
- **UPDATE.md** güncellendi: Otomatik güncelleme bölümü eklendi
- **FUTURE.md** güncellendi: Kurulum deneyimi hedefleri (pre-built binary, GUI installer)
- **TEST_REPORT.md** sürüm güncellendi

## [1.7.13] - 2026-04-07

### Plugin UI: Dark/Light Tema Uyumu ve Font Okunabilirliği

**Kök neden düzeltmesi:**
- **`@media (prefers-color-scheme: light)` kaldırıldı:** Figma plugin iframe'inde bu media query çalışmıyor. Figma `themeColors: true` ile `<html>` elementine `.figma-light` / `.figma-dark` class ekler — artık resmi Figma tema sistemi kullanılıyor.
- **`@media` fallback eklendi:** Browser preview ve Figma dışı ortamlarda da light tema çalışır (`:root:not(.figma-dark)` selector ile).

**Renk düzeltmeleri:**
- **17 CSS custom property tanımlandı:** `--fmcp-bg-subtle`, `--fmcp-text-secondary`, `--fmcp-border-light` vb. Dark tema varsayılan, `.figma-light` ve `@media light` ile override.
- **Tüm hardcoded `rgba(255,255,255,...)` inline renkler** CSS variable'lara çevrildi — light temada artık okunaklı.
- **Tüm `color: inherit` ve `color: #fff`** kaldırıldı, tema-uyumlu `var()` fallback'lere çevrildi.
- **Figma `--figma-color-*` variable fallback'leri** `var(--fmcp-*)` ile değiştirildi — Figma variable inject etmediğinde bile doğru renk.
- **3 JS dinamik renk** (`updateTokenUI`, `updatePortLabel`) `fmcpVar()` helper ile tema-uyumlu.

**Font okunabilirliği:**
- **Tüm font boyutları +2px büyütüldü:** body 11→13, label/toggle 10→12, info 9→11, note 8→10, icon 7→9.
- **Icon boyutları da +2px:** info butonları 13→15px, rate-limit info 11→13px (line-height uyumlu).

**Etkilenen alanlar:** Status bar, Advanced panel, Host/Port input, Port switcher, API Token section, Rate limit bar, Connections panel — tümü dark ve light temada okunaklı.

## [1.7.10] - 2026-04-05

### Doküman: Kapsamlı Güncelleme Rehberi

- **docs/UPDATE.md (YENİ):** NPX cache temizleme, clone güncelleme, Claude Code, Windsurf, Figma plugin güncelleme, sorun giderme, rollback — tüm senaryolar tek rehberde
- **docs/ONBOARDING.md:** Kırık link düzeltmesi (`README.md#sürüm-ve-güncellemeler` anchoru yoktu), `figma-mcp-bridge-plugin` binary name eklendi
- **README.md:** Dokümanlar tablosuna UPDATE.md linki, sürüm bilgisi güncellendi
- **FUTURE.md:** Sürüm referansları güncellendi
- **.cursor-plugin/plugin.json:** Sürüm güncellendi

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
