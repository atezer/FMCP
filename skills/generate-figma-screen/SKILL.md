---
name: generate-figma-screen
description: Kod veya açıklamadan Figma'da tam ekran/sayfa oluşturur. Yayınlanmış design system bileşenlerini arayıp instance olarak yerleştirir; hardcode değer yerine DS token'larını kullanır. "Figma'da ekran oluştur", "kodu Figma'ya çevir", "landing page çiz", "ekran tasarla", "generate screen", "UI'ı Figma'ya aktar" ifadeleriyle tetiklenir. F-MCP Bridge ve figma_execute gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designer
    - uidev
required_inputs:
  - name: device
    type: enum
    options:
      - "iPhone 17 (402×874)"
      - "iPhone 16 Pro Max (440×956)"
      - "iPhone 16 (393×852)"
      - "iPhone 13/14 (390×844)"
      - "Android Compact (412×917)"
      - "Android Medium (700×840)"
      - "iPad Pro 11 (834×1194)"
      - "iPad Pro 13 (1024×1366)"
      - "Desktop (1440×1024)"
      - "Custom (width×height ver)"
    question: "Hangi device boyutunda olsun?"
    required: true
    default_source: ".claude/design-systems/last-intent.md#device"
  - name: design_system
    type: from_state
    source: ".claude/design-systems/active-ds.md#Library Name"
    fallback_question: "Hangi tasarım sistemi kullanılsın? (❖ SUI / Material / Apple HIG / Custom)"
    required: true
  - name: reference_benchmark
    type: node_id_or_none
    question: "Referans alınacak benchmark ekranı var mı? (Node ID veya Figma URL, yoksa 'yok')"
    required: false
    affects: ["screen_type", "sections"]
  - name: screen_type
    type: enum
    options:
      - "Dashboard / özet"
      - "Liste / arama sonuçları"
      - "Detay / profil"
      - "Form / veri girişi"
      - "Login / onboarding"
      - "Confirmation / success"
      - "Empty state"
      - "Error / 404"
    question: "Ne tür bir ekran?"
    required: true
    skip_if: "reference_benchmark != none"
  - name: sections
    type: string_list
    question: "Hangi ana içerik bölümlerini istiyorsun? (örn: header, balance card, quick actions, transactions, bottom nav)"
    required: true
    skip_if: "reference_benchmark != none"
  - name: variants
    type: enum
    options:
      - "Tek varyant"
      - "Light + Dark mode"
      - "2-3 layout alternatifi"
    question: "Kaç varyant istiyorsun?"
    required: false
    default: "Tek varyant"
---

# Generate Figma Screen — Kod/Açıklamadan Figma Ekranı

> **Design Token Kuralı:** Bu skill'deki kod örneklerinde geçen font adları, renk kodları, piksel boyutları yalnızca FORMAT gösterimidir. Çalışma anında tüm design token değerleri (font, renk, boyut, spacing, radius, gölge) kayıtlı kütüphaneden (`figma_get_variables`, `figma_get_styles`) veya kullanıcıdan okunmalıdır. Hardcoded token değeri kullanma. Detay: `project-context.md` → "Design Token Kuralı".

## Overview

Bu skill, bir kod tabanından veya metin açıklamasından Figma'da tam sayfa/ekran oluşturur. Temel ilke: hardcode hex renk ve piksel değerleri yerine **yayınlanmış design system** bileşenlerini (component instance), değişkenlerini (variable) ve stillerini (text/effect style) kullanmak.

Topluluk `figma-generate-design` skill'inden uyarlanmış, F-MCP Bridge araçlarına göre yeniden yazılmıştır.

**Zorunlu:** Her `figma_execute` çağrısından önce [figma-canvas-ops](../figma-canvas-ops/SKILL.md) kılavuzundaki kuralları uygula.

## Skill Boundaries

- Bu skill: Figma'da **ekran** oluşturma/güncelleme (DS bileşen instance'ları ile)
- Figma'dan **kod** üretmek istiyorsan → [implement-design](../implement-design/SKILL.md)
- Yeniden kullanılabilir **bileşen/variant** oluşturmak istiyorsan → [generate-figma-library](../generate-figma-library/SKILL.md)
- Code Connect eşlemesi istiyorsan → [code-design-mapper](../code-design-mapper/SKILL.md)

## Prerequisites

- F-MCP Bridge plugin bağlı olmalı
- Hedef Figma dosyasında yayınlanmış DS bileşenleri (veya team library erişimi) olmalı
- Kaynak: kod dosyaları veya ekran açıklaması

## F-MCP skill koordinasyonu

- **Önce (isteğe bağlı):** `audit-figma-design-system` ile mevcut ekranın DS uyumunu kontrol et
- **Birlikte:** `figma-canvas-ops` (her `figma_execute` öncesi zorunlu)
- **Sonra:** `figma-a11y-audit` ile erişilebilirlik kontrolü; `design-drift-detector` ile kod parity'si

## Required Workflow

**Bu adımları sırayla uygula. Adım atlama.**

### Step 0: Aktif Tasarım Sistemi Kontrolü (ZORUNLU - v1.8.0+)

**Ekran yapmaya başlamadan önce DS context'inin belirli olduğundan emin ol.**

```
1. Read .claude/design-systems/active-ds.md
2. Status alanı:
   ✅ Aktif        → Library Name'i not al, Step 1'e geç
   ❌ Henüz seçilmedi → Kullanıcıya sor:
     "Hangi tasarım sistemi ile ilerleyelim?
      - ❖ SUI (varsa)
      - Material Design
      - Apple HIG
      - Kendi DS'iniz (Figma library URL verin)
      - Hiçbiri (ham Figma)"
3. Kullanıcı yanıtladıktan sonra active-ds.md'yi update et:
   - Status: ✅ Aktif
   - Library Name: <seçim>
   - Selected At: <bugün>
4. Sonraki turlarda bu soruyu TEKRAR SORMA — active-ds.md zaten dolu.
   Kullanıcı açıkça "DS değiştir" demediği sürece aynı DS'i kullan.
```

**Bypass:** Kullanıcı "DS'siz devam et" derse `Status: DS bypass mode` olarak işaretle. Token binding kuralı esnetilir ama yine de kullanıcıya hardcoded değer kullandığını bildir.

Detay: [figma-canvas-ops SKILL Section 0 — Design System Context](../figma-canvas-ops/SKILL.md#0-design-system-context-zorunlu--v180).

### Step 1: Plugin Bağlantısını Doğrula

```
figma_get_status()
```

### Step 2: Ekranı Anla

Figma'ya dokunmadan önce ne inşa edileceğini anla:

1. Koddan oluşturuluyorsa ilgili kaynak dosyaları oku — sayfa yapısı, bölümler, kullanılan bileşenler
2. Ekranın ana bölümlerini listele (Header, Hero, Content, Footer vb.)
3. Her bölüm için gereken UI bileşenlerini belirle (Button, Input, Card, Nav vb.)

### Step 2.5: Tasarım Yönü Belirleme

DS bileşenlerini keşfetmeden ÖNCE, ne inşa edileceğinin estetik yönünü belirle.

#### Marka Profili Kontrolü

Proje kökünde `.fmcp-brand-profile.json` varsa:
- `aestheticDirection` → estetik yön zaten tanımlı, kullan
- `typography.displayFont` / `typography.bodyFont` → font seçimi zaten tanımlı, kullan
- `typography.rationale` → seçim gerekçesi mevcut

#### Profil Yoksa Kullanıcıya Sor

**Amaç:** Bu ekran hangi sorunu çözüyor? Kim kullanıyor?

**Estetik Yön:** Aşağıdakilerden birini seç veya tanımla:

| Yön | Karakteristik | Örnek Referans |
|-----|--------------|----------------|
| Brutal minimal | Çok beyaz alan, tek font, siyah-beyaz + tek accent | Stripe, Linear |
| Maksimalist | Yoğun renk, bold tipografi, katmanlı | Spotify Wrapped, Figma |
| Retro-futuristik | Neon + karanlık, monospace, grid | Vercel, Terminal |
| Organik / doğal | Yumuşak köşeler, sıcak renkler, el yapımı his | Notion, Calm |
| Lüks / rafine | Serif font, düşük kontrast, çok whitespace | Apple, Aesop |
| Playful / oyunsu | Renkli, yuvarlak, büyük tipografi | Duolingo, Slack |
| Editorial / dergi | Grid bazlı, image-heavy, typographic | Medium, NYT |
| Brutalist / ham | Kırık grid, mono font, minimal dekorasyon | Bloomberg, Craigslist |
| Soft / pastel | Hafif renkler, yumuşak gölgeler, rounded | Headspace, Airbnb |
| Industrial / utiliteryen | Fonksiyonel, data-dense, utility-first | GitHub, Grafana |

**Kısıtlamalar:** Teknik gereksinimler (framework, performans, a11y)

**Farklılaşma:** Bu ekranı unutulmaz yapan tek şey ne?

> **DS bileşen kütüphanesi olan projelerde:** Estetik yön DS'nin belirlediği sınırlar içinde olmalı. DS font, renk ve spacing kararlarını zaten vermiştir. Bu adım DS'yi *aşmak* için değil, DS bileşenlerini *nasıl compose edeceğini* yönlendirmek içindir.

#### Tipografi Stratejisi

| Durum | Font Seçimi |
|-------|-------------|
| Marka profili var | `typography.displayFont` + `typography.bodyFont` kullan |
| DS font'ları var | DS font'larını kullan (Inter DS font'uysa Inter DOĞRU — Anti-pattern DEĞİL) |
| Ne DS ne profil var | Ayırt edici display font seç (Satoshi, Clash Display, General Sans vb.) + okunaklı body font |

- Display font: başlıklar, hero text, sayfa title
- Body font: paragraflar, açıklamalar, form etiketleri
- Font çifti kararını raporda belirt (neden bu çift?)

### Step 3: Design System Keşfi (Cache-First Stratejisi)

Üç şey gerekiyor: **bileşenler**, **variable'lar**, **stiller**.

**⚠️ MCP TOOL SEÇİMİ (v1.8.0+):**
- F-MCP plugin bağlıysa **`figma_search_assets`** veya **`figma_get_library_variables`** kullan
- Resmi Figma MCP'nin **`search_design_system`** tool'unu **ÇAĞIRMA** — "Resource links not supported" / "file could not be accessed" hatası verir
- Detay: FMCP_INSTRUCTIONS → "TOOL SELECTION" bölümü

**CACHE-FIRST KURALI (MUTLAK ZORUNLU - PRE-FLIGHT BLOCKER):**

Figma API'ye gitmeden önce `.claude/design-systems/<library-id>/` cache'ini kontrol et:

```
1. Read .claude/design-systems/<library-id>/_meta.md
   ↓
   ✅ Var, sync güncel (24h içinde) → cache'leri kullan, devam et
   ❌ Yok / sync eski / yarım kalmış → Step 3a-3d'yi ÇALIŞTIR ve cache'i doldur,
                                       ANCAK O ZAMAN ekran üretimine başla
```

**Cache eksik veya stale ise ekran üretimi BAŞLAYAMAZ** — önce keşif/cache, sonra üretim. Bu, hardcoded fallback'leri ve tekrar tekrar API çağrılarını engeller.

- Text style key'leri → `.claude/design-systems/<library-id>/tokens.md` (text style key cache)
- Variable key'leri → `.claude/design-systems/<library-id>/tokens.md`
- Component key'leri + override notları → `.claude/design-systems/<library-id>/components.md`
- Font ailesi + available weights → `.claude/design-systems/<library-id>/tokens.md` (Font Weights bölümü)

Cache doldurulduktan sonra her oturumda 24 saat boyunca tekrar API'ye gitmeden okunabilir. **Bu, sonraki oturumlarda token tüketimini %60-70 düşürür.**

**Cache Invalidation:** Cache dosyasının başına `lastUpdated: YYYY-MM-DD HH:mm` ekle. 24 saatten eski cache'ler otomatik yenilenmelidir. Kütüphane güncellendiğinde key'ler değişebilir.

#### Kütüphane Cache Şablonu

Her DS kütüphanesi `.claude/libraries/<ds>.md` dosyasında şu bölümleri içermeli:

```markdown
### Text Style Key Cache (importStyleByKeyAsync ile kullan)
| Style Adı | Font | Size | Key |
|-----------|------|------|-----|
| heading/h1 | Bold | 32 | `abc123...` |
| body/regular | Regular | 14 | `def456...` |

### Effect Style Key Cache
| Style Adı | Key |
|-----------|-----|
| shadow/card | `ghi789...` |

### Sık Kullanılan Variable Key Cache
**Renkler:**
| Variable | Key |
|----------|-----|
| bg/primary | `jkl012...` |

**Boyutlar:**
| Variable | Key |
|----------|-----|
| spacing/md | `mno345...` |

### Sık Kullanılan Component Key Cache
| Bileşen | Key | Override Notları |
|---------|-----|------------------|
| Button | `pqr678...` | `Label#id` → TEXT property |
| Input | `stu901...` | Label → nested text (findOne) |
```

**Cache oluşturma:** İlk ekran oluşturmada `figma_get_styles`, `figma_get_variables(summary)` ve `componentProperties` ile key'leri topla, `.claude/libraries/<ds>.md`'ye yaz. Sonraki oturumlarda direkt cache'den oku.

#### 3a: Bileşen keşfi

**Tercih: önce mevcut ekranları incele.** Dosyada aynı DS'yi kullanan ekranlar varsa, `figma_execute` ile mevcut instance'ları tara:

```js
const frame = figma.currentPage.findOne(n => n.name === "Mevcut Ekran");
const uniqueSets = new Map();
frame.findAll(n => n.type === "INSTANCE").forEach(inst => {
  const mc = inst.mainComponent;
  const cs = mc?.parent?.type === "COMPONENT_SET" ? mc.parent : null;
  const key = cs ? cs.key : mc?.key;
  const name = cs ? cs.name : mc?.name;
  if (key && !uniqueSets.has(key)) {
    uniqueSets.set(key, { name, key, isSet: !!cs, sampleVariant: mc.name });
  }
});
return [...uniqueSets.values()];
```

Mevcut ekran yoksa `figma_search_components` ve `figma_get_design_system_summary` kullan. **Geniş ara** — birden fazla terim dene:

```
figma_search_components(query="button", currentPageOnly=false)
figma_search_components(query="input", currentPageOnly=false)
figma_search_components(query="card", currentPageOnly=false)
```

#### 3b: Variable keşfi

```
figma_get_variables(verbosity="summary")
```

Renk, spacing, radius token'larını not al. Gerekirse `verbosity="full"` ile detay al.

#### 3c: Stil keşfi

```
figma_get_styles()
```

Text style ve effect style'ları not al.

#### 3d: DS Variable Key'lerini Hazırla (ZORUNLU)

Ekran oluşturmadan önce kullanılacak tüm DS token'larının **variable key'lerini** topla. Bu adım atlanamaz.

1. **Kütüphane dosyasını oku:** `.claude/libraries/` dizinindeki kütüphane dosyasından font ailesi, variable collection ve text style bilgilerini al.
2. **HEDEF dosyada variable key'lerini çek** (DS dosyasına bağlanmak GEREKMEZ):
   ```
   figma_get_library_variables({ libraryName: "❖ SUI" })
   ```
   Veya `figma_execute` ile:
   ```js
   // HEDEF dosyada çalıştır — DS dosyası değil!
   var cols = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
   var target = cols.filter(function(c) { return c.libraryName === "❖ SUI"; });
   var results = [];
   for (var ci = 0; ci < target.length; ci++) {
     var vars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(target[ci].key);
     for (var vi = 0; vi < vars.length; vi++) {
       results.push({ name: vars[vi].name, key: vars[vi].key, type: vars[vi].resolvedType, collection: target[ci].name });
     }
   }
   return results;
   ```
3. **Text style key'lerini çek:** Kütüphane cache'inde key varsa oku. Yoksa REST API ile DS dosyasından: `figma_rest_api GET /v1/files/{DS_FILE_KEY}/styles`
   Alternatif: Hedef dosyada zaten import edilmiş style'lar:
   ```js
   var styles = await figma.getLocalTextStylesAsync();
   return styles.map(function(s) { return { id: s.id, name: s.name, key: s.key }; });
   ```
4. **Font ailesi:** Kütüphane dosyasındaki `Font Ailesi` alanından oku. Bulunamazsa DS text style'larından font bilgisini çıkar. Kullanıcıya sor. Kullanıcı "sen seç" derse VE DS fontu bulunamadıysa `Inter` kullan.

Bu adımda toplanan key'ler, sonraki adımlarda `importVariableByKeyAsync` ile hedef dosyaya import edilecek.

### Step 4: Boş Alan Bul ve Wrapper Frame Oluştur

```js
const children = figma.currentPage.children;
let maxX = 0;
children.forEach(c => {
  const right = c.x + c.width;
  if (right > maxX) maxX = right;
});

// DS'den arka plan ve spacing variable'larını import et
const bgVar = await figma.variables.importVariableByKeyAsync("SURFACE_BG_KEY");
const paddingVar = await figma.variables.importVariableByKeyAsync("SPACING_KEY");

const frame = figma.createFrame();
frame.name = "Ekran Adı";
frame.x = maxX + 100;
frame.y = 0;
frame.resize(1440, 900); // Masaüstü varsayılan; mobil için 390x844
frame.layoutMode = "VERTICAL";
frame.primaryAxisSizingMode = "AUTO";
frame.counterAxisSizingMode = "FIXED";

// Arka plan rengini DS variable'ına BAĞLA (hardcoded renk YAZMA)
const fills = [{type: "SOLID", color: {r:1,g:1,b:1}}]; // geçici
const boundFill = figma.variables.setBoundVariableForPaint(fills[0], "color", bgVar);
frame.fills = [boundFill];

// Padding'i DS variable'ına BAĞLA
frame.setBoundVariable("paddingLeft", paddingVar);
frame.setBoundVariable("paddingRight", paddingVar);
frame.setBoundVariable("paddingTop", paddingVar);
frame.setBoundVariable("paddingBottom", paddingVar);

return { frameId: frame.id, position: { x: frame.x, y: frame.y } };
```

### Step 5: Bölüm Bölüm İnşa Et

**Her bölümü ayrı bir `figma_execute` çağrısında oluştur.** Tek çağrıda tüm ekranı oluşturmaya ÇALIŞMA.

Sıra: Üstten alta — Header → Hero → Content → Footer

Her bölüm için:

1. `figma_execute` ile bölüm frame'ini oluştur, DS bileşen instance'larını yerleştir
2. **Tüm renkleri `setBoundVariableForPaint` ile DS variable'ına bağla** — hardcoded renk kullanma
3. **Tüm spacing/padding/radius değerlerini `setBoundVariable` ile bağla** — hardcoded sayı kullanma
4. **Metin node'larına text style ata:** `setTextStyleIdAsync` ile DS text style'ını uygula — hardcoded fontSize/fontName kullanma
5. Oluşturulan node ID'lerini return et
6. `figma_capture_screenshot` ile görsel doğrulama — boundVariables bağlı mı kontrol et

**Metin oluşturma kalıbı (DS'e bağlı):**

```js
await figma.loadFontAsync({ family: "DS_FONT", style: "Regular" });
const textColorVar = await figma.variables.importVariableByKeyAsync("TEXT_COLOR_KEY");

const text = figma.createText();
text.characters = "Metin içeriği";

// Text style uygula (fontSize, fontName, lineHeight hep style'dan gelir)
await text.setTextStyleIdAsync("TEXT_STYLE_ID");

// Metin rengini DS variable'ına bağla
const textFills = [...text.fills];
const boundTextFill = figma.variables.setBoundVariableForPaint(textFills[0], "color", textColorVar);
text.fills = [boundTextFill];
```

**Loading State Karar Ağacı:**

Dinamik içerik barındıran her öğe için uygun loading pattern'ını belirle:

| Beklenen Yüklenme Süresi | Loading Pattern | Kullanım |
|--------------------------|----------------|----------|
| < 1 saniye | Yok (anlık) | Statik içerik, önbellekli veri |
| 1-3 saniye | Spinner | Buton, küçük widget, tek alan |
| 3-10 saniye | Skeleton | Kart, liste, metin bloğu, görsel |
| > 10 saniye | Progress bar | Dosya yükleme, toplu işlem |

**Skeleton türleri:**
- Metin bloğu → `skeleton-text` (tam genişlik × 16px, 2-3 satır)
- Başlık → `skeleton-title` (200px × 24px)
- Avatar/ikon → `skeleton-circle` (pulse animasyonlu daire)
- Kart → `skeleton-card` (başlık + 2 satır metin + görsel alanı)
- Tablo/liste → `skeleton-row` (satır bazlı tekrarlayan skeleton)

**Instance oluşturma kalıbı:**

```js
// figma_instantiate_component aracını kullan veya figma_execute içinde:
const component = figma.root.findOne(
  n => n.type === "COMPONENT" && n.name === "Button"
);
const instance = component.createInstance();
parentFrame.appendChild(instance);
// FILL boyutlandırmayı appendChild'DAN SONRA ayarla
instance.layoutSizingHorizontal = "FILL";
```

**Tercihen `figma_instantiate_component` aracını kullan** — daha güvenli ve basit.

### Step 5.1: Gestalt İlkeleri ile Spacing Kararları (ZORUNLU)

Tek bir `itemSpacing` ile tüm bölümü dizme — **YANLIŞ**. Spacing kararlarında tüm tasarım ilkelerini sentezle:

**Gestalt Proximity:** İlişkili öğeler yakın, ilişkisiz öğeler uzak.
```
Card içi mantıksal gruplar (nested frame ile):
├── Header Group (title + subtitle) → iç gap: küçük (sp-050 ~ sp-100)
├── Form Group (inputs + checkbox) → iç gap: küçük-orta (sp-100 ~ sp-150)
├── Action Group (button + register link) → iç gap: küçük (sp-100 ~ sp-150)
├── Social Group (divider + social buttons + legal) → iç gap: küçük-orta (sp-150)
└── Gruplar arası gap: BÜYÜK (sp-300 ~ sp-400)
```

**Similarity:** Aynı işlevi gören öğeler aynı text style, renk ve boyutta olmalı.
**Hierarchy:** Büyük/bold = önemli (başlık, CTA), küçük/light = ikincil (legal text, açıklama).
**Contrast:** CTA butonu ve önemli öğeler arka plandan ayrışmalı.
**Alignment:** Tutarlı hizalama ile düzen hissi — tüm child'lar `layoutSizingHorizontal="FILL"` (appendChild SONRA).
**White Space:** Nefes aldıran boşluklar — ne çok sıkışık ne çok dağınık.

### Step 5.15: DS Bileşen Kullanım Kuralı (ZORUNLU)

**Önce DS'te o işlevi karşılayan bileşen variant'ını ara. DS'te varsa bileşeni kullan, yoksa raw node oluştur.**

| İhtiyaç | YANLIŞ (raw node) | DOĞRU (DS bileşen) |
|---------|-------------------|---------------------|
| Link text | Text node + Text/link rengi | Button(Type=Link) instance |
| İkon göstermek | Rectangle + SVG path | İkon component instance |
| Ayırıcı çizgi | Rectangle 1px yükseklik | Divider component instance |
| Placeholder input | Text node + gri renk | Input component doğru variant |
| Toggle | Checkbox + custom logic | Switch component instance |

**Kural:** Ekrana koyacağın her UI öğesi için şu soruyu sor: "DS'te bu işlevi karşılayan bileşen var mı?"
- **Evet →** DS bileşenini kullan, variant/property'lerini ayarla (öncelikli)
- **Hayır →** Raw node oluştur (DS'te yoksa geçerli yol)

**Uygulama:** Ekran oluşturmadan önce (Step 3) DS bileşen kataloğunu tara. `.claude/libraries/<ds>.md` dosyasındaki bileşen listesini kontrol et. Link, divider, hint, badge gibi yardımcı öğeler için de mutlaka bileşen ara.

### Step 5.16: Auto-Layout Sizing Kuralları (ZORUNLU)

**Tüm child node'lar `layoutSizingHorizontal = "FILL"` olmalı (appendChild SONRASI).** `layoutAlign = "STRETCH"` kullanma — tutarsız davranır.

```js
// DOĞRU: appendChild sonra FILL
parentFrame.appendChild(child);
child.layoutSizingHorizontal = "FILL";

// YANLIŞ: layoutAlign = "STRETCH"
child.layoutAlign = "STRETCH"; // tutarsız, kullanma
```

**İstisnalar:**
- **Horizontal row içindeki text node'lar:** `layoutSizingHorizontal = "HUG"` — FILL yaparsan text kesilir
- **Logo instance:** HUG veya FIXED — doğal boyutunda kalsın
- **layoutGrow = 1:** Horizontal row'da eşit genişlik paylaşımı için (divider'lar gibi)

**Card yapısı:**
```
Screen: VERTICAL, counterAxis=CENTER, layoutSizingVertical=HUG
├── Logo: HUG (doğal boyut)
├── Card: FILL (appendChild SONRA) ← ekran padding ile genişlik kontrol edilir
│   ├── Title text: FILL
│   ├── Form Group: FILL
│   │   ├── Input instance: FILL
│   │   ├── Input instance: FILL
│   │   └── Horizontal Row: FILL
│   │       ├── Checkbox: HUG
│   │       └── Button(Link): HUG
│   ├── Action Group: FILL
│   │   ├── Button(Primary): FILL
│   │   └── Horizontal Row: FILL
│   │       ├── Text: HUG
│   │       └── Button(Link): HUG
│   └── Social Group: FILL
│       ├── Divider Row: FILL
│       ├── Social Button: FILL
│       └── Legal text: FILL
└── Bottom text: FILL
```

**Responsive:** Ekran genişliği FIXED (1280/768/375) veya Breakpoints/Screen token'a bound. Mode (Web/Tablet/Mobil) padding ve gap değerlerini kontrol eder → card otomatik uyar.

**Mode adı eşleşmesi DİKKAT:** `indexOf("Web")` "Mobil & Web Mobil"i de yakalar. `indexOf("Desktop")` kullan.

### Step 5.2: Instance Override Rehberi (ZORUNLU)

**Component PROPERTY (TEXT/BOOLEAN/VARIANT tipi) → `setProperties`:**
```js
btn.setProperties({"Value#44:2": "Buton Metni"});
```

**NESTED TEXT (property olarak expose edilmemiş) → `findOne`:**
```js
var label = instance.findOne(function(n){
  return n.type==="TEXT" && n.name==="Label";
});
if(label){
  await figma.loadFontAsync(label.fontName);
  label.characters = "Yeni Metin";
}
```

**Kural:** Property mi nested mi bilmiyorsan → önce `componentProperties` oku. Orada yoksa `findOne` kullan. Hiçbir instance'ta "Label", "Value", "Button" gibi default text bırakma.

### Step 5.3: API Gotcha Tablosu (EZBERLE)

| İşlem | DOĞRU API | YANLIŞ (HATA VERİR) |
|-------|-----------|---------------------|
| Fill/stroke renk bind | `setBoundVariableForPaint(paint, "color", var)` | `setBoundVariable("fills", 0, var)` |
| Text style ata | `await node.setTextStyleIdAsync(style.id)` | `node.fontSize = 24` veya fontSize variable |
| Effect style ata | `await node.setEffectStyleIdAsync(style.id)` | `node.effectStyleId = style.id` |
| Dark mode set | Library API chain → collection OBJECT | String collection ID |
| Sayfa geçişi | `await figma.setCurrentPageAsync(page)` | `figma.currentPage = page` |
| FILL sizing | appendChild SONRA `layoutSizingHorizontal = "FILL"` | appendChild ÖNCE |
| Function adı | `async function g(k){}` | Arrow fn ile `import` keyword (reserved) |

### Step 5.4: Referans Sadakati

Kullanıcı referans ekran (screenshot, canlı site) paylaştıysa:
- Card genişliği, renk tonu, border stili, spacing oranlarını kopyala
- Kendi yorumunu ekleme — referansa sadık kal
- Emin olmadığın kararlardan önce kullanıcıya sor

### Step 5.5: Görsel Derinlik ve Detay (İsteğe Bağlı)

Estetik yön belirlendiyse (Step 2.5), bölüm inşa sırasında şu detaylar eklenebilir:

**Spatial Composition:**
- Asimetrik layout: her bölüm aynı grid'e sıkışmasın
- Overlap: öğeler arasında kasıtlı örtüşme (hero image + text overlay)
- Negatif alan: dramatik boşluk CTA'yı öne çıkarır

**Arka Plan ve Atmosfer:**
- Düz renk yerine: subtle gradient, noise doku, geometrik pattern
- Katmanlı transparan: overlay + backdrop-blur efektleri
- Gölge derinliği: elevation token'larını kullan (sm → xl)

**Dekoratif Detaylar:**
- Border: dekoratif border (dashed, gradient border)
- İkon: mono-weight ikon seti tutarlılığı
- Mikro detaylar: buton iç gölge, kart hover efekti ipucu

> **NOT:** Bu öneriler DS bileşen kütüphanesi varsa DS'nin izin verdiği ölçüde uygulanır. DS token'ları dışında hardcoded değer eklenmez.

### Step 6: Görsel Doğrulama

```
figma_capture_screenshot(nodeId="wrapper-frame-id")
```

Screenshot'ı incele:
- Bölümler doğru sırada mı?
- Spacing ve hizalama tutarlı mı?
- Renk ve tipografi DS'ye uygun mu?

**Anti-Pattern Kontrolü** (screenshot'a bakarak):
- ❌ Generic font mu kullanılmış? (DS font'u yokken Inter/Roboto/Arial)
- ❌ Mor gradient + beyaz arka plan? (klişe AI estetiği)
- ❌ Tahmin edilebilir grid? (12-col, hep aynı padding, her bölüm aynı)
- ❌ Her ekran birbirinin kopyası mı? (aynı layout, renk, font)
- ❌ "Bu bir AI'ın ürettiği gibi mi görünüyor?" → Evet ise revizyona dön

Sorun varsa hedefli `figma_execute` ile düzelt.

### Step 6.5: Self-Audit Mandate (ZORUNLU — v1.8.1+)

**Ekranı kullanıcıya sunmadan ÖNCE kendi kendini denetle.** Bu adım **atlanamaz** — screenshot yeterli değil çünkü Claude görsel olarak "güzel" görünen ama token/bileşen disiplininden uzak ekranları fark edemez.

#### Adım 1 — `figma_validate_screen` çağır

```
figma_validate_screen(nodeId="wrapper-frame-id", expectedDs="❖ SUI", minScore=80)
```

Tool şunu döner:
```json
{
  "score": 92,
  "passed": true,
  "minScore": 80,
  "breakdown": {
    "instanceCoverage": 85,
    "libraryInstanceCount": 7,
    "autoLayoutCoverage": 100,
    "tokenBindingCoverage": 90
  },
  "violations": [],
  "recommendation": "Score 92/100 passed minimum 80. Screen is DS-compliant."
}
```

#### Adım 2 — Skor değerlendirmesi

| Skor | Karar | Davranış |
|---|---|---|
| **≥ 80** | ✅ Passed | Kullanıcıya sun, rapor et |
| **60-79** | ⚠️ Kısmi | Violations listesini oku, targeted fix'ler uygula, tekrar validate et |
| **< 60** | ❌ Failed | **Ekranı sil** (`figma_execute` → `node.remove()`), Step 3-5'e dön, DS bileşenleriyle yeniden inşa et |

#### Adım 3 — Retry Loop (max 3 deneme)

Eğer ilk denemede score < 80 ise:
1. Violations listesini oku (en kritik 5'i)
2. Her bir violation için `figma_execute` ile targeted fix uygula:
   - `HARDCODED_FILL` → `figma_bind_variable` ile binding ekle
   - `NO_AUTO_LAYOUT` → `layoutMode = "VERTICAL"` ekle
3. Tekrar `figma_validate_screen` çağır
4. **Max 3 deneme.** 3. denemede de fail ise:
   - Ekranı sil
   - Kullanıcıya rapor et: "3 denemede de minimum skoru yakalayamadım. Muhtemel sebepler: [list]. Elle düzeltmek mi, farklı yaklaşım mı denemek istersiniz?"

#### Adım 4 — Pass sonrası raporlama

Validation passed ise kullanıcıya özet çıkar:
```
✅ Ekran hazır: "Vadesiz TL - iPhone 17"
   📊 DS Compliance Score: 92/100
   🧩 Library Instances: 7
   🎨 Token Bindings: 24
   📐 Auto-Layout Coverage: 100%
   ⏱️ Süre: 18 saniye
```

#### Anti-patterns (Self-Audit atlamak)

❌ **YANLIŞ:** "Screenshot güzel görünüyor, validate'e gerek yok" → Bu bir **disiplin kaçırmasıdır**
✅ **DOĞRU:** Screenshot güzel olsa bile validate çalıştır. Token binding eksikliği gözle görülmez.

❌ **YANLIŞ:** Score 75 → "yeterince iyi, kullanıcıya sun"
✅ **DOĞRU:** Score < 80 → retry loop, ekranı düzelt

❌ **YANLIŞ:** Self-audit'i opsiyonel sayma
✅ **DOĞRU:** generate-figma-screen akışının **tamamlanma koşulu** bu adımdır. Validate çalıştırılmadan akış TAMAMLANMIŞ sayılmaz.

### Step 7: Güncelleme Senaryosu

Mevcut bir ekranı güncellerken:

1. `figma_get_file_data` ile mevcut yapıyı oku
2. `figma_get_design_context` ile değişecek bölümü analiz et
3. Yalnızca değişen bölümü yeniden oluştur veya güncelle
4. Tüm ekranı baştan oluşturmaktan kaçın

## Türkçe Karakter Kuralı (ZORUNLU)

Tüm Türkçe metin içeriklerinde (Figma text node, kod string, dokümantasyon) doğru Unicode karakterler kullanılmalıdır. ASCII karşılıkları YASAKTIR:

| Doğru | Yanlış | Doğru | Yanlış |
|-------|--------|-------|--------|
| ş | s | Ş | S |
| ı | i | İ | I |
| ö | o | Ö | O |
| ü | u | Ü | U |
| ç | c | Ç | C |
| ğ | g | Ğ | G |

Son adım: Üretilen tüm Türkçe metinleri karakter kontrolünden geçir.

## Performans Kuralları

- Aynı oturumda `figma_get_variables(verbosity="full")` birden fazla çağırma — ilk sonucu kullan. `verbosity="full"` 500K+ karakter üretir, **asla full kullanma** — `summary` yeterli.
- `figma_search_components`: varsayılan `currentPageOnly=true`; `false` yalnızca gerektiğinde (timeout riski)
- Her `figma_execute` çağrısı küçük ve odaklı olmalı — 50+ satır kod riski yüksek
- **Asla 3 paralel agent çalıştırma** — gereksiz token tüketir. Key'ler `.claude/libraries/` dosyasında cache'liyse agent bile gereksiz.
- **Performans bütçesi:** Ekran başına ≤5 figma_execute (3 core + 1 hata buffer + 1 doğrulama), <130K token hedefi. Cache'li çalışmada <100K.
- **Timeout:** 1-5 node → 5000ms | 6-12 node → 10000ms | 13+ node → 15-30000ms veya işlemi böl

## Responsive Boyut Presetleri (ZORUNLU)

Her ekran **minimum 3 boyutta** oluşturulmalı:

| Cihaz | Genişlik | Yükseklik | Padding | Notlar |
|-------|---------|-----------|---------|--------|
| Mobile | 390px | HUG | 24px | iPhone 14 referans. Touch target min 44px |
| Tablet | 768px | HUG | 120px | iPad referans. İçerik max 528px genişlik |
| Web | 1440px | HUG | 480px | Desktop referans. İçerik max 480px genişlik |

**Uygulama (3 adım):**

**Adım 1: Breakpoint token'ları oluştur (bir kerelik)**

Primitives collection'a ekran boyut token'ları ekle:
```
screen/mobile-width: 390    screen/tablet-width: 768    screen/web-width: 1440
screen/tablet-padding: 120  screen/web-padding: 480
screen/top-padding-mobile: 80  screen/top-padding-tablet: 160
screen/bottom-padding: 40
```

Semantic collection'a alias'lar ekle:
```
layout/screen-mobile-width → screen/mobile-width
layout/screen-tablet-width → screen/tablet-width
layout/screen-web-width → screen/web-width
layout/screen-tablet-padding → screen/tablet-padding
layout/screen-web-padding → screen/web-padding
```

**Adım 2: Ekranları oluştur ve klonla**

```js
// figma_execute — Mobile (master)
const mobile = figma.createFrame();
mobile.name = "Screen / Mobile";
mobile.layoutMode = "VERTICAL";
// ... içerik ekle ...
```

Tablet ve Web klonla → resize et.

**Adım 3: Ekran boyutlarını token'lara bağla (ZORUNLU)**

Her ekranın width ve padding'i variable'a bağlanmalı. Hard-coded değer KABUL EDİLMEZ:

```js
// figma_execute — Token binding (her ekran için)
const semVars = {}; // semantic variable'ları yükle

// Mobile
const mobile = await figma.getNodeByIdAsync("<MOBILE_ID>");
mobile.setBoundVariable("width", semVars["layout/screen-mobile-width"]);
mobile.setBoundVariable("paddingLeft", semVars["layout/page-padding"]);
mobile.setBoundVariable("paddingRight", semVars["layout/page-padding"]);
mobile.setBoundVariable("paddingTop", semVars["layout/screen-top-padding-mobile"]);
mobile.setBoundVariable("paddingBottom", semVars["layout/screen-bottom-padding"]);

// Tablet
const tablet = await figma.getNodeByIdAsync("<TABLET_ID>");
tablet.setBoundVariable("width", semVars["layout/screen-tablet-width"]);
tablet.setBoundVariable("paddingLeft", semVars["layout/screen-tablet-padding"]);
tablet.setBoundVariable("paddingRight", semVars["layout/screen-tablet-padding"]);
tablet.setBoundVariable("paddingTop", semVars["layout/screen-top-padding-tablet"]);

// Web
const web = await figma.getNodeByIdAsync("<WEB_ID>");
web.setBoundVariable("width", semVars["layout/screen-web-width"]);
web.setBoundVariable("paddingLeft", semVars["layout/screen-web-padding"]);
web.setBoundVariable("paddingRight", semVars["layout/screen-web-padding"]);
```

**Min Height bağlama (ZORUNLU):**

Ekranın minimum yüksekliği de token'a bağlanmalı. Figma'da "Fixed height (900)" yerine "Add min height..." → "Apply variable..." kullanılmalı:

```js
// Her ekran için minHeight bağla
mobile.setBoundVariable("minHeight", primVars["screen/mobile-height"]); // 844
tablet.setBoundVariable("minHeight", primVars["screen/tablet-height"]); // 1024
web.setBoundVariable("minHeight", primVars["screen/web-height"]);       // 900
```

**Kural:** Figma'da tüm boyut değerleri (width, minHeight, padding) "Apply variable..." ile token bağlı görünmeli. Hard-coded değer KABUL EDİLMEZ. Bu, breakpoint değiştiğinde tüm ekranların otomatik güncellenmesini sağlar.

## Dark Mode (ZORUNLU)

Her ekran **Light ve Dark** tema olarak oluşturulmalı.

### Free Plan (1 mode sınırı):
Ayrı "Primitives Dark" collection oluştur, aynı token isimleriyle dark değerler ver. Ekranı klonla ve dark renkleri uygula:

```js
// figma_execute — Dark mode uygulama
const lightScreen = await figma.getNodeByIdAsync("<LIGHT_NODE_ID>");
const darkScreen = lightScreen.clone();
darkScreen.name = lightScreen.name + " / Dark";
// Arka planı dark yapSet background and traverse children to apply dark palette
```

### Professional+ Plan (çoklu mode):

Light ekranı klonla, collection OBJECT ile mode set et. **String ID çalışmaz — library API chain zorunlu:**

```js
// 1. Collection object al
var colls = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
var semCol = colls.find(function(c){ return c.name.indexOf("Semantic Colors") !== -1; });
var vars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(semCol.key);
var firstVar = await figma.variables.importVariableByKeyAsync(vars[0].key);
var localColl = await figma.variables.getVariableCollectionByIdAsync(firstVar.variableCollectionId);
var darkMode = localColl.modes.find(function(m){ return m.name === "Dark"; });

// 2. Dark ekrana set et
dark.setExplicitVariableModeForCollection(localColl, darkMode.modeId);
```

### Semantic Sizes Mode Binding (ZORUNLU)

Her ekran frame'inde Semantic Sizes collection'a da mode set edilmeli. Figma Appearance panelinde hem renk hem boyut mode'u görünmeli:

```js
// Semantic Sizes collection object al (aynı chain)
var sizeColls = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
var semSize = sizeColls.find(function(c){ return c.name.indexOf("Semantic Sizes") !== -1; });
var sizeVars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(semSize.key);
var sizeFirst = await figma.variables.importVariableByKeyAsync(sizeVars[0].key);
var localSizeColl = await figma.variables.getVariableCollectionByIdAsync(sizeFirst.variableCollectionId);

var webMode = localSizeColl.modes.find(function(m){ return m.name.indexOf("Web Desktop") !== -1; });
var tabletMode = localSizeColl.modes.find(function(m){ return m.name.indexOf("Tablet") !== -1; });
var mobilMode = localSizeColl.modes.find(function(m){ return m.name.indexOf("Mobil") !== -1; });

// Her ekrana size mode set et
webScreen.setExplicitVariableModeForCollection(localSizeColl, webMode.modeId);
tabletScreen.setExplicitVariableModeForCollection(localSizeColl, tabletMode.modeId);
mobileScreen.setExplicitVariableModeForCollection(localSizeColl, mobilMode.modeId);
```

**Sonuç:** Her ekranın Figma Appearance panelinde:
- Semantic Colors → Light / Dark
- Semantic Sizes → Web Desktop / Tablet / Mobil & Web Mobil
- W alanı → breakpoint token'ına bound

### Toplam Ekran Matrisi:
```
Mobile Light | Mobile Dark
Tablet Light | Tablet Dark
Web Light    | Web Dark
= 6 ekran minimum
```

## Çıktı Formatı

- Oluşturulan tüm ekranların Figma node ID'leri (6 ekran)
- DS uyum özeti (kaç instance, kaç variable bağlı)
- Responsive doğrulama: her boyutta screenshot
- Dark/Light tema screenshot karşılaştırma

## Evolution Triggers

- Bridge'e asset arama veya otomatik ekran üretme aracı eklenirse paralel iş akışı eklenmeli
- Yeni bileşen instance araçları eklenirse Step 5 kalıbı güncellenmeli
- Mobil platform desteği genişletilirse boyut presetleri eklenmeli
