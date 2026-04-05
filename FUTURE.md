# F-MCP -- Kalan Adımlar (Future)

> Son güncelleme: 5 Nisan 2026 (v1.7.10 — kapsamlı güncelleme rehberi, doküman düzeltmeleri)
> Paket sürümü (`package.json`): **1.7.10**

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
- [ ] Hibrit akış (plugin + REST) dokümantasyonu

### P2 — WebSocket Yeniden Bağlantı ve Teşhis

- [x] `figma_plugin_diagnostics` — uptime, heartbeat, bellek, port (v1.6.0)
- [ ] Plugin crash durumunda otomatik yeniden bağlantı
- [ ] Bağlantı durumu UI göstergesi (iyileştirilmiş)

### P2 — Geliştirici Deneyimi

- [x] `CONTRIBUTING.md` — yerel kurulum, test, skill yazma, PR süreci (v1.6.0)
- [x] Claude Code `.mcp.json` kurulum rehberi — README'ye eklendi (v1.7.0)
- [x] 46 araç test raporu — `docs/TEST_REPORT.md`: Free/Pro/Org/Enterprise plan bazlı yetenek matrisi, adım adım test rehberi (v1.7.0)
- [ ] Eski belgelere "deprecated" notu ekle (OAUTH_SETUP.md vb.)
- [ ] IDE config örnekleri: VSCode, Windsurf, Zed

### P3 — npm ve GitHub Görünürlük

- [x] package.json keywords güncellendi (design-system, design-tokens, zero-trust, cursor, agent — v1.6.0)
- [ ] GitHub repo açıklaması + topics ekle
- [ ] README'ye CI badge, npm version badge ekle

### P4 — Node.js Bağımlılığı Kaldırma (Standalone)

Node.js olmadan F-MCP kullanabilme. Detaylı analiz ve plan: [STANDALONE_PLAN.md](docs/STANDALONE_PLAN.md)

- [ ] Python bridge 10→46 araca genişletme (düşük risk, 2-3 gün)
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
