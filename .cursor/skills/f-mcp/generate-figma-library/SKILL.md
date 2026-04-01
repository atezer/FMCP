---
name: generate-figma-library
description: Kod tabanından Figma'da profesyonel design system kütüphanesi inşa eder. Variable collection, primitive/semantic token, bileşen (variant, auto-layout, property), sayfa yapısı ve tema desteği oluşturur. "DS kütüphanesi oluştur", "design system inşa et", "token'ları Figma'ya yaz", "bileşen kütüphanesi kur", "generate library", "Figma'da DS oluştur" ifadeleriyle tetiklenir. F-MCP Bridge ve figma_execute gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designops
    - designer
---

# Generate Figma Library — Koddan DS Kütüphanesi İnşa

## Overview

Bu skill, bir kod tabanından Figma'da profesyonel bir design system kütüphanesi oluşturur. Variable'lar (token), stiller, bileşenler (variant, auto-layout, property) ve sayfa yapısı dahil. Topluluk `figma-generate-library` skill'inden uyarlanmış, F-MCP Bridge araçlarına göre yeniden yazılmıştır.

**Bu ASLA tek seferde yapılacak bir iş değildir.** DS inşa etmek 20–100+ `figma_execute` çağrısı, birden fazla faz ve zorunlu kullanıcı onay noktaları gerektirir.

**Zorunlu:** Her `figma_execute` çağrısından önce [figma-canvas-ops](../figma-canvas-ops/SKILL.md) kılavuzundaki kuralları uygula.

## Skill Boundaries

- Bu skill: Figma'da **DS kütüphanesi** oluşturma/güncelleme
- DS bileşenleriyle **ekran** oluşturmak istiyorsan → [generate-figma-screen](../generate-figma-screen/SKILL.md)
- Mevcut ekranı DS'ye **hizalamak** istiyorsan → [apply-figma-design-system](../apply-figma-design-system/SKILL.md)
- Figma token'larını **kod dosyalarına** export etmek istiyorsan → [design-token-pipeline](../design-token-pipeline/SKILL.md)

## Prerequisites

- F-MCP Bridge plugin bağlı olmalı
- Kod tabanında token/bileşen bilgisi mevcut olmalı (CSS variables, Tailwind config, Swift Color extension, vb.)

## F-MCP skill koordinasyonu

- **Sonra:** `design-token-pipeline` (token export), `code-design-mapper` (bileşen eşleme), `design-system-rules` (kural üretimi)
- **Doğrulama:** `audit-figma-design-system` ile oluşturulan kütüphanenin tutarlılığını kontrol et
- **a11y:** `figma-a11y-audit` ile kontrast ve erişilebilirlik kontrolü

## F-MCP Avantajları

Bridge'de topluluk skill'inde olmayan toplu araçlar mevcut:

| Araç | Açıklama |
|---|---|
| `figma_batch_create_variables` | Toplu variable oluşturma |
| `figma_batch_update_variables` | Toplu variable güncelleme |
| `figma_setup_design_tokens` | Yapılandırılmış token kurulumu |
| `figma_arrange_component_set` | Variant grid düzenleme |
| `figma_create_variable_collection` | Collection oluşturma |

## Zorunlu Faz Sırası

Faz sırasını değiştirme veya atlama — yapısal bozulmalara neden olur.

```
Faz 0: KEŞİF (henüz yazma yok)
  0a. Kod tabanını analiz et → token, bileşen, isimlendirme kurallarını çıkar
  0b. Figma dosyasını incele → mevcut sayfa, variable, bileşen, stil
  0c. v1 kapsamını kilitle → tam token seti + bileşen listesinde mutabık kal
  ✋ KULLANICI ONAYI: tam planı sun, onay bekle

Faz 1: TEMELLERİ KUR (token'lar — her zaman bileşenlerden önce)
  1a. Variable collection ve modları oluştur
  1b. Primitive variable'lar (ham değerler)
  1c. Semantic variable'lar (alias, mod-bazlı)
  1d. Tüm variable'larda scope ayarla
  1e. Effect style ve text style oluştur
  → Çıkış kriteri: planlanan her token mevcut, tüm scope'lar ayarlı
  ✋ KULLANICI ONAYI: variable özeti göster

Faz 2: DOSYA YAPISI (bileşenlerden önce)
  2a. Sayfa iskeletini oluştur: Cover → Başlangıç → Temeller → Bileşenler → Yardımcılar
  2b. Temel dokümantasyon sayfaları (renk swatchleri, tipografi örnekleri, spacing barları)
  → Çıkış kriteri: planlanan tüm sayfalar mevcut
  ✋ KULLANICI ONAYI: sayfa listesi + screenshot

Faz 3: BİLEŞENLER (bağımlılık sırasıyla, teker teker)
  Her bileşen için (atomlar → moleküller → organizmalar):
    3a. Bileşen sayfasını oluştur
    3b. Base component: auto-layout + variable bağlama
    3c. Variant kombinasyonları (combineAsVariants + grid layout)
    3d. Component property ekle (TEXT, BOOLEAN, INSTANCE_SWAP)
    3e. Sayfa dokümantasyonu (başlık, açıklama, kullanım notları)
    3f. Doğrulama: figma_get_file_data + figma_capture_screenshot
    → Çıkış kriteri: variant sayısı doğru, tüm bağlamalar doğrulanmış
    ✋ KULLANICI ONAYI: her bileşen sonrası screenshot

Faz 4: ENTEGRASYON + QA
  4a. İsteğe bağlı Code Connect eşleme (code-design-mapper)
  4b. a11y denetimi (figma-a11y-audit): kontrast, minimum dokunma hedefi
  4c. İsimlendirme denetimi: kopya yok, isimsiz node yok, tutarlı casing
  4d. Bağlanmamış fill/stroke denetimi: hardcode kalmamış
  4e. Son review: tüm sayfaların screenshot'ları
  ✋ KULLANICI ONAYI: tam onay
```

## Faz 0: Keşif (Detay)

### 0a. Kod tabanı analizi

Aşağıdakileri çıkar:

| Kaynak | Çıkarılacak |
|---|---|
| CSS Custom Properties / Sass variables | Renk, spacing, radius, shadow token'ları |
| Tailwind config | Tema token'ları, breakpoint'ler |
| Swift Color/Font extension | iOS token'ları |
| Android colors.xml / Compose Theme | Android token'ları |
| Bileşen dosyaları | Bileşen listesi, prop'lar, variant'lar |

### 0b. Figma dosyası inceleme

```
figma_get_status()
figma_get_file_data(depth=1)
figma_get_variables(verbosity="summary")
figma_get_styles()
```

Mevcut yapıyı not al — çakışma riski varsa kullanıcıya sor.

## Faz 1: Temeller (Detay)

### Variable collection oluşturma

```
figma_create_variable_collection(name="Colors", modes=["Light", "Dark"])
figma_create_variable_collection(name="Spacing", modes=["Default"])
figma_create_variable_collection(name="Radius", modes=["Default"])
```

### Toplu variable oluşturma (F-MCP avantajı)

```
figma_batch_create_variables(
  collectionId="<id>",
  variables=[
    { name: "primary/50", type: "COLOR", values: { "Light": "#EEF2FF", "Dark": "#312E81" } },
    { name: "primary/100", type: "COLOR", values: { "Light": "#E0E7FF", "Dark": "#3730A3" } },
    ...
  ]
)
```

Veya `figma_setup_design_tokens` ile yapılandırılmış kurulum.

### Scope ayarlama

Variable oluşturduktan sonra scope'ları ayarla (ZORUNLU):

```js
// figma_execute içinde
const variable = await figma.variables.getVariableByIdAsync("<id>");
variable.scopes = ["FRAME_FILL", "SHAPE_FILL"];
return { id: variable.id, scopes: variable.scopes };
```

### Text ve effect style'lar

```js
const style = figma.createTextStyle();
style.name = "Heading/H1";
await figma.loadFontAsync({ family: "Inter", style: "Bold" });
style.fontName = { family: "Inter", style: "Bold" };
style.fontSize = 32;
style.lineHeight = { value: 40, unit: "PIXELS" };
return { styleId: style.id, name: style.name };
```

## Faz 3: Bileşenler (Detay)

### Base component

```js
const component = figma.createComponent();
component.name = "Button";
component.layoutMode = "HORIZONTAL";
component.primaryAxisSizingMode = "AUTO";
component.counterAxisSizingMode = "AUTO";
component.paddingTop = component.paddingBottom = 12;
component.paddingLeft = component.paddingRight = 24;
component.cornerRadius = 8;
component.itemSpacing = 8;

// Metin ekle
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
const label = figma.createText();
label.characters = "Button";
label.fontName = { family: "Inter", style: "Medium" };
label.fontSize = 14;
component.appendChild(label);

return { componentId: component.id };
```

### Variant'lar

```js
const variants = [];
const sizes = ["Small", "Medium", "Large"];
const types = ["Primary", "Secondary", "Ghost"];

for (const size of sizes) {
  for (const type of types) {
    const variant = existingComponent.clone();
    variant.name = `Size=${size}, Type=${type}`;
    // Boyut ve stil ayarlamaları...
    variants.push(variant);
  }
}

const componentSet = figma.combineAsVariants(
  [existingComponent, ...variants],
  figma.currentPage
);
componentSet.name = "Button";
return { componentSetId: componentSet.id, variantCount: variants.length + 1 };
```

Variant grid düzenleme için `figma_arrange_component_set` kullanılabilir.

### Component property

```js
// figma_execute içinde
const component = await figma.getNodeByIdAsync("<id>");
component.addComponentProperty("label", "TEXT", "Button");
component.addComponentProperty("showIcon", "BOOLEAN", true);
return { properties: component.componentPropertyDefinitions };
```

## Performans Kuralları

- Her `figma_execute` çağrısı küçük ve odaklı olmalı — tek bir işlem (1 collection, 1 bileşen, vb.)
- `figma_batch_create_variables` tercih et — 10+ variable için tekil çağrılardan çok daha verimli
- `figma_get_variables` ilk çağrıdan sonra sonucu yeniden kullan
- Screenshot doğrulamayı her faz sonunda yap, her adımda değil

## Evolution Triggers

- Bridge'e yeni batch araçları (ör. batch style oluşturma) eklenirse Faz 1 güncellenmeli
- Yeni component property türleri desteklenirse Faz 3 güncellenmeli
- Çoklu dosya desteği eklenirse Faz 2 genişletilmeli
- `figma_setup_design_tokens` parametreleri değişirse Faz 1 güncellenmeli
