---
name: visual-qa-compare
description: Figma tasarımı ile kodlanmış UI arasında görsel karşılaştırma yapar. Screenshot tabanlı fark tespiti, spacing/color/typography sapmaları raporlar. "visual QA", "görsel karşılaştır", "Figma vs kod", "pixel compare", "QA kontrol", "implementasyon doğrula" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - uidev
    - designops
---

# Visual QA Compare — Figma vs Kod Görsel Karşılaştırma

> **Design Token Kuralı:** Bu skill'deki kod örneklerinde geçen font adları, renk kodları, piksel boyutları yalnızca FORMAT gösterimidir. Çalışma anında tüm design token değerleri (font, renk, boyut, spacing, radius, gölge) kayıtlı kütüphaneden (`figma_get_variables`, `figma_get_styles`) veya kullanıcıdan okunmalıdır. Hardcoded token değeri kullanma. Detay: `project-context.md` → "Design Token Kuralı".

## Overview

Bu skill, Figma tasarımı ile kodlanmış UI arasındaki **görsel** farkları tespit eder. `design-drift-detector` token/kod tabanlı çalışırken, bu skill **pixel/görsel** tabanlı karşılaştırma yapar.

**Salt okunur** — Figma tuvalinde değişiklik yapmaz.

## Fark: visual-qa-compare vs design-drift-detector

| Özellik | visual-qa-compare | design-drift-detector |
|---|---|---|
| **Odak** | Görsel/pixel farklar | Token/kod değer farkları |
| **Girdi** | Figma screenshot + kod UI screenshot | Figma variable'lar + kod token dosyaları |
| **Çıktı** | Görsel fark raporu (spacing, renk, tipografi) | Drift raporu (değer uyumsuzlukları) |
| **Araç** | `figma_capture_screenshot` + `figma_get_design_context` | `figma_check_design_parity` + `figma_get_variables` |

## Prerequisites

- F-MCP Bridge plugin bağlı olmalı
- Kodlanmış UI'ın çalışır durumda screenshot'ı alınabilmeli (dev server veya deploy)
- Hedef Figma ekranın node ID'si bilinmeli

## F-MCP skill koordinasyonu

- **Birlikte:** `design-drift-detector` ile token bazlı kontrol (görsel + token = tam QA)
- **Önce (isteğe bağlı):** `implement-design` çıktısı sonrası doğrulama
- **Sonra:** Fark varsa `fix-figma-design-system-finding` (Figma tarafı) veya kod düzeltme

## Required Workflow

### Step 1: Plugin Bağlantısını Doğrula

```
figma_get_status()
```

### Step 2: Figma Screenshot Al

```
figma_capture_screenshot(nodeId="<NODE_ID>", format="PNG", scale=2)
```

### Step 3: Figma Design Context Al

> **DERİN ANALİZ KURALI:** Sadece frame/node isimlerine bakarak sonuç çıkarma. Her node'un içindeki text content (`characters`), instance prop'ları ve child yapılarını detaylı oku. Bir şeyin "eksik" veya "yok" olduğunu iddia etmeden önce tüm child node'ların içeriğini kontrol et.

> **GÖRSEL DOĞRULAMA KURALI:** Analiz sonucunu raporlamadan önce `figma_capture_screenshot` ile ekran görüntüsü al ve görsel olarak kontrol et. Text content ile screenshot'ın tutarlı olduğunu teyit et. Çelişki varsa screenshot'ı esas al.

```
figma_get_design_context(
  nodeId="<NODE_ID>",
  depth=3,
  verbosity="full",
  includeLayout=true,
  includeVisual=true,
  includeTypography=true
)
```

Bu veriden referans değerleri çıkar:
- **Spacing:** padding, margin, item spacing değerleri
- **Renk:** fill, stroke, text renkleri (hex)
- **Tipografi:** font family, size, weight, line height
- **Boyut:** width, height, corner radius

### Step 4: Kod UI Referansı Al

Kullanıcıdan kodlanmış UI'ın screenshot'ını veya canlı URL'ini iste. Yöntemler:

1. **Kullanıcı screenshot paylaşır** — doğrudan karşılaştır
2. **Dev server URL** — browser aracıyla screenshot al (varsa)
3. **Deploy URL** — production/staging screenshot'ı

### Step 5: Karşılaştırma Analizi

AI ile Figma screenshot ve design context verilerini kullanarak kodlanmış UI ile karşılaştır:

#### 5a: Spacing Analizi

```markdown
| Öğe | Figma | Kod | Fark | Öncelik |
|---|---|---|---|---|
| Header padding | 24px | 20px | -4px | Orta |
| Card spacing | 16px | 16px | 0 | ✓ |
| Button padding H | 24px | 16px | -8px | Yüksek |
```

#### 5b: Renk Analizi

```markdown
| Öğe | Figma | Kod | Fark | Öncelik |
|---|---|---|---|---|
| Primary button | #2563EB | #2563EB | — | ✓ |
| Body text | #1F2937 | #374151 | Farklı | Orta |
| Background | #FFFFFF | #FAFAFA | Hafif fark | Düşük |
```

#### 5c: Tipografi Analizi

```markdown
| Öğe | Figma | Kod | Fark | Öncelik |
|---|---|---|---|---|
| H1 | Inter 32/40 Bold | Inter 32/40 Bold | — | ✓ |
| Body | Inter 16/24 Regular | Inter 14/20 Regular | Size farkı | Yüksek |
| Caption | Inter 12/16 Regular | Inter 12/16 Regular | — | ✓ |
```

### Step 6: Token Parity Kontrolü (opsiyonel)

Görsel farkların token kaynaklı olup olmadığını kontrol et:

```
figma_check_design_parity(
  codeTokens='{"color/primary": "#2563EB", "spacing/md": 16, "font/body-size": 16}'
)
```

### Step 7: Rapor Üret

Tüm karşılaştırma sonuçlarını aşağıdaki formatta yapılandırılmış QA raporu olarak oluştur.

## Çıktı Formatı

```markdown
# Visual QA Raporu — [Ekran Adı]

## Genel Uyum: %87 (26/30 öğe eşleşiyor)

### Kritik Farklar (4)
1. **Body text font size** — Figma: 16px, Kod: 14px → Token güncellenmeli
2. **Button horizontal padding** — Figma: 24px, Kod: 16px → CSS düzeltmesi
3. **Card corner radius** — Figma: 12px, Kod: 8px → Token kontrolü
4. **Body text color** — Figma: #1F2937, Kod: #374151 → Token eşlemesi kontrol

### Eşleşen Öğeler (26)
✓ Header layout, ✓ Primary colors, ✓ H1 typography, ✓ Spacing grid, ...

### Öneriler
1. `design-drift-detector` ile token kaynaklı farkları tespit et
2. CSS token değişkenlerini Figma variable isimleriyle hizala
3. Body text size'ı 16px'e güncelle (DS standardı)

### Platform-Spesifik Notlar
- **iOS:** Dynamic Type ile font scaling kontrol edilmeli
- **Android:** density-independent pixel (dp) doğrulaması
- **Web:** Responsive breakpoint'lerde tekrar kontrol
```

## Hata Yonetimi

1. **Plugin baglanti hatasi:** `figma_get_status()` ile kontrol et. Bagli degilse kullaniciya Figma'da F-MCP ATezer Bridge plugin'ini acmasini soyler.
2. **Tool timeout:** Bir kez tekrar dene. Basarisizsa kapsami daralt (daha az node, daha dusuk depth).
3. **Bos yanit:** Hedef node veya sayfa var mi kontrol et. Kullaniciya net bilgi ver.
4. **Rate limit (REST tool'lar):** `figma_get_rest_token_status()` ile kontrol et. Limit dolduysa bekle.
5. **Beklenmeyen hata:** Hata mesajini kullaniciya goster, alternatif yaklasim oner.

## Evolution Triggers

- Bridge'e görsel diff aracı eklenirse (ör. visual diff aracı) otomatik karşılaştırma adımı eklenmeli
- Browser otomasyon araçlarıyla entegrasyon genişletilirse Step 4 otomatikleştirilebilir
- CI entegrasyonu için JSON çıktı formatı eklenebilir
