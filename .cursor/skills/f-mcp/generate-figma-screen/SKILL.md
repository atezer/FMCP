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

### Step 4: Boş Alan Bul ve Wrapper Frame Oluştur

```js
const children = figma.currentPage.children;
let maxX = 0;
children.forEach(c => {
  const right = c.x + c.width;
  if (right > maxX) maxX = right;
});

const frame = figma.createFrame();
frame.name = "Ekran Adı";
frame.x = maxX + 100;
frame.y = 0;
frame.resize(1440, 900); // Masaüstü varsayılan; mobil için 390x844
frame.layoutMode = "VERTICAL";
frame.primaryAxisSizingMode = "AUTO";
frame.counterAxisSizingMode = "FIXED";
frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

return { frameId: frame.id, position: { x: frame.x, y: frame.y } };
```

### Step 5: Bölüm Bölüm İnşa Et

**Her bölümü ayrı bir `figma_execute` çağrısında oluştur.** Tek çağrıda tüm ekranı oluşturmaya ÇALIŞMA.

Sıra: Üstten alta — Header → Hero → Content → Footer

Her bölüm için:

1. `figma_execute` ile bölüm frame'ini oluştur, DS bileşen instance'larını yerleştir
2. Variable bağla (hardcode değer kullanma)
3. Oluşturulan node ID'lerini return et
4. `figma_capture_screenshot` ile görsel doğrulama

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

## Performans Kuralları

- Aynı oturumda `figma_get_variables(verbosity="full")` birden fazla çağırma — ilk sonucu kullan
- `figma_search_components`: varsayılan `currentPageOnly=true`; `false` yalnızca gerektiğinde (timeout riski)
- Her `figma_execute` çağrısı küçük ve odaklı olmalı — 50+ satır kod riski yüksek

## Çıktı Formatı

- Oluşturulan ekranın Figma node ID'si
- DS uyum özeti (kaç instance, kaç variable bağlı)
- Screenshot

## Evolution Triggers

- Bridge'e asset arama veya otomatik ekran üretme aracı eklenirse paralel iş akışı eklenmeli
- Yeni bileşen instance araçları eklenirse Step 5 kalıbı güncellenmeli
- Mobil platform desteği genişletilirse boyut presetleri eklenmeli
