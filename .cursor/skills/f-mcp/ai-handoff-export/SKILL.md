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

### Step 7: Handoff dosyalarını üret

1. `HANDOFF_TEMPLATE.md` içini doldur.
2. `docs/handoff.manifest.schema.json` uyumlu `handoff.manifest.json` çıktısı oluştur.

### Step 8: Platform Hedefi Belirle

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

### Step 9: Self-healing sonucunu işle

- İterasyon sayısını kaydet (`0-3`).
- Açık kalan sapmaları `openIssues` alanına yaz.
- Çözülemeyen fark varsa `manualReviewNeeded=true`.

### Step 10: Executive Summary (PO/PM Modu)

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

## Handoff Prensipleri

Her handoff paketi bu 4 prensibe uygun olmalıdır:

1. **Varsayma, belirt** — Belirtilmeyen her şeyi geliştirici tahmin eder. Padding, radius, renk, davranış, hepsi açıkça yazılmalı.
2. **Token kullan, değer değil** — `spacing-md` yaz, `16px` yazma. `color/primary` yaz, `#2563eb` yazma. Token ismi hem niyeti hem değeri taşır.
3. **Tüm durumları göster** — Default, hover, active/pressed, disabled, loading, error, empty, focus. Gösterilmeyen durum "yok" demek değil, "bilinmiyor" demek.
4. **Neden'i açıkla** — "Mobilde daraltılır" yerine "Mobilde daraltılır çünkü tek elle kullanım senaryosunda ekran alanı kısıtlı." Bağlam, geliştiricinin kenar durumlarında doğru karar vermesini sağlar.

## Etkileşim Spesifikasyonları

Step 5 (Code-Only Props) ile Step 6 (Screenshot) arasında üretilecek ek bölüm (Step 5.5):

### Davranış Detayları

| Öğe | Tıklama/Tap | Hover | Transition | Gesture |
|-----|------------|-------|------------|---------|
| CTA Buton | navigate("/dashboard") | scale(1.02), shadow-lg | 200ms ease-out | — |
| Kart | navigate("/detail/:id") | border highlight | 150ms ease-in-out | swipe-left: sil |
| Input | focus + keyboard | border-color change | 100ms | — |
| Modal | — | — | enter: 300ms ease-out, exit: 200ms ease-in | swipe-down: kapat |

### Animasyon Spesifikasyonları

- **Giriş animasyonları:** fade-in + slide-up (stagger delay: 50ms per item)
- **Çıkış animasyonları:** fade-out (150ms)
- **Mikro etkileşimler:** buton press scale(0.97), toggle spring(damping: 15)
- **Sayfa geçişleri:** push (iOS), shared-element (Android), fade (Web)

## İçerik Spesifikasyonları

Step 5 (Code-Only Props) çıktısına ek olarak:

| Alan | Max Karakter | Truncation | Boş Durum | Yükleme Durumu |
|------|-------------|-----------|-----------|---------------|
| Sayfa başlığı | 60 | ellipsis | — | skeleton (200×24) |
| Açıklama metni | 120 | 2 satır + "devamı" | "Henüz açıklama yok" | skeleton (full-width×16 ×2) |
| CTA butonu | 24 | — | — | spinner |
| Kullanıcı adı | 30 | ellipsis | "Anonim" | skeleton (120×16) |
| Avatar | — | — | initials fallback | pulse circle |

> **Copy kuralları** için bkz. [ux-copy-guidance](../ux-copy-guidance/SKILL.md) — hata mesajı formülü, boş durum kalıbı, CTA prensipleri

## Uç Durumlar

Step 8 (Self-healing) sonrasında değerlendirilecek:

| Uç Durum | Tasarım Davranışı | Not |
|----------|------------------|-----|
| Min içerik (başlık 3 kelime) | Normal görünüm | Kart yüksekliği auto |
| Max içerik (başlık 30 kelime) | Truncation: 2 satır + ellipsis | Tooltip ile tam metin |
| Uluslararası metin (Almanca %30 uzun) | Truncation tetiklenir | i18n testinde en uzun locale kontrol |
| RTL dil (Arapça) | Mirror layout | İkonlar ters, sayılar LTR kalır |
| Yavaş bağlantı / offline | Skeleton → timeout mesajı (10sn) | "Bağlantı kurulamadı. Tekrar deneyin." |
| Eksik veri (null avatar) | Initials fallback → generic ikon | İsim de yoksa "?" ikonu |
| Eksik veri (isim yok) | "Anonim Kullanıcı" placeholder | Backend default ile uyumlu olmalı |

## Erişilebilirlik Spesifikasyonları

Handoff paketine a11y bilgisi eklenir. Detaylı denetim için bkz. [figma-a11y-audit](../figma-a11y-audit/SKILL.md).

| Öğe | Fokus Sırası | ARIA Label/Role | Klavye Etkileşimi |
|-----|-------------|----------------|-------------------|
| Ana başlık | — (heading, fokuslanmaz) | role="heading" level=1 | — |
| E-posta input | 1 | label="E-posta adresi" | Tab: giriş, Enter: submit |
| Şifre input | 2 | label="Şifre" | Tab: giriş, Enter: submit |
| Giriş butonu | 3 | role="button" label="Giriş yap" | Enter/Space: tetikle |
| Google butonu | 4 | role="button" label="Google ile giriş" | Enter/Space: tetikle |

**Ekran okuyucu duyuruları:**
- Form submit sonrası: `aria-live="assertive"` — "Giriş başarılı" veya "Hatalı e-posta adresi"
- Loading durumunda: `aria-busy="true"` — "Yükleniyor"
- Modal açıldığında: fokus modal'a taşınır, `aria-modal="true"`

## Marka Profili Entegrasyonu

`.fmcp-brand-profile.json` varsa handoff paketine otomatik eklenir:
- `voiceTone` → İçerik spesifikasyonlarında ton referansı
- `copyRules` → CTA max karakter, kaçınılacak/tercih edilecek kelimeler
- `i18n` → Uç durumlar bölümünde desteklenen diller ve en uzun locale

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
