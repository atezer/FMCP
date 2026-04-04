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

1. Bilesen analizi yap (figma_get_component_for_development + figma_get_design_context + figma_get_variables)
2. **KULLANICIYA FORMAT SECENEKLERINI SUN** — icerik ozetleriyle birlikte
3. Secime gore frame(ler) olustur
4. Eski ayni isimli frame varsa sil
5. Yeni frame'i uygun pozisyona yerlestir
6. Height bug fix: primaryAxisSizingMode FIXED→AUTO toggle
7. Viewport'u frame'e odakla

## Skill Koordinasyonu

- Oncesi: `generate-figma-library` veya `figma-canvas-ops`
- Sonrasi: `ai-handoff-export`
- Iliskili: `figma-a11y-audit`, `reference_industry_design_standards.md`
