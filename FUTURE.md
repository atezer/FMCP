# F-MCP -- Kalan Adımlar (Future)

> Son güncelleme: 11 Nisan 2026 (v1.7.23 — Local full + Cloudflare modları kaldırıldı, plugin-only single-mode)
> Paket sürümü (`package.json`): **1.7.23**

---

## YÜKSEK ÖNCELİKLİ HEDEFLER (Plugin-Only Kullanıcılar İçin)

### P0 — Plugin Çoklu Port + Otomatik AI Aracı Tespiti

**Branch:** `feature/multi-port-plugin` (ayrı branch, mevcut yapı bozulmaz)

Şimdi: Kullanıcı Claude/Cursor'dan "bağlan" dediğinde portu elle değiştirmek zorunda.
Hedef: Plugin tüm portları (5454-5470) sessizce dinler, AI aracı otomatik tespit edilir.

**Akış:**
```
Plugin açılır → 5454-5470 tarar → bulunan bridge'lere bağlanır
→ Her bridge welcome mesajında clientName gönderir (otomatik tespit)
→ Plugin UI: ◀ 5454 (Cursor) ▶ veya ◀ 5456 (Claude) ▶
→ Kullanıcı ok tuşlarıyla geçiş yapar
```

**Teknik:**
- Bridge: parent process'ten AI aracı adı tespit edilir (Claude.app, Cursor.app, claude-code)
- Plugin: çoklu WebSocket bağlantısı (tek yerine dizi)
- UI: ok tuşlarıyla port/client geçişi, bağlı olana etiket

**Değişecek dosyalar:**
- `src/core/plugin-bridge-server.ts` — welcome mesajına `clientName` ekle
- `f-mcp-plugin/code.js` — çoklu WebSocket bağlantı yönetimi
- `f-mcp-plugin/ui.html` — port geçiş UI (ok tuşları + etiket)

**Ek UI değişiklikleri:**
- [x] "Otomatik tara" butonu kaldırıldı (v1.7.0)
- [ ] Host alanı: şimdilik kalsın, ileride geliştirilecek

- [x] Bridge: clientName otomatik tespit — env var + process tree walking (v1.7.0)
- [x] Plugin: çoklu port bağlantısı — 5454-5470 periyodik tarama, 10s (v1.7.0)
- [x] Plugin UI: ◀ port (AI aracı adı) ▶ geçiş + (i) info paneli (v1.7.0)
- [x] "Otomatik tara" butonu kaldırıldı (v1.7.0)
- [x] Test: Claude + Cursor + Claude Code aynı anda, plugin'de geçiş (v1.7.0)
- [ ] (i) info panelinde bağlı dosya kaynaklarını göster — ör. "Figma Desktop: 1, Chrome: 3 Figma, 1 FigJam" (DÜŞÜK ÖNCELİK — değer/karmaşıklık oranı düşük)

### P0 — Tasarım Oluşturma Araçları (Node Creation)

Şimdi: Yeni frame/text/rectangle oluşturmak için `figma_execute` ile ham Plugin API kodu yazmak gerekiyor.
Hedef: Özel araçlar ile kolay node oluşturma.

- [x] `figma_create_frame` — x, y, width, height, name, parentId (v1.6.0)
- [x] `figma_create_text` — text, x, y, fontSize, fontFamily, parentId (v1.6.0)
- [x] `figma_create_rectangle` — geometry + fill/stroke (v1.6.0)
- [x] `figma_create_group` — children birleştirme (v1.6.0)

Etki: Tasarım otomasyonu, bileşen üretimi, layout yeniden oluşturma için temel.

### P0 — Asset Search ve Code Connect

Şimdi: Sadece dosya-içindeki bileşenler aranabiliyor (`figma_search_components`). Takım kütüphane arama yok.
Hedef: Yayınlanmış kütüphane bileşen/variable arama + Code Connect eşlemesi.

- [x] `figma_search_assets` — takım kütüphane arama (plugin teamLibrary API, v1.6.0)
- [ ] `figma_get_code_connect` — node için kod eşlemesi. Detaylı plan: [CODE_CONNECT_USE_PLAN.md](docs/CODE_CONNECT_USE_PLAN.md)
- [ ] `figma_use` — yüksek seviyeli bileşen/token tüketim aracı. Detaylı plan: [CODE_CONNECT_USE_PLAN.md](docs/CODE_CONNECT_USE_PLAN.md)

### P1 — Görsel Export (SVG/PNG/Batch)

Şimdi: Sadece screenshot (bitmap PNG). SVG export ve toplu export yok.
Hedef: Vektörel format desteği + çoklu node export.

- [x] `figma_export_nodes` — SVG/PNG/JPG/PDF batch export, 1-50 node (v1.6.1)
- [ ] REST API image export rehberi (`/v1/images/:fileKey`)

### P1 — Güvenlik Denetimi (Enterprise)

`docs/SECURITY_AUDIT.md` içindeki kritik maddeler:
- [ ] K1: `figma_execute` eval limiti (kod enjeksiyonu önleme)
- [ ] K2: Zod girdi doğrulama güçlendir
- [ ] Y1: Token log azaltma (hassas veri maskeleme)

### P1 — REST API Kullanıcı Rehberi

- [x] `docs/REST_API_GUIDE.md` — token kurulumu, örnek çağrılar, rate limit yönetimi (v1.6.0)
- ~~Hibrit akış (plugin + REST) dokümantasyonu~~ — N/A (REST modu v1.7.23'te kaldırıldı)

### P2 — WebSocket Yeniden Bağlantı ve Teşhis

- [x] `figma_plugin_diagnostics` — uptime, heartbeat, bellek, port (v1.6.0)
- [ ] Plugin crash durumunda otomatik yeniden bağlantı
- [ ] Bağlantı durumu UI göstergesi (iyileştirilmiş)

### P2 — Geliştirici Deneyimi

- [x] `CONTRIBUTING.md` — yerel kurulum, test, skill yazma, PR süreci (v1.6.0)
- [x] Claude Code `.mcp.json` kurulum rehberi — README'ye eklendi (v1.7.0)
- [x] 46 araç test raporu — `docs/TEST_REPORT.md`: Free/Pro/Org/Enterprise plan bazlı yetenek matrisi, adım adım test rehberi (v1.7.0)
- [x] Eski belgelere "deprecated" notu ekle (KURULUM.md, TOOL_MAPPING.md güncellendi — v1.7.23)
- [x] Kod temizliği: local full + cloudflare modları kaldırıldı (v1.7.23)
- [ ] IDE config örnekleri: VSCode, Windsurf, Zed

### P2 — Kurulum Deneyimi İyileştirmeleri

Feedback kaynağı: `fmcp-feedback.md` (kullanıcı deneyim raporu)
Plan: `.claude/plans/compiled-shimmying-mccarthy.md`

- [x] `scripts/setup.sh` — Otomatik kurulum (Homebrew + Node.js + build + config) (v1.7.14)
- [x] `scripts/setup-npx.sh` — NPX yolu için minimal kurulum (v1.7.14)
- [x] Plugin UI "otomatik bağlantı aktif" mesajı (v1.7.14)
- [ ] npm README güncelleme — sonraki version bump'ta (1.7.15+) otomatik yansıyacak
- [ ] Pre-built binary dağıtımı (Node.js gerektirmeyen) — `brew install --cask fmcp`
- [ ] Tek satır web installer: `curl -fsSL https://fmcp.dev/install.sh | bash`
- [ ] GUI installer (.dmg) — tasarımcılar için sıfır terminal deneyimi

### P3 — npm ve GitHub Görünürlük

- [x] package.json keywords güncellendi (design-system, design-tokens, zero-trust, cursor, agent — v1.6.0)
- [ ] GitHub repo açıklaması + topics ekle
- [ ] README'ye CI badge, npm version badge ekle

### P4 — Node.js Bağımlılığı Kaldırma (Standalone)

Node.js olmadan F-MCP kullanabilme. Detaylı analiz ve plan: [STANDALONE_PLAN.md](docs/STANDALONE_PLAN.md)

- ~~Python bridge 10→46 araca genişletme~~ — Mimari değişti, plugin-only single-mode (v1.7.23)
- [ ] Standalone binary (pkg ile, yüksek risk, 3-4 hafta, opsiyonel)

### P0 — Figma Make Entegrasyonu + Canlı Prototip Süreci

Şimdi: Tasarımlar Figma'da statik olarak oluşturuluyor. Onay sonrası kodlama süreci manuel.
Hedef: Onaylanan tasarımları Figma Make'e aktarıp, canlı kodlanmış prototip olarak üretmek — tam otomasyon.

**Tam Süreç Akışı:**
```
1. AI ile tasarım üretimi (FMCP + generate-figma-screen/library)
     ↓
2. Kullanıcı/PM/Tasarımcı onay verir (chat üzerinden)
     ↓
3. Onaylanan ekranlar Figma Make'e aktarılır
     ↓
4. Figma Make'te ekranlar tek tek canlı prototipe dönüştürülür
     ↓
5. Canlı prototip linki paylaşılır (test/demo/stakeholder review)
```

**Gerekli Yeni Araçlar:**
- [ ] `figma_export_to_make` — Onaylanan Figma frame'lerini Make dosyasına aktar
- [ ] `figma_make_generate` — Make dosyasında ekranı canlı koda dönüştür
- [ ] `figma_make_preview` — Make önizleme linki oluştur

**Gerekli Yeni Skill:**
- [ ] `figma-make-prototype` — Tam akış: onay → Make aktarımı → ekran ekran üretim → canlı link
  - Step 1: Kullanıcı onayı al (chat'te ekran listesi + screenshot göster, onay bekle)
  - Step 2: Onaylanan ekranları Figma Make dosyasına aktar
  - Step 3: Her ekranı sırasıyla Make'te canlı koda dönüştür (responsive + dark mode dahil)
  - Step 4: Canlı önizleme linki oluştur ve paylaş
  - Step 5: Geri bildirim → düzeltme döngüsü (Make üzerinde)

**Mevcut Skill Güncellemeleri:**
- [ ] `generate-figma-screen` — Süreç sonuna "Onay → Make aktarımı" adımı ekle
- [ ] `ai-handoff-export` — Handoff'a "Canlı Prototip Linki" bölümü ekle
- [ ] `figma-screen-analyzer` — PO/PM raporuna "Make önizleme durumu" ekle

**Teknik Notlar:**
- Figma Make API'si `use_figma` MCP aracı üzerinden erişilebilir (`mcp__figma__use_figma`)
- Make dosyaları `figma.com/make/:fileKey` formatında
- Make'e aktarım için `get_design_context` verisi + screenshot kullanılır
- Make kodu React tabanlı — token dosyaları (CSS/Tailwind) ile entegre çalışır

**Öncelik:** P0 — Tasarım-kod arası kopukluğu kapatan kritik özellik. FMCP'nin "sıfırdan üretime" vizyonunun son halkası.

### P0 — Figma Prototip Bağlantıları + Animasyonlar

Şimdi: Üretilen ekranlar birbirinden bağımsız, aralarında navigasyon ve etkileşim bağlantısı yok.
Hedef: AI üretilen ekranlar arasında doğru prototip bağlantıları, animasyonlar ve aksiyon adımları otomatik oluşturulmalı.

**Tam Prototip Akışı:**
```
1. Ekranlar üretilir (Login, Home, Register, Forgot Password vb.)
     ↓
2. Ekranlar arası navigasyon haritası çıkarılır
     ↓
3. Figma prototip bağlantıları (connections) oluşturulur
     ↓
4. Geçiş animasyonları ayarlanır (slide, dissolve, push vb.)
     ↓
5. Flow starting point belirlenir
     ↓
6. Prototip test edilir (play mode)
```

**Gerekli Yeni Araçlar:**
- [ ] `figma_create_prototype_connection` — İki frame/node arası prototip bağlantısı oluştur
  - Parametreler: sourceNodeId, destinationNodeId, trigger (ON_CLICK/ON_HOVER/ON_DRAG),
    action (NAVIGATE/OVERLAY/SWAP/BACK), transition (DISSOLVE/SLIDE_IN/PUSH/SMART_ANIMATE),
    duration (ms), easing (EASE_IN/EASE_OUT/LINEAR)
- [ ] `figma_set_flow_starting_point` — Prototip başlangıç noktasını belirle
- [ ] `figma_create_interaction` — Node üzerinde etkileşim ekle (hover state, press state, vb.)
- [ ] `figma_get_prototype_connections` — Mevcut prototip bağlantılarını oku (denetim için)

**Gerekli Yeni Skill:**
- [ ] `figma-prototype-flow` — Ekranlar arası tam prototip akışı oluşturma
  - Step 1: Mevcut ekranları listele ve navigasyon haritasını çıkar
  - Step 2: Her buton/link için hedef ekranı belirle
  - Step 3: Prototip bağlantılarını oluştur (doğru trigger + action + animasyon)
  - Step 4: Flow starting point'i ayarla
  - Step 5: Bağlantıları doğrula (tüm interaktif elemanlar bağlanmış mı?)
  - Step 6: Screenshot/GIF ile prototip akışını dokümante et

**Bağlantı Örnekleri (Login Akışı):**
```
Login / Mobile:
  "Giriş Yap" butonu → ON_CLICK → NAVIGATE → Home ekranı (SLIDE_IN_RIGHT, 300ms, EASE_OUT)
  "Şifremi unuttum" link → ON_CLICK → NAVIGATE → Forgot Password ekranı (PUSH, 250ms)
  "Google ile Giriş Yap" → ON_CLICK → OVERLAY → Google Auth modal (DISSOLVE, 200ms)
  "Kayıt Ol" link → ON_CLICK → NAVIGATE → Register ekranı (SLIDE_IN_RIGHT, 300ms)
  Input focus → ON_CLICK → SET_STATE → Input / Focused state (INSTANT)
  Button hover → ON_HOVER → SET_STATE → Button / Hover state (EASE_IN, 150ms)

Register ekranı:
  "Zaten hesabım var" → ON_CLICK → NAVIGATE → Login ekranı (SLIDE_IN_LEFT, 300ms) — BACK

Forgot Password:
  "Geri" → ON_CLICK → BACK (PUSH_REVERSE, 250ms)
  "Gönder" → ON_CLICK → NAVIGATE → Check Email ekranı (SLIDE_IN_RIGHT, 300ms)
```

**Animasyon Standartları:**
| Geçiş Türü | Animasyon | Süre | Easing | Kullanım |
|-----------|-----------|------|--------|----------|
| İleri navigasyon | SLIDE_IN_RIGHT | 300ms | EASE_OUT | Yeni ekrana git |
| Geri navigasyon | SLIDE_IN_LEFT | 300ms | EASE_OUT | Önceki ekrana dön |
| Modal açma | DISSOLVE | 200ms | EASE_IN | Overlay/popup göster |
| Modal kapama | DISSOLVE | 150ms | EASE_OUT | Overlay/popup kapat |
| Hover state | — | 150ms | EASE_IN | Buton/link hover efekti |
| Press state | — | 100ms | EASE_OUT | Buton basma efekti |
| Smart animate | SMART_ANIMATE | 300ms | EASE_IN_OUT | Aynı bileşen farklı state |

**Mevcut Skill Güncellemeleri:**
- [ ] `generate-figma-screen` — Ekran üretimi sonrasında otomatik prototip bağlantısı adımı ekle
- [ ] `ai-handoff-export` — Handoff'a "Prototip Akış Diyagramı" bölümü ekle
- [ ] `figma-a11y-audit` — Prototip fokus sırası ile a11y fokus sırası uyumunu kontrol et

**Teknik Notlar:**
- Figma Plugin API: `node.reactions` dizisi ile prototip bağlantıları oluşturulur
- Her reaction: `{ trigger, actions: [{ type, destinationId, navigation, transition }] }`
- `figma_execute` ile mevcut Plugin API kullanılarak bağlantı oluşturulabilir
- Flow starting point: `figma.currentPage.flowStartingPoints` ile yönetilir

**Öncelik:** P0 — Prototipsiz tasarım eksik bir tasarımdır. Stakeholder review, kullanıcı testi ve geliştirici handoff için prototip zorunlu.

### P1 — Figma Dev Mode Entegrasyonu

Şimdi: Üretilen ekranların geliştirici notları sadece HANDOFF.md dosyasında.
Hedef: Figma Dev Mode'da doğrudan görünür geliştirici notları, ölçümleri ve kod snippetleri.

**Gerekli Yeni Araçlar:**
- [ ] `figma_set_dev_status` — Ekranın geliştirme durumunu ayarla (Ready for dev / In progress / Completed)
- [ ] `figma_add_dev_annotation` — Dev Mode'da görünür teknik not ekle
- [ ] `figma_set_measurements` — Otomatik ölçüm çizgileri (padding, margin, gap)

**Gerekli Skill Güncellemesi:**
- [ ] `ai-handoff-export` — Handoff sonrasında Figma Dev Mode notlarını otomatik ekle
- [ ] `implement-design` — Kod üretimi sırasında Dev Mode bilgilerini referans al

**Teknik Notlar:**
- Figma Dev Mode API: `node.devStatus = { type: "READY_FOR_DEV", description: "..." }`
- Annotations: Plugin API ile node üzerine teknik not eklenir
- Dev Mode CSS/iOS/Android code snippets: figma_execute ile okunabilir

### P1 — Web Capture Entegrasyonu (Bookmarklet + Extension)

Şimdi: FMCP sadece Figma içindeki veriyi okuyup yazabiliyor. Web'den tasarım kaynağı alma yolu yok.
Hedef: Herhangi bir web sayfasını (rakip sitesi, canlı ürün, referans) doğrudan Figma'ya native node olarak import etmek ve AI-destekli analiz, karşılaştırma, token çıkarma iş akışlarını tetiklemek.

**Arka plan:** Figma, `https://mcp.figma.com/mcp/html-to-design/capture.js` adresinde kamuya açık bir `capture.js` betiği sunuyor. Bu betik, herhangi bir web sayfasının DOM yapısını Figma-uyumlu formata dönüştürüyor. Viral LinkedIn paylaşımları bu betiği bir bookmarklet ile kullanmayı gösteriyor ama bu yaklaşım tek başına capture yapıyor — sonrasında analiz, karşılaştırma, token çıkarma yok. FMCP bu capture'ı AI-destekli bir iş akışının girişi olarak kullanarak farklılaşabilir.

**Mimari karar:** Puppeteer/CDP geri eklenmez (v1.7.23'te kasıtlı kaldırıldı). Mevcut `PluginBridgeServer`'ın HTTP server'ına yeni endpoint eklenir. Bookmarklet/extension capture verisini bu endpoint'e POST eder. Tüm node oluşturma mevcut `executeCodeViaUI` pattern'i üzerinden yapılır.

**Detaylı Plan:** [.claude/plans/greedy-booping-gem.md](../.claude/plans/greedy-booping-gem.md)

#### Faz 1 — Temel Altyapı (P0 içinde)

**Gerekli Yeni Araçlar:**
- [ ] `figma_generate_bookmarklet` — Kullanıcıya özelleştirilmiş bookmarklet JS kodu üretir; capture verisi otomatik FMCP bridge'e POST edilir
  - Parametreler: `mode` (full-page/select-element/viewport), `port` (default: aktif bridge portu)
  - Output: `javascript:` URL + kurulum talimatları
- [ ] `figma_import_web_capture` — Capture verisini alıp Figma'da native node olarak oluşturur
  - Parametreler: `captureId` veya `captureData`, `targetNodeId`, `importMode` (full/layout-only/tokens-only), `namePrefix`
  - Büyük sayfalar için chunked import (timeout önleme)
- [ ] `figma_list_web_captures` — Buffer'daki capture'ları listeler (id, url, title, capturedAt, nodeCount)

**Server-side değişiklikler:**
- [ ] `src/core/plugin-bridge-server.ts` — `POST /api/capture` endpoint (mevcut `/shutdown` handler'ının yanına); capture buffer (`Map<string, WebCapturePayload>`, max 10, LRU); CORS preflight (`OPTIONS`) — mevcut `Access-Control-Allow-Origin: *` header'ları zaten var
- [ ] `src/core/types/figma.ts` — `WebCaptureNode`, `WebCapturePayload` interface'leri
- [ ] `src/core/plugin-bridge-connector.ts` — `importWebCapture()` metodu
- [ ] `f-mcp-plugin/code.js` — `BATCH_CREATE_NODES` message handler (eval yerine güvenli, tipli node oluşturma; `EXECUTE_CODE` handler'ı model alınır)

**Gerekli Yeni Skill:**
- [ ] `web-capture-import` — Capture → import → analiz workflow'u
  - Step 1: `figma_generate_bookmarklet` ile bookmarklet oluştur
  - Step 2: Kullanıcıya kurulum talimatları ver
  - Step 3: Kullanıcı sayfayı yakalar → veri FMCP'ye gelir
  - Step 4: `figma_import_web_capture` ile Figma'ya aktar
  - Step 5: Mevcut DS token'larıyla eşleştirme öner
  - Persona: designer, uidev

#### Faz 2 — Akıllı Katman

**Gerekli Yeni Araçlar:**
- [ ] `figma_compare_web_with_design` — Yakalanan web sayfası vs Figma tasarımı diff raporu
  - Parametreler: `captureId`/`captureData`, `referenceNodeId`, `compareMode` (visual/tokens/layout/full)
  - Output: Renk, tipografi, spacing, layout diff raporu
- [ ] `figma_extract_tokens_from_capture` — CSS'den design token çıkarma + opsiyonel Figma variable oluşturma
  - Parametreler: `captureData`, `createVariables`, `collectionName`, `deduplicateThreshold`

**Gerekli Yeni Skill'ler:**
- [ ] `competitor-design-analysis` — Rakip site analiz otomasyonu
  - Akış: bookmarklet ile rakip sitesini yakala → "Competitors" sayfasına import → token çıkarma → kendi DS ile karşılaştırma → rapor (renk paleti, tipografi ölçek, erişilebilirlik/kontrast)
  - Persona: designer, designops, po
- [ ] `live-site-visual-qa` — Mevcut `visual-qa-compare` skill'inin web capture destekli versiyonu
  - Akış: canlı siteyi yakala → Figma tasarımıyla otomatik karşılaştır → üç seviye rapor (yapısal, görsel, token)
  - Örnek çıktı: "Button border-radius kodda 4px ama Figma'da 8px (token: radius.md)"
  - Persona: uidev, designops

**Gelişmiş Capture Kanalı:**
- [ ] `fmcp-browser-extension/` — Chrome/Edge/Firefox extension (Manifest V3)
  - Bookmarklet'e göre avantajları: CSP tarafından engellenmez, kalıcı WebSocket bağlantısı, gelişmiş element picker, `getComputedStyle` ile tam CSS erişimi, cross-origin iframe desteği
  - Mimari: `background.js` (WebSocket), `content.js` (DOM capture), `popup.html` (UI)
  - Özel capture implementasyonu (Figma `capture.js`'ye bağımlılık olmadan)

#### Faz 3 — Gelişmiş (P2)

- [ ] `figma_batch_capture_compare` — Çoklu sayfa toplu karşılaştırma (multi-page QA, çoklu rakip analizi)
- [ ] `design-system-reverse-engineer` skill — Herhangi bir siteden tam DS çıkarma ve Figma library üretimi
- [ ] Extension DevTools paneli — Gelişmiş CSS inspector entegrasyonu

**Mevcut Skill Güncellemeleri:**
- [ ] `visual-qa-compare` — Web capture'ı input kaynağı olarak destekle
- [ ] `design-drift-detector` — Canlı site capture'ını drift kaynağı olarak destekle
- [ ] `design-token-pipeline` — Web capture'dan çıkarılan token'ları pipeline girdisi olarak destekle

**Teknik Notlar:**
- Capture payload formatı: `WebCapturePayload` (yapılandırılmış node ağacı + extracted tokens)
- Max payload boyutu: 5MB; `response-guard.ts` truncation uygulanır
- Node oluşturma: `BATCH_CREATE_NODES` handler (recursive createFrame/createText/createRectangle)
- Riskler: `capture.js` format değişikliği (adapter pattern ile soyutla), CSP engellemesi (extension fallback), büyük payload (chunked import)

**Yeniden Kullanılacak Mevcut Kod:**
- `PluginBridgeServer.createServer` HTTP handler (`plugin-bridge-server.ts:290`) — capture endpoint için
- `conn.executeCodeViaUI()` pattern — import tool node oluşturma
- `EXECUTE_CODE` message handler (`code.js:433`) — `BATCH_CREATE_NODES` model
- `figma_create_frame/text/rectangle` tool pattern'i — node oluşturma kodu
- `response-guard.ts` truncation — büyük payload kırpma
- `response-cache.ts` LRU pattern — capture buffer

**Farklılaşma:**
1. Capture → Figma → AI Analiz tek akışta (bookmarklet sadece capture yapar)
2. Design System eşleme (rakip/canlı site token'larını mevcut DS ile karşılaştırma)
3. Rakip analizi otomasyonu (capture + token çıkarma + rapor)
4. Visual QA otomasyonu (canlı site vs Figma tasarımı)
5. Zero-trust korunur (tüm veri lokalde)
6. CSP-proof (extension ile)

**Öncelik:** P1 — FMCP'nin "Figma'ya veri girişi" kanalını genişleten kritik özellik. Bookmarklet yaklaşımının viral yayılımı düşünülürse FMCP'nin "sadece Figma içi iş akışı" algısını kırmak için stratejik.

### P2 — Component Documentation Skill Testi (Diğer Bileşenler)

`component-documentation` skill'i şu an sadece Button bileşeninde test edildi.
Diğer bileşen tiplerinde de test edilerek skill template'i genelleştirilmeli.

- [ ] Input/TextField bileşeni — form elemanı, farklı state'ler (error, focused, disabled, helper text)
- [ ] Card bileşeni — container/organism seviyesi, slot yapısı, responsive davranış
- [ ] Modal/Dialog bileşeni — overlay, focus trap, klavye yönetimi, a11y gereksinimleri
- [ ] Navigation/Tab bileşeni — aktif/pasif state, responsive collapse, icon+label

Her testte kontrol edilecekler:
- Skill'in 2 format seçeneği (Standard/Compact) doğru çalışıyor mu?
- Variant sayısı değişken olanlarda kart layoutu bozuluyor mu?
- Token referansları bileşen bazlı doğru çekilebiliyor mu?
- Endüstri standartları bileşen tipine göre doğru adapte ediliyor mu?

### P3 — Yeni Skiller

- [ ] `design-to-code-generator` — tasarım → React/Vue/Svelte kod üretimi
- [ ] `design-system-migrations` — variable toplu yeniden adlandırma, token güncelleme
- [ ] `layout-reconstruction` — layout context'ten responsive grid oluşturma

### P3 — Anthropic Design Skill Maddelerini F-MCP Skill'lerine Entegre Etme (v2)

> Kaynak: Anthropic built-in design skill'leri (accessibility-review, design-handoff, design-critique, design-system-management, ux-writing, frontend-design) ile tüm F-MCP skill'leri **satır satır** karşılaştırıldı.
> Temel tespit: F-MCP teknik execution'da güçlü ama **tasarım prensipleri, yapısal çerçeveler, estetik yönlendirme ve kişiselleştirme** eksik.
> Ayrıca: Anthropic'in user-research ve research-synthesis skill'leri F-MCP'de hiç yok — PO/PM persona'sı için entegre edilmeli.

---

#### 0. [TAMAMLANDI] Marka Profili Mekanizması (`brand-profile`)

> Tüm skill'lerin kişiselleştirilebilmesi için ortak bir yapı gerekiyor.

- [ ] `.fmcp-brand-profile.json` şema tanımı oluştur — skill'lerin okuyacağı merkezi kişiselleştirme dosyası
  ```json
  {
    "brand": {
      "name": "Acme Corp",
      "language": "tr",
      "voiceTone": {
        "personality": ["samimi", "profesyonel", "cesur"],
        "formality": "semi-formal",
        "humor": "subtle",
        "examples": {
          "success": "Harika! İşlem tamamlandı.",
          "error": "Bir sorun oluştu. Tekrar deneyebilirsin.",
          "empty": "Henüz burada bir şey yok. Hadi başlayalım!"
        }
      },
      "copyRules": {
        "maxCTALength": 24,
        "avoidWords": ["tıklayın", "lütfen"],
        "preferWords": ["keşfet", "başla", "oluştur"],
        "ctaStyle": "verb-first",
        "errorTone": "empathetic-actionable"
      },
      "typography": {
        "displayFont": "Satoshi",
        "bodyFont": "Inter",
        "monoFont": "JetBrains Mono",
        "rationale": "Satoshi display için cesur/modern, Inter body için okunaklı"
      },
      "aestheticDirection": "minimal-bold",
      "targetPlatforms": ["ios", "android", "web"],
      "designSystemName": "Acme DS"
    }
  }
  ```
- [ ] Her skill'e "Marka Profili Entegrasyonu" bölümü ekle — `.fmcp-brand-profile.json` varsa oku, yoksa varsayılan davranış
- [ ] `SKILL_INDEX.md`'ye "Kişiselleştirme" bölümü ekle — profil dosyasının ne olduğu, nasıl oluşturulacağı

---

#### 1. [TAMAMLANDI] `figma-a11y-audit/SKILL.md` — Erişilebilirlik Çerçevesi

Kaynak: Anthropic `accessibility-review`
Ekleme yeri: `## Required Workflow`'dan hemen önce

- [ ] **"WCAG 2.1 AA Hızlı Referans"** — 4 prensip, 12 kriter:
  - Perceivable: 1.1.1 (alt text), 1.3.1 (semantik yapı), 1.4.3 (metin kontrastı ≥4.5:1), **1.4.11** (UI bileşen kontrastı ≥3:1 — mevcut skill'de eksik, sadece metin kontrastı var)
  - Operable: 2.1.1 (klavye), 2.4.3 (fokus sırası), **2.4.7** (görünür fokus göstergesi — mevcut Step 7c'de odak sırası var ama fokus göstergesi tasarım kuralı yok), **2.5.5** (dokunma hedefi ≥44px — mevcut Step 5'te var ama WCAG referansı yok)
  - Understandable: 3.1.1 (dil), **3.2.1** (fokusta tahmin edilebilir davranış — tamamen eksik), **3.3.1** (hata tanımlama — tamamen eksik), 3.3.2 (etiket/talimat)
  - Robust: 4.1.2 (ad/rol/değer)
- [ ] **"Yaygın Sorunlar Kontrol Listesi"** — 8 madde (Step 8 doğrulama listesine ek olarak, Step 3'ten önce referans):
  1. Yetersiz renk kontrastı 2. Eksik form etiketleri 3. Klavye erişimi yok 4. Alt text eksik 5. Focus trap hatalı 6. ARIA landmark eksik 7. Otomatik oynatılan medya 8. Zaman limitleri
- [ ] **"Test Yaklaşımı Sırası"** — 5 aşama (Step 3'ten önce, denetimin hangi sırayla yürütüleceğini belirtir):
  1. Otomatik tarama (Step 4-6) 2. Klavye-only navigasyon (Step 7c, 7e) 3. Ekran okuyucu testi (Step 7a, 7b, 7d) 4. Kontrast doğrulama (gradient/overlay kaçırılanlar — screenshot) 5. %200 zoom testi (içerik kaybı/yatay kaydırma kontrolü)
- [ ] **Step 5 genişletme:** Mevcut dokunma hedefi kontrolüne **2.5.5** WCAG referansı ekle ve web için **24x24 CSS px** minimum hedef (WCAG 2.2 Target Size) notu
- [ ] **Step 8 genişletme:** Mevcut 7 kontrole 3 yeni kontrol ekle: (8) fokus göstergesi renk kontrastı, (9) hata mesajı ilişkilendirme (aria-describedby), (10) UI bileşen kontrastı (non-text 3:1)

---

#### 2. [TAMAMLANDI] `ai-handoff-export/SKILL.md` — Handoff Prensipleri ve Kapsamı

Kaynak: Anthropic `design-handoff`
Ekleme yeri: `## Rules` bölümünün hemen üstüne yeni `## Handoff Prensipleri` bölümü

- [ ] **"Handoff Prensipleri"** (4 madde — mevcut Rules'a ek, daha üst düzey):
  1. Varsayma, belirt — belirtilmeyen her şeyi geliştirici tahmin eder
  2. Token kullan, değer değil — `spacing-md` yaz, `16px` yazma (mevcut Rules'ta implicit var ama prensip olarak formüle edilmemiş)
  3. Tüm durumları göster — default, hover, active, disabled, loading, error, empty (mevcut skill'de durumlar yok!)
  4. Neden'i açıkla — "Mobilde daraltılır çünkü tek elle kullanım" bağlamı handoff'a ekle
- [ ] **"Etkileşim Spesifikasyonları"** (Step 5 ile Step 6 arasına yeni Step):
  - Tıklama/tap davranışı, hover durumları
  - Transition: süre (ms) + easing (ease-in-out, spring vb.)
  - Gesture desteği: swipe, pinch, long-press (hangi platform neyi destekler)
  - Animasyon: giriş/çıkış animasyonları, stagger delay
- [ ] **"İçerik Spesifikasyonları"** (Step 5'e ek, Code-Only Props'tan sonra):
  - Karakter limitleri (başlık max 60, açıklama max 120 vb.)
  - Truncation davranışı (ellipsis, fade, wrap)
  - Boş durum (empty state) tanımı ve görseli
  - Yükleme durumu (loading/skeleton) tanımı
  - Hata durumu (error state) mesaj yapısı — UX Copy Guidance skill'ine referans
- [ ] **"Uç Durumlar"** (Step 8 Self-healing'den sonra yeni Step):
  - Min/max içerik (başlık 3 kelime vs 30 kelime)
  - Uluslararası metin (Almanca %30 daha uzun, Arapça RTL)
  - Yavaş bağlantı (offline/timeout fallback)
  - Eksik veri (null avatar, isim yok)
- [ ] **"Erişilebilirlik Spesifikasyonları"** (mevcut handoff'ta tamamen yok!):
  - Fokus sırası haritası (figma-a11y-audit çıktısına referans)
  - ARIA label/role listesi
  - Klavye etkileşimleri (Tab, Enter, Escape, Arrow keys)
  - Ekran okuyucu duyuruları (dinamik içerik değişikliklerinde)
- [ ] **Marka Profili Entegrasyonu:** `.fmcp-brand-profile.json` varsa handoff'a `voiceTone` ve `copyRules` bilgisini otomatik ekle

---

#### 3. [TAMAMLANDI] `audit-figma-design-system/SKILL.md` — DS Eksiksizlik Çerçevesi

Kaynak: Anthropic `design-system-management`
Ekleme yeri: `## Ne işaretlenir / ne işaretlenmez` bölümünün hemen üstüne

- [ ] **"DS Eksiksizlik Çerçevesi: Token Kategorileri"** — audit sırasında bu kategorilerin varlığını kontrol et:
  - Renkler: brand (primary, secondary, accent), semantic (success, warning, error, info), neutral (gray scale)
  - Tipografi: scale (6+ kademe), weights (regular, medium, semi-bold, bold), line-heights
  - Spacing: scale (4-8 kademe, ör. 4/8/12/16/24/32/48/64)
  - Border: radius kademeleri, genişlik
  - Shadow: elevation seviyeleri (sm, md, lg, xl)
  - **Motion: duration + easing** (mevcut audit'te hiç kontrol edilmiyor! DS'lerde motion token'ları sıkça eksik)
- [ ] **"DS Eksiksizlik Çerçevesi: Bileşen Tanımı"** — bir bileşenin "eksiksiz" sayılması için:
  - Variant'lar (primary, secondary, ghost, destructive vb.)
  - Durumlar (default, hover, active, disabled, loading, error — **mevcut audit sadece instance/token sayıyor, durum eksikliğini kontrol etmiyor**)
  - Boyutlar (sm, md, lg — en az 2)
  - Davranış spec'i (transition, animasyon)
  - A11y spec'i (minimum touch target, fokus göstergesi, label)
- [ ] **"DS Eksiksizlik Çerçevesi: Pattern Katmanı"** — bileşen üstü pattern kontrolü:
  - Forms (input grubu, validation görseli, submit akışı)
  - Navigation (sidebar, tabs, breadcrumb, bottom nav)
  - Data display (tablo, kart listesi, liste)
  - Feedback (toast, modal, inline mesaj, snackbar)
- [ ] **"DS Prensipleri"** (audit raporunun sonuna ek bölüm):
  1. Tutarlılık > Yaratıcılık — sistem tekrar icat edilmesin diye var
  2. Kısıtlamalar içinde esneklik — composable, rigid değil
  3. Belgelenmemiş = yok — component-documentation skill'ine referans
  4. Versiyonla ve migrate et — breaking change'lerde migration path sun
- [ ] **Audit JSON şemasına yeni alan:** `"dsCompleteness"` objesi ekle — token kategorileri, bileşen durum kapsamı, pattern kapsamı skorları

---

#### 4. [TAMAMLANDI] `figma-screen-analyzer/SKILL.md` — Tasarım Kritik Çerçevesi

Kaynak: Anthropic `design-critique`
Ekleme yeri: Step 4'ü (Görsel Hiyerarşi Değerlendirmesi) genişlet + Step 5'e yeni bölüm

- [ ] **Step 3.5 (yeni): "İlk İzlenim Analizi (2 saniye testi)"** — Step 3 (DS Uyum) ile Step 4 arasına:
  - Screenshot'a bakarak: göz ilk nereye gidiyor? bu doğru mu?
  - Duygusal tepki: güven mi, kafa karışıklığı mı, heyecan mı?
  - Amaç netliği: ekran ne için, 2 saniyede anlaşılıyor mu?
  - Bu bölüm mevcut "Görsel Hiyerarşi"den farklı: daha sezgisel, daha kısa
- [ ] **Step 4 genişletme:** Mevcut 4 maddeye (ana bölümler, görsel akış, öne çıkan öğeler, boşluk dengesi) ekle:
  - **Okuma sırası doğru mu?** (başlık → alt başlık → içerik → CTA — F-pattern, Z-pattern veya üstten alta mı?)
  - **Vurgu doğru elemanda mı?** (CTA görsel olarak en dikkat çekici mi? yoksa dekoratif bir eleman mı öne çıkıyor?)
  - **Tipografi hiyerarşisi net mi?** (kaç farklı boyut var? 3-4 kademe yeterli, 7+ sorun)
  - Beyaz alan etkili mi? (sıkışıklık mı, dengesiz dağılım mı, kasıtlı dramatik boşluk mu?)
- [ ] **Step 5 genişletme: "Geri Bildirim Prensipleri"** — rapor üretildikten sonra nasıl sunulacağı:
  1. Spesifik ol — "CTA navigasyonla yarışıyor" yaz, "layout kafa karıştırıcı" yazma
  2. Neden'i açıkla — tasarım prensibine veya kullanıcı ihtiyacına bağla
  3. Alternatif öner — sadece sorun tespit etme, çözüm de sun
  4. İyi olanı kabul et — iyi yapılan şeyleri de raporla (yalnızca eleştiri değil)
  5. Aşamaya göre ayarla — erken keşif farklı, son düzeltme farklı feedback alır
- [ ] **Marka Profili Entegrasyonu:** `.fmcp-brand-profile.json` varsa `aestheticDirection` ve `typography` bilgisiyle değerlendir

---

#### 5. [TAMAMLANDI] `generate-figma-screen/SKILL.md` — Tasarım Düşüncesi ve Estetik

Kaynak: Anthropic `frontend-design`
Ekleme yeri: Step 2 (Ekranı Anla) ile Step 3 (DS Keşfi) arasına yeni Step 2.5

- [ ] **Step 2.5 (yeni): "Tasarım Yönü Belirleme"** — DS bileşenlerini keşfetmeden ÖNCE:
  - **Amaç:** Bu ekran hangi sorunu çözüyor? Kim kullanıyor?
  - **Estetik Yön:** Marka profili varsa `.fmcp-brand-profile.json` → `aestheticDirection` oku. Yoksa kullanıcıya sor:
    - brutal minimal, maksimalist, retro-futuristik, organik/doğal, lüks/rafine, playful/oyunsu, editorial/dergi, brutalist/ham, art deco/geometrik, soft/pastel, industrial/utiliteryen, neon/cyber
  - **Kısıtlamalar:** Teknik gereksinimler (framework, performans, a11y)
  - **Farklılaşma:** Bu ekranı unutulmaz yapan tek şey ne?
  - **NOT:** DS bileşen kütüphanesi olan projelerde estetik yön DS'nin belirlediği sınırlar içinde olmalı. DS yoksa serbest estetik.
- [ ] **Step 3'e "Tipografi Stratejisi" ek bölüm:**
  - Marka profili varsa → `typography.displayFont` ve `typography.bodyFont` kullan
  - DS font'ları varsa → DS font'larını kullan (Inter DS font'uysa Inter DOĞRU)
  - Ne DS ne profil varsa → ayırt edici display font seç (Satoshi, Clash Display, General Sans vb.), generic fontlardan kaçın (Arial, Roboto, system fonts)
  - Body font: display ile kontrast oluşturan okunaklı font
  - Font çifti kararını raporla (neden bu çift?)
- [ ] **Step 5'e "Görsel Derinlik" ek bölüm:** (bölüm bölüm inşa sırasında)
  - Spatial composition: asimetri, overlap, diagonal flow, grid-breaking öğeler, dramatik negatif alan
  - Arka plan: düz renk yerine atmosfer oluştur — gradient mesh, noise doku, geometrik pattern, katmanlı transparan
  - Detaylar: gölge derinliği, dekoratif border, micro-interaction ipuçları
  - **NOT:** Bu öneriler DS bileşen kütüphanesi varsa DS'nin izin verdiği ölçüde uygulanır
- [ ] **"Anti-Pattern Koruması"** (Step 6 Görsel Doğrulama'ya ek kontrol):
  - YAPMA: DS font'u yokken generic font kullan (Inter, Roboto, Arial)
  - YAPMA: Mor gradient + beyaz arka plan (klişe AI estetiği)
  - YAPMA: Tahmin edilebilir grid (12-col, hep aynı padding)
  - YAPMA: Her ekran birbirinin kopyası (aynı layout, aynı renk, aynı font)
  - Screenshot kontrolünde: "Bu ekran başka bir AI'ın ürettiği gibi mi görünüyor?" sorusu

---

#### 6. [TAMAMLANDI] `ux-copy-guidance/SKILL.md` — UX Yazarlık ve Marka Sesi Rehberi

Kaynak: Anthropic `ux-writing` + kişiselleştirme ihtiyacı

> Bu skill salt okunur değildir — Figma text node'larına copy uygulayabilir.

- [ ] **Frontmatter:** name, description, personas (designer, uidev, po), mcp-server
- [ ] **"5 Temel Prensip":**
  1. Anlaşılır — jargon yok, belirsizlik yok, açık söyle
  2. Kısa — tam anlamı en az kelimeyle ifade et
  3. Tutarlı — aynı kavram her yerde aynı terim
  4. Faydalı — her kelime kullanıcının hedefine hizmet etsin
  5. İnsanca — yardımsever bir insan gibi yaz, robot gibi değil
- [ ] **"Kopya Kalıpları" (formüllü):**
  - **CTA:** Fiille başla + spesifik ol + sonuca eşle → "Hesap oluştur" (DOĞRU) vs "Gönder" (YANLIŞ)
  - **Hata Mesajları:** Ne oldu + Neden + Nasıl düzeltilir → "Ödeme reddedildi. Bankanız kartı onaylamadı. Farklı bir kart deneyin."
  - **Boş Durumlar:** Bu ne + Neden boş + Nasıl başlanır → "Henüz proje yok. İlk projenizi oluşturarak ekibinizle çalışmaya başlayın."
  - **Onay Diyalogları:** Eylemi netleştir + sonuçları belirt + butonlara eylem fiili → "3 dosya silinsin mi? Bu geri alınamaz." / "Dosyaları sil" / "Vazgeç"
  - **Başarı Mesajları:** Kısa kutla + sonraki adım → "Profil güncellendi. Değişiklikler hemen yansıyacak."
  - **Yükleme Durumları:** Ne yapılıyor + beklenti → "Raporunuz hazırlanıyor..." (1-3 sn), "Bu birkaç dakika sürebilir" (>10 sn)
- [ ] **"Ses ve Ton Rehberi":**
  - Varsayılan ton matrisi: Başarı (kutlayıcı ama abartısız), Hata (empatik + aksiyon odaklı), Uyarı (net + acil), Nötr (bilgilendirici + kısa)
  - **Kişiselleştirme:** `.fmcp-brand-profile.json` → `voiceTone` bölümünü oku. Varsa:
    - `personality` dizisinden ton kalibrasyonu yap (ör. ["samimi", "cesur"] → kısa, direkt, emoji-uygun)
    - `formality` seviyesine göre kelime seçimi (formal: "İşleminiz başarıyla tamamlandı" vs casual: "Tamam, bitti!")
    - `humor` seviyesi (none: asla, subtle: hafif, playful: serbest)
    - `examples` bölümündeki gerçek örnekleri ton referansı olarak kullan
  - **Profil yoksa:** Kullanıcıya 3 soru sor:
    1. Markanız bir insan olsa nasıl konuşurdu? (3 sıfat)
    2. Formallik seviyesi? (formal / yarı-formal / casual)
    3. Bir başarı mesajı örneği verin
    → Cevapları `.fmcp-brand-profile.json` olarak kaydet
- [ ] **"Çok Dilli / i18n Kuralları":**
  - Almanca, Fince, Macarca gibi diller metin uzunluğunu %20-40 artırır — tasarımda truncation planla
  - Arapça, İbranice RTL layout gerektirir
  - Tarih/saat/para formatları kültüre göre değişir
  - Copy kalıplarında kültür-nötr dil kullan (metafor, deyim, emoji dikkatli)
- [ ] **"Figma Entegrasyonu"** — copy'yi Figma text node'larına uygulama:
  ```js
  // figma_execute — Text node'lara copy uygula
  const node = await figma.getNodeByIdAsync("<TEXT_NODE_ID>");
  await figma.loadFontAsync(node.fontName);
  node.characters = "Yeni copy metni";
  ```
  - Toplu copy güncelleme: ekrandaki tüm text node'ları listele → kullanıcıya tablo sun → onaylananları güncelle
- [ ] **Skill Koordinasyonu:**
  - ai-handoff-export → Step 5 (İçerik Spesifikasyonları) bu skill'e referans verir
  - figma-screen-analyzer → raporda copy kalitesi değerlendirmesi bu skill'i referans alır
  - component-documentation → bileşen label/placeholder copy'si bu skill'in prensiplerini uygular
  - generate-figma-screen → text node oluştururken bu skill'in kalıplarını kullanır

---

#### 7. [TAMAMLANDI] `component-documentation/SKILL.md` — Durum ve Copy Zenginleştirmesi

Kaynak: Anthropic `design-system-management` (bileşen durumları) + `ux-writing` (copy spec)

- [ ] **Format Seçenekleri (Standard) genişletme:** Mevcut 8 bölüme 2 yeni bölüm ekle:
  - **Bölüm 3.5: Durumlar** — Default, Hover, Active/Pressed, Disabled, Loading, Error, Focus görsel grid'i (mevcut Standard format'ta durumlar sadece Props'ta dolaylı var, görsel olarak gösterilmiyor)
  - **Bölüm 7.5: Copy Spec** — Bileşenin text node'ları için copy kuralları (max karakter, truncation, boş durum metni) — ux-copy-guidance skill'ine referans
- [ ] **Bileşen Description Kuralları genişletme:** "Bu bileşen hangi durumlara sahip?" sorusunu description'a tek cümleyle ekle

---

#### 8. [TAMAMLANDI] `implement-design/SKILL.md` — Handoff Prensipleri ve Etkileşim Detayı

Kaynak: Anthropic `design-handoff` (prensip 4: "neden'i açıkla")

- [ ] **Step 2 (Handoff & Specs Topla) genişletme:** ai-handoff-export'un yeni "Etkileşim Spesifikasyonları" ve "Uç Durumlar" bölümlerini implement-design'ın spec toplama adımında referans al
- [ ] **Step 7 (Design Parity Check) genişletme:** Mevcut görsel karşılaştırmaya ek olarak:
  - Durum kapsamı kontrolü: tüm durumlar (hover, disabled, loading, error) implement edildi mi?
  - Etkileşim kontrolü: transition süreleri doğru mu?
  - Uç durum kontrolü: min/max içerik test edildi mi?

---

#### 9. [TAMAMLANDI] `generate-figma-library/SKILL.md` — DS Eksiksizlik Kontrolü

Kaynak: Anthropic `design-system-management` (token kategorileri, bileşen tanımı)

- [ ] **Faz 2 (Foundations) genişletme:** Mevcut token oluşturma adımlarına ekle:
  - **Motion token'ları:** duration (fast: 150ms, normal: 250ms, slow: 400ms) ve easing (ease-in-out, spring) — mevcut skill'de motion token'ları hiç yok
  - **Shadow/elevation token'ları:** sm, md, lg, xl seviyeleri — mevcut skill'de shadow token oluşturma var mı kontrol et, yoksa ekle
- [ ] **Faz 4 (Components) genişletme:** Her bileşen için zorunlu durum kontrolü:
  - Default, Hover, Active, Disabled, Loading, Error, Focus — en az 4'ü olmalı
  - Mevcut skill sadece variant oluşturuyor, durum kapsamı kontrolü yok

---

#### 10. [TAMAMLANDI] `design-system-rules/SKILL.md` — DS Prensipleri ve Pattern Katmanı

Kaynak: Anthropic `design-system-management` (prensipler)

- [ ] **Step 4 (Platform-Spesifik Kurallar) genişletme:** Her platform kural dosyasının başına DS prensipleri ekle:
  1. Tutarlılık > Yaratıcılık
  2. Kısıtlamalar içinde esneklik (composable, rigid değil)
  3. Belgelenmemiş = yok
  4. Versiyonla ve migrate et
- [ ] **Cross-Platform Kurallar genişletme:** Pattern katmanı referansı ekle — Forms, Navigation, Data Display, Feedback pattern'larının tüm platformlarda aynı mantıkla çalışması gerektiği

---

#### 11. [TAMAMLANDI] `design-drift-detector/SKILL.md` — Motion Token Drift Kontrolü

- [ ] **Drift kontrol listesine ekle:** Motion token'ları (duration, easing) — mevcut skill sadece renk, tipografi, spacing drift'i kontrol ediyor, motion yok

---

#### 12. [TAMAMLANDI] `SKILL_INDEX.md` — Kapsamlı Güncelleme

- [ ] Yeni `ux-copy-guidance` skill'i index'e ekle — "Dokümantasyon" veya yeni "İçerik ve Yazarlık" kategorisi
- [ ] "Kişiselleştirme" bölümü ekle — `.fmcp-brand-profile.json` açıklaması, profil oluşturma akışı
- [ ] Persona akışlarını güncelle:
  - **Tasarımcı:** generate-figma-screen akışına "Tasarım Yönü Belirleme" adımı ekle
  - **DesignOps:** audit akışına "DS Eksiksizlik Çerçevesi" kontrolü ekle
  - **UI Geliştirici:** handoff akışına "Etkileşim Spesifikasyonları" ve "Uç Durumlar" adımı ekle
  - **PO/PM:** figma-screen-analyzer akışına "İlk İzlenim Analizi" ekle, ux-copy-guidance'ı ekle
- [ ] Uçtan Uca Akış'ı güncelle — yeni skill ve adımları ekle
- [ ] Skill sayısını güncelle (18 → 19)

---

#### Uygulama Sırası (Önerilen)

1. **Önce:** Madde 0 (brand-profile şeması) — diğer tüm skill'lerin referans alacağı temel
2. **Sonra:** Madde 6 (ux-copy-guidance yeni skill) — bağımsız, diğerlerini bloklamaz
3. **Paralel:** Madde 1-5 (mevcut skill genişletmeleri) — birbirinden bağımsız
4. **Paralel:** Madde 7-11 (ikincil genişletmeler) — birbirinden bağımsız
5. **Son:** Madde 12 (SKILL_INDEX güncellemesi) — tüm değişiklikler tamamlandıktan sonra

---

### P3.5 — Skill Hata Düzeltmeleri + Dış Kaynak İyileştirmeleri (Sıfır Hata Doğrulanmış)

> Kaynak: edenspiekermann/Skills (3 skill), Owl-Listener/designer-skills (63 skill, 8 plugin) ile F-MCP skill'leri karşılaştırıldı. Ayrıca mevcut skill'lerdeki hatalar, tutarsızlıklar ve yanlış kodlar tespit edildi. Tüm `figma_*` çağrıları ve `figma_execute` içindeki Figma Plugin API kullanımları kaynak kodla doğrulandı.

#### HATA DÜZELTMELERİ (A1-A10)

**A1. ai-handoff-export: Duplike "Step 6" numaralama hatası**
- [ ] İki ayrı adım "Step 6" olarak numaralanmış (satır 83 ve 87). Sonraki tüm adımlar bir numara kayık.
- Düzeltme: Step 6 (Screenshot) → Step 6, Step 6 (Handoff) → Step 7, Step 7 → Step 8, Step 8 → Step 9, Step 9 → Step 10. Yeni eklenen bölümler de buna göre kaydırılacak.

**A2. figma-a11y-audit: "Salt okunur" iddiası ama annotation yazıyor**
- [ ] Overview "Salt okunur — Figma tuvalinde değişiklik yapmaz" diyor ama Step 7 annotation frame oluşturuyor.
- Düzeltme: `**Okuma + Yazma** — Denetim sonuçlarını okur, isteğe bağlı olarak annotation frame ekler.`

**A3. figma-a11y-audit: Step 8 h1Count kontrolü yanlış**
- [ ] `h1Count <= 2` — kural "max 1 adet H1" diyor. 2 H1'e izin vermek yanlış.
- Düzeltme: `h1Count <= 2` → `h1Count <= 1`

**A4. figma-a11y-audit: Step 8 body text filtresi mantık hatası**
- [ ] `n.fontSize < 18 && n.fontSize < 14` — `< 18` gereksiz. Ayrıca `<12` zaten önceki step'te yakalanıyor.
- Düzeltme: `allText.filter(n => n.fontSize >= 12 && n.fontSize < 14)`

**A5. figma-screen-analyzer: Duplike figma_get_design_context çağrısı**
- [ ] Step 2'de iki ayrı çağrı (depth=3/full + depth=2). Aynı veriyi iki kere çekmek gereksiz.
- Düzeltme: İkinci çağrıyı (depth=2) sil.

**A6. figma-screen-analyzer: Step numaralama kayması**
- [ ] Yeni Step 3 (İlk İzlenim) eklendikten sonra eski Step numaraları güncellenmedi.
- Düzeltme: DS Uyum → Step 4, Görsel Hiyerarşi → Step 5, Geri Bildirim → Step 6, Rapor → Step 7.

**A7. figma-a11y-audit: WCAG versiyon başlık tutarsızlığı**
- [ ] Başlık "WCAG 2.1 AA" diyor ama 2.5.5 Target Size kriteri WCAG 2.2'de eklendi.
- Düzeltme: `"WCAG 2.1/2.2 AA Hızlı Referans"` + 2.5.5'e `(WCAG 2.2)` notu.

**A8. component-documentation: Compact formatta Copy Spec eksikliği belirtilmemiş**
- [ ] Standard 10 bölüme çıktı ama Compact'ta Copy Spec yok, bu belirtilmemiş.
- Düzeltme: Compact'a not ekle: `NOT: Copy Spec ve Durumlar bölümleri Compact formatta dahil değildir.`

**A9. generate-figma-library: Faz 1 çıkış kriteri scope çelişkisi**
- [ ] Çıkış kriteri "tüm scope'lar ayarlı" diyor ama motion token STRING type — scope ayarlanamaz.
- Düzeltme: `→ Çıkış kriteri: ... (motion token'lar STRING olarak belgelenmiş), shadow effect style'lar oluşturulmuş`

**A10. SKILL_INDEX.md: DesignOps akışında ux-copy-guidance eksik**
- [ ] Uçtan uca akışta ux-copy-guidance var ama DesignOps persona akışında yok.
- Düzeltme: DesignOps akışına isteğe bağlı ux-copy-guidance ekle.

#### İYİLEŞTİRMELER (B1-B12)

**edenspiekermann kaynaklı (B1-B4):**
- [ ] B1. audit-figma-design-system: Ortam bazlı çıktı format otomatik tespiti (CI→JSON, chat→markdown)
- [ ] B2. apply-figma-design-system: İki giriş modu (review-then-apply + apply-known-scope)
- [ ] B3. apply-figma-design-system: %80 eşik kuralı ("birkaç DS buton ≠ bağlı bölüm")
- [ ] B4. fix-figma-design-system-finding: 3 beklenen girdi formatı (tek JSON, tam audit+index, serbest metin+URL)

**Owl-Listener kaynaklı (B5-B12):**
- [ ] B5. generate-figma-screen: Loading state karar ağacı (<1sn→yok, 1-3sn→spinner, 3-10sn→skeleton, >10sn→progress bar)
- [ ] B6. generate-figma-library: İsimlendirme konvansiyonu çerçevesi (token: kategori/alt/varyant, bileşen: PascalCase, prop: camelCase)
- [ ] B7. generate-figma-library: 60-30-10 renk kuralı (%60 baskın, %30 ikincil, %10 vurgu)
- [ ] B8. figma-a11y-audit: Gesture a11y kontrolleri (swipe→buton alternatifi, pinch→+/- buton, long-press→context menu)
- [ ] B9. ai-handoff-export: Loading state karar ağacı (handoff'ta her öğe için loading pattern)
- [ ] B10. audit-figma-design-system: Nielsen 10 Sezgisel Değerlendirme (isteğe bağlı --heuristic flag)
- [ ] B11. component-documentation: State machine geçiş diyagramı (Default→Hover→Active→Default döngüsü)
- [ ] B12. implement-design: Gesture platform mapping tablosu (swipe/long-press/pinch/pull-to-refresh × iOS/Android/Web)

#### KOD/PLUGIN UYUMLULUK DOĞRULAMASI (Tamamlandı)

Tüm skill'lerdeki `figma_*` çağrıları ve `figma_execute` içindeki Figma Plugin API kullanımları kaynak kodla doğrulandı:
- ✅ setBoundVariable, findAll, loadFontAsync, getNodeByIdAsync → figma_execute içinde çalışır
- ✅ currentPageOnly → local-plugin-only.ts'de tanımlı
- ✅ Tüm parametre uyumluluğu doğrulandı (capture_screenshot, check_design_parity, get_design_context, execute timeout, get_variables verbosity)
- ⚠️ Dikkat: figma_execute timeout 5sn varsayılan (büyük ekranlarda artırılmalı), export limiti 50 node, variable batch limiti 100

#### Uygulama Sırası
1. **Önce A1-A10:** Hata düzeltmeleri
2. **Sonra B1-B12:** İyileştirmeler
3. **Son:** `npm run validate:fmcp-skills` + step numara doğrulama + Türkçe karakter kontrolü

---

### P3.5 — Canlı Figma Test Sonuçları (v1.7.17 doğrulaması)

P3.5 A1-A10 + B1-B12 uygulamasının ardından 19 skill canlı Figma dosyalarında satır satır test edildi. Her skill'in her step'i gerçek tool çağrılarıyla doğrulandı ve Figma üzerinde görsel çıktı bırakıldı.

**Test dosyaları (feedback ve görsel doğrulama için):**

- **Figma Design (Skill Test):** [https://www.figma.com/design/QNtXuQ5PshxcbkiyMc0YlA/Untitled?node-id=0-1](https://www.figma.com/design/QNtXuQ5PshxcbkiyMc0YlA/Untitled?node-id=0-1)
  - 20 sayfa: `0. Test Ana Sayfa` + 19 skill (her skill kendi sayfasında)
  - Her sayfada skill'in step notları, kullanılan araçlar, sonuç özeti
  - Login ekranı (390×844 mobil, `generate-figma-screen` testi)
  - Button component set + 5 variant (State=Default/Hover/Active/Disabled/Focus, `generate-figma-library` testi)
  - DS token'ları: 4 collection, 24 variable, 3 effect style
  - Bug fix doğrulama + WCAG 2.1/2.2 AA a11y denetim raporu

- **FigJam Board (Diyagram Test):** [https://www.figma.com/board/roQjK1YgnJBHOTLbtjqFck/Design-System-JIRA-backlog-süreci?node-id=0-1](https://www.figma.com/board/roQjK1YgnJBHOTLbtjqFck/Design-System-JIRA-backlog-süreci?node-id=0-1)
  - `figjam-diagram-builder` testi: 3 swim lane + 13 skill kartı + 10 connector
  - 3 fazlı üretim doğrulaması (Zemin → Node'lar → Connector'lar)
  - Güvenli execute kuralları (<500 karakter dönüş, deterministik koordinat)

**Test sonuçları:** 18 PASS | 1 PARTIAL | 0 SKIP
- **PARTIAL:** `visual-qa-compare` — Figma tarafı çalışıyor, kodlanmış UI olmadığı için karşılaştırma simülasyon

**Düzeltilen buglar (6/7) — Figma'ya birebir uygulandı:**
- ✅ Button touch target 41px → 45px (padding 12→14, tüm 5 variant)
- ✅ Placeholder kontrast 2.84:1 → 4.71:1 (WCAG AA, renk koyulaştırıldı)
- ✅ "Kayıt Olun" → primary/500 variable bağlandı (`fix-figma-design-system-finding` ile)
- ✅ Footer text + Alt başlık → neutral/900 variable bağlandı
- ✅ Placeholder Türkçe karakter "ornek" → "örnek" (`ux-copy-guidance` ile)
- ⚠️ **Açık:** semantic/error yuvarlama farkı (#e53333 vs #E63333) — token export normalize edilmeli

**Araç sorunları → P3.6 planına taşındı** (bu sürümde dahil değil, plugin dokunulmadı):
- `figma_setup_design_tokens` mode name → mode ID mapping (`f-mcp-plugin/code.js:2719-2731`)
- `ALL_FILLS` + spesifik fill scope çakışması doğrulaması yok (`f-mcp-plugin/code.js:632-635` + `src/core/plugin-bridge-connector.ts:56-63`)
- FigJam `shapeWithText` varsayılan font Inter Medium dokümante değil (`figma-canvas-ops/SKILL.md` + `figjam-diagram-builder/SKILL.md`)
- FigJam timeout limiti (13+ node single call → 5sn aşar) dokümante değil

**P3.6 uygulaması v1.7.18 veya sonraki sürümde yapılacak.** Plan detayı aşağıda.

---

### P3.6 — MCP Bridge Araç Sorunları Düzeltmesi (Sıfır Hata Doğrulanmış)

> Kaynak: 19 skill'in kapsamlı Figma testi sırasında tespit edildi. Plugin bozulmamalı, mevcut çağrılar geriye uyumlu kalmalı.

#### C1. figma_setup_design_tokens: mode name → mode ID mapping
- [x] `f-mcp-plugin/code.js` satır 2719-2733: Mode name'leri mode ID'ye çeviren `modeNameToId` haritası ekle
- [x] İlk modu `renameMode()` ile kullanıcının istediği isme yeniden adlandır ("Mode 1" → "Light")
- [x] COLOR tipi token'lar için `hexToFigmaRGB()` dönüşümü ekle (mevcut fonksiyon satır 150'de)
- [x] Geriye uyumluluk: `modeNameToId[mid] || mid` — ham mode ID geçilirse de çalışır
- Doğrulama: `modes: ["Light", "Dark"]` + `values: { "Light": "#fff", "Dark": "#000" }` → başarılı olmalı

#### C2. ALL_FILLS + spesifik fill scope çakışması doğrulaması
- [x] `f-mcp-plugin/code.js` satır 632-635: Scope atamadan önce ALL_FILLS mutual exclusion kontrolü ekle
- [x] `src/core/plugin-bridge-connector.ts` satır 56-63: `createVariable()` metoduna erken doğrulama ekle
- [x] Net hata mesajı: "ALL_FILLS cannot be combined with FRAME_FILL/SHAPE_FILL/TEXT_FILL..."
- Doğrulama: `["ALL_FILLS", "TEXT_FILL"]` → net hata, `["ALL_FILLS"]` tek başına → başarılı

#### C3. FigJam shapeWithText varsayılan font Inter Medium dokümantasyonu
- [x] `.cursor/skills/f-mcp/figma-canvas-ops/SKILL.md` Kural 8'e FigJam özel durumu ekle
- [x] `.cursor/skills/f-mcp/figjam-diagram-builder/SKILL.md` Step 2'ye FigJam Font Kuralı bölümü ekle
- [x] Kural: `createShapeWithText()` → "Inter Medium" (Regular DEĞİL), `loadFontAsync(shape.text.fontName)` önerisi

#### C4. FigJam timeout limiti dokümantasyonu
- [x] `.cursor/skills/f-mcp/figma-canvas-ops/SKILL.md` Kural 5'e timeout yapılandırması ekle
- [x] `.cursor/skills/f-mcp/figjam-diagram-builder/SKILL.md` Common Issues'a timeout bölümü ekle
- [x] Güvenli limitler: 1-6 node → 5000ms | 7-12 → 10000ms | 13+ → böl veya 15000-30000ms
- [x] Font optimizasyonu: Tek seferde yükle, sonra tüm node'ları oluştur

#### Uygulama Sırası
1. **C1** (en yüksek — araç tamamen kırık)
2. **C2** (kriptik hata mesajı)
3. **C3 + C4 birlikte** (doküman değişiklikleri)
4. **Son:** `npm run build:local` + `npm test` + `npm run validate:fmcp-skills` + canlı Figma doğrulama

#### Değişecek Dosyalar
- `f-mcp-plugin/code.js` (C1 + C2 plugin tarafı)
- `src/core/plugin-bridge-connector.ts` (C2 sunucu tarafı → `npm run build:local` gerekli)
- `.cursor/skills/f-mcp/figma-canvas-ops/SKILL.md` (C3 + C4)
- `.cursor/skills/f-mcp/figjam-diagram-builder/SKILL.md` (C3 + C4)

---

## TAMAMLANAN AŞAMALAR

- [x] **Türkçe Karakter Düzeltmesi** (2026-04-05) — 7 skill'e Türkçe Karakter Kuralı eklendi, 2 skill iç tutarsızlığı düzeltildi (component-documentation, generate-figma-library), 4 test output dosyası düzeltildi (HANDOFF.md, LoginScreen.tsx, LoginView.swift, LoginScreen.kt), Figma tasarım dosyasındaki 48+ text node ve frame ismi düzeltildi, 3 dokümantasyon dosyası düzeltildi (TEST_REPORT.md, FUTURE.md, CHANGELOG.md). İteratif doğrulama döngüsü ile sıfır hata garantisi.
- [x] **v1.5.2** — Test altyapısı (36 test, CI entegrasyonu)
- [x] **v1.5.1** — TypeScript tip güvenliği (%90 any azaltma, types/figma.ts)
- [x] **v1.5.0** — Plugin minify (geri alındı), CI güçlendirme, archive/belge/TODO temizliği
- [x] **v1.4.x** — Figma REST API (4 tool), Response Guard (context koruması), token yönetimi
- [x] **v1.3.x** — figma_set_port, çoklu AI aracı, port çatışması dayanıklılığı
- [x] **v1.2.x** — Sabit port, graceful shutdown, paralel görevler

**Tamamlananlar (işaretlendi):** npm **1.2.0** yayın/doğrulama - GitHub **Release v1.2.0** (gövde güncel) - **CHANGELOG** + **RELEASE_NOTES_TEMPLATE** süreç satırı - **Figma** org plugin - **FUTURE** kod taraması / Bridge tablosu - **S3** GitHub doküman maddeleri - **S7** README satırı - **Sabit port** stratejisi + ölü port probe - **Graceful shutdown** (SIGINT/SIGTERM) - **Paralel görevler** dokümantasyonu (MULTI_INSTANCE + CLAUDE_DESKTOP_CONFIG) - **check-ports** teşhis scripti - **figma_set_port** runtime port değişimi - **Port çatışması dayanıklılığı** (crash yerine MCP ayakta kalır) - **Çoklu AI aracı** aynı anda (Claude + Cursor) - **Figma REST API** token entegrasyonu (4 yeni tool) - **Response Guard** context koruması (237KB→10KB kırpma) - **429 retry** exponential backoff - **Plugin UI** token girişi + süre yönetimi + rate limit göstergesi - **figma.clientStorage** kalıcı token depolama.

**Kod taraması özeti:** `docs/TOOLS.md` / `TOOLS_FULL_LIST.md` / `FMCP_AGENT_CANVAS_COMPAT.md` — `dist/local-plugin-only.js` ile parite (2026-04). Yayın: `npm view @atezer/figma-mcp-bridge version` ile **1.7.0** doğrulanabilir (yayım sonrası).

---

## 1. NPM Publish

- [x] `@atezer/figma-mcp-bridge@1.2.0` npm'de yayında (`npm view` ile doğrulandı)
- [x] `npx -y @atezer/figma-mcp-bridge@latest` ile çekilebilirlik (paket sürümü 1.2.0)
- [ ] `figma-mcp-bridge-plugin` bin'inin temiz ortamda smoke testi (isteğe bağlı CI)

---

## 2. Yerel repo durumu (FCM -- bu workspace)

Aşağıdakiler repoda **mevcut**; upstream `atezer/FMCP` ile çalışıyorsanız `main` günceldir (fork/PR akışıyla çekenler kendi senkronunu doğrular).

### Skills

Kaynak tek klasör: **`.cursor/skills/f-mcp/`** (köke kopya `skills/` arşivde: `archive/skills-root-duplicate/`).

| Dosya | Durum |
|-------|--------|
| `.cursor/skills/f-mcp/figma-canvas-ops/SKILL.md` | Mevcut (yeni) |
| `.cursor/skills/f-mcp/generate-figma-screen/SKILL.md` | Mevcut (yeni) |
| `.cursor/skills/f-mcp/generate-figma-library/SKILL.md` | Mevcut (yeni) |
| `.cursor/skills/f-mcp/figjam-diagram-builder/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/audit-figma-design-system/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/fix-figma-design-system-finding/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/apply-figma-design-system/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/design-token-pipeline/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/code-design-mapper/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/design-system-rules/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/ai-handoff-export/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/implement-design/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/design-drift-detector/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/visual-qa-compare/SKILL.md` | Mevcut (yeni) |
| `.cursor/skills/f-mcp/figma-a11y-audit/SKILL.md` | Mevcut (yeni) |
| `.cursor/skills/f-mcp/figma-screen-analyzer/SKILL.md` | Mevcut (yeni) |
| `.cursor/skills/f-mcp/ds-impact-analysis/SKILL.md` | Mevcut (yeni) |

### Dokümanlar

| Dosya | Durum |
|-------|--------|
| `PRIVACY.md` | Mevcut |
| `docs/TOOLS.md` | Mevcut (MCP araç envanteri) |
| `docs/FMCP_AGENT_CANVAS_COMPAT.md` | Mevcut |
| `docs/FIGMA_USE_STRUCTURED_INTENT.md` | Mevcut |
| `docs/FMCP_ENTERPRISE_WORKFLOWS.md` | Mevcut |
| `docs/SECURITY_AUDIT.md` | Mevcut (güvenlik bulguları checklist) |
| `docs/handoff.manifest.schema.json` | Mevcut |
| `HANDOFF_TEMPLATE.md` | Mevcut |
| `docs/MULTI_INSTANCE.md` | Mevcut (paralel görevler bölümü eklendi) |
| `docs/CLAUDE_DESKTOP_CONFIG.md` | Mevcut (çoklu mcpServers örneği eklendi) |

### Bridge

| Konu | Durum |
|------|--------|
| `dist/local-plugin-only.js` | Plugin-only araç seti + **graceful shutdown** (SIGINT/SIGTERM) |
| `dist/local.js` | Tam mod: CDP, ek node araçları, tasarım sistemi önbelleği |
| `src/core/plugin-bridge-server.ts` | **Sabit port** stratejisi, `probePort` health-check, ölü port retry |
| `f-mcp-plugin/manifest.json` | `teamlibrary` izni (library variable araması için) |
| `scripts/check-ports.sh` | 5454-5470 port tarama teşhis scripti |

### Config örnekleri

| Dosya | Durum |
|-------|--------|
| `.mcp.json` | Mevcut (kök) |
| `.cursor-plugin/plugin.json` | Mevcut; sürüm **1.7.0**, açıklama `docs/TOOLS.md` referanslı |

---

## 3. GitHub ve doküman tutarlılığı

- [x] `atezer/FMCP` `main` ile yerel push senkronu (son değişiklikler gönderildi; fork/PR kullananlar kendi dallarını birleştirmeli)
- [x] `KURULUM.md` -- **Sürüm** **1.2.0** (`package.json` ile uyum)
- [x] `.cursor-plugin/plugin.json` -- `version` **1.2.0**; açıklama `docs/TOOLS.md` ile hizalı
- [x] Sürüm notları -- kök `CHANGELOG.md`; `README.md` ve `KURULUM.md` içinde GitHub Releases / npm takibi ve güncelleme özeti
- [x] GitHub Releases -- [v1.2.0](https://github.com/atezer/FMCP/releases/tag/v1.2.0), [v1.2.1](https://github.com/atezer/FMCP/releases/tag/v1.2.1); gövde: [`docs/releases/v1.2.0-body.md`](docs/releases/v1.2.0-body.md), [`docs/releases/v1.2.1-body.md`](docs/releases/v1.2.1-body.md); sonraki sürüm: **CHANGELOG -> `docs/releases/vX.Y.Z-body.md` -> [`RELEASE_NOTES_TEMPLATE.md`](docs/RELEASE_NOTES_TEMPLATE.md) içindeki `gh release create` / `edit`**

---

## 4. Cursor Plugin Dağıtımı

**Kontrol:** `.cursor-plugin/plugin.json` geçerli JSON; `skills` -> `.cursor/skills/f-mcp/`, `mcpServers` NPX tanımı mevcut -- Cursor sürümüne göre resmi şema doğrulaması elle/marketplace rehberi ile yapılmalı.

- [ ] Cursor Plugin API / şema ile biçim doğrulaması (resmi dokümantasyon)
- [ ] Skills yollarının IDE'de yüklendiği manuel test
- [ ] Cursor Marketplace'e publish değerlendir

---

## 5. Figma Plugin Yayını

**Kontrol notu (2026-03-27):** Depo tarafında `f-mcp-plugin/manifest.json` (Plugin ID, `teamlibrary`, `enablePrivatePluginApi`, `networkAccess` localhost **5454-5470**, FigJam/Dev editor) ve [docs/PUBLISH-PLUGIN.md](docs/PUBLISH-PLUGIN.md) (Data security cevapları, org seçimi) yayın gereksinimleriyle uyumlu. **Canlı durum:** Organization üzerinden plugin yayını tamamlandı; diğer organizasyonel dağıtımlar (ek org / aynı yapılandırma ile çoğaltma) için hazırlık kullanıcı tarafından onaylandı.

- [x] **Organization private plugin** -- Figma Org üzerinden yayınlandı; çoklu org / org yapılarına uygun dağıtım için hazır
- [ ] **Community (genel)** -- İsteğe bağlı; Figma Community incelemesi ayrı süreç (şimdilik org odaklı yayın yeterli sayıldı)
- [x] **Plugin listing** -- Görsel, açıklama ve etiketler org yayını için hazırlandı / kullanıldı

---

## 6. .mcpb Dosya Dağıtımı

**Kontrol:** Depoda `*.mcpb` dosyası yok; dağıtım maddeleri hala geçerli.

- [ ] `figma-mcp-bridge.mcpb` (büyük paket) -- GitHub tek dosya limiti dışında kalıyorsa
- [ ] Alternatif: GitHub Releases asset veya ayrı hosting
- [ ] Gerekirse Git LFS

---

## 7. Doküman & README İyileştirmeleri

- [ ] GitHub repo **description** ve **topics** (Figma, MCP, design-system, AI, cursor, claude) -- repo ayarları (UI)
- [x] Kök `README.md` mevcut ve güncel; `docs/` bağlantı tablosu var
- [x] `docs/TOOLS.md` -- **Agent Canvas** / `local-plugin-only` paritesi (2026-04): `figma_search_assets` / `figma_get_code_connect` / `figma_use` kayıtlı değildir notu; `TOOLS_FULL_LIST.md`, `FMCP_AGENT_CANVAS_COMPAT.md`, `FIGMA_USE_STRUCTURED_INTENT.md` ile hizalı
- [ ] İngilizce README alternatifi veya çift dil desteği değerlendir
- [ ] Badge'ler (npm version, license, stars)

---

## 8. Test & CI

**Kontrol:** `.github/workflows/` mevcut (validate:fmcp-skills CI); ek test/build CI eklenmedi.

- [ ] GitHub Actions: `npm run build:local`, `npm test` / lint
- [ ] NPM publish workflow (tag -> `npm publish`)
- [ ] Plugin bağlantısı smoke testi (isteğe bağlı)
- [ ] Güvenlik düzeltmeleri sonrası regresyon: `figma_execute` limit, WS payload (bkz. [S10](#10-güvenlik-denetimi-security-audit))
- [ ] Bağımlılık gözden geçirmesi: periyodik `npm audit` (gerekirse `fix` / manuel yükseltme); kritik CVE'lerde patch sürümü
- [ ] İsteğe bağlı: commit/CI öncesi **secret / anahtar sızıntısı** taraması (ör. [gitleaks](https://github.com/gitleaks/gitleaks), TruffleHog) -- `wrangler.jsonc` id'leri için [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) (D2)

---

## 9. İleri Seviye (Uzun Vadeli)

- [ ] Cloudflare Worker -- `wrangler.jsonc` + `src/index.ts` (Durable Objects, OAuth KV) mevcut; **production deploy / operasyon** ve dokümantasyon netleştirilmeli
- [ ] OAuth -- Worker tarafında token/refresh kodu var; **çoklu kullanıcı / oturum modeli** ve güvenlik gözden geçirmesi açık ([S10](#10-güvenlik-denetimi-security-audit) Y1/O3 ile ilişkili)
- [ ] Python bridge -- `python-bridge/` mevcut; Node **1.2.0** ile protokol/feature parity testi
- [x] Multi-instance -- `docs/MULTI_INSTANCE.md` sabit port ve paralel görevler dokümantasyonu tamamlandı; `check-ports.sh` teşhis scripti eklendi
- [x] Port env -- `src/core/config.ts`: `FIGMA_MCP_BRIDGE_PORT` **veya** `FIGMA_PLUGIN_BRIDGE_PORT` (ikisi de okunuyor). Sabit port stratejisi uygulanmış; otomatik port taraması kaldırılmış.
- [x] **figma_set_port** -- Runtime port değişimi (v1.3.0). Port meşgulse crash yerine MCP ayakta kalır; `figma_set_port(5456)` ile farklı porta geçiş. Claude + Cursor aynı anda kullanım desteği.
- [x] **npm paket optimizasyonu** -- dist/cloudflare paketten çıkarıldı; 284KB→234KB (%18), 128→104 dosya (v1.4.1→v1.4.3).
- [x] Enterprise audit log -- `FIGMA_MCP_AUDIT_LOG_PATH`, `dist/core/audit-log.js`, [docs/ENTERPRISE.md](docs/ENTERPRISE.md); örnek log senaryoları / test isteğe bağlı
- [x] Graceful shutdown -- `local-plugin-only.ts`'e SIGINT/SIGTERM handler eklendi; port serbest bırakma sorunu çözüldü

---

## 10. Güvenlik denetimi (Security audit)

**Evet, FUTURE'a eklenmeli:** Yayınlanmış bir köprü + `eval` + WebSocket yüzeyi için izlenebilir maddeler yol haritasında olmalı. Özet checklist repoda: **[docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)** (K1-K4, Y1-Y3, O1-O7, D1-D4; Y4 iptal notu).

**Kaynak:** Cursor planı `~/.cursor/plans/security_audit_fixes_f803037b.plan.md` -- ekip için asıl takip **`docs/SECURITY_AUDIT.md`** üzerinden yapılmalı; plan yalnızca geliştirici makinesinde kalabilir.

- [ ] **Kritik:** K1 `code.js` eval limit - K2 Zod (plugin-only + `local.ts`) + Python `len` - K3 `nodeId` - K4 OPT-IN WS secret
- [ ] **Yüksek:** Y1 token log - Y2 `0.0.0.0` uyarısı - Y3 path traversal -- Y4 dokümana "postMessage `*` zorunlu" notu
- [ ] **Orta:** O2 maxPayload + rate - O3/O5/O7 hata sanitize (Worker OAuth dahil) - O6 console-monitor - O1/O4 dokümantasyon + debug log
- [ ] **Düşük:** D1-D4 (CORS, wrangler id, TMPDIR, debug host SSRF)

OAuth / token logları **S9** ile birlikte ele alınmalı; düzeltmelerde tek PR veya sıralı sürüm önerilir.
