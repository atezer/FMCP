---
name: audit-figma-design-system
description: Figma ekran veya bileşenini design system entegrasyonu açısından okuma-only denetler; eksik kütüphane instance'ları, yerel override'lar ve bağlanmamış token'ları raporlar. "figma ds audit", "design system audit", "kütüphane kullanımı kontrol", "token bağlı mı", "DS sağlık kontrolü", "ne kadar DS uyumlu", "tasarım durumu raporu", "ekran kalitesi" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designer
    - designops
    - po
---

# Audit Figma Design System (tuval içi)

## Overview

Bu skill **yalnızca okur**; Figma node'unun yayınlanmış design system ile ne kadar entegre olduğunu yapısal kanıta dayanarak denetler. Görsel tatmin değil, **instance / tekrar / ham değer / token bağlama** odaklıdır.

Yazma gerekiyorsa aşağıdaki skill’lerden birine yönlendir.

## F-MCP araç eşlemesi (resmi Figma MCP isimleri yerine)

| Niyet | F-MCP Bridge |
|--------|----------------|
| Design context | `figma_get_design_context` |
| Görsel doğrulama | `figma_capture_screenshot` |
| Variable / bağlılık | `figma_get_variables` (verbosity=`full`), gerekiyorsa `figma_get_styles` |
| Yapı / iç içe instance haritası | `figma_get_file_data` (düşük `depth`), hedef node için `figma_get_component` veya `figma_get_design_context`; büyük tahta için `figma_get_file_data` (timeout riski — dikkat). **Not:** Bridge’te ayrı bir “yalnızca metadata” MCP aracı yok; yapı bu üç araçla alınır. |
| Kod/dev spec ipucu | `figma_get_design_context` (`includeCodeReady=true`); uygunsa `figma_get_component_for_development` |
| Kütüphanede aday bileşen | `figma_search_components`, özet için `figma_get_design_system_summary` |

## F-MCP skill koordinasyonu

| Bulgu sonrası | Ne zaman |
|---------------|----------|
| **fix-figma-design-system-finding** | Tek net bulgu, tek node veya dar küme |
| **apply-figma-design-system** | Çoklu bulgu, ekran geneli veya bölüm bölüm reconcile |
| **design-token-pipeline** | Rapor “token export / kod tarafı senkron” gerektiriyorsa |
| **design-drift-detector** | Aynı ekranın **kod** ile parity’si de soruluyorsa (Figma audit’ten sonra) |
| **code-design-mapper** | Eşleştirilecek bileşen aileleri netleştikten sonra mapping güncellemesi |
| **figma-screen-analyzer** | PO/PM/SEM'e yönelik teknik olmayan ekran analizi ve DS uyum raporu |
| **ds-impact-analysis** | Bir token/bileşen değişikliğinin etki yarıçapını ölçmek istiyorsan |
| **ai-handoff-export** / **implement-design** | Audit “Pass” veya düzeltme sonrası koda geçiş |

### Önerilen uçtan uca akış (özet)

1. **audit-figma-design-system** (tuval DS uyumu)  
2. **fix-figma-design-system-finding** (tek bulgu) *veya* **apply-figma-design-system** (çok bölüm)  
3. **design-token-pipeline** (kod token dosyaları)  
4. İsteğe bağlı **code-design-mapper**  
5. **ai-handoff-export** → **implement-design**  
6. **design-drift-detector** (kod–Figma parity)  
7. Gerekirse **design-system-rules** ile repo kurallarını güncelle

**FigJam** ve bu zincir zorunlu sıralı değildir.

### Zincir performansı (tek oturum)

- Aynı zincirde **tekrarlı** `figma_get_variables(verbosity="full")` ve `figma_get_design_context` çağrılarını azalt: önceki adımın çıktısı hâlâ geçerliyse yeniden çağırma; mümkünse `verbosity="summary"` ile başla, orta detay için `"standard"`, tam detay için `"full"` kullan.
- `figma_search_components`: varsayılan **`currentPageOnly=true`**; `false` yalnızca gerektiğinde (büyük dosyada timeout riski).

## Çıktı Formatı

- Kullanıcı `--json` veya JSON isterse: şema altındaki JSON’u **markdown fence’siz**, ek metin yok.
- Sohbet ortamı veya `--markdown`: insan okunur markdown rapor.
- Belirsizse: markdown varsayılan.

## Required Workflow

1. **Girdi:** Figma URL veya `fileKey` + `nodeId`. `node-id=72-293` → `72:293` normalize et.
2. **Bağlantı:** `figma_get_status()`.
3. **Kanıt:** Hedef node için `figma_get_design_context`; `figma_capture_screenshot`; `figma_get_variables`. Büyük/hacimli yapıda `figma_get_file_data` (düşük `depth`) veya aynı node üzerinden `figma_get_component` / `figma_get_design_context`. Özel primitive için `figma_search_components`.

> **DERİN ANALİZ KURALI:** Sadece frame/node isimlerine bakarak sonuç çıkarma. Her node'un içindeki text content (`characters`), instance prop'ları ve child yapılarını detaylı oku. Bir şeyin "eksik" veya "yok" olduğunu iddia etmeden önce tüm child node'ların içeriğini kontrol et.

> **GÖRSEL DOĞRULAMA KURALI:** Analiz sonucunu raporlamadan önce `figma_capture_screenshot` ile ekran görüntüsü al ve görsel olarak kontrol et. Text content ile screenshot'ın tutarlı olduğunu teyit et. Çelişki varsa screenshot'ı esas al.
4. **İnceleme:** Yerel frame ile yeniden icat edilmiş primitive, tekrarlayan kardeş yapılar, tokenize eşlerin yanında ham hex/spacing/typography, navigasyon gibi yüksek etkili custom yapılar, variant sapması.
5. **Öneri:** Yalnızca `figma_search_components` ile **inandırıcı** aday bulunduğunda değiştirme öner; zayıf eşleşmede aday yazma.
6. **Çıktı:** Seçilen formatta rapor; ardından yukarıdaki koordinasyon tablosuna göre sonraki skill’i öner.

## Ne işaretlenir / ne işaretlenmez

**İşaretle:** Ad-hoc frame ile yapılmış button/card/alert/chip vb.; tekrarlayan kardeş modüller; somut ham değer + tokenize komşular; global pattern’lerin custom olması; nominal component içi variant sapması.

**İşaretleme:** Saf estetik; copy; makul ölçüde ekrana özgü layout; zaten instance + token ile doğru olan tek seferlik kompozisyonlar; belgesiz varsayımlar.

## Kanıt standardı

Her bulgu için: (1) Figma yapısında somut ne gösteriyor? (2) Bakım, tutarlılık, tema veya ölçeklenebilirlik için neden önemli?

## JSON çıktı şeması ( `--json` )

Tek JSON obje; markdown veya ek prose yok:

```json
{
  "findings": [
    {
      "title": "<= 80 karakter, emir kipi>",
      "body": "Markdown açıklama",
      "confidence_score": 0.0,
      "priority": 0,
      "code_location": {
        "absolute_file_path": "/figma/<fileKey>/nodes/<nodeId>",
        "line_range": { "start": 1, "end": 1 }
      }
    }
  ],
  "overall_correctness": "ds compliant" | "ds non-compliant",
  "overall_explanation": "1-3 cümle özet",
  "overall_confidence_score": 0.0
}
```

- En az bir bulgu varsa `overall_correctness`: `"ds non-compliant"`.
- Bulgu yoksa `"ds compliant"`.
- `code_location.absolute_file_path`: en spesifik sorunlu node için `/figma/<fileKey>/nodes/<nodeId>`.
- `line_range` her zaman `1`.

## Öncelik ve güven skorları

- **priority:** 0 nit, 1 orta drift, 2 önemli primitive/token, 3 kütüphane/nav seviyesi kritik.
- **confidence_score:** 0.9–1.0 doğrudan yapısal kanıt; 0.7–0.89 güçlü çıkarım; 0.5–0.69 zayıf — tercihen bulgu yazma.

## Erişilebilirlik (a11y) Kontrol Noktaları

Audit sırasında aşağıdaki temel a11y kontrolleri de yapılır. Ayrıntılı a11y denetimi için **figma-a11y-audit** skill'ine yönlendir.

- **Renk kontrastı:** Metin/arka plan renk çiftlerinde WCAG AA minimum kontrastı (4.5:1 normal metin, 3:1 büyük metin) sağlanıyor mu?
- **Minimum boyut:** Etkileşimli öğeler (button, input, link) iOS için 44x44pt, Android için 48x48dp minimumunu karşılıyor mu?
- **Metin boyutu:** Body metin en az 14px (mobil) / 16px (masaüstü) mü?

Bu kontroller audit raporunda `[a11y]` etiketiyle ayrı bölümde gösterilir. Detaylı denetim (fokus sırası, VoiceOver/TalkBack, ARIA) için:

→ **figma-a11y-audit** skill'ini kullan.

## PO/PM Executive Rapor Modu

`--executive` flag veya PO/PM persona algılandığında teknik detay yerine yönetici özeti çıkar:

**Executive summary formatı:**

```markdown
## DS Uyum Raporu — [Ekran Adı]

- **DS Uyum Oranı:** %85 (17/20 öğe DS ile uyumlu)
- **Risk Seviyesi:** Orta
- **Kritik Bulgular:** 2 adet
- **Önerilen Aksiyon Süresi:** ~2 saat

### Bulgular (öncelik sırasıyla)
1. [Yüksek] Navigation bar custom yapılmış — DS NavBar bileşeni mevcut
2. [Orta] 3 renk token'a bağlı değil — tema değişikliğinde kopacak

### Sonraki Adım
→ apply-figma-design-system ile otomatik düzeltme önerilir
```

## Tetik örnekleri

- "Bu ekranı design system entegrasyonu için denetle"
- "Bu board'da eksik component kullanımı var mı?"
- "Token'lar doğru bağlı mı — audit --json ile ver"
- "Tasarım durumu raporu ver" (PO/PM)
- "Ne kadar DS uyumlu bu ekran?" (PO/PM)

## Evolution Triggers

- Bridge'e yeni DS analiz aracı eklendiğinde kanıt toplama adımları güncellenmeli
- Yeni a11y standartları (WCAG 3.0) yayınlandığında kontrol noktaları güncellenmeli
- PO/PM geri bildirimine göre executive summary formatı genişletilmeli
