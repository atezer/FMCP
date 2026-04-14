---
name: code-design-mapper
description: Figma tasarım bileşenlerini iOS, Android ve Web platformlarındaki kod bileşenlerine eşler. Bir Figma component'i birden fazla platform implementasyonuyla eşleşebilir. Enterprise plan gerektirmez, lokal çalışır. "code connect", "connect component", "map component", "bileşen eşle", "component mapping", "hangi kod bu bileşene karşılık geliyor", "bileşen eşleme tablosu" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - uidev
    - designops
required_inputs:
  - name: direction
    type: enum
    options:
      - "Figma → Kod (tek component kodla)"
      - "Kod → Figma (mevcut koddan Figma component üret)"
      - "Bi-directional mapping (mapping tablosu)"
    question: "Hangi yönde eşleştirme?"
    required: true
  - name: figma_component_id
    type: string
    question: "Hangi Figma component? (node ID veya component key)"
    required: false
    skip_if: "direction == 'Kod → Figma (mevcut koddan Figma component üret)'"
  - name: code_component_path
    type: string
    question: "Kod tarafındaki component path nedir? (örn: ./src/components/Button.tsx)"
    required: false
  - name: platform
    type: enum
    options:
      - "iOS (SwiftUI)"
      - "Android (Compose)"
      - "Web (React)"
      - "Web (Vue)"
      - "Multi-platform (hepsi)"
    question: "Hangi platform?"
    required: true
  - name: mapping_output
    type: enum
    options:
      - "JSON mapping file"
      - "Markdown tablo"
      - "Code Connect format"
    question: "Mapping çıktısı nasıl istersen?"
    required: false
    default: "Markdown tablo"
---

# Code-Design Mapper (Multi-Platform)

## Overview

Bu skill, Figma tasarım bileşenlerini **iOS, Android ve Web** platformlarındaki kod karşılıklarına eşler. Tek bir Figma component'i 3 farklı platform implementasyonuyla eşleşebilir.

Figma resmi Code Connect'ten farkları:
- Enterprise plan gerektirmez
- Published component zorunluluğu yok
- **Multi-platform mapping**: 1 Figma component → N platform implementasyonu
- Her platformun implementasyon durumu ayrı izlenir
- Platformlar arası tutarlılık kontrolü

REST API veya Figma access token gerekmez.

## Code Connect Uyarlama Notu

Resmi Figma MCP'de Code Connect akışı `get_code_connect_suggestions` ve `send_code_connect_mappings` araçlarıyla çalışır. **F-MCP Bridge'de bu araçlar kayıtlı değildir** (FUTURE.md'de planlı).

F-MCP ile eşdeğer iş akışı:

| Resmi Code Connect adımı | F-MCP Bridge karşılığı |
|---|---|
| Resmi: code connect suggestions | `figma_search_components` + `figma_get_component` + `figma_get_component_for_development` |
| Bileşen–kod eşleme | AI ile `.figma-mappings.json` üretimi (bu skill'in ana akışı) |
| Resmi: send code connect mappings | **yok** — eşleme dosyası repoda kalır, Figma'ya gönderilmez |

**Resmi Code Connect `.figma.js` şablonları gerekiyorsa:** Kullanıcıya resmi Figma MCP sunucusunu etkinleştirmesi ve [topluluk figma-code-connect skill'ini](https://github.com/figma/mcp-server-guide/blob/main/skills/figma-code-connect/SKILL.md) kullanması önerilir.

**Bridge'e Code Connect araçları eklendiğinde** bu bölüm ve iş akışı güncellenmeli.

## Prerequisites

- F-MCP Bridge plugin Figma'da çalışıyor ve bağlı olmalı
- En az bir platformda component implementasyonu mevcut olmalı
- Platform proje dizinleri biliniyor olmalı

## F-MCP skill koordinasyonu

- **Önce:** Stabil kütüphane instance’ları için isteğe bağlı **apply-figma-design-system** veya **audit-figma-design-system**.
- **Sonra:** `.figma-mappings.json` ile **design-drift-detector** ve **implement-design**; manifest için **ai-handoff-export**.

## Required Workflow

**Bu adımları sırayla uygula. Adım atlama.**

### Step 1: Plugin Bağlantısını Doğrula

```
figma_get_status()
```

### Step 2: Platform Projelerini Belirle

Kullanıcıdan veya codebase'den platform proje köklerini belirle:

```
Hangi platformlarda çalışıyorsunuz ve proje dizinleri nerede?

- iOS:     ör. ios-app/ veya MyApp.xcodeproj/
- Android: ör. android-app/ veya app/src/main/
- Web:     ör. web-app/ veya src/
```

Her platform için component dizinlerini tespit et:

| Platform | Yaygın Component Dizinleri |
|----------|---------------------------|
| **iOS (SwiftUI)** | `Sources/Components/`, `Views/`, `UI/` |
| **iOS (UIKit)** | `Views/`, `UI/Components/`, `Cells/` |
| **Android (Compose)** | `ui/components/`, `presentation/components/` |
| **Android (XML)** | `res/layout/`, `res/values/styles.xml` |
| **Web (React)** | `src/components/`, `components/ui/` |
| **Web (Vue)** | `src/components/`, `views/` |
| **Web (Legacy)** | `templates/`, `partials/`, `public/js/` |

### Step 3: Figma Component'lerini Keşfet

Belirli component:

```
figma_get_component(nodeId="<NODE_ID>")
```

Tüm component'ler (aktif sayfa):

```
figma_search_components(query="", currentPageOnly=true, limit=50)
```

**Uyarı:** `currentPageOnly=false` büyük dosyalarda timeout'a neden olabilir. Önce `currentPageOnly=true` (varsayılan) ile dene. Component başka sayfadaysa dikkatli şekilde `false` kullan.

### Step 4: Component Detaylarını Çek

```
figma_get_component_for_development(nodeId="<NODE_ID>", scale=2, format="PNG")
```

Bu tek çağrıda hem metadata hem base64 screenshot döner. Ancak base64 screenshot context'i şişirir — çok fazla component taranacaksa önce `figma_get_component(nodeId="...")` (sadece metadata) kullan, screenshot'ı sadece eşleşme onayı için al.

Her component için Figma'daki bilgiler:
- Component adı ve yolu
- Variant özellikleri (variant props ve değerleri)
- Child yapısı
- Görsel referans (base64 screenshot — context ağır)

### Step 5: Her Platformda Eşleşme Ara

Her Figma component'i için, **her platformda ayrı ayrı** eşleşme ara:

**iOS arama:**
- `.swift` dosyalarında `struct ComponentName: View` (SwiftUI)
- `.swift` dosyalarında `class ComponentName: UIView` (UIKit)
- `.xib` / `.storyboard` dosyalarında custom class referansları

**Android arama:**
- `.kt` dosyalarında `@Composable fun ComponentName` (Compose)
- `res/layout/` altında `component_name.xml` (XML)
- Custom View class'ları

**Web arama:**
- `.tsx`/`.jsx` dosyalarında `export function ComponentName` veya `export const ComponentName`
- `.vue` dosyalarında `<script>` içinde component tanımı
- `.html`/`.hbs` dosyalarında template/partial

### Step 6: Eşleşmeleri Kullanıcıya Sun

**Multi-platform sunum formatı:**

```
Figma Component: Button (42:15)
Variant'lar: primary | secondary | ghost × sm | md | lg

Platform Eşleşmeleri:
┌──────────┬────────────────────────────────────┬──────────┐
│ Platform │ Kod Dosyası                        │ Durum    │
├──────────┼────────────────────────────────────┼──────────┤
│ iOS      │ Sources/UI/ButtonComponent.swift   │ Eşleşti  │
│ Android  │ ui/components/ButtonComponent.kt   │ Eşleşti  │
│ Web      │ src/components/Button.tsx           │ Eşleşti  │
└──────────┴────────────────────────────────────┴──────────┘

Figma Component: Avatar (42:30)
┌──────────┬────────────────────────────────────┬──────────────┐
│ Platform │ Kod Dosyası                        │ Durum        │
├──────────┼────────────────────────────────────┼──────────────┤
│ iOS      │ Sources/UI/AvatarView.swift        │ Eşleşti      │
│ Android  │ —                                  │ Eksik        │
│ Web      │ src/components/Avatar.tsx           │ Eşleşti      │
└──────────┴────────────────────────────────────┴──────────────┘

Bu eşleşmeleri kaydetmek ister misiniz?
```

### Step 7: Multi-Platform Mapping Dosyasını Oluştur/Güncelle

**Önemli:** `.figma-mappings.json` dosyası AI agent tarafından oluşturulur ve yönetilir. Hiçbir MCP aracı bu dosyayı okumaz veya yazmaz — tamamen agent-tarafı bir artifact'tir.

Proje kökünde `.figma-mappings.json` dosyası:

```json
{
  "version": "2.0",
  "lastUpdated": "2026-03-12T10:30:00Z",
  "figmaFile": "Design System",
  "platforms": {
    "ios": {
      "rootDir": "ios-app/",
      "framework": "SwiftUI",
      "language": "Swift",
      "componentDirs": ["Sources/UI/", "Sources/Components/"]
    },
    "android": {
      "rootDir": "android-app/",
      "framework": "Compose",
      "language": "Kotlin",
      "componentDirs": ["app/src/main/java/com/app/ui/components/"]
    },
    "web": {
      "rootDir": "web-app/",
      "framework": "React",
      "language": "TypeScript",
      "componentDirs": ["src/components/", "src/ui/"]
    }
  },
  "components": [
    {
      "figmaNodeId": "42:15",
      "figmaName": "Button",
      "figmaPath": "Components/Button",
      "variants": {
        "variant": ["primary", "secondary", "ghost"],
        "size": ["sm", "md", "lg"]
      },
      "implementations": {
        "ios": {
          "codePath": "ios-app/Sources/UI/ButtonComponent.swift",
          "componentName": "ButtonComponent",
          "propMapping": {
            "variant": { "codeProp": "style", "codeType": "ButtonStyle" },
            "size": { "codeProp": "size", "codeType": "ButtonSize" }
          },
          "status": "synced",
          "lastSync": "2026-03-12T10:30:00Z"
        },
        "android": {
          "codePath": "android-app/app/src/main/java/com/app/ui/components/ButtonComponent.kt",
          "componentName": "ButtonComponent",
          "propMapping": {
            "variant": { "codeProp": "variant", "codeType": "ButtonVariant" },
            "size": { "codeProp": "size", "codeType": "ButtonSize" }
          },
          "status": "synced",
          "lastSync": "2026-03-12T10:30:00Z"
        },
        "web": {
          "codePath": "web-app/src/components/Button.tsx",
          "componentName": "Button",
          "propMapping": {
            "variant": { "codeProp": "variant", "codeType": "string" },
            "size": { "codeProp": "size", "codeType": "string" }
          },
          "status": "synced",
          "lastSync": "2026-03-12T10:30:00Z"
        }
      }
    },
    {
      "figmaNodeId": "42:30",
      "figmaName": "Avatar",
      "figmaPath": "Components/Avatar",
      "variants": {
        "size": ["xs", "sm", "md", "lg", "xl"]
      },
      "implementations": {
        "ios": {
          "codePath": "ios-app/Sources/UI/AvatarView.swift",
          "componentName": "AvatarView",
          "status": "synced",
          "lastSync": "2026-03-12T10:30:00Z"
        },
        "android": null,
        "web": {
          "codePath": "web-app/src/components/Avatar.tsx",
          "componentName": "Avatar",
          "status": "outdated",
          "lastSync": "2026-02-15T14:00:00Z"
        }
      }
    }
  ],
  "coverageSummary": {
    "totalComponents": 25,
    "ios": { "implemented": 20, "missing": 5, "outdated": 2 },
    "android": { "implemented": 18, "missing": 7, "outdated": 1 },
    "web": { "implemented": 22, "missing": 3, "outdated": 3 }
  }
}
```

### Step 8: Platform Coverage Raporu Oluştur

Mapping tamamlandıktan sonra coverage raporu sun:

```
Design System Platform Coverage Raporu
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Toplam Figma Component: 25

        iOS     Android   Web
Impl.   20/25   18/25     22/25
%       80%     72%       88%
Güncel  18/20   17/18     19/22
Eksik   5       7         3

Eksik Component'ler:
  Android: Avatar, Tooltip, Breadcrumb, Stepper, DatePicker
  iOS:     Breadcrumb, DataTable, Pagination, RichText, CodeBlock
  Web:     Stepper, DatePicker, BottomSheet
```

## Mevcut Mapping'leri Güncelleme

"Mapping'leri güncelle" veya "sync" dendiğinde:

1. `.figma-mappings.json` oku
2. Her component + her platform için güncel durumu kontrol et
3. Figma'da variant değişikliği varsa → `status: "outdated"`
4. Kodda component silinmişse → `status: "missing"`
5. Coverage summary'yi güncelle

## Eksik Platform Implementasyonu Başlatma

Coverage raporunda eksik görünen component'i implement etmek için:

1. Mapping'den eksik platformu ve Figma nodeId'yi belirle
2. `figma_get_component_for_development(nodeId="...")` ile Figma verisini al
3. **implement-design** skill'ini hedef platform belirterek kullan
4. Oluşturulan implementasyonu mapping'e ekle

## Examples

### Örnek 1: Tekli Component — 3 Platform Eşleme

Kullanıcı: "Button component'ini tüm platformlarda eşle, nodeId: 42:15"

**Akış:**

1. `figma_get_status()` → bağlı
2. `figma_get_component_for_development(nodeId="42:15")` → Button, variants
3. iOS'ta ara → `ButtonComponent.swift` bulundu
4. Android'de ara → `ButtonComponent.kt` bulundu
5. Web'de ara → `Button.tsx` bulundu
6. 3 platform eşleşmesini sun
7. Kullanıcı onayladı → `.figma-mappings.json`'a kaydet

### Örnek 2: Platform Eksikleri Tespiti

Kullanıcı: "Tüm component'leri tara, hangi platformlarda eksik göster"

**Akış:**

1. `figma_search_components(query="", currentPageOnly=false)` → 25 component
2. Her component için 3 platformda ara
3. Coverage raporu oluştur
4. Kullanıcıya öncelik öner: "Android'de 7 component eksik, en kritikleri: Avatar, Tooltip"

### Örnek 3: Sadece Bir Platform İçin Eşleme

Kullanıcı: "Android Compose component'lerini Figma ile eşle"

**Akış:**

1. Sadece Android component dizinlerini tara
2. Figma component'leriyle eşleştir
3. Sadece Android sütununu güncelle, diğer platformları koru

## Common Issues and Solutions

### Sorun: Platform projesi farklı repo'da

**Çözüm:** `platforms.ios.rootDir` alanını absolute path veya relative path olarak ayarla. Farklı repo'lar için workspace root'a göre path ver.

### Sorun: Aynı Figma component'i platformlarda farklı isimle

**Çözüm:** Her platform implementasyonunun `componentName` alanı bağımsızdır. Figma'da "SegmentedControl" → iOS'ta "Picker", Android'de "TabRow", Web'de "SegmentedControl" olabilir.

### Sorun: Platform-spesifik component (ör. BottomSheet sadece mobile)

**Çözüm:** Web implementasyonu `null` olarak bırak, coverage raporunda "N/A" göster. Platform-specific component'leri mapping'de işaretle.

### Sorun: Legacy ve modern aynı platformda

**Çözüm:** `platforms` altında ayrı entry ekle: `"web-legacy": { "framework": "jQuery", ... }`. Bir Figma component'in hem modern hem legacy web karşılığı olabilir.

## Evolution Triggers

- Bridge'e Code Connect araçları (suggestions / send mappings) eklenirse Code Connect uyarlama bölümü ve iş akışı güncellenmeli
- Yeni platform desteği (Flutter, .NET MAUI) eklenirse platform profilleri genişletilmeli
- `.figma-mappings.json` şeması değişirse çıktı formatı uyarlanmalı
