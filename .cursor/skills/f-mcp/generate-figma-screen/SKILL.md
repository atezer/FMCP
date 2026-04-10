---
name: generate-figma-screen
description: Kod veya açıklamadan Figma'da tam ekran/sayfa oluşturur. Yayınlanmış design system bileşenlerini arayıp instance olarak yerleştirir; hardcode değer yerine DS token'larını kullanır. "Figma'da ekran oluştur", "kodu Figma'ya çevir", "landing page çiz", "ekran tasarla", "generate screen", "UI'ı Figma'ya aktar" ifadeleriyle tetiklenir. F-MCP Bridge ve figma_execute gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designer
    - uidev
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

### Step 1: Plugin Bağlantısını Doğrula

```
figma_get_status()
```

### Step 2: Ekranı Anla

Figma'ya dokunmadan önce ne inşa edileceğini anla:

1. Koddan oluşturuluyorsa ilgili kaynak dosyaları oku — sayfa yapısı, bölümler, kullanılan bileşenler
2. Ekranın ana bölümlerini listele (Header, Hero, Content, Footer vb.)
3. Her bölüm için gereken UI bileşenlerini belirle (Button, Input, Card, Nav vb.)

### Step 3: Design System Keşfi

Üç şey gerekiyor: **bileşenler**, **variable'lar**, **stiller**.

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
2. **DS dosyasında variable key'lerini çek:** Ekranda kullanılacak renk, spacing, text style token'larının key'lerini DS dosyasında `figma_execute` ile oku:
   ```js
   // DS dosyasında çalıştır (fileKey = DS dosyasının file key'i)
   const varIds = ["VariableID:...", "VariableID:..."];
   const result = [];
   for (const id of varIds) {
     const v = await figma.variables.getVariableByIdAsync(id);
     if (v) result.push({ name: v.name, key: v.key, type: v.resolvedType });
   }
   return result;
   ```
3. **Text style ID'lerini çek:** DS dosyasında text style'ları al:
   ```js
   // DS dosyasında çalıştır
   const styles = await figma.getLocalTextStylesAsync();
   return styles.map(s => ({ id: s.id, name: s.name, key: s.key }));
   ```
4. **Font ailesi:** Kütüphane dosyasındaki `Font Ailesi` alanından oku. Bulunamazsa kullanıcıya sor. Kullanıcı "sen seç" derse `Inter` kullan.

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

### Step 6: Görsel Doğrulama

```
figma_capture_screenshot(nodeId="wrapper-frame-id")
```

Screenshot'ı incele:
- Bölümler doğru sırada mı?
- Spacing ve hizalama tutarlı mı?
- Renk ve tipografi DS'ye uygun mu?

Sorun varsa hedefli `figma_execute` ile düzelt.

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

- Aynı oturumda `figma_get_variables(verbosity="full")` birden fazla çağırma — ilk sonucu kullan
- `figma_search_components`: varsayılan `currentPageOnly=true`; `false` yalnızca gerektiğinde (timeout riski)
- Her `figma_execute` çağrısı küçük ve odaklı olmalı — 50+ satır kod riski yüksek

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
Semantic collection'a "Dark" mode ekle, alias'ları dark primitive'lere yönlendir. Figma'nın native mode switching'i kullanılır.

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
