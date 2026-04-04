---
name: component-documentation
description: Figma bileseni icin kullanim kilavuzu olusturur. "bilesen dokumantasyonu", "component docs", "usage guidelines", "bilesen kilavuzu" ifadeleriyle tetiklenir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designer
    - designops
    - uidev
---

# Component Documentation

## Workflow

1. **Standart kontrolu:** `reference_industry_design_standards.md` oku. "Son guncelleme" 1 yildan eskiyse kullaniciya guncelleme oner (kaynak listesi asagida).
2. **Bilesen analizi:** figma_get_component_for_development + figma_get_design_context (depth=2, full) + figma_get_variables
3. **KULLANICIYA FORMAT SEC:** Asagidaki 2 secenegi icerik ozetiyle sun. Onay olmadan frame OLUSTURMA.
4. Secime gore frame olustur. Eski ayni isimli frame varsa sil.
5. Height bug fix: `primaryAxisSizingMode` FIXED→AUTO toggle.
6. Viewport'u frame'e odakla.

---

## Format Secenekleri

### Standard (~2400px, 780px genis)

| # | Bolum | Icerik |
|---|-------|--------|
| 1 | Intro | Baslik (26px Bold) + 2 satirlik tanitim |
| 2 | Variantlar | Kart: gri bg, instance (130px fixed) + isim + aciklama (FILL) |
| 3 | Kurallar | Do/Dont metin kutulari (yesil/kirmizi, 3+3 madde) + gorsel ornekler (gercek instance'larla dogru/yanlis cift kartlar) |
| 4 | Standartlar | Kaynak chip'leri (M3, HIG, WCAG, shadcn) + info kutu (touch, kontrast, hiyerarsi, boyut, states) |
| 5 | Props | Satir bazli: prop adi (mavi) + tip/default (gri) + aciklama (FILL) |
| 6 | A11y | Info kutu: touch, focus, label, disabled |
| 7 | Tokenlar | Renk + boyut token satirlari, dark mode notu |
| 8 | Kod | Tek koyu blok: React, SwiftUI, Compose |

### Compact (~1300px, 720px genis)

| # | Bolum | Icerik |
|---|-------|--------|
| 1 | Baslik | 24px Bold + tek satirlik tanitim |
| 2 | Variantlar | Satir bazli: instance + "Name — aciklama" |
| 3 | Kurallar | Do/Dont minimal: 3+3 madde (gorsel ornek yok) |
| 4 | Teknik | TEK KUTU: touch, kontrast, padding, states, props hepsi icinde |
| 5 | Tokenlar | 2 satir, bullet-separated |
| 6 | Kod | Tek koyu blok |

---

## Gorsel Do/Don't Ornekleri (Sadece Standard)

Kurallar bolumune metin kutularindan SONRA eklenir. Her ornek cift kart (dogru + yanlis) yan yana:

```
HORIZONTAL row (FILL):
  ├── Dogru kart: yesil bg + border, gercek instance'lar, kisa aciklama
  └── Yanlis kart: kirmizi bg + border, gercek instance'lar, kisa aciklama
```

Ornek ciftler (bilesen tipine gore adapte et):
- Hiyerarsi dogru/yanlis: Primary+Secondary vs 2x Primary
- Etiket dogru/yanlis: "Giris Yap" vs "Tikla"
- Variant kullanimi dogru/yanlis: Primary+Outline+Ghost vs hepsi ayni

Her kartta:
- Baslik: 13px Bold, yesil/kirmizi
- Instance satiri: gercek component instance'lari yan yana
- Aciklama: 12px, tek satir

---

## Ortak Kurallar

### Dil
- Sade, junior-friendly — teknik terimlerin yanina aciklama ekle
- Her kural 1 satir — neden gerekliyse parantez icinde
- "CTA" degil "ana aksiyon butonu"

### Layout
- Ana frame: VERTICAL, genislik FIXED, yukseklik AUTO
- Child'lar: `layoutSizingHorizontal = "FILL"`
- Metinler: `textAutoResize = "HEIGHT"` — ASLA sabit yukseklik
- Do/Dont: HORIZONTAL parent, FILL child'lar — ASLA sabit genislik
- Font: Inter (Regular, Medium, Semi Bold, Bold)

### Standart Referansi
- Hafiza: `reference_industry_design_standards.md` (14 bolum)
- Bilesene uygun bolumler secilir, tamami yazilmaz
- Chip'lerle kaynak goster: M3, HIG, WCAG 2.2, shadcn/ui

---

## Standart Guncelleme Kaynaklari (Yillik)

| Kaynak | URL | Kontrol |
|--------|-----|---------|
| shadcn/ui | shadcn.com | Yeni bilesenler, tema tokenlari |
| Tailwind CSS | tailwindcss.com | Varsayilan degerler, breaking changes |
| Radix UI | radix-ui.com | Yeni primitive'ler, a11y kaliplari |
| Lucide Icons | lucide.dev | Grid/stroke degisiklikleri |
| Material Design 3 | m3.material.io | M3 Expressive, bilesen specleri |
| Apple HIG | developer.apple.com/design | Liquid Glass, platform kurallari |
| WCAG | w3.org/TR/WCAG22 | Yeni SC'ler, hedef boyut |
| W3C Design Tokens | designtokens.org | DTCG format, yeni tipler |
| Carbon DS | carbondesignsystem.com | Bilesen checklist |

---

## Skill Koordinasyonu

- Oncesi: `generate-figma-library` veya `figma-canvas-ops`
- Sonrasi: `ai-handoff-export`
- Iliskili: `figma-a11y-audit`, `reference_industry_design_standards.md`
