---
name: implement-design
description: Figma tasarımlarını iOS (SwiftUI/UIKit), Android (Compose/XML) ve Web (React/Vue/legacy) platformlarına production-ready koda dönüştürür. Figma node ID paylaşıldığında, "implement design", "tasarımı kodla", "build this component", "bu ekranı implement et", "bu tasarımı kodla", "Figma'dan kod üret" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - uidev
---

# Implement Design (Multi-Platform)

## Overview

Bu skill, Figma tasarımlarını **iOS, Android ve Web** platformlarına pixel-perfect doğrulukla koda dönüştürür. Aynı Figma design system'i 3 farklı platformda implement eden ekipler için tasarlanmıştır.

**Önemli:** Tüm veriler plugin bridge (WebSocket) üzerinden alınır. MCP araçları platform-agnostik tasarım verisi sağlar; platform-spesifik kod dönüşümü (SwiftUI, Compose, CSS vb.) AI agent tarafından yapılır.

**Desteklenen platformlar ve çıktı formatları:**

| Platform | Modern | Legacy |
|----------|--------|--------|
| **iOS** | SwiftUI | UIKit (Storyboard/XIB, programmatic) |
| **Android** | Jetpack Compose | XML Layout + View system |
| **Web** | React + Tailwind/CSS Modules | jQuery, vanilla JS, Handlebars, legacy CSS |

REST API veya Figma access token gerekmez; tüm veriler plugin bridge üzerinden alınır.

## Prerequisites

- F-MCP Bridge plugin Figma'da çalışıyor ve bağlı olmalı
- Hedef platform belirlenmiş olmalı (iOS / Android / Web)
- Projenin platform-spesifik konvansiyonları bilinmeli

## F-MCP skill koordinasyonu

- **Önce:** **code-design-mapper** ve **design-token-pipeline** çıktıları varsa kullan; isteğe bağlı **ai-handoff-export**; tuvalde ham primitive’ler varsa **audit-figma-design-system** → **apply-figma-design-system** (veya tek bulgu için **fix-figma-design-system-finding**).
- **Sonra (tipik):** Kod üretildikten veya güncellendikten sonra **design-drift-detector** ile parity. Drift bulgusu Figma kaynaklıysa **fix-figma-design-system-finding** veya **apply-figma-design-system**; kod kaynaklıysa kodu düzeltip drift’i yeniden çalıştır.

## Required Workflow

**Bu adımları sırayla uygula. Adım atlama.**

### Step 1: Plugin Bağlantısını Doğrula

```
figma_get_status()
```

### Step 2: Hedef Platformu Belirle

Kullanıcıdan hedef platformu öğren. Birden fazla platform seçilebilir:

- **iOS** — SwiftUI mi UIKit mi? Minimum iOS versiyonu?
- **Android** — Compose mi XML mi? Minimum API level?
- **Web** — React/Vue/Svelte/Angular/vanilla? Tailwind/CSS Modules/Sass/legacy CSS?

Platform belirlenmemişse sor. "Tüm platformlar" denildiyse sırayla her platform için üret.

### Step 3: Node ID Belirle

Kullanıcı Figma URL paylaştıysa:

**URL formatı:** `https://figma.com/design/:fileKey/:fileName?node-id=1-2`

- `node-id=1-2` → `1:2` formatına çevir

Node ID verilmediyse dosya yapısını keşfet:

```
figma_get_file_data(depth=1, verbosity="summary")
```

### Step 4: Design Context Al (Chunked Metadata Stratejisi)

**Büyük ekranlar için parçalı okuma stratejisi uygula:**

1. **İlk çağrı — üst yapı:** `depth=1`, `verbosity="summary"` ile ekranın ana bölümlerini ve child ID'lerini al
2. **Bölüm bazlı detay:** Her ana bölümün ID'si ile ayrı `figma_get_design_context` çağrısı (`depth=2`, `verbosity="full"`)
3. **3 seviye sınırı:** Hiçbir çağrıda `depth` 3'ü geçmesin — timeout ve aşırı veri riski

```
figma_get_design_context(
  nodeId="<NODE_ID>",
  depth=1,
  verbosity="summary"
)
```

Sonra her child bölüm için:

```
figma_get_design_context(
  nodeId="<CHILD_NODE_ID>",
  depth=2,
  verbosity="full",
  includeLayout=true,
  includeVisual=true,
  includeTypography=true,
  includeCodeReady=true
)
```

`outputHint` parametresini platformla eşleştirme:
- Web projeleri: `outputHint="react"` veya `outputHint="tailwind"` — `layoutSummary` alanını kod-hazır formatta üretir
- iOS/Android: `outputHint` kullanma — `outputHint` yalnızca web formatlarını destekler (`react` ve `tailwind`). iOS/Android için ham layout/visual/typography verilerini al ve platform-native koda kendin çevir

Bu çağrı döner:
- Layout (Auto Layout → StackView/LinearLayout/Flexbox eşleşmesi için)
- Typography (font, size, weight → platform-spesifik font API'sine çevrilecek)
- Renkler (hex → UIColor/Color/SwiftUI Color, Android Color, CSS var)
- Component yapısı ve variant'lar
- roleHint / suiComponent

### Step 5: Screenshot Al

```
figma_capture_screenshot(nodeId="<NODE_ID>", format="PNG", scale=2)
```

### Step 6: Token ve Variable Verilerini Çek

```
figma_get_variables(verbosity="full")
```

```
figma_get_styles(verbosity="full")
```

`figma_get_variables` ham variable verisi döner: `name`, `resolvedType` (COLOR/FLOAT/STRING/BOOLEAN), `valuesByMode` (her mode için değer). Alias referansları `valuesByMode` içinde `type: "VARIABLE_ALIAS"` olarak gelir — bu durumda hedef variable'ın ID'si verilir, alias zincirini sen çözmelisin.

Bu verilerle:
- Variable'ların mode bazlı değerlerini oku (ör. Light mode: `#2563eb`, Dark mode: `#60a5fa`)
- Alias referanslarını takip ederek son değere ulaş
- Platform-spesifik token formatını belirle

### Step 7: Platform-Spesifik Implementasyon

#### iOS — SwiftUI

**Layout çevirisi:**
- Figma Auto Layout (vertical) → `VStack`
- Figma Auto Layout (horizontal) → `HStack`
- Figma Auto Layout (wrap) → `LazyVGrid` / `FlowLayout`
- Figma constraints → `.frame()` modifier'ları
- Figma padding → `.padding()` modifier'ları

**Renk çevirisi:**
- Figma hex → `Color(red:green:blue:)` veya Asset Catalog color
- Design token referansı → `Color("primaryColor")` (Asset Catalog'dan)
- Opacity → `.opacity()` modifier

**Typography çevirisi:**
- Figma font → `.font(.system(size:weight:))` veya custom font
- Line height → `.lineSpacing()`
- Letter spacing → `.tracking()`

**Component yapısı:**
```swift
struct ButtonComponent: View {
    let variant: ButtonVariant
    let size: ButtonSize
    let title: String

    var body: some View {
        Text(title)
            .font(size.font)
            .foregroundColor(variant.textColor)
            .padding(size.padding)
            .background(variant.backgroundColor)
            .cornerRadius(size.cornerRadius)
    }
}
```

#### iOS — UIKit (Legacy)

**Layout çevirisi:**
- Auto Layout → `NSLayoutConstraint` veya SnapKit
- Stack → `UIStackView`
- Padding → `layoutMargins` veya constraint insets

**Component yapısı:**
```swift
class ButtonView: UIView {
    private let titleLabel = UILabel()

    func configure(variant: ButtonVariant, size: ButtonSize) {
        titleLabel.font = size.uiFont
        titleLabel.textColor = variant.uiTextColor
        backgroundColor = variant.uiBackgroundColor
        layer.cornerRadius = size.cornerRadius
    }
}
```

#### Android — Jetpack Compose

**Layout çevirisi:**
- Figma Auto Layout (vertical) → `Column`
- Figma Auto Layout (horizontal) → `Row`
- Figma Auto Layout (wrap) → `FlowRow` / `LazyVerticalGrid`
- Figma padding → `Modifier.padding()`
- Figma constraints → `Modifier.fillMaxWidth()`, `.wrapContentHeight()`

**Renk çevirisi:**
- Figma hex → `Color(0xFF2563EB)` veya `MaterialTheme.colorScheme.primary`
- Design token → `AppTheme.colors.primary`

**Typography çevirisi:**
- Figma font → `TextStyle(fontSize = 14.sp, fontWeight = FontWeight.SemiBold)`
- Line height → `lineHeight = 20.sp`
- Letter spacing → `letterSpacing = 0.5.sp`

**Component yapısı:**
```kotlin
@Composable
fun ButtonComponent(
    variant: ButtonVariant,
    size: ButtonSize,
    title: String,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(
            containerColor = variant.backgroundColor
        ),
        shape = RoundedCornerShape(size.cornerRadius),
        contentPadding = size.contentPadding
    ) {
        Text(
            text = title,
            style = size.textStyle,
            color = variant.textColor
        )
    }
}
```

#### Android — XML Layout (Legacy)

**Layout çevirisi:**
- Auto Layout (vertical) → `LinearLayout android:orientation="vertical"` veya `ConstraintLayout`
- Auto Layout (horizontal) → `LinearLayout android:orientation="horizontal"`
- Padding → `android:padding`
- Spacing → `android:layout_marginTop` veya Space view

**Component yapısı:**
```xml
<com.google.android.material.button.MaterialButton
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="@string/button_text"
    android:textSize="@dimen/text_size_md"
    android:textColor="@color/button_text"
    android:backgroundTint="@color/button_bg"
    app:cornerRadius="@dimen/radius_md"
    android:paddingHorizontal="@dimen/space_lg"
    android:paddingVertical="@dimen/space_md" />
```

#### Web — Modern (React/Vue/Svelte)

- Figma MCP çıktısı genellikle React + Tailwind formatında gelir
- Projenin framework'üne çevir
- Mevcut component library'yi kullan
- Design token'ları CSS variables veya Tailwind config'den referans al

#### Web — Legacy

**Legacy altyapılarda:**
- jQuery plugin pattern'ı veya vanilla JS class'ı kullan
- Handlebars/EJS/Pug template'lerine çevir
- Legacy CSS (float-based layout, flexbox polyfill'ler)
- Bootstrap 3/4 grid system'ine uyarla
- IE11 / eski browser desteği için fallback'ler ekle

### Step 7b: Asset İndirme

Bileşende SVG/PNG asset gerekiyorsa:

```
figma_get_component_image(nodeId="<COMPONENT_ID>", format="SVG")
```

veya

```
figma_get_component_image(nodeId="<COMPONENT_ID>", format="PNG", scale=2)
```

İndirilen asset'leri platform dizinine yerleştir:
- **iOS:** `Assets.xcassets/` (1x, 2x, 3x)
- **Android:** `res/drawable-*dpi/`
- **Web:** `public/assets/` veya `src/assets/`

### Step 7c: Screenshot ile Görsel Doğrulama

Her platform çıktısı sonrası Figma screenshot'ı ile karşılaştır:

```
figma_capture_screenshot(nodeId="<NODE_ID>", format="PNG", scale=2)
```

Üretilen kodu çalıştırıp ekran görüntüsünü al ve Figma screenshot'ı ile karşılaştır. Farklar varsa düzelt.

### Step 8: Design Parity Kontrolü

**Önemli sınırlama:** `figma_check_design_parity` yalnızca **token değerlerini** karşılaştırır (variables + styles). Belirli bir component'in layout, spacing veya typography'sini kontrol etmez. Component-level doğrulama için screenshot karşılaştırması kullan.

**Önemli:** `codeTokens` içindeki token isimleri Figma'daki variable isimleriyle **tam eşleşmeli**. Figma'da `color/primary` ise, `codeTokens`'ta da `color/primary` kullan, `primary` veya `--color-primary` değil.

```
figma_check_design_parity(
  codeTokens='{"color/primary": "#2563eb", "spacing/md": 16}'
)
```

### Step 9: Platform-Spesifik Doğrulama Kontrol Listesi

**Tüm platformlar:**
- [ ] Layout eşleşiyor (spacing, alignment, sizing)
- [ ] Typography eşleşiyor (font, size, weight, line height)
- [ ] Renkler tam eşleşiyor
- [ ] Token'lar hardcoded değil, design system referansları kullanılıyor

**iOS ek kontroller:**
- [ ] Dynamic Type desteği (accessibility font scaling)
- [ ] Dark Mode desteği (UITraitCollection / @Environment colorScheme)
- [ ] Safe area inset'leri doğru uygulanmış
- [ ] VoiceOver erişilebilirliği

**Android ek kontroller:**
- [ ] Material Design 3 uyumu
- [ ] Dark Theme desteği (night qualifier veya isSystemInDarkTheme)
- [ ] Farklı ekran yoğunlukları (dp/sp birimleri doğru)
- [ ] TalkBack erişilebilirliği
- [ ] Minimum API level uyumu

**Web ek kontroller:**
- [ ] Responsive davranış
- [ ] WCAG AA erişilebilirlik
- [ ] Legacy browser desteği (gerekiyorsa)
- [ ] RTL (sağdan-sola) desteği (gerekiyorsa)

## Cross-Platform Tutarlılık

Aynı component'i birden fazla platformda implement ederken:

1. **Tek Figma kaynağı** — Tüm platformlar aynı Figma node'dan beslenir
2. **Aynı token değerleri** — Renkler, spacing, radius her platformda aynı sayısal değeri kullanmalı
3. **Platform-native davranış** — Görünüm aynı olmalı ama interaction pattern'ları platforma özgü olmalı (ör. iOS haptic feedback, Android ripple effect, Web hover state)
4. **Naming tutarlılığı** — Token isimleri platformlar arası eşleşmeli:
   - Figma: `color/primary/500`
   - iOS: `Color.primary500` veya `Asset Catalog: primary-500`
   - Android: `@color/primary_500` veya `AppColors.Primary500`
   - Web: `--color-primary-500` veya `colors.primary.500`

## Examples

### Örnek 1: Button — 3 Platform

Kullanıcı: "Bu butonu iOS, Android ve Web için implement et, nodeId: 42:15"

**Akış:**

1. `figma_get_status()` → bağlı
2. `figma_get_design_context(nodeId="42:15", ...)` → Button, variant: primary/secondary, padding: 16x24, radius: 8, font: Inter 14/600
3. `figma_capture_screenshot(nodeId="42:15")`
4. `figma_get_variables(verbosity="full")` → primary=#2563eb, radius-md=8
5. Sırayla 3 platform çıktısı üret:
   - **iOS (SwiftUI):** `ButtonComponent.swift` — `Color("primary")`, `.cornerRadius(8)`, `.font(.system(size: 14, weight: .semibold))`
   - **Android (Compose):** `ButtonComponent.kt` — `Color(0xFF2563EB)`, `RoundedCornerShape(8.dp)`, `fontSize = 14.sp`
   - **Web (React):** `Button.tsx` — `var(--color-primary)`, `border-radius: 8px`, `font-size: 14px`
6. `figma_check_design_parity(...)` → doğrulama

### Örnek 2: Legacy Web Desteğiyle Ekran

Kullanıcı: "Bu login ekranını Bootstrap 4 ile implement et, nodeId: 10:5"

**Akış:**

1. Design context + screenshot al
2. Auto Layout → Bootstrap grid (`row`, `col-md-6`)
3. Figma spacing → Bootstrap spacing utilities (`p-3`, `mt-4`)
4. Figma renkler → Bootstrap variables veya custom CSS
5. jQuery form validation pattern'ı kullan
6. IE11 flexbox fallback'leri ekle

## Common Issues and Solutions

### Sorun: Auto Layout → platform-native layout eşleşmiyor

**Çözüm:** Auto Layout'un axis, spacing, padding değerlerini al; her platform için native eşdeğerini kullan. Web'de `outputHint="react"` kullandıysan `layoutSummary` alanını referans al. iOS/Android'de `includeLayout=true` ile gelen raw layout verisinden `layoutMode`, `itemSpacing`, `paddingLeft/Right/Top/Bottom` alanlarını oku.

### Sorun: Büyük dosyada design context çok büyük

**Çözüm:** `depth=1` kullan, child node ID'lerini belirle, her birini ayrı `figma_get_design_context` çağrısıyla çek. `verbosity="summary"` ile başlayıp detay gerektikçe `"full"` kullan.

### Sorun: `figma_search_components` timeout veriyor

**Çözüm:** Varsayılan `currentPageOnly=true`; büyük dosyalarda `currentPageOnly=false` timeout'a neden olabilir. Önce `currentPageOnly=true` ile dene; sonuç yoksa dikkatli şekilde `false` kullan.

### Sorun: Font Figma'da custom, platformda yok

**Çözüm:** Custom font'u platforma ekle (iOS: Info.plist + bundle, Android: res/font, Web: @font-face). Font yoksa en yakın system font'u öner ve kullanıcıya bildir.

### Sorun: Platform-spesifik component karşılığı yok

**Çözüm:** Figma component'i platform-native parçalara böl. Örneğin Figma'da tek bir "SegmentedControl", iOS'ta `Picker`, Android'de `TabLayout`, Web'de custom component olabilir.

### Sorun: Legacy altyapıda modern Figma tasarımı implement edilemiyor

**Çözüm:** Progressive enhancement uygula. Temel görünüm legacy CSS ile, gelişmiş özellikler (animasyon, blur, gradient) modern browser'lar için ekle.

## Evolution Triggers

- Bridge'e yeni design context parametreleri eklendiğinde Step 4 güncellenmeli
- `figma_get_component_image` formatları genişletilirse asset indirme adımı güncellenmeli
- Yeni platform desteği (Flutter, .NET MAUI, Kotlin Multiplatform) eklenirse platform çevirme bölümleri genişletilmeli
- `outputHint` iOS/Android desteği eklenir eklenirse ilgili not kaldırılmalı
