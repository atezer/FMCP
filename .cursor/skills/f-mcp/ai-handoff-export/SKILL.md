---
name: ai-handoff-export
description: Figma tasarım verisini AI'nın kod üretimi için kullanabileceği tek bir handoff paketine dönüştürür (HANDOFF şablonu + JSON manifest). Node kimlikleri, design context özeti, token özeti, ekran görüntüsü referansları ve opsiyonel Code Connect haritası üretir. PO/PM için executive summary da içerir. "AI handoff", "handoff dosyası", "handoff export", "teslimat paketi", "figma handoff", "koda teslim özeti", "design handoff oluştur", "handoff al", "implementasyon paketi" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - uidev
    - po
---

# AI Handoff Export

## Overview

Bu skill, dağınık Figma çıktılarını tek bir teslimat formatında toplar:

- `HANDOFF_TEMPLATE.md` (insan okunur)
- `handoff.manifest.json` (makine okunur, schema tabanlı)

**Önemli:** Tüm veriler plugin bridge üzerinden alınır. Şablon: repo kökünde `HANDOFF_TEMPLATE.md`; şema: `docs/handoff.manifest.schema.json`.

## F-MCP skill koordinasyonu

- **Önce:** Tuval DS uyumu için isteğe bağlı **audit-figma-design-system** / **apply-figma-design-system**; token isimleri için **design-token-pipeline** ile uyumlu manifest.
- **Sonra:** **implement-design** ana tüketici; **code-design-mapper** özetini manifest’e işleyebilirsin.
- **PO/PM akışı:** Teknik olmayan ekran özeti için **figma-screen-analyzer**; değişiklik etkisi için **ds-impact-analysis**

## Required Workflow

### Step 1: Plugin Bağlantısını Doğrula

`figma_get_status()`

### Step 2: Hedef node'ları netleştir

- Kullanıcı URL verdiyse `node-id` değerini ayıkla.
- Node belirsizse `figma_get_file_data(depth=1)` ile kapsam çıkar.

### Step 3: Design context topla

`figma_get_design_context` çağrısı:

- `includeLayout=true`
- `includeVisual=true`
- `includeTypography=true`
- `includeCodeReady=true`
- `depth=2`

### Step 4: Token ve component reuse özeti çıkar

- `figma_get_variables`
- `figma_search_components`
- gerekiyorsa `figma_get_component_for_development`

### Step 5: Code-Only Props Çıkar

"Code only props" katmanı olan bileşenlerde, gizli property'leri spec data olarak çıkar:

```js
// figma_execute — Code-only props okuma
const component = await figma.getNodeByIdAsync("<COMPONENT_ID>");
const codeOnlyFrame = component.children.find(c => c.name === "Code only props");
if (codeOnlyFrame) {
  const props = codeOnlyFrame.children.map(c => ({
    name: c.name,
    type: c.type === "TEXT" ? "string" : "variant",
    value: c.type === "TEXT" ? c.characters : null,
    visible: c.visible
  }));
  return { codeOnlyProps: props };
}
```

Handoff çıktısına ekle:
```yaml
## Code-Only Properties (Geliştirici İçin)
| Property | Type | Default | Görünürlük |
|----------|------|---------|-----------|
| accessibilityLabel | string | "Button label" | Gizli |
| as | enum (h1-h6) | h2 | Gizli |
```

### Step 6: Screenshot referansı ekle

- `figma_capture_screenshot`

### Step 6: Handoff dosyalarını üret

1. `HANDOFF_TEMPLATE.md` içini doldur.
2. `docs/handoff.manifest.schema.json` uyumlu `handoff.manifest.json` çıktısı oluştur.

### Step 7: Platform Hedefi Belirle

Handoff manifest'ine hedef platform(lar) eklenir:

```json
{
  "targetPlatforms": ["ios", "android", "web"],
  "platformDetails": {
    "ios": { "framework": "SwiftUI", "minVersion": "16.0" },
    "android": { "framework": "Compose", "minApiLevel": 24 },
    "web": { "framework": "React", "styling": "Tailwind" }
  }
}
```

Platform bilgisi kullanıcıdan alınır veya proje yapısından çıkarılır.

### Step 8: Self-healing sonucunu işle

- İterasyon sayısını kaydet (`0-3`).
- Açık kalan sapmaları `openIssues` alanına yaz.
- Çözülemeyen fark varsa `manualReviewNeeded=true`.

### Step 9: Executive Summary (PO/PM Modu)

PO/PM persona algılandığında veya `--executive` flag ile teknik handoff'un yanında yönetici özeti eklenir:

```markdown
## Executive Summary — [Ekran Adı]

### Genel Bakış
- **Ekran:** Login Screen
- **DS Uyum:** %92 (23/25 öğe)
- **Tahmini İmplementasyon Süresi:** iOS: 4s, Android: 4s, Web: 3s
- **Risk Seviyesi:** Düşük

### Bileşen Dağılımı
- DS instance: 18 (hazır)
- Custom öğe: 2 (oluşturulması gerekli)
- Token bağlı: 23/25

### Platform Hazırlık Durumu
| Platform | Token | Bileşen | Hazırlık |
|---|---|---|---|
| iOS | ✓ | %90 | Hazır |
| Android | ✓ | %85 | Eksik: SegmentedControl |
| Web | ✓ | %95 | Hazır |

### Riskler ve Açık Noktalar
1. Custom illustration asset'i henüz export edilmedi
2. Animasyon spesifikasyonu eksik
```

## Rules

- Hardcoded renk/font yerine mevcut token isimlerini yaz.
- "Yeni component oluştur" kararı vermeden önce component araması yap.
- Handoff dosyasında varsayımları açıkça "riskler" altında belirt.
- Code Connect verisi yoksa alanı boş bırak; uydurma map yazma.
- PO/PM persona'sı için executive summary'yi her zaman ekle.
- Platform hedefini manifest'e her zaman yaz.

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

## Evolution Triggers

- Bridge'e yeni metadata araçları eklendiğinde handoff paketi zenginleştirilebilir
- Yeni platform desteği (Flutter, .NET MAUI) eklenirse platformDetails şeması genişletilmeli
- PO/PM geri bildirimine göre executive summary formatı güncellenmeli
