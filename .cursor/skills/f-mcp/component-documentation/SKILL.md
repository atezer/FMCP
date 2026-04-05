---
name: component-documentation
description: Figma bileşeni için kullanım kılavuzu oluşturur. "bileşen dokümantasyonu", "component docs", "usage guidelines", "bileşen kılavuzu" ifadeleriyle tetiklenir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designer
    - designops
    - uidev
---

# Component Documentation

## Workflow

1. **Standart kontrolü:** `reference_industry_design_standards.md` oku. "Son güncelleme" 1 yıldan eskiyse kullanıcıya güncelleme öner (kaynak listesi aşağıda).
2. **Bileşen analizi:** figma_get_component_for_development + figma_get_design_context (depth=2, full) + figma_get_variables
3. **KULLANICIYA FORMAT SEÇ:** Aşağıdaki 2 seçeneği içerik özetiyle sun. Onay olmadan frame OLUŞTURMA.
4. Seçime göre frame oluştur. Eski aynı isimli frame varsa sil.
5. Height bug fix: `primaryAxisSizingMode` FIXED→AUTO toggle.
6. Viewport'u frame'e odakla.

---

## Format Seçenekleri

### Standard (~2400px, 780px geniş)

| # | Bölüm | İçerik |
|---|-------|--------|
| 1 | Intro | Başlık (26px Bold) + 2 satırlık tanıtım |
| 2 | Variantlar | Kart: gri bg, instance (130px fixed) + isim + açıklama (FILL) |
| 3 | Kurallar | Do/Dont metin kutuları (yeşil/kırmızı, 3+3 madde) + görsel örnekler (gerçek instance'larla doğru/yanlış çift kartlar) |
| 4 | Standartlar | Kaynak chip'leri (M3, HIG, WCAG, shadcn) + info kutu (touch, kontrast, hiyerarşi, boyut, states) |
| 5 | Props | Satır bazlı: prop adı (mavi) + tip/default (gri) + açıklama (FILL) |
| 6 | A11y | Info kutu: touch, focus, label, disabled |
| 7 | Tokenlar | Renk + boyut token satırları, dark mode notu |
| 8 | Kod | Tek koyu blok: React, SwiftUI, Compose |

### Compact (~1300px, 720px geniş)

| # | Bölüm | İçerik |
|---|-------|--------|
| 1 | Başlık | 24px Bold + tek satırlık tanıtım |
| 2 | Variantlar | Satır bazlı: instance + "Name — açıklama" |
| 3 | Kurallar | Do/Dont minimal: 3+3 madde (görsel örnek yok) |
| 4 | Teknik | TEK KUTU: touch, kontrast, padding, states, props hepsi içinde |
| 5 | Tokenlar | 2 satır, bullet-separated |
| 6 | Kod | Tek koyu blok |

---

## Görsel Do/Don't Örnekleri (Sadece Standard)

Kurallar bölümüne metin kutularından SONRA eklenir. Her örnek çift kart (doğru + yanlış) yan yana:

```
HORIZONTAL row (FILL):
  ├── Doğru kart: yeşil bg + border, gerçek instance'lar, kısa açıklama
  └── Yanlış kart: kırmızı bg + border, gerçek instance'lar, kısa açıklama
```

Örnek çiftler (bileşen tipine göre adapte et):
- Hiyerarşi doğru/yanlış: Primary+Secondary vs 2x Primary
- Etiket doğru/yanlış: "Giriş Yap" vs "Tıkla"
- Variant kullanımı doğru/yanlış: Primary+Outline+Ghost vs hepsi aynı

Her kartta:
- Başlık: 13px Bold, yeşil/kırmızı
- Instance satırı: gerçek component instance'ları yan yana
- Açıklama: 12px, tek satır

---

## Ortak Kurallar

### Dil
- Sade, junior-friendly — teknik terimlerin yanına açıklama ekle
- Her kural 1 satır — neden gerekliyse parantez içinde
- "CTA" değil "ana aksiyon butonu"

### Türkçe Karakter Kuralı (ZORUNLU)
Tüm Türkçe metin içeriklerinde doğru Unicode karakterler kullanılmalıdır. ASCII karşılıkları YASAKTIR:
ş (s değil), ı (i değil), ö (o değil), ü (u değil), ç (c değil), ğ (g değil), İ (I değil), Ş (S değil)
Son adım: Üretilen tüm Türkçe metinleri karakter kontrolünden geçir.

### Layout
- Ana frame: VERTICAL, genişlik FIXED, yükseklik AUTO
- Child'lar: `layoutSizingHorizontal = "FILL"`
- Metinler: `textAutoResize = "HEIGHT"` — ASLA sabit yükseklik
- Do/Dont: HORIZONTAL parent, FILL child'lar — ASLA sabit genişlik
- Font: Inter (Regular, Medium, Semi Bold, Bold)

### Token Bağlama Kontrolü
Dokümantasyon üretirken bileşendeki bağlı olmayan değerleri tespit et ve uyar.
Token bağlama kuralları için bkz: `generate-figma-library` skill'i.

### Standart Referansı
- Hafıza: `reference_industry_design_standards.md` (14 bölüm)
- Bileşene uygun bölümler seçilir, tamamı yazılmaz
- Chip'lerle kaynak göster: M3, HIG, WCAG 2.2, shadcn/ui

---

## Standart Güncelleme Kaynakları (Yıllık)

| Kaynak | URL | Kontrol |
|--------|-----|---------|
| shadcn/ui | shadcn.com | Yeni bileşenler, tema tokenları |
| Tailwind CSS | tailwindcss.com | Varsayılan değerler, breaking changes |
| Radix UI | radix-ui.com | Yeni primitive'ler, a11y kalıpları |
| Lucide Icons | lucide.dev | Grid/stroke değişiklikleri |
| Material Design 3 | m3.material.io | M3 Expressive, bileşen specleri |
| Apple HIG | developer.apple.com/design | Liquid Glass, platform kuralları |
| WCAG | w3.org/TR/WCAG22 | Yeni SC'ler, hedef boyut |
| W3C Design Tokens | designtokens.org | DTCG format, yeni tipler |
| Carbon DS | carbondesignsystem.com | Bileşen checklist |

---

## Skill Koordinasyonu

- Öncesi: `generate-figma-library` veya `figma-canvas-ops`
- Sonrası: `ai-handoff-export`
- İlişkili: `figma-a11y-audit`, `reference_industry_design_standards.md`
