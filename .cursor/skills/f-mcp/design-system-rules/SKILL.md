---
name: design-system-rules
description: iOS, Android ve Web platformlarına özel design system kuralları oluşturur. Figma variable ve style verilerini analiz ederek akıllı kural üretimi yapar. "create design system rules", "design system kuralları oluştur", "platform kuralları ayarla", "DS standartlarını belirle", "token kullanım kuralları" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designops
    - uidev
---

# Design System Rules Generator (Multi-Platform)

> **Design Token Kuralı:** Bu skill'deki kod örneklerinde geçen font adları, renk kodları, piksel boyutları yalnızca FORMAT gösterimidir. Çalışma anında tüm design token değerleri (font, renk, boyut, spacing, radius, gölge) kayıtlı kütüphaneden (`figma_get_variables`, `figma_get_styles`) veya kullanıcıdan okunmalıdır. Hardcoded token değeri kullanma. Detay: `project-context.md` → "Design Token Kuralı".

## Overview

Bu skill, **iOS, Android ve Web** platformlarına özel design system kuralları oluşturur. Her platformun kendi framework'ü, naming convention'ı ve dosya yapısı olduğu için, kurallar platform-spesifik olarak üretilir.

Figma'daki variable ve style verilerini analiz ederek projenin mevcut yapısına uygun kurallar üretir.

REST API veya Figma access token gerekmez.

## Prerequisites

- F-MCP Bridge plugin Figma'da çalışıyor ve bağlı olmalı
- Hangi platformlara hizmet verildiği bilinmeli
- Platform proje dizinleri erişilebilir olmalı

## F-MCP skill koordinasyonu

- **Önce:** Figma isimlendirme ve bağlılık için isteğe bağlı **audit-figma-design-system** veya **design-token-pipeline** çıktılarıyla hizala.
- **Sonra:** Üretilen kuralları **design-drift-detector** ve **implement-design** doğrulamalarında referans al; tuval ihlali için **apply-figma-design-system** / **fix-figma-design-system-finding**.

## Required Workflow

### Step 1: Plugin Bağlantısını Doğrula

```
figma_get_status()
```

### Step 2: Figma Design System Verilerini Çek

```
figma_get_design_system_summary(currentPageOnly=false)
```

```
figma_get_token_browser(verbosity="full")
```

```
figma_get_variables(verbosity="full")
```

```
figma_get_styles(verbosity="full")
```

Bu verilerden çıkar:
- Token kategorileri ve isimlendirme yapısı
- Mode'lar (Light/Dark, brand varyantları vb.)
- Variable'ların `resolvedType`, `valuesByMode`, `scopes` bilgileri
- Hangi variable'ların alias olduğu (referans zincirleri)

**Not:** Plugin-only modda enrichment (health score, unused variables, circular references) otomatik olarak hesaplanmaz. Bu analizleri kendin yapmalısın: aynı isimdeki variable'ları, referans edilmeyen variable'ları ve döngüsel alias'ları raw veriden tespit et.

### Step 3: Her Platform İçin Codebase Analizi

Her platform projesini ayrı analiz et:

**iOS Projesi:**
- Proje yapısı (SPM / CocoaPods / tuist)
- SwiftUI mi UIKit mi?
- Mevcut Color extension'ları / Asset Catalog yapısı
- Typography tanımları (Font extension veya custom modifier)
- Spacing/sizing constant'ları
- Component dizin yapısı

**Android Projesi:**
- Compose mi XML mi?
- Theme yapısı (MaterialTheme / custom theme)
- `res/values/` altındaki resource dosyaları (colors.xml, dimens.xml, styles.xml)
- Compose token tanımları (Color object, Typography object)
- Component paket yapısı

**Web Projesi:**
- Framework (React/Vue/Svelte/Angular/vanilla)
- CSS yaklaşımı (Tailwind/CSS Modules/Sass/styled-components/legacy CSS)
- Token dosya konumları
- Component dizin yapısı
- Legacy altyapı gereksinimleri

### Step 4: Platform-Spesifik Kurallar Oluştur

Her platform için ayrı kural dosyası oluştur:

#### iOS Kuralları

```markdown
---
description: F-MCP Bridge ile Figma tasarımlarını iOS'a implement etmek için kurallar.
globs: ["**/*.swift"]
alwaysApply: false
---

# iOS Design System Kuralları (F-MCP Bridge)

## Genel
- IMPORTANT: Tüm UI component'leri `[IOS_COMPONENT_DIR]` dizininde olmalı
- SwiftUI kullan (minimum iOS [VERSION])
- Component isimleri PascalCase, dosya adı = struct adı

## Renkler
- IMPORTANT: Renkleri asla hardcode etme
- Asset Catalog color set'lerini kullan: `Color("primaryColor")`
- Veya extension kullan: `Color.DS.primary`
- Token kaynak dosyası: `[COLOR_EXTENSION_PATH]`
- Dark Mode desteği zorunlu — `@Environment(\.colorScheme)` veya Asset Catalog'da "Any, Dark" appearance

## Typography
- Custom font'lar `[FONT_DIR]`'de kayıtlı
- Typography scale: `Font.DS.bodyMedium`, `Font.DS.headingLarge` vb.
- IMPORTANT: Dynamic Type desteği zorunlu — `@ScaledMetric` veya `.dynamicTypeSize` kullan
- Token kaynak dosyası: `[TYPOGRAPHY_EXTENSION_PATH]`

## Spacing
- Spacing constant'ları: `Spacing.xs` (4), `Spacing.sm` (8), `Spacing.md` (16), `Spacing.lg` (24), `Spacing.xl` (32)
- IMPORTANT: Magic number kullanma, her zaman Spacing enum'dan referans al
- Token kaynak dosyası: `[SPACING_FILE_PATH]`

## Layout
- Figma Auto Layout → SwiftUI VStack/HStack/ZStack
- Figma padding → .padding() modifier
- Figma constraints → .frame() modifier
- Safe area: .safeAreaInset() veya .ignoresSafeArea() (tasarıma göre)

## F-MCP İş Akışı
1. `figma_get_design_context` ile veri çek (outputHint kullanma, ham veriyi Swift'e çevir)
2. `figma_capture_screenshot` ile görsel referans al
3. `figma_get_variables(verbosity="full")` ile token ilişkilerini çöz
4. SwiftUI View oluştur, token referansları kullan
5. `figma_check_design_parity` ile doğrula

## Erişilebilirlik
- VoiceOver label'ları zorunlu: `.accessibilityLabel()`
- Semantic renkleri kullan
- Minimum touch target: 44x44pt
```

#### Android Kuralları

```markdown
---
description: F-MCP Bridge ile Figma tasarımlarını Android'e implement etmek için kurallar.
globs: ["**/*.kt", "**/res/**/*.xml"]
alwaysApply: false
---

# Android Design System Kuralları (F-MCP Bridge)

## Genel
- IMPORTANT: Tüm UI component'leri `[ANDROID_COMPONENT_PKG]` paketinde olmalı
- Jetpack Compose kullan (minimum API [LEVEL])
- @Composable function isimleri PascalCase

## Renkler
- IMPORTANT: Renkleri asla hardcode etme
- Compose: `AppTheme.colors.primary` veya `MaterialTheme.colorScheme.primary`
- XML: `@color/primary` (res/values/colors.xml'den)
- Token kaynak dosyası: `[COLOR_OBJECT_PATH]`
- Dark Theme desteği zorunlu — `isSystemInDarkTheme()` veya night resource qualifier

## Typography
- Compose: `AppTheme.typography.bodyMedium` veya `MaterialTheme.typography.bodyMedium`
- XML: `@style/TextAppearance.App.BodyMedium`
- Custom font'lar `res/font/` dizininde
- Token kaynak dosyası: `[TYPOGRAPHY_OBJECT_PATH]`

## Spacing
- Spacing constant'ları: `AppTheme.spacing.xs` (4.dp), `AppTheme.spacing.md` (16.dp) vb.
- IMPORTANT: Hardcoded dp değeri kullanma, spacing object'ten referans al
- Token kaynak dosyası: `[SPACING_OBJECT_PATH]`

## Layout
- Figma Auto Layout (vertical) → Column
- Figma Auto Layout (horizontal) → Row
- Figma padding → Modifier.padding()
- Figma constraints → Modifier.fillMaxWidth(), .wrapContentHeight()

## F-MCP İş Akışı
1. `figma_get_design_context` ile veri çek (outputHint kullanma, ham veriyi Compose'a çevir)
2. `figma_capture_screenshot` ile görsel referans al
3. `figma_get_variables(verbosity="full")` ile token ilişkilerini çöz
4. @Composable function oluştur, theme token'ları kullan
5. `figma_check_design_parity` ile doğrula

## Erişilebilirlik
- Content description zorunlu: `Modifier.semantics { contentDescription = "..." }`
- Minimum touch target: 48x48dp
- TalkBack uyumu
```

#### Web Kuralları

```markdown
---
description: F-MCP Bridge ile Figma tasarımlarını Web'e implement etmek için kurallar.
globs: ["src/components/**", "src/pages/**"]
alwaysApply: false
---

# Web Design System Kuralları (F-MCP Bridge)

## Genel
- IMPORTANT: UI component'leri `[WEB_COMPONENT_DIR]` dizininde olmalı
- [FRAMEWORK] kullan ([LANGUAGE])
- Component isimleri PascalCase

## Renkler
- IMPORTANT: Renkleri asla hardcode etme
- [STYLING_APPROACH] kullan: [ÖRNEKLER]
- Token kaynak dosyası: `[TOKEN_FILE_PATH]`
- Dark Mode desteği: `[DARK_MODE_APPROACH]`

## Typography
- Typography scale: `[TYPOGRAPHY_TOKENS]`
- Custom font'lar: `[FONT_LOADING_APPROACH]`

## Spacing
- Spacing scale: `[SPACING_TOKENS]`
- IMPORTANT: Magic number kullanma

## Layout
- Figma Auto Layout → Flexbox
- Figma Auto Layout (wrap) → CSS Grid veya flex-wrap
- Responsive breakpoint'ler: `[BREAKPOINTS]`

## Legacy Desteği (varsa)
- Minimum browser desteği: `[BROWSER_SUPPORT]`
- IE11 / eski browser fallback'leri: `[FALLBACK_APPROACH]`
- jQuery / vanilla JS pattern'ları: `[LEGACY_PATTERNS]`

## F-MCP İş Akışı
1. `figma_get_design_context` ile veri çek (outputHint="react" veya "tailwind")
2. `figma_capture_screenshot` ile görsel referans al
3. `figma_get_variables(verbosity="full")` ile token ilişkilerini çöz
4. Projenin framework ve styling yaklaşımına çevir
5. `figma_check_design_parity` ile doğrula

## Erişilebilirlik
- WCAG AA uyumu zorunlu
- Semantic HTML kullan
- aria-label'lar zorunlu
- Keyboard navigation desteği
```

### Step 5: Variable Verilerini Analiz Et ve Uyarılar Çıkar

`figma_get_variables(verbosity="full")` çıktısını analiz ederek:

1. **Naming tutarsızlıkları:** Token isimlerinde karışık ayırıcı kullanımı var mı? (bazıları `color/primary/500`, bazıları `primary-500`)
2. **Alias zincirleri:** `valuesByMode` içinde `type: "VARIABLE_ALIAS"` olan variable'ları takip et. Döngüsel referans var mı kontrol et.
3. **Mode tutarlılığı:** Tüm variable'lar tüm mode'larda değer tanımlamış mı?

Bu analizlerden çıkan uyarıları kural dosyasına ekle:

```markdown
## Design System Uyarıları

### Naming Tutarsızlıkları
- Color token'larda karışık: bazıları `color/primary/500`, bazıları `primary-500`
- Spacing'de: `space-md` ve `spacing/md` birlikte var

### Alias İlişkileri
- `semantic/primary` → `primitives/blue-500` (bir seviye alias)
- Döngüsel referans tespit edilmediyse kaldır
```

### Step 6: Kuralları Kaydet

Her platform için ayrı kural dosyası kaydet:

```
.cursor/rules/figma-ios.mdc        — iOS kuralları
.cursor/rules/figma-android.mdc    — Android kuralları
.cursor/rules/figma-web.mdc        — Web kuralları
```

`globs` pattern'ları platform dosya uzantılarına göre ayarla.

### Step 7: Cross-Platform Tutarlılık Kuralı Ekle

Tüm platformlara uygulanan ortak bir kural dosyası da oluştur:

```markdown
---
description: Tüm platformlarda Figma design system tutarlılığı için ortak kurallar.
globs: ["**/*.swift", "**/*.kt", "**/*.tsx", "**/*.jsx", "**/*.vue"]
alwaysApply: false
---

# Cross-Platform Design System Kuralları

## Token Değer Tutarlılığı
- IMPORTANT: Tüm platformlarda aynı token aynı değeri kullanmalı
  - primary = #2563eb (iOS Color, Android Color, CSS var hepsi aynı hex)
  - spacing-md = 16 (pt, dp, px hepsi 16)
  - radius-md = 8 (pt, dp, px hepsi 8)

## Naming Convention Eşleme
| Figma Token | iOS | Android | Web |
|-------------|-----|---------|-----|
| color/primary/500 | Color.DS.primary500 | AppColors.Primary500 | --color-primary-500 |
| spacing/md | Spacing.md | AppSpacing.md | --space-md |
| radius/md | CornerRadius.md | AppShape.md | --radius-md |

## Component Mapping
- Aynı Figma component'in tüm platformlardaki karşılığı aynı davranışı sergilemeli
- Platform-native interaction pattern'ları kullanılabilir (iOS haptic, Android ripple, Web hover)
- Görsel output her platformda aynı olmalı

## Kaynak Dosya
- Token değerleri `.figma-mappings.json`'da kayıtlı
- Drift tespiti için `figma_check_design_parity` kullan
```

## Examples

### Örnek 1: iOS + Android + React Proje

Kullanıcı: "3 platform için design system kurallarını oluştur"

**Akış:**

1. Figma verilerini çek (design system summary, variables, styles, token browser)
2. Her platform projesini analiz et:
   - iOS: SwiftUI, SPM, `Sources/DesignSystem/`
   - Android: Compose, `ui/theme/` paketinde theme tanımları
   - Web: React + Tailwind, `src/components/ui/`
3. 4 kural dosyası oluştur:
   - `.cursor/rules/figma-ios.mdc`
   - `.cursor/rules/figma-android.mdc`
   - `.cursor/rules/figma-web.mdc`
   - `.cursor/rules/figma-cross-platform.mdc`
4. Variable analiz uyarılarını her dosyaya ekle

### Örnek 2: Sadece Android Kuralları

Kullanıcı: "Android için Figma kurallarını oluştur, Compose kullanıyoruz"

**Akış:**

1. Figma verilerini çek
2. Android projesini analiz et: Compose, Material 3, custom theme
3. `.cursor/rules/figma-android.mdc` oluştur
4. Compose-specific kuralları ekle (theme, typography, color scheme)

## Common Issues and Solutions

### Sorun: Platform projeleri farklı repo'larda

**Çözüm:** Her platformun `rootDir`'ini absolute path olarak ayarla. Kural dosyaları `.cursor/rules/` altında kalır, globs pattern'ları uyarlanır.

### Sorun: Aynı platformda hem modern hem legacy var

**Çözüm:** İki ayrı kural dosyası oluştur: `figma-web-modern.mdc` ve `figma-web-legacy.mdc`. Globs ile hangi dizinlerde hangi kuralların geçerli olduğunu ayır.

### Sorun: Platform-spesifik token isimleri Figma'yla eşleşmiyor

**Çözüm:** Cross-platform kuralında token eşleme tablosu oluştur. Her geliştirici kendi platformundaki karşılığı tabloda bulabilir.

## Evolution Triggers

- Bridge'e `create_design_system_rules` benzeri araç eklenirse şablon tabanlı üretim entegre edilmeli
- Yeni platform veya framework desteği eklenirse kural şablonları genişletilmeli
- Cursor/IDE kural formatı değişirse çıktı dosya yapısı uyarlanmalı
