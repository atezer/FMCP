---
name: fmcp-intent-router
description: F-MCP ile ilgili herhangi bir kullanıcı talebinin ilk giriş noktası. Kullanıcının niyetini analiz eder, hangi hedef SKILL'in çalıştırılacağına karar verir, o SKILL için gereken eksik input'ları tek turda toplar, özet+onay alır ve ondan sonra hedef SKILL'i çalıştırır. "figma", "ekran oluştur", "tasarım yap", "component üret", "DS denetle", "token sync", "kod üret", "design system" gibi her F-MCP-tetiklemesiyle aktive olur. Claude hiçbir figma_* yazma tool'u çalıştırmadan ÖNCE bu protokolü uygulamak zorundadır.
metadata:
  mcp-server: user-figma-mcp-bridge
  version: 1.8.1
  priority: 100
  phase: entry-gate
  personas:
    - designer
    - uidev
    - designops
---

# F-MCP Intent Router — Universal Entry Gate

## Neden Var?

F-MCP Bridge'in 20+ SKILL'i var. Her biri farklı bir iş yapar (ekran oluşturma, denetim, kütüphane inşası, vb.) ve her biri farklı input'lar ister. Claude kullanıcı "figma'da ekran yap" dediğinde:

1. Hangi SKILL lazım? (`generate-figma-screen` mi `generate-figma-library` mi?)
2. Hangi bilgiler eksik? (device? DS? benchmark? içerik bölümleri?)
3. Kullanıcı ne onay verdi?

Bu SKILL bu üç soruyu **upstream** çözer. Claude intent'i netleştirmeden hiçbir `figma_execute`, `figma_create_frame`, `figma_clone_screen_to_device` çalıştırmaz. "Hızlı ve doğru" kuralı: yanlış varsayım yapmaktansa 1 soru sormak her zaman daha hızlıdır.

## Protokol (8 Adım)

Kullanıcı F-MCP ile ilgili herhangi bir talep yaptığında Claude bu 8 adımı SIRAYLA uygular. Hiçbir adım atlanmaz.

### Adım 1 — Intent Analysis

Kullanıcı talebini oku. Anahtar kelimeleri tara:

| Kullanıcı ifadesi | Olası SKILL adayı |
|---|---|
| "ekran yap", "tasarım oluştur", "ui çiz", "UI'ı Figma'ya aktar", "landing page", "mobil ekran" | `generate-figma-screen` |
| "DS hizala", "SUI'ye uygula", "design system uygula", "token'lara bağla" | `apply-figma-design-system` |
| "denet", "audit", "DS sağlığı", "token bağlı mı", "ne kadar DS uyumlu" | `audit-figma-design-system` |
| "kütüphane yap", "component set üret", "DS kütüphane inşa" | `generate-figma-library` |
| "Figma'dan kod üret", "implement design", "SwiftUI/Compose/React kodu" | `implement-design` |
| "kod ↔ figma eşleştir", "Code Connect", "design mapping" | `code-design-mapper` |
| "görsel karşılaştır", "visual diff", "QA screenshot" | `visual-qa-compare` |
| "token sync", "design tokens export", "CSS/Swift/Kotlin token" | `design-token-pipeline` |
| "figjam diyagram", "flowchart", "mind map" | `figjam-diagram-builder` |
| "ekran özeti", "analiz et", "ne içeriyor" | `figma-screen-analyzer` |
| "accessibility", "a11y", "WCAG", "contrast check" | `figma-a11y-audit` |
| "drift", "kod/tasarım sapması", "out of sync" | `design-drift-detector` |
| "UX copy", "microcopy", "buton metni", "empty state" | `ux-copy-guidance` |

### Adım 2 — State Files Check

Claude her seferinde üç state dosyasını okur:

```
1. .claude/design-systems/active-ds.md
   → Aktif DS belirtilmiş mi? (örn "❖ SUI")
   
2. .claude/design-systems/last-intent.md
   → Son tamamlanan intent nedir? (device, ds, skill, inputs)
   
3. .claude/design-systems/intent-history.md
   → Son 5 intent nedir? (LRU)
```

Bu dosyalar Claude'un "öncekiyle aynı mı?" sorusu sormasını sağlar.

### Adım 3 — Decide Target Skill

Adım 1'deki keyword eşleşmesi + Adım 2'deki state bilgisi → tek bir SKILL seç.

**Karar mantığı:**

```
IF user request EXACTLY matches one keyword pattern
   → Select that skill (single match, no question)
   
ELSE IF user request matches 2+ patterns (ambiguous)
   → Ask user: "Şunlardan hangisini yapayım?"
   → Use AskUserQuestion with matched skills as options
   
ELSE IF user request is generic ("figma'da bir şey yap")
   → Ask user: "Tam olarak ne yapmak istiyorsun?"
   → Offer top 5 common skills as options
   
ELSE (no match)
   → Ask user to clarify intent in natural language
```

### Adım 4 — Read Target Skill Metadata

Seçilen SKILL'in frontmatter'ını oku. `required_inputs` bloğunu parse et:

```yaml
required_inputs:
  - name: device
    type: enum
    options: ["iPhone 17", "iPhone 16 Pro Max", ...]
    question: "Hangi device boyutunda olsun?"
    required: true
    default_source: ".claude/design-systems/last-intent.md#device"
  - name: design_system
    type: from_state
    source: ".claude/design-systems/active-ds.md#Library Name"
    required: true
  - name: reference_benchmark
    type: node_id_or_none
    question: "Referans benchmark node var mı?"
    required: false
    affects: ["screen_type", "sections"]  # verilirse bunlar atlanır
  - name: screen_type
    type: enum
    ...
    skip_if: "reference_benchmark != none"
```

**Input türleri:**
- `enum` — Kullanıcı seçenekten seçer
- `from_state` — State dosyasından oku, yoksa fallback_question sor
- `node_id_or_none` — Figma node ID veya "yok"
- `string` — Serbest metin
- `string_list` — Virgülle ayrılmış liste
- `boolean` — Yes/No

**Özellikler:**
- `required: true/false` — Zorunlu mu?
- `default_source` — State'ten default çekilir
- `default` — Sabit default değer
- `skip_if` — Koşullu atlamak (başka input'un değerine bağlı)
- `affects` — Bu input verilirse atlanacak diğer input'ları belirtir

### Adım 5 — Gather Missing Inputs (Smart Skipping)

Claude her `required_inputs` girdisini şu mantıkla işler:

```
FOR each input in required_inputs:
  IF input has default_source AND state file value exists:
    → USE state value, don't ask
  
  IF input has default:
    → USE default, don't ask
  
  IF user request already mentions this input (parse from prompt):
    → USE parsed value, don't ask
  
  IF another input has affects: [this_input_name] AND that input was set:
    → SKIP this input (will be derived from affecting input)
  
  IF input has skip_if AND condition evaluates true:
    → SKIP this input
  
  ELSE:
    → ADD to missing list
```

Missing list'teki tüm soruları **TEK** `AskUserQuestion` çağrısında toplayıp sor. Max 4 soru/çağrı (AskUserQuestion limiti). 5+ soru gerekiyorsa 2 ayrı çağrı yap, ama ÖNCE kritik 4'ü sor, sonra kalanları.

**Örnek — generate-figma-screen:**

```
Kullanıcı: "sui ile ekran yap"

State okuma:
  - active-ds.md → "❖ SUI" ✓ (design_system sorulmaz)
  - last-intent.md → yok

Missing inputs:
  1. device (zorunlu)
  2. reference_benchmark (opsiyonel ama soruyu sor)
  3. screen_type (zorunlu, reference'a bağlı)
  4. sections (zorunlu, reference'a bağlı)
  5. variants (opsiyonel, default "single")

AskUserQuestion (tek çağrı, 4 soru):
Q1: Hangi device? (iPhone 17 / 16 Pro Max / Android / iPad / Custom)
Q2: Referans benchmark var mı? (Evet node ID / Hayır template kullan)
Q3: Ekran tipi? (dashboard / list / detail / form / login)
Q4: Ana bölümler? (kısa liste yaz)
```

### Adım 6 — Summary + Explicit Confirmation Gate

Tüm input'lar toplandıktan sonra Claude **AYRI** bir `AskUserQuestion` çağrısıyla onay ister:

```
"Anladım, şunu yapacağım:

 🎯 Skill: generate-figma-screen
 📱 Device: iPhone 17 (402×874)
 🎨 DS: ❖ SUI
 📋 Reference: 139:3407 (Vadesiz TL Hesabı)
 🧩 Yaklaşım: clone-to-device with SUI token binding
 📊 Çıktı: 1 ekran 'Vadesiz TL - iPhone 17'
 ⏱️ Tahmini süre: 20 saniye

 Onaylıyor musun?"

Seçenekler:
 [✅ Evet, başla]
 [✏️ Değiştir (hangi alan?)]
 [❌ İptal]
```

**Bu adım ATLANMAZ.** Fast path dahil HER durumda onay sorusu sorulur. İstisna: sadece "önceki ile aynı" cevabı gelen repeat path, tek adım onay.

### Adım 7 — Execute Target Skill

Onay alındıktan sonra:

1. Seçilen SKILL'in `SKILL.md` dosyasını yükle (Skill tool ile)
2. Kullanıcıdan topladığın input'ları context'te tut
3. SKILL'in kendi Step 1-N akışını çalıştır

**ÖNEMLİ:** Target SKILL zaten Step 0 (DS context check), Step 1-N (iş), Step N+1 (self-audit via `figma_validate_screen`) yapacak. Intent router'ın işi sadece input gathering ve onay — execution target SKILL'e bırakılır.

### Adım 8 — Persist Intent

SKILL tamamlandıktan sonra (başarılı veya başarısız):

**1. `.claude/design-systems/last-intent.md` güncelle:**
```markdown
# Last Intent
**Updated:** 2026-04-14 14:23

## Selected Skill
generate-figma-screen

## Inputs
- device: iPhone 17
- design_system: ❖ SUI
- reference_benchmark: 139:3407
- (other inputs)

## Result
- output_node: 173:12130
- validation_score: 95/100
- duration: 18s
- status: ✅ Success

## User Confirmation
✅ Onaylandı 14:23
```

**2. `.claude/design-systems/intent-history.md` başına yeni entry ekle** (LRU 5, eskisi silinir).

## Fast Paths (Akıllı Kısayollar)

### Fast Path 1 — Detaylı Talep

Kullanıcı talebi zaten tüm input'ları içeriyorsa (örn. "139:3407'yi iPhone 17'ye SUI ile klonla"), Adım 5 atlanır. Direkt Adım 6 (onay) → Adım 7 (execute).

**Örnek:**
```
Kullanıcı: "139:3407'yi iPhone 17'ye SUI ile klonla"

Parse:
  - skill: generate-figma-screen (klonla keyword)
  - device: iPhone 17 (explicit)
  - ds: SUI (explicit + active-ds.md confirm)
  - reference: 139:3407 (explicit)
  - variants: single (default)

→ Direkt Adım 6: onay sor
→ Kullanıcı "Evet" → Adım 7: execute
```

### Fast Path 2 — Repeat

Kullanıcı "bir tane daha yap" / "aynısını yap" derse, `last-intent.md`'yi oku ve tek bir soruyla onay al:

```
"Öncekiyle aynı ayarlarla mı devam edeyim?
 
 • Skill: generate-figma-screen
 • Device: iPhone 17
 • DS: ❖ SUI
 • Yaklaşım: clone-to-device

 [✅ Aynı]
 [✏️ Değiştir]
 [❌ İptal]"
```

### Fast Path 3 — Partial Reuse

Kullanıcı "aynı ama Android'de" derse, `last-intent.md`'nin çoğunu reuse et, sadece değişen alanları sor:

```
State'ten reuse: ds, reference, type, sections, variants
Kullanıcıdan sor: device = Android (hangisi? - Compact/Medium)
```

## Ambiguity Handling

### Durum 1 — Belirsiz talep

```
Kullanıcı: "figma'da bir şey yap"

Router: Tek SKILL eşleşmedi.

AskUserQuestion:
"Ne yapmak istediğini netleştirebilir misin?
 (a) Yeni ekran oluştur
 (b) Mevcut ekranı DS'ye uydur (reconcile)
 (c) Dosyayı denetle / rapor çıkar
 (d) Figma → kod üret
 (e) Başka — açıklayarak yaz"
```

### Durum 2 — Çoklu eşleşme

```
Kullanıcı: "SUI ile bir şey yap"

Router: 4 SKILL match (create, apply, audit, library).

AskUserQuestion:
"SUI ile ne yapmak istiyorsun?
 (a) Yeni ekran oluştur (generate-figma-screen)
 (b) Mevcut ekrana SUI uygula (apply-figma-design-system)
 (c) SUI uyumu denet (audit-figma-design-system)
 (d) SUI library'ye component ekle (generate-figma-library)"
```

### Durum 3 — Yanlış SKILL seçme riski

Kullanıcı "token oluştur" derse:
- Yanlış: `generate-figma-screen` (token yok o)
- Doğru: `generate-figma-library` (DS kütüphane inşası, içinde token creation var)
- Alternatif: `design-token-pipeline` (external token sync)

Router **sorar:**
```
"Token işi için:
 (a) Figma'da yeni variable/token oluştur (library)
 (b) Kod tarafındaki token'ları Figma'ya sync et (pipeline)
 (c) Figma token'larını CSS/Swift/Kotlin'a export et (pipeline)"
```

## Anti-Patterns (Claude'un Yapmaması Gerekenler)

❌ **YANLIŞ:** Kullanıcı "ekran yap" deyince direkt `figma_create_frame` çağırmak.
✅ **DOĞRU:** Önce Adım 1-6 uygula, onay al, sonra target SKILL'i çalıştır.

❌ **YANLIŞ:** 4 ayrı AskUserQuestion ile tek tek sormak.
✅ **DOĞRU:** Mümkün olan en az sayıda AskUserQuestion çağrısı (tek çağrıda 4 soru).

❌ **YANLIŞ:** "Default iPhone 13 kullanayım" diye kendi kendine varsayım yapmak.
✅ **DOĞRU:** Device bilgisi yoksa **sor**. Varsayım yapma.

❌ **YANLIŞ:** Onay aşamasını atlamak ("zaten açık") diye execute'a geçmek.
✅ **DOĞRU:** Her zaman Adım 6'yı uygula. Fast path bile onay sorusu sorar.

❌ **YANLIŞ:** `last-intent.md`'yi görmezden gelip her seferinde baştan sormak.
✅ **DOĞRU:** Aynı session'da ikinci talep → repeat path.

❌ **YANLIŞ:** Bir SKILL'i yükleyip sonra metadata'sını okumamak.
✅ **DOĞRU:** Target SKILL'in `required_inputs`'ını ALWAYS parse et.

## Referanslar

- Her F-MCP SKILL'in `required_inputs` metadata'sı — bu router'ın kullandığı shape
- `.claude/design-systems/active-ds.md` — DS context (v1.8.0+)
- `.claude/design-systems/last-intent.md` — son tamamlanan intent
- `.claude/design-systems/intent-history.md` — son 5 intent LRU
- `src/core/instructions.ts` — FMCP_INSTRUCTIONS "INTENT ROUTER ENTRY" bölümü (v1.8.1+)

## Evolution Triggers

- Yeni F-MCP SKILL eklendiğinde: Adım 1 keyword tablosuna ekle
- SKILL'e yeni input eklendiğinde: Adım 4'ün parse mantığı metadata'yı otomatik yakalar, router'ı güncellemeye gerek yok
- Kullanıcı geri bildirim verirse ("çok soru soruyorsun"): Fast path'lerin aktivasyon eşiklerini düşür
