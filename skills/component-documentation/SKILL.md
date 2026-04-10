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

> **Design Token Kuralı:** Bu skill'deki kod örneklerinde geçen font adları, renk kodları, piksel boyutları yalnızca FORMAT gösterimidir. Çalışma anında tüm design token değerleri (font, renk, boyut, spacing, radius, gölge) kayıtlı kütüphaneden (`figma_get_variables`, `figma_get_styles`) veya kullanıcıdan okunmalıdır. Hardcoded token değeri kullanma. Detay: `project-context.md` → "Design Token Kuralı".

## Workflow

1. **Standart kontrolü:** `reference_industry_design_standards.md` oku. "Son güncelleme" 1 yıldan eskiyse kullanıcıya güncelleme öner (kaynak listesi aşağıda).
2. **Bileşen analizi:** figma_get_component_for_development + figma_get_design_context (depth=3, full) + figma_get_variables

> **DERİN ANALİZ KURALI:** Sadece frame/node isimlerine bakarak sonuç çıkarma. Her node'un içindeki text content (`characters`), instance prop'ları ve child yapılarını detaylı oku. Bir şeyin "eksik" veya "yok" olduğunu iddia etmeden önce tüm child node'ların içeriğini kontrol et.

> **GÖRSEL DOĞRULAMA KURALI:** Analiz sonucunu raporlamadan önce `figma_capture_screenshot` ile ekran görüntüsü al ve görsel olarak kontrol et. Text content ile screenshot'ın tutarlı olduğunu teyit et. Çelişki varsa screenshot'ı esas al.
3. **Bileşen description güncelleme:** Bileşenin description ve link alanlarını güncelle (bkz. "Bileşen Description Kuralları").
4. **KULLANICIYA FORMAT SEÇ:** Aşağıdaki 2 seçeneği içerik özetiyle sun. Onay olmadan frame OLUŞTURMA.
5. Seçime göre frame oluştur. Eski aynı isimli frame varsa sil.
6. Height bug fix: `primaryAxisSizingMode` FIXED→AUTO toggle.
7. Viewport'u frame'e odakla.

> **ONAY KURALI:** Bileşene herhangi bir ekleme veya değişiklik yapmadan önce (description, property, variant, child node, frame oluşturma vb.) yapılacak değişikliği açıkça belirt ve kullanıcıdan onay bekle. Sadece okuma/analiz işlemleri onaysız yapılabilir.

---

## Format Seçenekleri

### Standard (~2800px, 780px geniş)

| # | Bölüm | İçerik |
|---|-------|--------|
| 1 | Intro | Başlık (26px Bold) + 2 satırlık tanıtım |
| 2 | Variantlar | Kart: gri bg, instance (130px fixed) + isim + açıklama (FILL) |
| 3 | Durumlar | Grid: Default, Hover, Active, Disabled, Loading, Error, Focus — her durum gerçek instance ile gösterilir (mevcut variant'ın farklı state'leri) |
| 4 | Kurallar | Do/Dont metin kutuları (yeşil/kırmızı, 3+3 madde) + görsel örnekler (gerçek instance'larla doğru/yanlış çift kartlar) |
| 5 | Standartlar | Kaynak chip'leri (M3, HIG, WCAG, shadcn) + info kutu (touch, kontrast, hiyerarşi, boyut, states) |
| 6 | Props | Satır bazlı: prop adı (mavi) + tip/default (gri) + açıklama (FILL) |
| 7 | Copy Spec | Text node'lar için copy kuralları: max karakter, truncation davranışı, boş durum metni, placeholder. Bkz. [ux-copy-guidance](../ux-copy-guidance/SKILL.md) |
| 8 | A11y | Info kutu: touch, focus, label, disabled |
| 9 | Tokenlar | Renk + boyut token satırları, dark mode notu |
| 10 | Kod | Tek koyu blok: React, SwiftUI, Compose |

### Compact (~1300px, 720px geniş)

| # | Bölüm | İçerik |
|---|-------|--------|
| 1 | Başlık | 24px Bold + tek satırlık tanıtım |
| 2 | Variantlar | Satır bazlı: instance + "Name — açıklama" |
| 3 | Kurallar | Do/Dont minimal: 3+3 madde (görsel örnek yok) |
| 4 | Teknik | TEK KUTU: touch, kontrast, padding, states, props hepsi içinde |
| 5 | Tokenlar | 2 satır, bullet-separated |
| 6 | Kod | Tek koyu blok |

> **NOT:** Copy Spec ve Durumlar bölümleri Compact formatta dahil değildir. Bu bölümler yalnızca Standard formatta yer alır.

---

## State Machine Geçiş Diyagramı (Sadece Standard)

Etkileşimli bileşenler için durum geçiş diyagramı üretilir. Variant yapısından (`State` prop'u) otomatik çıkarılır:

```mermaid
stateDiagram-v2
  [*] --> Default
  Default --> Hover : onMouseEnter
  Hover --> Active : onMouseDown / onTouchStart
  Active --> Default : onMouseUp / onTouchEnd
  Default --> Focus : onFocus (Tab)
  Focus --> Default : onBlur
  Default --> Disabled : disabled=true
  Hover --> Default : onMouseLeave
  Active --> Loading : async action
  Loading --> Default : success
  Loading --> Error : failure
  Error --> Default : retry / dismiss
```

**Kurallar:**
- Her durumdan `Disabled`'a geçiş mümkün (programatik)
- `Loading` yalnızca async aksiyon tetikleyen bileşenlerde (Button, Form, Toggle)
- `Error` yalnızca başarısız olabilecek aksiyonlarda
- Geçiş tetikleyicileri (onMouseEnter, onFocus vb.) açıkça belirtilmeli
- Statik bileşenler (Card, Badge, Divider) için diyagram üretilmez

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

## Bileşen Description Kuralları

### Description alanı
- "Bu bileşen nedir ve ne amaçla kullanılır?" sorusuna **tek cümle** cevap ver
- State listesi, yapı detayları, teknik kurallar gibi uzun bilgileri description'a EKLEME
- Varsa bileşenin dokümantasyon sayfasını (Documentation frame) oku ve oradan özetle

### Link alanı
- Bileşenin dokümantasyon sayfası varsa Figma linkini `documentationLinks` olarak ekle
- Format: `https://www.figma.com/design/{fileKey}/...?node-id={docNodeId}`

### Örnek
- **Doğru:** "File Upload bileşeni, kullanıcıların belgelerini sisteme yüklemesini sağlar. Buton aracılığıyla dosya seçimi yapılır."
- **Yanlış:** "Dosya yükleme bileşeni (Mobil). States: empty, loading, loaded, disable. Yapısı: Label + Button + Belgeler listesi + Hint. Kurallar: Genişlik 358px, maks 10 dosya..."

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

## Marka Profili Entegrasyonu

`.fmcp-brand-profile.json` varsa:
- `voiceTone` → Bileşen açıklama ve kullanım notlarının ton kalibrasyonu
- `copyRules` → Copy Spec bölümünde CTA max karakter, kaçınılacak kelimeler referansı

## Skill Koordinasyonu

- Öncesi: `generate-figma-library` veya `figma-canvas-ops`
- Sonrası: `ai-handoff-export`
- İlişkili: `figma-a11y-audit`, `ux-copy-guidance`, `reference_industry_design_standards.md`
