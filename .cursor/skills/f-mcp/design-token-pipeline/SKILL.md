---
name: design-token-pipeline
description: Figma variable'larını iOS (Swift Color/Font/Spacing), Android (colors.xml, dimens.xml, Compose Theme), ve Web (CSS, Tailwind, Sass, TS) formatlarında otomatik token dosyalarına dönüştürür. Ters yönde kod token dosyalarından Figma variable'ları da oluşturabilir. "export tokens", "token pipeline", "token'ları export et", "sync tokens", "generate token files", "token'ları Figma'ya yaz", "kod token'larını senkronla" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir. Bu özellik resmi Figma plugininde yoktur.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - uidev
    - designops
---

# Design Token Pipeline (Multi-Platform)

> **Design Token Kuralı:** Bu skill'deki kod örneklerinde geçen font adları, renk kodları, piksel boyutları yalnızca FORMAT gösterimidir. Çalışma anında tüm design token değerleri (font, renk, boyut, spacing, radius, gölge) kayıtlı kütüphaneden (`figma_get_variables`, `figma_get_styles`) veya kullanıcıdan okunmalıdır. Hardcoded token değeri kullanma. Detay: `project-context.md` → "Design Token Kuralı".

## Overview

Bu skill, Figma'daki design token'ları (variable'lar ve style'lar) **iOS, Android ve Web** platformlarının kullandığı formatlarda kod dosyalarına dönüştürür. Resmi Figma plugininde bu özellik yoktur.

**Önemli:** MCP araçları (`figma_get_variables`, `figma_get_styles`, `figma_get_token_browser`) ham variable ve style verisi döner. Platform-spesifik dosya formatlarına dönüşüm (Swift, XML, CSS vb.) **AI agent tarafından** yapılır. Araçlar doğrudan Swift/XML/CSS export etmez.

**Desteklenen çıktı formatları:**

| Platform | Format | Dosya |
|----------|--------|-------|
| **iOS** | Swift Color extension | `Colors.swift` |
| **iOS** | Swift Font extension | `Typography.swift` |
| **iOS** | Swift Spacing constants | `Spacing.swift` |
| **iOS** | Asset Catalog color set | `*.colorset/Contents.json` |
| **Android** | XML resources | `colors.xml`, `dimens.xml`, `styles.xml` |
| **Android** | Compose Color object | `AppColors.kt` |
| **Android** | Compose Typography | `AppTypography.kt` |
| **Android** | Compose Spacing | `AppSpacing.kt` |
| **Web** | CSS Custom Properties | `tokens.css` |
| **Web** | Tailwind config | `tailwind.config.js` |
| **Web** | TypeScript constants | `tokens.ts` |
| **Web** | Sass variables | `_tokens.scss` |
| **JSON** | W3C Design Tokens | `tokens.json` |

**Ek özellikler:**
- Mode desteği (Light/Dark tema — variable'ların `valuesByMode` alanından)
- Alias zinciri çözümleme (variable referansları `type: "VARIABLE_ALIAS"` olarak gelir, AI takip eder)
- Incremental güncelleme (mevcut dosyalar okunup, sadece değişenler güncellenir)
- Kategori bazlı export
- Cross-platform token değeri tutarlılık doğrulaması

REST API veya Figma access token gerekmez.

## Prerequisites

- F-MCP Bridge plugin bağlı olmalı
- Hedef platform(lar) ve styling yaklaşımları bilinmeli

## F-MCP skill koordinasyonu

- **Önce:** Figma’da token’lar tutarlı bağlıysa export daha güvenilir — isteğe bağlı **audit-figma-design-system**.
- **Sonra:** **design-drift-detector** ve **implement-design** bu dosyaları referans alır; **design-system-rules** güncellenebilir.
- **Etki analizi:** Bir token değişikliğinin yarıçapını ölçmek istiyorsan → **ds-impact-analysis**
- **Performans:** Aynı oturumda token verisi zaten çekildiyse (`figma_get_variables` / `figma_get_styles`) yeniden full çağırma; **audit-figma-design-system** içindeki “Zincir performansı” bölümüne uy.

## Required Workflow

### Step 1: Plugin Bağlantısını Doğrula

```
figma_get_status()
```

### Step 2: Token Envanterini Çek

Önce genel envanter için token browser:

```
figma_get_token_browser(verbosity="full")
```

Sonra detaylı variable verisi (`summary`: koleksiyon/sayı, `standard`: isim/tip, `full`: tüm değerler + mode'lar):

```
figma_get_variables(verbosity="full")
```

Bu çağrı döner: `variableCollections` (koleksiyon adları, mode'lar, mode ID'leri) ve `variables` (her variable'ın `name`, `resolvedType`, `valuesByMode`). Alias'lar `valuesByMode` içinde `{type: "VARIABLE_ALIAS", id: "..."}` olarak gelir — hedef variable'ı ID ile bul ve son değere ulaş.

**Code Syntax desteği:** Variable'larda `codeSyntax` alanı varsa (Web, Android, iOS), token export sırasında bu değerleri platform-spesifik isimlendirme için kullan. Figma'da Code Syntax ayarlanmışsa, token dönüşümünde Figma'daki isimleri referans al:
- **Web:** `codeSyntax.WEB` → CSS custom property adı (ör. `var(--btn-primary-bg)`)
- **Android:** `codeSyntax.ANDROID` → Resource adı (ör. `R.color.btn_primary_bg`)
- **iOS:** `codeSyntax.iOS` → Swift sabit adı (ör. `ButtonColor.primary.bg`)

Code Syntax bilgisini okumak için `figma_execute` kullan:
```js
const v = await figma.variables.getVariableByIdAsync("<id>");
return { name: v.name, codeSyntax: v.codeSyntax };
```

Stil verileri için:

```
figma_get_styles(verbosity="full")
```

Paint styles (renk), text styles (tipografi), effect styles (gölge vb.) döner.

### Step 3: Hedef Platformları ve Formatları Belirle

Kullanıcıdan hangi platformlara export edileceğini öğren. Birden fazla seçilebilir.

### Step 4: Platform-Spesifik Token Dosyaları Üret

---

#### iOS — Swift Extensions

**Colors.swift:**

```swift
import SwiftUI

// Auto-generated by F-MCP Design Token Pipeline
// Source: Figma — [File Name]
// Generated: 2026-03-12T10:30:00Z

extension Color {
    enum DS {
        // Primitives
        static let blue50 = Color(hex: "#EFF6FF")
        static let blue100 = Color(hex: "#DBEAFE")
        static let blue500 = Color(hex: "#3B82F6")
        static let blue900 = Color(hex: "#1E3A5A")

        // Semantic
        static let primary = blue500
        static let background = Color(light: "#FFFFFF", dark: "#0A0A0A")
        static let textPrimary = Color(light: "#1A1A1A", dark: "#FAFAFA")
    }
}

extension Color {
    init(hex: String) {
        // hex → Color init implementation
    }

    init(light: String, dark: String) {
        self.init(UIColor { traitCollection in
            traitCollection.userInterfaceStyle == .dark
                ? UIColor(hex: dark) : UIColor(hex: light)
        })
    }
}
```

**Typography.swift:**

```swift
import SwiftUI

extension Font {
    enum DS {
        static let headingLarge = Font.custom("Inter", size: 24).weight(.bold)
        static let headingMedium = Font.custom("Inter", size: 20).weight(.semibold)
        static let bodyLarge = Font.custom("Inter", size: 16).weight(.regular)
        static let bodyMedium = Font.custom("Inter", size: 14).weight(.regular)
        static let bodySmall = Font.custom("Inter", size: 12).weight(.regular)
        static let labelMedium = Font.custom("Inter", size: 14).weight(.medium)
    }
}
```

**Spacing.swift:**

```swift
import Foundation

enum Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 48
}

enum CornerRadius {
    static let sm: CGFloat = 4
    static let md: CGFloat = 8
    static let lg: CGFloat = 12
    static let full: CGFloat = 9999
}
```

**Dönüşüm kuralları (iOS):**
- Token adı → camelCase (ör. `color/primary/500` → `primary500`)
- COLOR → `Color(hex:)` veya Asset Catalog
- FLOAT → `CGFloat`
- Mode desteği → `UITraitCollection` veya Asset Catalog appearance
- Font → `Font.custom()` veya `Font.system()`

---

#### Android — XML Resources

**res/values/colors.xml:**

```xml
<?xml version="1.0" encoding="utf-8"?>
<!-- Auto-generated by F-MCP Design Token Pipeline -->
<resources>
    <!-- Primitives -->
    <color name="blue_50">#FFEFF6FF</color>
    <color name="blue_100">#FFDBEAFE</color>
    <color name="blue_500">#FF3B82F6</color>
    <color name="blue_900">#FF1E3A5A</color>

    <!-- Semantic -->
    <color name="primary">@color/blue_500</color>
    <color name="background">#FFFFFFFF</color>
    <color name="text_primary">#FF1A1A1A</color>
</resources>
```

**res/values-night/colors.xml:**

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="primary">@color/blue_400</color>
    <color name="background">#FF0A0A0A</color>
    <color name="text_primary">#FFFAFAFA</color>
</resources>
```

**res/values/dimens.xml:**

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Spacing -->
    <dimen name="space_xs">4dp</dimen>
    <dimen name="space_sm">8dp</dimen>
    <dimen name="space_md">16dp</dimen>
    <dimen name="space_lg">24dp</dimen>
    <dimen name="space_xl">32dp</dimen>

    <!-- Corner Radius -->
    <dimen name="radius_sm">4dp</dimen>
    <dimen name="radius_md">8dp</dimen>
    <dimen name="radius_lg">12dp</dimen>

    <!-- Typography -->
    <dimen name="text_size_sm">12sp</dimen>
    <dimen name="text_size_md">14sp</dimen>
    <dimen name="text_size_lg">16sp</dimen>
</resources>
```

#### Android — Compose Theme Objects

**AppColors.kt:**

```kotlin
package com.app.ui.theme

import androidx.compose.ui.graphics.Color

// Auto-generated by F-MCP Design Token Pipeline

object AppColors {
    // Primitives
    val Blue50 = Color(0xFFEFF6FF)
    val Blue100 = Color(0xFFDBEAFE)
    val Blue500 = Color(0xFF3B82F6)
    val Blue900 = Color(0xFF1E3A5A)

    // Semantic — Light
    val PrimaryLight = Blue500
    val BackgroundLight = Color(0xFFFFFFFF)
    val TextPrimaryLight = Color(0xFF1A1A1A)

    // Semantic — Dark
    val PrimaryDark = Color(0xFF60A5FA)
    val BackgroundDark = Color(0xFF0A0A0A)
    val TextPrimaryDark = Color(0xFFFAFAFA)
}
```

**AppTypography.kt:**

```kotlin
package com.app.ui.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

object AppTypography {
    val HeadingLarge = TextStyle(fontSize = 24.sp, fontWeight = FontWeight.Bold)
    val HeadingMedium = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
    val BodyLarge = TextStyle(fontSize = 16.sp, fontWeight = FontWeight.Normal)
    val BodyMedium = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Normal)
    val BodySmall = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Normal)
    val LabelMedium = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.Medium)
}
```

**AppSpacing.kt:**

```kotlin
package com.app.ui.theme

import androidx.compose.ui.unit.dp

object AppSpacing {
    val xs = 4.dp
    val sm = 8.dp
    val md = 16.dp
    val lg = 24.dp
    val xl = 32.dp
    val xxl = 48.dp
}

object AppCornerRadius {
    val sm = 4.dp
    val md = 8.dp
    val lg = 12.dp
}
```

**Dönüşüm kuralları (Android):**
- Token adı → snake_case (XML), PascalCase (Compose)
- COLOR → `#AARRGGBB` (XML), `Color(0xFFRRGGBB)` (Compose)
- FLOAT → `dp` (spacing/radius), `sp` (typography)
- Mode → `values-night/` qualifier (XML), Light/Dark suffix (Compose)

---

#### Web — CSS / Tailwind / Sass / TypeScript

Web formatları önceki versiyondaki gibi:

**CSS Custom Properties:**
```css
:root {
  --color-primary: #3b82f6;
  --space-md: 16px;
  --radius-md: 8px;
}

[data-theme="dark"] {
  --color-primary: #60a5fa;
  --color-background: #0a0a0a;
}
```

**Tailwind Config:** Nested object formatında `theme.extend`

**TypeScript:** `as const` ile type-safe constant'lar

**Sass:** `$variable` formatında, `$map` destekli

---

#### JSON — W3C Design Tokens (Platformlar-arası)

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "primary": {
      "$type": "color",
      "$value": "#3b82f6",
      "$extensions": {
        "mode": { "dark": "#60a5fa" },
        "platforms": {
          "ios": "Color.DS.primary",
          "android": "@color/primary / AppColors.Primary",
          "web": "var(--color-primary)"
        }
      }
    }
  }
}
```

### Step 5: Dosyaları Yaz

Her platform için oluşturulan dosyaları doğru konumlara yaz:

| Platform | Dosya | Konum |
|----------|-------|-------|
| iOS | Colors.swift | `[ios-root]/Sources/DesignSystem/` |
| iOS | Typography.swift | `[ios-root]/Sources/DesignSystem/` |
| iOS | Spacing.swift | `[ios-root]/Sources/DesignSystem/` |
| Android | colors.xml | `[android-root]/app/src/main/res/values/` |
| Android | colors.xml (night) | `[android-root]/app/src/main/res/values-night/` |
| Android | dimens.xml | `[android-root]/app/src/main/res/values/` |
| Android | AppColors.kt | `[android-root]/app/src/main/java/.../ui/theme/` |
| Android | AppTypography.kt | `[android-root]/app/src/main/java/.../ui/theme/` |
| Android | AppSpacing.kt | `[android-root]/app/src/main/java/.../ui/theme/` |
| Web | tokens.css | `[web-root]/src/styles/` |
| Web | tailwind.config.js | `[web-root]/` |
| JSON | tokens.json | proje kökü |

Dosya başına auto-generated uyarısı ekle.

### Step 6: Cross-Platform Doğrulama

Token dosyaları oluşturulduktan sonra platformlar arası değer tutarlılığını kontrol et:

**Önemli:** `codeTokens` içindeki token isimleri Figma'daki variable isimleriyle **tam eşleşmeli**. Figma'da `color/primary` varsa `codeTokens`'ta da `color/primary` kullan. Bu araç yalnızca token değerlerini karşılaştırır, platform-spesifik naming convention'larını anlamaz.

```
figma_check_design_parity(
  codeTokens='{"color/primary": "#3b82f6", "spacing/md": "16", "radius/md": "8"}'
)
```

Ek olarak kendi doğrulamamızı da yap (üretilen dosyalar arasında değerleri karşılaştırarak):

```
Cross-Platform Token Tutarlılık Kontrolü:
┌─────────────────┬───────────┬───────────┬───────────┐
│ Token           │ iOS       │ Android   │ Web       │
├─────────────────┼───────────┼───────────┼───────────┤
│ primary         │ #3B82F6   │ #3B82F6   │ #3b82f6   │ OK
│ spacing-md      │ 16 pt     │ 16 dp     │ 16 px     │ OK
│ radius-md       │ 8 pt      │ 8 dp      │ 8 px      │ OK
│ text-size-md    │ 14 pt     │ 14 sp     │ 14 px     │ OK
└─────────────────┴───────────┴───────────┴───────────┘
Sonuç: Tüm platformlarda token değerleri tutarlı ✓
```

## Incremental Güncelleme

"Token'ları güncelle" / "sync tokens" dendiğinde:

1. Mevcut token dosyalarını oku (her platform için)
2. `figma_get_variables(verbosity="full")` ile güncel Figma verileri çek
3. Değişen token'ları tespit et
4. Sadece değişen token'ları her platformda güncelle
5. Auto-generated timestamp'i güncelle
6. Cross-platform tutarlılık kontrolü çalıştır

## Kategori Bazlı Export

- "Sadece renkleri export et" → COLOR variable'lar + paint style'lar
- "Spacing token'larını güncelle" → FLOAT variable'lar (space/spacing adlı)
- "Typography'yi export et" → text style'lar + font size/weight/line-height variable'lar

## Examples

### Örnek 1: 3 Platform Token Export

Kullanıcı: "Figma token'larını iOS, Android ve Web için export et"

**Akış:**

1. Figma verilerini çek
2. 3 platformun projelerini analiz et
3. iOS: `Colors.swift`, `Typography.swift`, `Spacing.swift` üret
4. Android: `colors.xml`, `dimens.xml`, `AppColors.kt`, `AppTypography.kt`, `AppSpacing.kt` üret
5. Web: `tokens.css`, `tailwind.config.js` update
6. JSON: `tokens.json` üret (referans)
7. Cross-platform doğrulama çalıştır

### Örnek 2: Sadece Android Token Güncelleme

Kullanıcı: "Android renk token'larını güncelle"

**Akış:**

1. Figma'dan güncel COLOR variable'ları çek
2. Mevcut `colors.xml` ve `AppColors.kt` dosyalarını oku
3. Değişen renkleri tespit et
4. Sadece değişen renkleri güncelle
5. `values-night/colors.xml` da güncelle (dark mode varsa)

## Common Issues and Solutions

### Sorun: Birim farkları (pt vs dp vs px)

**Çözüm:** Figma'daki sayısal değer her platformda aynı kalır, sadece birim değişir: iOS = pt, Android = dp/sp, Web = px. 16 her yerde 16'dır.

### Sorun: Android'de hem XML hem Compose token'ları gerekiyor

**Çözüm:** İkisini de üret. XML resources → legacy View system, Kotlin objects → Compose. Her iki set de aynı Figma değerlerinden türetilir.

### Sorun: iOS Asset Catalog mu Swift extension mı?

**Çözüm:** Kullanıcıya sor. Asset Catalog Interface Builder'da görsel seçim sağlar; Swift extension programmatic erişim sağlar. İkisi birlikte de kullanılabilir.

### Sorun: Figma'da mode 2'den fazla (ör. Light, Dark, HighContrast)

**Çözüm:** iOS: Asset Catalog'da "High Contrast" appearance ekle. Android: her mode için ayrı resource qualifier. Web: her mode için ayrı CSS class/data-attribute.

---

## Reverse Flow: Kod → Figma Variable

Mevcut akış yalnızca **Figma → Kod** yönünde çalışır. Bu bölüm ters yönü tanımlar: kod tabanındaki token tanımlarını Figma variable'larına yazmak.

### Ne zaman kullanılır

- Kod tabanında token'lar tanımlı ama Figma'da henüz variable yok
- Kod tabanındaki token güncellemelerini Figma'ya yansıtmak
- JSON contract/W3C Design Token dosyasını Figma'ya aktarmak

### Direction parametresi

- `--direction=figma-to-code` — Mevcut varsayılan akış (Figma → kod dosyaları)
- `--direction=code-to-figma` — Reverse flow (kod → Figma variable'ları)

### Reverse Flow Adımları

#### R-Step 1: Kaynak token dosyasını oku

Desteklenen kaynak formatları:

| Format | Dosya | Ayrıştırma |
|---|---|---|
| CSS Custom Properties | `tokens.css` | `--token-name: value` ayrıştır |
| Tailwind config | `tailwind.config.js` | `theme.extend.*` objelerini çıkar |
| JSON (W3C Design Tokens) | `tokens.json` | `$value`, `$type` alanları |
| Swift Color extension | `Colors.swift` | Renk tanımlarını ayrıştır |
| Android colors.xml | `colors.xml` | `<color name="">` elementleri |
| Sass variables | `_tokens.scss` | `$token-name: value` ayrıştır |
| TypeScript constants | `tokens.ts` | `export const` objelerini çıkar |

#### R-Step 2: Token'ları kategorize et

Kaynak dosyadan çıkarılan her token'ı sınıfla:

- **COLOR** — hex, rgb, hsl değerleri
- **FLOAT** — spacing, radius, font-size (px/dp/pt → sayısal değer)
- **STRING** — font family, font weight isimleri

#### R-Step 3: Mevcut Figma variable'larla karşılaştır

```
figma_get_variables(verbosity="full")
```

- Aynı isimde variable varsa: değer farkı kontrol et → güncelle veya atla
- Yeni token varsa: oluşturulacaklar listesi
- Figma'da olup kodda olmayan: rapor et (silme önerisi)

#### R-Step 4: Collection ve variable oluştur/güncelle

Yeni collection gerekiyorsa:
```
figma_create_variable_collection(name="Design Tokens", modes=["Light", "Dark"])
```

Toplu oluşturma (tercih):
```
figma_batch_create_variables(
  collectionId="<id>",
  variables=[
    { name: "color/primary", type: "COLOR", values: { "Light": "#2563EB", "Dark": "#60A5FA" } },
    { name: "spacing/md", type: "FLOAT", values: { "Light": 16 } },
    ...
  ]
)
```

Güncelleme:
```
figma_batch_update_variables(
  updates=[
    { variableId: "<id>", values: { "Light": "#3B82F6" } },
    ...
  ]
)
```

#### R-Step 5: Scope ayarla

Her variable için uygun scope'u ayarla (figma_execute içinde):

```js
const variable = await figma.variables.getVariableByIdAsync("<id>");
// Renk token'ları
if (variable.resolvedType === "COLOR") {
  variable.scopes = variable.name.includes("text")
    ? ["TEXT_FILL"]
    : ["FRAME_FILL", "SHAPE_FILL"];
}
// Spacing token'ları
if (variable.resolvedType === "FLOAT" && variable.name.includes("spacing")) {
  variable.scopes = ["GAP", "WIDTH_HEIGHT"];
}
return { id: variable.id, scopes: variable.scopes };
```

#### R-Step 6: Doğrulama

Oluşturulan variable'ları kontrol et:

```
figma_get_variables(verbosity="summary")
```

Sayı ve isimlerin kaynak ile eşleştiğini doğrula.

### Çıktı

- Oluşturulan variable sayısı ve listesi
- Güncellenen variable sayısı ve fark özeti
- Atlanılan (zaten güncel) token sayısı
- Figma'da olup kodda olmayan token raporu

## Evolution Triggers

- Bridge'e yeni token araçları eklendiğinde (ör. toplu token import aracı) ilgili adımlar güncellenmeli
- W3C Design Tokens spec güncellendiğinde JSON formatı uyarlanmalı
- Yeni platform formatları (Flutter, .NET MAUI vb.) desteklendiğinde çıktı tablosu genişletilmeli
