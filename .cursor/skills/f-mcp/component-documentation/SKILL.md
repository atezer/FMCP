---
name: component-documentation
description: Figma bileseni icin kullanim kilavuzu, variant rehberi, do/dont kurallari ve erisebilirlik notlari olusturur. Bilesen dokumantasyonu sayfasi Figma dosyasinda olusturulur. "bilesen dokumantasyonu", "component docs", "usage guidelines", "bilesen kilavuzu" ifadeleriyle tetiklenir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designer
    - designops
    - uidev
---

# Component Documentation — Bilesen Kullanim Kilavuzu

## Overview

Bu skill, Figma'da olusturulan bilesenler icin kullanim dokumantasyonu uretir. Dokumantasyon Figma dosyasinda ayri bir frame olarak olusturulur ve su bolumleri icerir:

1. **Bilesen Tanitimi** — Ne ise yarar, nerede kullanilir
2. **Variant Rehberi** — Her variant ne zaman secilir
3. **Props Tablosu** — Mevcut property'ler ve varsayilan degerleri
4. **Kullanim Kurallari (Do / Don't)** — Dogru ve yanlis kullanim ornekleri
5. **Erisebilirlik** — A11y gereksinimleri ve code-only props
6. **Token Referansi** — Bagli tokenlar ve degerleri
7. **Kod Ornekleri** — Platform bazli kullanim (React, SwiftUI, Compose)

## Prerequisites

- F-MCP Bridge plugin bagli
- Dokumante edilecek bilesen Figma'da mevcut (component veya component set)
- Bilesen token'lara bagli olmali (hardcoded deger icermemeli)

## Required Workflow

### Step 1: Bilesen Analizi

```
figma_get_component_for_development(nodeId="<COMPONENT_SET_ID>")
figma_get_design_context(nodeId="<COMPONENT_SET_ID>", depth=2, verbosity="full")
```

Bilesenden su bilgileri cikar:
- Variant listesi ve isimleri
- Component property'ler (label, variant, boolean vb.)
- Code-only props (gizli katman)
- Bagli token'lar (fill, stroke, padding, radius vb.)
- Auto-layout ayarlari

### Step 2: Dokumantasyon Frame'i Olustur

Figma'da bilesen sayfasinda veya ayri "Documentation" sayfasinda:

```js
// figma_execute — Documentation frame olustur
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });

const doc = figma.createFrame();
doc.name = "Docs / <COMPONENT_NAME>";
doc.layoutMode = "VERTICAL";
doc.primaryAxisSizingMode = "AUTO";
doc.counterAxisSizingMode = "FIXED";
doc.resize(800, 100);
doc.itemSpacing = 32;
doc.paddingLeft = 40;
doc.paddingRight = 40;
doc.paddingTop = 40;
doc.paddingBottom = 40;
doc.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
```

### Step 3: Bolum 1 — Bilesen Tanitimi

```
<COMPONENT_NAME>

<kisa aciklama — 1-2 cumle>

Kullanim alanlari:
- Form submit butonlari
- Dialog onay/iptal aksiyonlari
- Navigasyon linkleri (buton gorunumunde)
```

### Step 4: Bolum 2 — Variant Rehberi

Her variant icin:
- Gorsel ornek (instance)
- Ne zaman kullanilir (1 cumle)
- Ne zaman kullanilMAZ (1 cumle)

Ornek format:

```
| Variant | Kullanim | Ornek |
|---------|----------|-------|
| Primary | Ana aksiyonlar, CTA | "Giris Yap", "Kaydet" |
| Secondary | Ikincil aksiyonlar | "Google ile Giris", "Iptal" |
| Outline | Tercihli/opsiyonel aksiyonlar | "Daha Fazla", "Filtrele" |
| Ghost | Minimal, metin-benzeri aksiyonlar | "Sifremi Unuttum" |
| Disabled | Kullanilabilir degil durumu | Form eksik, yukleniyor |
```

**Kural:** Her ekranda en fazla 1 Primary buton olmali. Birden fazla esit onemde aksiyon varsa birini Secondary yapin.

### Step 5: Bolum 3 — Props Tablosu

```
| Property | Type | Default | Aciklama |
|----------|------|---------|----------|
| label | TEXT | "Button" | Buton uzerindeki metin |
| Variant | VARIANT | Primary | Gorus degiskeni |
| accessibilityLabel | TEXT | "Button" | Ekran okuyucu etiketi (code-only) |
```

### Step 6: Bolum 4 — Do / Don't

Gorsel orneklerle:

**Do:**
- Primary butonu ekranin en onemli aksiyonu icin kullanin
- Label'i kisa ve net tutun (2-3 kelime ideal)
- Full-width kullanin mobilde, fixed-width kullanin web'de
- Disabled durumunda neden disabled oldugunu aciklayin (tooltip/mesaj)

**Don't:**
- Ayni ekranda 2+ Primary buton kullanmayin
- "Tikla", "Buraya bas" gibi anlamsiz label'lar kullanmayin
- Buton yerine link kullanmayin (navigasyon haric)
- Icon-only buton kullanirken aria-label eklemeyi unutmayin

### Step 7: Bolum 5 — Erisebilirlik

```
Minimum Gereksinimler:
- Touch target: >= 44x44px (iOS) / >= 48x48dp (Android)
- Kontrast: >= 4.5:1 (WCAG AA, normal metin)
- Fokus gostergesi: Focus ring gorunur olmali
- Ekran okuyucu: accessibilityLabel tanimli olmali
- Disabled: aria-disabled="true", tabIndex="-1"

Code-Only Props:
- accessibilityLabel: Ekran okuyucu etiketi
- role: "button"
- aria-disabled: "true"/"false"
- tabIndex: "0"/"-1"
```

### Step 8: Bolum 6 — Token Referansi

```
| Token | Deger | Kullanim |
|-------|-------|----------|
| button/primary/bg | color/blue/600 (#2563EB) | Primary arka plan |
| button/primary/text | color/white (#FFFFFF) | Primary metin |
| button/padding-x | spacing/lg (16px) | Yatay ic bosluk |
| button/padding-y | spacing/md (12px) | Dikey ic bosluk |
| button/radius | radius/md (8px) | Kose yuvarlama |
| button/minHeight | size/touch-min-ios (44px) | Minimum yukseklik |
```

### Step 9: Bolum 7 — Kod Ornekleri

Her platform icin minimal kullanim ornegi:

**React:**
```jsx
<Button variant="primary" label="Kaydet" onClick={handleSave} />
```

**SwiftUI:**
```swift
Button("Kaydet") { handleSave() }
  .buttonStyle(.primary)
```

**Compose:**
```kotlin
Button(onClick = { handleSave() }) {
  Text("Kaydet")
}
```

### Step 10: Gorsel Instance'lar Ekle

Dokumantasyon frame'ine bileseni gercek instance'larla goster:

```js
// figma_execute — Variant orneklerini ekle
const primaryVariant = await figma.getNodeByIdAsync("<PRIMARY_ID>");
const instance = primaryVariant.createInstance();
docFrame.appendChild(instance);
```

### Step 11: Screenshot ile Dogrula

```
figma_capture_screenshot(nodeId="<DOC_FRAME_ID>")
```

## Cikti

- Figma'da `Docs / <COMPONENT_NAME>` frame'i
- Tum variant'larin gorsel ornekleri
- Props tablosu
- Do/Don't kurallari
- A11y gereksinimleri
- Token referansi
- Kod ornekleri

## Skill Koordinasyonu

- **Oncesi:** `generate-figma-library` (bilesen olusturma) veya `figma-canvas-ops` (bilesen duzenleme)
- **Sonrasi:** `ai-handoff-export` (handoff'a dokumantasyon linki ekle)
- **Iliskili:** `figma-a11y-audit` (a11y bilgilerini referans al)

## Evolution Triggers

- Yeni variant turleri eklenirse (orn. Loading, Icon-only) rehber genisletilmeli
- Yeni platform destegi eklenirse kod ornekleri genisletilmeli
- Figma Dev Mode entegrasyonu gelirse dokumantasyon Dev Mode'a baglanmali
