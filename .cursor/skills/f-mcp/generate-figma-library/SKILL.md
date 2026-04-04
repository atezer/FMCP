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

### Breakpoint / Ekran Boyut Token'ları (ZORUNLU)

Her DS kütüphanesinde ekran boyut token'ları olmalı. Responsive tasarımda hard-coded boyut KABUL EDİLMEZ:

```
Primitives:
  screen/mobile-width: 390     (iPhone 14)
  screen/mobile-height: 844
  screen/tablet-width: 768     (iPad portrait)
  screen/tablet-height: 1024
  screen/web-width: 1440       (Desktop)
  screen/web-height: 900
  screen/tablet-padding: 120   (Tablet yan padding)
  screen/web-padding: 480      (Web yan padding — centered card)
  screen/top-padding-mobile: 80
  screen/top-padding-tablet: 160
  screen/bottom-padding: 40

Semantic:
  layout/screen-mobile-width → screen/mobile-width
  layout/screen-tablet-width → screen/tablet-width
  layout/screen-web-width → screen/web-width
  layout/screen-tablet-padding → screen/tablet-padding
  layout/screen-web-padding → screen/web-padding
```

Her ekran frame'inde şu binding'ler ZORUNLUDUR:
- `setBoundVariable("width", ...)` — genişlik
- `setBoundVariable("minHeight", ...)` — minimum yükseklik
- `setBoundVariable("paddingLeft/Right", ...)` — yan padding
- `setBoundVariable("paddingTop/Bottom", ...)` — üst/alt padding

Figma'da "Fixed width (390)" veya "Fixed height (900)" yerine variable ikonu görünmelidir. **Hard-coded boyut değeri KABUL EDİLMEZ.**

### Kritik Kural: Tum Gorunum Degerleri Token'a Bagli Olmali (ZORUNLU)

Bir bilesen olusturulurken asagidaki TUM degerler semantic variable'a baglanmalidir. Hardcoded deger KABUL EDILMEZ:

| Ozellik | Baglama Yontemi | Ornek Token |
|---------|-----------------|-------------|
| Fill (arka plan) | `setBoundVariable("fills", ...)` | button/primary/bg |
| Text fill (yazi rengi) | Text node'da `setBoundVariable("fills", ...)` | button/primary/text |
| Stroke (kenarlik rengi) | `setBoundVariable("strokes", ...)` | button/primary/border |
| **Stroke width (kenarlik kalinligi)** | `setBoundVariable("strokeWeight", ...)` | button/border-width |
| Corner radius | `setBoundVariable("topLeftRadius", ...)` vb. | button/radius |
| Padding | `setBoundVariable("paddingLeft", ...)` vb. | button/padding-x |
| Item spacing (gap) | `setBoundVariable("itemSpacing", ...)` | button/gap |
| Min height | `setBoundVariable("minHeight", ...)` | button/minHeight |
| Font size | Text Style olustur + `setBoundVariable("fontSize", ...)` | button/fontSize |

**Ozellikle gozden kacan ozellikler:**
- `strokeWeight` — Outline buton gibi kenarligi olan variantlarda kenarlik kalinligi variable'a baglanmali
- `fontSize` — Figma'da fontFamily/fontWeight variable olarak baglanamaz, Text Style ile yonetilir
- Text Style olustur → fontSize'i variable'a bagla → tum text node'lara `setTextStyleIdAsync` ile uygula

### Kritik Kural: Text Hizalama (ZORUNLU)

Text node'un `textAlignHorizontal` degeri, bilesenin amacina gore ayarlanmali:

| Bilesen Tipi | textAlignHorizontal | Neden |
|-------------|---------------------|-------|
| Button, Tag, Badge | CENTER | Yazi butonun ortasinda olmali |
| Input, Textarea | LEFT | Kullanici metni soldan yazar |
| Card title, List item | LEFT | Okuma yonu sol→sag |
| Dialog title | LEFT veya CENTER | Tasarim kararina bagli |
| Table header/cell | LEFT | Tablo verisi sola hizali |

**Kural:** `textAlignHorizontal` ASLA varsayilan LEFT olarak birakilmamali — bilesen tipine gore bilinçli secilmeli.
Text Style icerisinde hizalama AYARLANAMAZ (Figma kisitlamasi) — her text node'da ayri ayarlanmali.

### Kritik Kural: Bilesen Sizing (ZORUNLU)

Bilesenler ve instance'lar ASLA `Fixed width` olarak birakilmamali (ozel durum haric):

| Durum | layoutSizingHorizontal | Neden |
|-------|----------------------|-------|
| Button, Tag, Badge | HUG | Icerige gore boyutlanir, yazi ortalanir |
| Input, Textarea | FILL | Parent genisligine uyar |
| Card | FILL veya FIXED | Responsive grid'e gore |
| Icon wrapper | HUG | Ikon boyutuna gore |

**Kural:** `Fixed width` kullanirsan yazinin ortalanmis gorunmesini engeller — buton "Kaydet" yazisindan genis kalir ve yazi sola yapisir. HUG kullanirsan buton yaziya sarilir ve auto-layout CENTER duzgun calisir.

**Dogrulama:** Faz 4 (4d) adiminda `boundVariables`, stroke, fontSize, text style, text hizalama VE sizing mode kontrol edilmeli.

### Toplu variable oluşturma (F-MCP avantajı)
```

### Kritik Kural: Semantic Token = Alias (ZORUNLU)

**Her semantic token, bir primitive token'a alias (VARIABLE_ALIAS) olarak bağlanmalıdır.** Hiçbir semantic token'da direkt sabit değer (literal value) olmamalıdır.

Eğer semantic token için uygun bir primitive yoksa, **önce primitive oluştur, sonra alias bağla:**

```js
// figma_execute — Primitives'te karşılık yoksa önce oluştur
const primColl = (await figma.variables.getLocalVariableCollectionsAsync()).find(c => c.name === "Primitives");
const newPrim = figma.variables.createVariable("size/touch-min-ios", primColl, "FLOAT");
newPrim.setValueForMode(primColl.modes[0].modeId, 44);
newPrim.description = "iOS minimum touch target. 44pt per Apple HIG.";
newPrim.scopes = ["WIDTH_HEIGHT"];

// Sonra semantic'i alias olarak bağla
const semVar = await figma.variables.getVariableByIdAsync("<SEMANTIC_VAR_ID>");
semVar.setValueForMode(semModeId, { type: "VARIABLE_ALIAS", id: newPrim.id });
```

Bu kural, token sisteminin tutarlılığını garanti eder: primitive değişince tüm semantic'ler otomatik güncellenir.

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

**Hata yönetimi:** `figma_batch_create_variables` kısmi başarı dönebilir. Yanıttaki `{ created, failed }` alanlarını kontrol et:
- `failed` boş değilse: hata mesajını oku, eksik variable'ları tekil `figma_create_variable` ile oluştur
- `created` dizisinden variable ID'lerini kaydet — sonraki adımlarda (scope atama, alias bağlama) kullanılacak

Veya `figma_setup_design_tokens` ile yapılandırılmış kurulum (atomik: ya hepsi başarılı ya hiçbiri).

### Scope ayarlama

Variable oluşturduktan sonra scope'ları ayarla (ZORUNLU):

```js
// figma_execute içinde
const variable = await figma.variables.getVariableByIdAsync("<id>");
variable.scopes = ["FRAME_FILL", "SHAPE_FILL"];
return { id: variable.id, scopes: variable.scopes };
```

### Description ve Code Syntax (ZORUNLU)

Her variable'a description ve code syntax ekle. Bu, geliştirici handoff'unda kritik bilgi sağlar:

```js
// figma_execute içinde — description
const variable = await figma.variables.getVariableByIdAsync("<id>");
variable.description = "Primary button background. WCAG AA on white (4.56:1).";

// Code syntax — 3 platform
variable.setVariableCodeSyntax("WEB", "var(--btn-primary-bg)");
variable.setVariableCodeSyntax("ANDROID", "R.color.btn_primary_bg");
variable.setVariableCodeSyntax("iOS", "ButtonColor.primary.bg");
return { id: variable.id, description: variable.description };
```

**İsimlendirme kuralları (Code Syntax):**
- **Web:** CSS custom property: `var(--token-name)` (kebab-case)
- **Android:** Resource reference: `R.color.token_name` veya `R.dimen.token_name` (snake_case)
- **iOS:** Swift constant: `Color.tokenName` veya `Spacing.tokenName` (camelCase)

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

// ZORUNLU: Component set'e auto-layout ekle — yoksa variantlar ust uste biner
componentSet.layoutMode = "VERTICAL"; // veya "HORIZONTAL"
componentSet.primaryAxisSizingMode = "AUTO";
componentSet.counterAxisSizingMode = "AUTO";
componentSet.itemSpacing = 16;

return { componentSetId: componentSet.id, variantCount: variants.length + 1 };
```

**KRITIK:** Variantlari birlestirmek icin `figma_arrange_component_set` kullan:

```
figma_arrange_component_set(nodeIds=["<VARIANT_1_ID>", "<VARIANT_2_ID>", ...])
```

Bu arac `combineAsVariants` + otomatik HORIZONTAL auto-layout uygular.

Arac sadece `combineAsVariants` cagirir — sonrasinda auto-layout veya manual positioning EKLEME. Figma native dashed-border grid'i kendisi uygular.

**ONEMLI:** `combineAsVariants` variant property adini `Property 1` olarak atar. Sonrasinda rename yap:

```js
// figma_execute — arrange_component_set SONRASI calistir
const cs = await figma.getNodeByIdAsync("<COMPONENT_SET_ID>");
for (const child of cs.children) {
  child.name = child.name.replace("Property 1=", "Variant=");
}
```

### Component property

```js
// figma_execute içinde
const component = await figma.getNodeByIdAsync("<id>");
component.addComponentProperty("label", "TEXT", "Button");
component.addComponentProperty("showIcon", "BOOLEAN", true);
return { properties: component.componentPropertyDefinitions };
```

### Code-Only Props Katmanı (Nathan Curtis Yaklaşımı)

Görsel olmayan ama geliştirici için kritik olan property'ler (accessibilityLabel, heading level, slot config, minLength, maxRows vb.) Figma'da **gizli bir katman** içinde tanımlanır. Bu, Figma'yı bileşen tanımının tek doğruluk kaynağı yapar.

**Adım 1: Gizli katman oluştur**

Component'in kök katmanının alt öğesi olarak, (0,0) konumunda, 0.01x0.01 boyutunda, içeriği kırpılmış bir frame ekle:

```js
// figma_execute — Code-only props katmanı oluştur
const component = await figma.getNodeByIdAsync("<COMPONENT_ID>");

const codeOnlyFrame = figma.createFrame();
codeOnlyFrame.name = "Code only props";
codeOnlyFrame.resize(0.01, 0.01);
codeOnlyFrame.x = 0;
codeOnlyFrame.y = 0;
codeOnlyFrame.clipsContent = true;
codeOnlyFrame.fills = [];
component.appendChild(codeOnlyFrame);
```

**Adım 2: Her property için bir katman ekle**

```js
await figma.loadFontAsync({ family: "Inter", style: "Regular" });

// Erişilebilirlik etiketi
const a11yLabel = figma.createText();
a11yLabel.characters = "Label";
a11yLabel.name = "accessibilityLabel";
a11yLabel.fontSize = 10;
codeOnlyFrame.appendChild(a11yLabel);

// Component property'ye bağla
component.addComponentProperty("accessibilityLabel", "TEXT", "Button label");
a11yLabel.componentPropertyReferences = { characters: "accessibilityLabel#<KEY>" };
```

**Adım 3: Görünürlük kontrolü**

- Ürün tasarımcısının görmesi gereken props → **katman görünür** (Properties panelinde çıkar)
- Sadece geliştirici için → **katman gizli** (`a11yLabel.visible = false;`) — Properties panelinde görünmez ama spec data'da çıkar

**Yaygın Code-Only Prop Örnekleri:**

| Bileşen | Code-Only Prop | Type | Açıklama |
|---------|---------------|------|----------|
| Button | accessibilityLabel | TEXT | Ekran okuyucu etiketi |
| Heading | as | VARIANT (h1-h6) | HTML tag seviyesi |
| Heading | level | VARIANT (1-6) | Görsel hiyerarşi seviyesi |
| Input | minLength | TEXT | Min karakter (doğrulama) |
| Input | maxLength | TEXT | Max karakter (doğrulama) |
| Textarea | minRows | TEXT | Min satır yüksekliği |
| Textarea | maxRows | TEXT | Max satır yüksekliği |
| Image | src | TEXT | Görsel kaynağı URL |
| Image | altText | TEXT | Alternatif metin |
| CheckboxGroup | items anyOf | TEXT | İzin verilen alt bileşenler |
| CheckboxGroup | minItems | TEXT | Min seçim sayısı |

**Spec Data Çıktısı (YAML):**
```yaml
components:
  button:
    props:
      label:
        type: string
      accessibilityLabel:
        type: string
      disabled:
        type: boolean
        default: false
  heading:
    props:
      children:
        type: string
      as:
        type: string
        enum: [h1, h2, h3, h4, h5, h6]
        default: h2
      level:
        type: number
        enum: [1, 2, 3, 4, 5, 6]
        default: 2
```

**Kural:** Code-only props, `ai-handoff-export` skill'inin HANDOFF.md çıktısında otomatik olarak listelenmeli. `figma-a11y-audit` skill'i bu props'ları erişilebilirlik denetiminde kullanmalı.

## Performans Kuralları

- Her `figma_execute` çağrısı küçük ve odaklı olmalı — tek bir işlem (1 collection, 1 bileşen, vb.)
- `figma_batch_create_variables` tercih et — 10+ variable için tekil çağrılardan çok daha verimli
- `figma_get_variables` ilk çağrıdan sonra sonucu yeniden kullan
- Screenshot doğrulamayı her faz sonunda yap, her adımda değil

## Dark Mode Token Stratejisi

DS kütüphanesinde dark mode desteği **zorunludur**. İki yaklaşım:

### Professional+ Plan (Önerilen):
Semantic collection'a "Dark" mode ekle:
```
figma_add_mode(collectionId="<SEMANTIC_ID>", modeName="Dark")
```
Sonra her semantic token'ın Dark mode değerini ayarla:
```js
// figma_execute
const semVar = await figma.variables.getVariableByIdAsync("<SEM_VAR_ID>");
semVar.setValueForMode(darkModeId, { type: "VARIABLE_ALIAS", id: darkPrimVarId });
```

### Free Plan Workaround:
Ayrı "Primitives Dark" collection oluştur:
1. Aynı token isimleriyle (color/blue/600, color/gray/900 vb.) dark değerler ata
2. Geliştirici kodda tema'ya göre hangi collection'ı kullanacağını seçer
3. FLOAT token'lar (spacing, radius, fontSize) aynı değerde kalır

### Dark Renk Paleti Rehberi:
| Light | Dark | Kural |
|-------|------|-------|
| Beyaz arka plan | Çok koyu gri (#0F1114) | Saf siyah değil, yumuşak koyu |
| Koyu metin (#111827) | Açık metin (#F3F4F6) | Ters çevir ama saf beyaz değil |
| Gri border (#E5E7EB) | Koyu border (#272A30) | Daha az belirgin |
| Mavi/600 (#2563EB) | Mavi/500 açık (#609EF6) | Daha parlak mavi (koyu yüzeyde okunur) |

## Evolution Triggers

- Bridge'e yeni batch araçları (ör. batch style oluşturma) eklenirse Faz 1 güncellenmeli
- Yeni component property türleri desteklenirse Faz 3 güncellenmeli
- Çoklu dosya desteği eklenirse Faz 2 genişletilmeli
- `figma_setup_design_tokens` parametreleri değişirse Faz 1 güncellenmeli
