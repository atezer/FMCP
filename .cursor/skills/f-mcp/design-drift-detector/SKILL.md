---
name: design-drift-detector
description: iOS, Android ve Web platformlarında mevcut kod ile Figma tasarımı arasındaki farkları (drift) tespit eder. Platform bazlı ve cross-platform drift raporları üretir. "check drift", "design drift", "platform drift", "tasarım sapması kontrol et", "parity check", "kod Figma uyuşuyor mu", "spacing doğrula", "token tutarlılık" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir. Bu özellik resmi Figma plugininde yoktur.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - uidev
    - designops
    - po
---

# Design Drift Detector (Multi-Platform)

## Overview

Bu skill, implementasyon sonrasında oluşan kod-tasarım sapmalarını **iOS, Android ve Web** platformlarında ayrı ayrı ve cross-platform olarak tespit eder. Resmi Figma plugininde bu yetenek yoktur.

**Drift türleri:**
- **Token drift** — Figma'da token değeri değişti ama platformdaki dosyada güncellenmedi
- **Component drift** — Figma component'i değişti (yeni variant, spacing değişikliği vb.) ama koddaki implementasyon güncellenmedi
- **Platform gap** — Bir platform güncellenmiş ama diğerleri eski kalmış
- **Cross-platform inconsistency** — Aynı token farklı platformlarda farklı değerde

REST API veya Figma access token gerekmez.

**Önemli:** Bu skill'in tüm karşılaştırma ve drift tespiti **AI agent tarafından** yapılır. MCP araçları (`figma_get_variables`, `figma_get_styles`, `figma_check_design_parity`) ham veri sağlar; drift analizi, raporlama ve düzeltme önerileri AI'ın çıkarımlarıdır.

## Prerequisites

- F-MCP Bridge plugin bağlı olmalı
- Tercihen `.figma-mappings.json` mevcut olmalı (code-design-mapper skill'i ile oluşturulur)
- Token dosyaları mevcut olmalı (design-token-pipeline skill'i ile oluşturulur)

## F-MCP skill koordinasyonu

**Bu skill’in yeri:** Kod ve Figma **parity** doğrulaması — tipik olarak **implement-design** veya mevcut kod tabanı üzerinde **sonra** çalıştırılır; handoff/implement **öncesi** “mutlaka drift” diye zorunlu değildir (henüz kod yoksa anlamsız olur).

**Tipik sıra (kod hattı):** **design-token-pipeline** → isteğe bağlı **code-design-mapper** → **ai-handoff-export** → **implement-design** → **design-drift-detector** (parity). Tuvalde DS tutarsızlığı şüpheliyse önce **audit-figma-design-system** ve gerekirse **fix-figma-design-system-finding** / **apply-figma-design-system**; aksi halde drift raporu **yanlış pozitif** üretebilir.

**Drift sonrası yönlendirme:**
- Sapma **kodda** → kodu düzelt, ardından bu skill’i **yeniden** çalıştır.
- Değişiklik etkisini ölçmek istiyorsan → **ds-impact-analysis**
- PO/PM'e teknik olmayan özet sunmak istiyorsan → **figma-screen-analyzer**
- Sapma **Figma tuvalinde** (instance/token) → **audit-figma-design-system** / **fix** / **apply**, sonra gerekirse tekrar drift veya implement.

**Performans:** Aynı oturumda `figma_get_variables` + `figma_get_design_context` tekrarını azalt; önceki tool çıktısı geçerliyse yeniden çağırma. Zincir notları: **audit-figma-design-system** içindeki “Zincir performansı”.

## Required Workflow

### Step 1: Plugin Bağlantısını Doğrula

```
figma_get_status()
```

### Step 2: Kontrol Kapsamını Belirle

3 kontrol modu var:

**A) Hızlı Token Drift** — Sadece token değerlerini karşılaştır (en hızlı)
**B) Platform Component Drift** — Belirli platformda component'leri kontrol et
**C) Tam Cross-Platform Tarama** — Tüm platformlarda token + component drift (en kapsamlı)

### Step 3: Veri Kaynaklarını Topla

#### Figma tarafı:

```
figma_get_variables(verbosity="full")
```

```
figma_get_styles(verbosity="full")
```

Component mapping varsa:

`.figma-mappings.json` dosyasını oku → component listesini ve platform implementasyonlarını al

Her component için:

```
figma_get_design_context(
  nodeId="<NODE_ID>",
  depth=2,
  verbosity="full",
  includeLayout=true,
  includeVisual=true,
  includeTypography=true
)
```

#### Kod tarafı (her platform için):

**iOS:**
- `Colors.swift` veya Asset Catalog'dan renk değerlerini oku
- `Typography.swift`'ten font değerlerini oku
- `Spacing.swift`'ten spacing değerlerini oku
- Component dosyalarındaki hardcoded değerleri ara

**Android:**
- `res/values/colors.xml` ve `res/values-night/colors.xml`'den renkleri oku
- `res/values/dimens.xml`'den spacing/radius/font size'ları oku
- `AppColors.kt`, `AppTypography.kt`, `AppSpacing.kt`'den Compose değerlerini oku
- Component dosyalarındaki hardcoded değerleri ara

**Web:**
- `tokens.css` veya `_tokens.scss`'den CSS variable/Sass variable değerlerini oku
- `tailwind.config.js`'den Tailwind token'larını oku
- `tokens.ts`'den TypeScript constant'ları oku
- Component dosyalarındaki hardcoded değerleri ara

### Step 4: Token Drift Kontrolü

Figma token'larını her platformdaki token dosyasıyla karşılaştır.

**KRİTİK — Token Name Eşleşme Sorunu:**

`figma_check_design_parity` token isimlerini **tam string eşleşme** ile karşılaştırır. Ancak platformlar arası isimlendirme farklıdır:

| Figma Variable Adı | iOS | Android | Web |
|---------------------|-----|---------|-----|
| `color/primary/500` | `primary500` | `primary_500` | `--color-primary-500` |
| `spacing/md` | `md` | `space_md` | `--space-md` |

Bu yüzden **`codeTokens` içinde Figma'daki variable adını aynen kullanmalısın** — platform naming convention'ını değil:

```
figma_check_design_parity(
  codeTokens='{"color/primary/500": "#3b82f6", "spacing/md": "16"}'
)
```

`figma_check_design_parity` sadece token DEĞER karşılaştırması yapar. Platform kodundaki isimlendirmeyi kontrol etmez. Bu yüzden ek olarak platform dosyalarından değerleri kendin çıkarıp Figma ile karşılaştır:

**Platform-spesifik token çıkarma (AI tarafından yapılır):**

| Platform | Token Dosyası | Değer Çıkarma |
|----------|--------------|---------------|
| iOS | `Colors.swift` | `Color(hex: "#3B82F6")` → `#3B82F6` |
| iOS | `Spacing.swift` | `static let md: CGFloat = 16` → `16` |
| Android | `colors.xml` | `<color name="primary">#FF3B82F6</color>` → `#3B82F6` |
| Android | `dimens.xml` | `<dimen name="space_md">16dp</dimen>` → `16` |
| Android | `AppColors.kt` | `Color(0xFF3B82F6)` → `#3B82F6` |
| Web | `tokens.css` | `--color-primary: #3b82f6` → `#3b82f6` |
| Web | `tailwind.config.js` | `primary: '#3b82f6'` → `#3b82f6` |

### Step 5: Component Drift Kontrolü

**Önemli:** `figma_check_design_parity` component-level karşılaştırma yapmaz. Component drift kontrolünü AI agent olarak kendin yapmalısın:

Her mapping'deki component için, her platformda:

1. `figma_get_design_context(nodeId=..., includeLayout=true, includeVisual=true, includeTypography=true)` ile Figma'daki güncel component verisini al
2. Platform kodunu oku (ör. `ButtonComponent.swift`, `ButtonComponent.kt`, `Button.tsx`)
3. Aşağıdaki özellikleri karşılaştır:
   - Renkler (background, text, border)
   - Spacing (padding, margin, gap)
   - Typography (font, size, weight, line-height)
   - Border radius
   - Boyutlar (width, height)
   - Variant/prop tanımları

Bu karşılaştırma tamamen AI tarafından yapılır — otomatik bir MCP aracı yoktur.

### Step 5.5: Motion Token Drift Kontrolü

Renk, tipografi ve spacing'e ek olarak **motion token'larını** da kontrol et:

| Motion Token | Figma Değer | iOS | Android | Web |
|-------------|-------------|-----|---------|-----|
| `duration/fast` | 150 | withAnimation(.easeInOut(duration: 0.15)) | animateFloatAsState(150ms) | transition: 150ms |
| `duration/normal` | 250 | 0.25 | 250ms | 250ms |
| `duration/slow` | 400 | 0.4 | 400ms | 400ms |
| `easing/standard` | ease-in-out | .easeInOut | FastOutSlowInInterpolator | ease-in-out |
| `easing/decelerate` | ease-out | .easeOut | DecelerateInterpolator | ease-out |

**Motion token drift kaynakları:**
- Figma'da motion token tanımlı ama kodda hardcoded süre/easing
- Platform bazında farklı easing curve'ler (Figma: ease-in-out, kod: linear)
- Yeni eklenen motion token'ların koda yansıtılmamış olması

> Motion token'ları Figma'da STRING variable olarak veya dokümantasyon sayfasında bulunabilir. `figma_get_variables(verbosity="full")` ile STRING type variable'ları kontrol et.

### Step 6: Cross-Platform Tutarlılık Kontrolü

Aynı token'ın 3 platformdaki değerini karşılaştır:

```
Cross-Platform Token Kontrolü:
┌─────────────────┬───────────┬───────────┬───────────┬──────────┐
│ Token           │ Figma     │ iOS       │ Android   │ Web      │
├─────────────────┼───────────┼───────────┼───────────┼──────────┤
│ primary         │ #2563EB   │ #3B82F6   │ #2563EB   │ #3b82f6  │
│                 │           │ DRIFT!    │ OK        │ DRIFT!   │
├─────────────────┼───────────┼───────────┼───────────┼──────────┤
│ spacing-md      │ 16        │ 16 pt     │ 16 dp     │ 12 px    │
│                 │           │ OK        │ OK        │ DRIFT!   │
├─────────────────┼───────────┼───────────┼───────────┼──────────┤
│ radius-md       │ 8         │ 8 pt      │ 8 dp      │ 8 px     │
│                 │           │ OK        │ OK        │ OK       │
└─────────────────┴───────────┴───────────┴───────────┴──────────┘
```

### Step 7: Drift Raporu Oluştur

```markdown
# Multi-Platform Design Drift Raporu
**Tarih:** 2026-03-12
**Figma Dosya:** Design System

## Özet

| Platform | Token Drift | Component Drift | Toplam |
|----------|-------------|-----------------|--------|
| iOS      | 3 divergent | 2 component     | 5      |
| Android  | 1 divergent | 1 component     | 2      |
| Web      | 5 divergent | 3 component     | 8      |
| **Cross-platform** | **2 inconsistency** | — | **2** |

**Kritik Seviye:** 5 (acil düzeltme gerekir)
**Orta Seviye:** 8 (sprint içinde düzeltilmeli)
**Düşük Seviye:** 4 (takip edilmeli)

---

## Token Drift — Platform Detayları

### iOS (3 drift)

| Token | Figma | iOS Kodu | Dosya | Önem |
|-------|-------|----------|-------|------|
| primary | #2563EB | #3B82F6 | Colors.swift:12 | KRİTİK |
| spacing-lg | 24 | 20 | Spacing.swift:8 | YÜKSEK |
| text-weight-bold | 700 | 600 | Typography.swift:5 | ORTA |

**Önerilen düzeltme:** `Colors.swift`'te `primary` değerini `#2563EB` olarak güncelle.

### Android (1 drift)

| Token | Figma | Android Kodu | Dosya | Önem |
|-------|-------|-------------|-------|------|
| spacing-lg | 24 | 20 | dimens.xml:8, AppSpacing.kt:6 | YÜKSEK |

### Web (5 drift)

| Token | Figma | Web Kodu | Dosya | Önem |
|-------|-------|---------|-------|------|
| primary | #2563EB | #3b82f6 | tokens.css:5 | KRİTİK |
| spacing-md | 16 | 12 | tokens.css:15 | YÜKSEK |
| spacing-lg | 24 | 20 | tokens.css:16 | YÜKSEK |
| radius-lg | 12 | 16 | tokens.css:22 | ORTA |
| text-size-lg | 16 | 18 | tokens.css:28 | ORTA |

---

## Cross-Platform Inconsistency

Aynı token'ın platformlar arasında farklı olduğu durumlar (Figma'dan bağımsız):

| Token | iOS | Android | Web | Notlar |
|-------|-----|---------|-----|--------|
| primary | #3B82F6 | #2563EB | #3b82f6 | iOS ≠ Android (ikisi de eski) |
| spacing-lg | 20 pt | 20 dp | 20 px | Hepsi eski ama tutarlı |

---

## Component Drift

### Button (42:15)

| Platform | Durum | Detay |
|----------|-------|-------|
| iOS | DRIFT | padding 12→16, font-weight 400→600 |
| Android | OK | — |
| Web | DRIFT | padding 12→16, border-radius 4→8 |

### Card (42:20)

| Platform | Durum | Detay |
|----------|-------|-------|
| iOS | OK | — |
| Android | DRIFT | yeni variant "outlined" Figma'da var, kodda yok |
| Web | OK | — |

---

## Önerilen Aksiyon Planı

### Acil (Bu Sprint)
1. `primary` rengini tüm platformlarda `#2563EB` olarak güncelle
2. `spacing-md` ve `spacing-lg` değerlerini Web'de düzelt

### Yüksek Öncelik
3. Button component'ini iOS ve Web'de güncelle
4. Card'a Android'de `outlined` variant'ı ekle

### Orta Öncelik
5. Typography font-weight değerlerini iOS'ta düzelt
6. Border radius değerlerini Web'de düzelt

### Otomasyon Önerisi
- Token drift'leri için: `design-token-pipeline` skill'ini çalıştırarak tüm platformların token dosyalarını yeniden üret
- Component drift'leri için: her drifted component'i `implement-design` skill'iyle yeniden implement et
```

### Step 8: Otomatik Düzeltme Seçenekleri

Kullanıcıya düzeltme yollarını sun:

**A) Token dosyalarını yeniden üret (tüm platformlar)**
→ `design-token-pipeline` skill'ini çalıştır

**B) Belirli platformun token'larını güncelle**
→ `design-token-pipeline` skill'ini sadece o platform için çalıştır

**C) Drifted component'leri yeniden implement et**
→ `implement-design` skill'ini hedef platform + nodeId ile çalıştır

**D) Sadece raporla**
→ Raporu kaydet, takıma paylaş

### Step 9: Mapping Durumlarını Güncelle

Drift kontrolü sonrası `.figma-mappings.json`'daki durumları güncelle:

- Drift yok → `status: "synced"`
- Drift var → `status: "outdated"`
- Düzeltme yapıldı → `status: "synced"`, `lastSync` güncelle
- Coverage summary'yi güncelle

## Periyodik Kontrol Önerileri

- **Sprint sonu:** Tüm platformlarda tam tarama
- **Design token güncellemesi sonrası:** Token drift kontrolü
- **Platform release öncesi:** İlgili platformda component drift kontrolü
- **Büyük Figma güncellemesi sonrası:** Cross-platform tarama

## Examples

### Örnek 1: Hızlı Token Kontrolü — Tüm Platformlar

Kullanıcı: "Token'lar güncel mi kontrol et, tüm platformlarda"

**Akış:**

1. `figma_get_variables(verbosity="full")` → Figma'daki 48 token
2. iOS'tan `Colors.swift` + `Spacing.swift` oku → 45 token
3. Android'den `colors.xml` + `dimens.xml` oku → 43 token
4. Web'den `tokens.css` oku → 48 token
5. Her platform için `figma_check_design_parity(...)` çağır
6. Cross-platform karşılaştırma tablosu oluştur
7. Rapor: "iOS'ta 3, Android'de 1, Web'de 5 drift tespit edildi"

### Örnek 2: Tek Platform Component Kontrolü

Kullanıcı: "Android component'leri Figma ile uyumlu mu?"

**Akış:**

1. `.figma-mappings.json`'dan Android mapping'lerini oku → 18 component
2. Her component için Figma design context çek
3. Android koduyla karşılaştır
4. Rapor: "1 component drifted (Card — yeni variant eksik)"

### Örnek 3: Belirli Component — Tüm Platformlar

Kullanıcı: "Button tüm platformlarda güncel mi?"

**Akış:**

1. `.figma-mappings.json`'dan Button mapping'ini oku → 3 platform implementasyonu
2. `figma_get_design_context(nodeId="42:15", ...)` → Figma'daki güncel Button
3. iOS `ButtonComponent.swift` oku → karşılaştır
4. Android `ButtonComponent.kt` oku → karşılaştır
5. Web `Button.tsx` oku → karşılaştır
6. Rapor: "iOS ve Web'de padding drift var, Android güncel"

## Common Issues and Solutions

### Sorun: Token dosyası bulunamıyor (platform hiç export etmemiş)

**Çözüm:** Önce `design-token-pipeline` skill'ini çalıştırarak token dosyalarını oluştur. Drift kontrolü token dosyası yoksa o platformu "not initialized" olarak raporlar.

### Sorun: Renk formatları farklı (hex case, alpha prefix)

**Çözüm:** Karşılaştırma öncesi normalize et: `#3B82F6`, `#3b82f6`, `#FF3B82F6`, `Color(0xFF3B82F6)` hepsi aynı renktir. Alpha prefix'i (FF) kaldır, lowercase'e çevir.

### Sorun: Platform projeleri farklı repo'da

**Çözüm:** `.figma-mappings.json`'daki `platforms.*.rootDir` alanından her platformun yolunu al. Dosya okumaları bu path'e göre yapılır.

### Sorun: False positive çok fazla

**Çözüm:** Tolerans eşiği uygula:
- Renk: Delta E < 3 ise "low priority"
- Spacing: 1px fark ise "low priority"
- Font size: tam eşleşme bekle (fark yok)

## Evolution Triggers

- Bridge'e yeni parity aracı eklenirse (ör. token karşılaştırma aracı) ilgili adımlar basitleştirilmeli
- Yeni platform desteği (Flutter, .NET MAUI) eklenirse platform drift profilleri genişletilmeli
- `figma_check_design_parity` parametreleri değişirse Step güncellemesi yapılmalı
- Cross-platform drift raporunda CI entegrasyonu eklenirse JSON çıktı formatı standardize edilmeli
