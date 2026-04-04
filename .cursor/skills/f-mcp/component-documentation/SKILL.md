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

## ZORUNLU: Format Secimi

Bu skill tetiklendiginde, bilesen analizi yapildiktan sonra ve HERHANGI bir frame olusturmadan ONCE kullaniciya asagidaki secenekler sunulmali:

```
Dokumantasyon icin 2 format var:

Standard (780px genis, ~1900px uzun)
├── Bilesen tanitimi (2 cumle)
├── Variant kartlari (gorsel instance + aciklama)
├── Do / Don't kutulari (yan yana)
├── Endustri standartlari (M3, HIG, WCAG chip'leri + ozet)
├── Props tablosu
├── Erisebilirlik ozeti
├── Token haritasi
└── Kod ornekleri (React, SwiftUI, Compose)

Compact (720px genis, ~1300px uzun)
├── Baslik + tek satirlik tanitim
├── Variant satirlari (instance + tek cumle)
├── Do / Don't (3+3 madde, minimal)
├── Teknik ozet (tek kutu: touch, kontrast, padding, states)
├── Token satirlari (2 satir)
└── Kod blogu (tek blok, 3 platform)

Hangisini istersin? Ikisini birden de yapabilirim.
```

Kullanici secim yapana kadar frame OLUSTURULMAZ.

## Ortak Kurallar (Her Iki Format)

### Dil
- Sade Turkce, junior-friendly
- Teknik terim kullanirsan yanina aciklama ekle
- "CTA" degil "ana aksiyon butonu"
- Her kural 1 satir — neden gerekliyse parantez icinde ekle

### Layout
- Ana frame: VERTICAL, genislik FIXED, yukseklik AUTO
- Tum child'lar: `layoutSizingHorizontal = "FILL"`
- Tum metinler: `textAutoResize = "HEIGHT"` — ASLA sabit yukseklik
- Do/Dont: HORIZONTAL parent, iki FILL child — ASLA sabit genislik
- Frame olusturduktan sonra `primaryAxisSizingMode` FIXED→AUTO toggle yap (height bug fix)
- Font: Inter (Regular, Medium, Semi Bold, Bold)

### Endustri Standartlari Referansi
- Hafiza dosyasi: `reference_industry_design_standards.md`
- Bilesene uygun bolumler secilir, tamami yazilmaz
- Chip'lerle kaynak goster: M3, HIG, WCAG 2.2, shadcn/ui

## Standard Format Detayi

### Frame: `Docs / <COMPONENT_NAME>`
- Genislik: 780px, padding: 36px, item spacing: 32px
- Corner radius: 12, stroke: 1px gray

### Bolumler (8 adet)

1. **Intro** — Baslik (26px Bold) + 2 satirlik aciklama (15px)
2. **Variantlar** — Her variant icin kart: gri bg, radius 10, instance (130px fixed) + isim+aciklama (FILL)
3. **Kurallar** — Do/Dont yan yana kutular: yesil/kirmizi border 2px, 3 madde her biri
4. **Standartlar** — Kaynak chip'leri + info kutu (5-6 satir: touch, kontrast, hiyerarsi, boyut, states)
5. **Props** — Satir bazli: prop adi (mavi) + tipi/default (gri) + aciklama (FILL)
6. **A11y** — Tek info kutu: 4 satir (touch, focus, label, disabled)
7. **Tokenlar** — 3 satir: renk tokenlari, boyut tokenlari (bullet-separated)
8. **Kod** — Tek koyu blok, 3 platform (React, SwiftUI, Compose)

### Hedef Yukseklik: ~1900px

## Compact Format Detayi

### Frame: `Docs / <COMPONENT_NAME> — Compact`
- Genislik: 720px, padding: 32px, item spacing: 24px

### Bolumler (6 adet, birlesmis)

1. **Baslik** — 24px Bold + tek satirlik aciklama
2. **Variantlar** — Satir bazli: instance + "Name — aciklama" (divider yok, sade)
3. **Kurallar** — Do/Dont minimal: 3+3 madde, kucuk kutular
4. **Teknik** — TEK KUTU: touch, kontrast, padding, radius, font, states, props — hepsi icinde
5. **Tokenlar** — 2 satir bullet-separated
6. **Kod** — Tek koyu blok

### Hedef Yukseklik: ~1300px

## Workflow

1. **ENDUSTRI STANDARTLARINI GUNCELLE** (her calistirmada):
   - `reference_industry_design_standards.md` oku
   - Icerigindeki "Son guncelleme" tarihini kontrol et
   - 1 yildan eskiyse kullaniciya uyar:
     "Endustri standartlari referansi [tarih]'den beri guncellenmedi. Guncellemek ister misin?
      Kontrol edilecek kaynaklar: shadcn.com, tailwindcss.com, m3.material.io, radix-ui.com, lucide.dev,
      developer.apple.com/design, w3.org/TR/WCAG22, designtokens.org"
   - Kullanici onaylarsa: kaynaklari tara, hafiza dosyasini guncelle, tarihi yenile
   - Onaylamazsa: mevcut bilgilerle devam et
2. Bilesen analizi yap (figma_get_component_for_development + figma_get_design_context + figma_get_variables)
3. **KULLANICIYA FORMAT SECENEKLERINI SUN** — icerik ozetleriyle birlikte
4. Secime gore frame(ler) olustur
5. Eski ayni isimli frame varsa sil
6. Yeni frame'i uygun pozisyona yerlestir
7. Height bug fix: primaryAxisSizingMode FIXED→AUTO toggle
8. Viewport'u frame'e odakla

## Endustri Standartlari Guncelleme Kaynaklari

Bu skill her tetiklendiginde `reference_industry_design_standards.md` hafiza dosyasindaki bilgiler kullanilir.
Asagidaki kaynaklar yillik (veya major versiyon degisikliklerinde) kontrol edilmeli:

| Kaynak | URL | Ne Kontrol Edilir |
|--------|-----|-------------------|
| shadcn/ui | shadcn.com | Yeni bilesenler, variant degisiklikleri, tema tokenlari |
| Tailwind CSS | tailwindcss.com | Varsayilan degerler, yeni ozellikler (v4 breaking changes) |
| Radix UI | radix-ui.com | Yeni primitive'ler, a11y kaliplari |
| Lucide Icons | lucide.dev | Grid/stroke degisiklikleri, yeni ikonlar |
| Material Design | m3.material.io | M3 Expressive, yeni bilesen specleri |
| Apple HIG | developer.apple.com/design | Liquid Glass, yeni platform kurallari |
| WCAG | w3.org/TR/WCAG22 | Yeni SC'ler, hedef boyut guncellemeleri |
| W3C Design Tokens | designtokens.org | DTCG format degisiklikleri, yeni tipler |
| Carbon DS | carbondesignsystem.com | Bilesen checklist guncellemeleri |

## Skill Koordinasyonu

- Oncesi: `generate-figma-library` veya `figma-canvas-ops`
- Sonrasi: `ai-handoff-export`
- Iliskili: `figma-a11y-audit`, `reference_industry_design_standards.md`
