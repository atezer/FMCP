# Login / Mobile — Geliştirici Handoff

**Figma Dosya:** Untitled (v1rHyWUKGLrlYcAOQmUDX9)
**Ekran:** Login / Mobile (node: 5:112)
**Boyut:** 390x846px (iPhone 14)
**Tarih:** 2026-04-04
**Oluşturan:** FMCP (F-MCP ATezer Bridge) + Claude Code

---

## 1. Genel Bakış

Mobil login ekranı. Kullanıcı e-posta ve şifre ile giriş yapar veya Google ile sosyal giriş kullanır. Tüm renkler semantic design token'lara bağlı, tüm elemanlar auto-layout ile responsive.

## 2. Ekran Yapısı

```
Login / Mobile (390x846, VERTICAL, padding 24/80)
  |-- Logo Area (VERTICAL, gap 8, center)
  |     |-- Logo (Ellipse 64x64, fill: button/primary/bg)
  |     |-- "MyApp" (Inter Bold 24px, fill: button/primary/bg)
  |
  |-- [spacer 32px]
  |
  |-- Headings (VERTICAL, gap 8, center)
  |     |-- "Hoş Geldiniz" (Inter Semi Bold 24px, fill: surface/foreground) — H1
  |     |-- "Hesabınıza giriş yapın" (Inter Regular 16px, fill: input/placeholder) — H2
  |
  |-- [spacer 24px]
  |
  |-- Form (VERTICAL, gap 16 = layout/section-gap)
  |     |-- Input / E-posta (HORIZONTAL, 342x48, fill: input/bg, stroke: input/border)
  |     |     |-- "E-posta adresi" (Inter Regular 14px, fill: input/placeholder)
  |     |-- Input / Şifre (HORIZONTAL, 342x48, fill: input/bg, stroke: input/border)
  |     |     |-- "Şifre" (Inter Regular 14px, fill: input/placeholder)
  |     |-- Button [Primary] "Giriş Yap" (FILL width, 44px min height)
  |     |-- "Şifremi unuttum" (Inter Medium 14px, fill: button/primary/bg) — link
  |
  |-- [spacer 24px]
  |
  |-- Divider (HORIZONTAL, gap 16, center)
  |     |-- Line Left (FILL, 1px, fill: surface/border)
  |     |-- "veya" (Inter Regular 14px, fill: input/placeholder)
  |     |-- Line Right (FILL, 1px, fill: surface/border)
  |
  |-- [spacer 24px]
  |
  |-- Button [Secondary] "Google ile Giriş Yap" (FILL width, 44px min height)
  |
  |-- [spacer 16px]
  |
  |-- Register Link (HORIZONTAL, gap 4, center)
        |-- "Hesabınız yok mu?" (Inter Regular 14px, fill: input/placeholder)
        |-- "Kayıt Ol" (Inter Semi Bold 14px, fill: button/primary/bg) — link
```

## 3. Token Referansları

### Renkler (Semantic → Primitive)

| Kullanım | Semantic Token | Primitive Alias | Hex |
|----------|---------------|----------------|-----|
| Ekran arka planı | surface/background | color/white | #FFFFFF |
| Ana metin | surface/foreground | color/gray/900 | #111827 |
| Placeholder / ikincil metin | input/placeholder | color/gray/500 | #6B7280 |
| Link / vurgu rengi | button/primary/bg | color/blue/600 | #2563EB |
| Input arka planı | input/bg | color/white | #FFFFFF |
| Input kenarlığı | input/border | color/gray/300 | #D1D5DB |
| Primary buton arka plan | button/primary/bg | color/blue/600 | #2563EB |
| Primary buton metin | button/primary/text | color/white | #FFFFFF |
| Secondary buton arka plan | button/secondary/bg | color/gray/100 | #F3F4F6 |
| Secondary buton metin | button/secondary/text | color/gray/900 | #111827 |
| Divider çizgisi | surface/border | color/gray/200 | #E5E7EB |

### Layout (Semantic → Primitive)

| Kullanım | Semantic Token | Primitive Alias | Deger |
|----------|---------------|----------------|-------|
| Sayfa padding | layout/page-padding | spacing/xl | 24px |
| Bölüm arası boşluk | layout/section-gap | spacing/lg | 16px |
| Eleman arası boşluk | layout/element-gap | spacing/sm | 8px |
| Buton padding-x | button/padding-x | spacing/lg | 16px |
| Buton padding-y | button/padding-y | spacing/md | 12px |
| Buton radius | button/radius | radius/md | 8px |
| Input padding | input/padding-x | spacing/md | 12px |
| Input radius | input/radius | radius/md | 8px |
| Buton min yükseklik | button/minHeight | size/touch-min-ios | 44px |
| Input min yükseklik | input/minHeight | size/touch-min-android | 48px |

## 4. Bileşen Listesi

| Bileşen | Variant | Figma Node | Kullanım |
|---------|---------|-----------|----------|
| Button | Primary | 5:99 | "Giriş Yap" — ana CTA |
| Button | Secondary | 5:101 | "Google ile Giriş Yap" — alternatif giriş |
| Input | E-posta | 5:126 | E-posta adresi girişi |
| Input | Şifre | 5:128 | Şifre girişi |

## 5. Erişebilirlik Notları

### Kontrast (WCAG AA)
- Primary buton (white/blue600): 5.17:1 — **PASS**
- Secondary buton (gray900/gray100): 16.13:1 — **PASS**
- Başlık (gray900/white): 17.74:1 — **PASS (AAA)**
- Placeholder (gray500/white): 4.83:1 — **PASS**

### Touch Target
- Tüm butonlar: >= 44px (iOS HIG) — **PASS**
- Tüm inputlar: >= 48px (Android Material) — **PASS**

### Başlık Hiyerarşisi
- H1: "Hoş Geldiniz" (24px, Semi Bold)
- H2: "Hesabınıza giriş yapın" (16px, Regular)

### Odak Sırası
1. Hoş Geldiniz (başlık)
2. E-posta input
3. Şifre input
4. Giriş Yap butonu
5. Şifremi unuttum link
6. Google ile Giriş Yap butonu
7. Kayıt Ol link

### Form İlişkilendirme
- E-posta: `<label>` + `type="email"` + `autocomplete="email"` + `required`
- Şifre: `<label>` + `type="password"` + `autocomplete="current-password"` + `required`

### Görsel Alt Text
- Logo: `alt="MyApp logosu"`
- Divider çizgileri: `role="presentation"` (dekoratif)

## 6. Platform Token Dosyaları

| Platform | Dosya | Konum |
|----------|-------|-------|
| Web (CSS) | tokens.css | test-output/ |
| Web (Tailwind) | tailwind.tokens.js | test-output/ |
| iOS (Swift) | DesignTokens.swift | test-output/ |
| Android (Kotlin) | DesignTokens.kt | test-output/ |
| Cross-platform (JSON) | tokens.json | test-output/ |

## 7. Uygulama Notları

- Tüm renkler semantic token üzerinden kullanılmalı (primitive direkt kullanılmamalı)
- Input focus durumunda border: `input/border-focus` (color/blue/500 = #3B82F6)
- Disabled buton durumunda kontrast WCAG muafı (WCAG 1.4.3)
- Responsive: Tüm elemanlar FILL genişlik, ekran genişliği değiştiğinde uyum sağlar
- Font: Inter ailesi (Regular, Medium, Semi Bold, Bold)

---

*Bu handoff FMCP (F-MCP ATezer Bridge) ile otomatik oluşturulmuştur.*
