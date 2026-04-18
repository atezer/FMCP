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

## Protokol (9 Adım — v1.9.1+)

Kullanıcı F-MCP ile ilgili herhangi bir talep yaptığında Claude bu 9 adımı SIRAYLA uygular. Hiçbir adım atlanmaz.

### 🚨 Adım 0 — DS GATE + BLANK FILE CHECK (v1.9.7+ MUTLAK İLK KAPI)

**Herhangi bir intent analysis veya figma_* tool çağrısından ÖNCE:**

1. `figma_get_status` çağır — plugin bağlı mı, response'ta `_bootstrap` varsa direktifleri OKU (v1.9.7)
2. `.claude/design-systems/active-ds.md` dosyasını oku
3. `Status:` alanını kontrol et:
   - **`✅ Aktif`** → DS net, Blank File Sub-Check'e geç (madde 5)
   - **`❌ Henüz seçilmedi`** VEYA dosya yok → kullanıcıya DS sorusu sor (madde 4)
4. **DS Sorusu (klasik):** "Aktif bir design system belirlenmemiş. Hangi DS ile ilerlemek istersiniz? (SUI / Material / kendi library)"

5. **BLANK FILE SUB-CHECK (v1.9.7, ZORUNLU):** `figma_get_design_system_summary` çağır.
   - `components === 0 && componentSets === 0 && variableCollections.length === 0` ise **BOŞ DOSYA** tespit edildi.
   - `_nextStep: "BLANK_FILE_DIALOG_REQUIRED"` response'ta görünüyorsa, **kullanıcıya 4 seçenek sun** (AskUserQuestion tek call, 4 option):
     ```
     Q: "Bu dosyada henüz Design System yok. Nasıl ilerleyelim?"
     (a) Team library import — "Hangi library? SUI, Material 3, iOS HIG, veya kendi library'niz?"
     (b) Mini DS kur otomatik — figma_create_mini_ds tool'u çağrılır (12 color + 8 sizing + 3 text style + Button/Input/Card)
     (c) Referans DS kopyala — "Material 3 template / iOS HIG template"
     (d) DS'siz ilerle — linter tolerant mode, hardcoded değerler kabul (explicit acceptance)
     ```
   - **Seçim yapılmadan `figma_execute createFrame` YASAK.** Claude ham createFrame denerse plugin `_DESIGN_SYSTEM_VIOLATIONS_BLOCKING` flag'i döndürür, retry zorunlu olur.
   - Kullanıcı "(b)" derse Claude `figma_create_mini_ds({ primaryColor, fontFamily, name })` tek tool çağrısı yapar, sonra ekran üretimine geçer.
   - Kullanıcı "(a)" derse Claude `figma_get_library_variables(libraryName)` ile listeleme yapar, seçenek sunar.

6. Seçim sonrası `active-ds.md`'yi güncelle (`Status: ✅ Aktif`, `Library Name: <isim>`), sonra Adım 1'e geç.

**Neden bu kadar katı:**
- DS belirsizken `figma_search_assets`, `figma_get_file_data`, `figma_get_library_variables` çağırmak = kullanıcının istemediği library'leri enumere etmek = **token israfı + UX bozulması**
- Test geçmişinde gözlenen hata: benchmark Figma dosyasının 24+ library component'i enumere edildi, sonra "hangi DS?" soruldu. **Bu sıra YASAK.**

**Bu adımda çağrılabilen tek Figma tool'u:**
- ✅ `figma_get_status()` — plugin bağlantı kontrolü, DS bağımsız
- **Başka HİÇBİR figma_* YASAK.** `figma_get_file_data`, `figma_search_assets`, `figma_search_components`, `figma_get_library_variables`, `figma_get_variables`, `figma_get_styles` — **hepsi YASAK** ta ki Adım 0 geçilene kadar.

---

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
| "bu görselden ilham al", "şu resim gibi", "link'teki tasarımdan", "dribbble/behance", "benchmark'tan varyasyon" | `inspiration-intake` → `generate-figma-screen` |

**Not (v1.8.3+):** `inspiration-intake` bir **ön-işleme** skill'idir. Kullanıcı bir Figma benchmark linki, internet görsel linki veya sohbete yüklenmiş görsel ile gelirse önce bu skill çalıştırılır (structural_intent JSON üretir, DEĞER çıkarmaz), sonra çıktısı `generate-figma-screen`'in `reference_benchmark` parametresine beslenir. v1.8.2 build-from-scratch kuralı ile tam uyumludur — clone değil, inspiration.

Mode tespiti:
- Figma URL pattern (`figma.com/file/...?node-id=`) → `inspiration-intake` (source_type: figma_url)
- Dribbble/Behance/genel HTTP URL → `inspiration-intake` (source_type: image_url, WebFetch fallback'li)
- Kullanıcı mesajında görsel attachment → `inspiration-intake` (source_type: image_uploaded)

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

### Adım 3b — Approach Karar Mantığı (v1.8.2+)

Target skill `generate-figma-screen` ise, **yaklaşım ayrımı** yap.
Kullanıcının cümlesinde şu keyword'leri ara ve `approach` input'unu doldur:

| Keyword | Yaklaşım | Tool Önerisi |
|---|---|---|
| "alternatif", "varyasyon", "farklı", "yeni", "tasarla", "redesign", "iyileştir" | `build-from-scratch` ⭐ | `figma_execute` + Step 5, **`figma_clone_screen_to_device` KULLANMA** |
| "aynı ekranı X device'a migrate et", "boyut değiştir", "iPhone 13→17", "klonla" | `clone-to-device` | `figma_clone_screen_to_device` |
| "mevcut ekranı DS'ye hizala", "tokenize et", "tokens bind et" | `apply-ds-to-existing` | `apply-figma-design-system` SKILL |
| Hiçbiri net değil | **Kullanıcıya sor** | — |

**⭐ ÖNEMLİ:** Eğer kullanıcı "3 alternatif" veya "varyasyon" derse, `approach = build-from-scratch` **DEFAULT**'tur. `figma_clone_screen_to_device` tool'u **ASLA önerilmez**. Clone tool'u kopyalama yaparken benchmark'ın **mevcut yanlışlıklarını** (hardcoded rectangle, missing token binding, non-responsive layout) kopyalar. Bu kullanıcının istediği **gerçek varyasyon yaratmaz**.

Eğer `approach = build-from-scratch` ise, Claude'un akış haritası:
```
figma_search_assets ile SUI bileşenlerini bul
  ↓
figma_get_library_variables ile DS token key'lerini topla
  ↓
figma_execute ile bölüm bölüm inşa et:
  - figma.createFrame() + layoutMode + padding (variable binding)
  - importComponentByKeyAsync + createInstance (DS instance'lar)
  - setBoundVariableForPaint (fills token bind)
  - setBoundVariable (padding/itemSpacing/cornerRadius token bind)
  - importStyleByKeyAsync + setTextStyleIdAsync (text style bind)
  - appendChild sonrası layoutSizingHorizontal/Vertical = FILL
  ↓
figma_validate_screen ile skor kontrolü (≥80)
```

**Özet + Onay ekranında göster:**
```
📋 Yaklaşım: build-from-scratch ⭐
 Bu kullanıcının "alternatif tasarım" isteğine uygun doğru yol.
 Clone tool kullanılmayacak. Her alternatif sıfırdan SUI bileşenleriyle inşa edilecek.
 Benchmark (139:xxx) sadece ilham kaynağı — kopyalanmayacak.
```

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

### v1.9.5 Elicitation Kuralı (SERT)

- **Maks 1 `AskUserQuestion` çağrısı** tüm oturum boyunca. Tekrar soru sormak yasak — state'ten veya context'ten çıkar.
- **"devam et" / "tamam" / "ok" / "yap" sonrası soru YASAK.** Kullanıcı onay verdi → üretime geç.
- User prompt'u anlamlıysa (spesifik ekran adı, boyut, DS veriliyorsa) **hiç sorma**, direkt planla ve göster.
- **"Sen seç"** cevabı alırsan: mantıklı default kullan (iPhone 17, mobile, single variant, active DS).
- Sorulan her soru ≤30 kelime — uzun elicitation yasak.
- Soruyu sormanın context maliyeti ≥ yanıtın değeri mi? Değilse sorma.

### v1.9.6 Negative Intent Detection (KRITIK)

Kullanıcı şu paternlerle **negatif/dışlayıcı** talimat verebilir — bunları ZORUNLU parse et:

| Kullanıcı paterni | Anlam | Nasıl handle et |
|---|---|---|
| "X'i atla" / "X'i kullanma" / "X'ten bahsetme" | X referansını DIŞLA | `exclude_references: ["X"]` state'e yaz, o node/page/frame'e referans verme |
| "X'e bakma" / "X yok say" / "X'i unut" | X sıfır-referans | Aynı |
| "Y benzetme" / "Y gibi olmasın" | Y anti-pattern | `anti_pattern_refs: ["Y"]` — Y'ye ters tasarım yap |
| "X dışında" / "X hariç" | Whitelist exclusion | `exclude_references: ["X"]` |
| "Sıfırdan" / "baştan" / "yeni tasarım" | Mevcut iterasyonları atla | `start_fresh: true`, ideation/iterasyon referansları atla |

**Örnek:**

```
Kullanıcı: "SUI Alt 3'e bakma, sıfırdan yeni bir Anasayfa tasarla"

PARSE:
  - exclude_references: ["SUI Alt 3", "241:11896"]  (SUI Alt 3 frame ID'si de dahil)
  - start_fresh: true
  - target_screen: "Anasayfa"
  - DS: active-ds.md'den çek

SONUÇ:
  - SUI Alt 3 sayfası referans alınmaz
  - Mevcut "SUI Alt 3 — Anasayfa" frame'i açılmaz, screenshot alınmaz
  - ideation sayfası (ilham) kullanılabilir ama SUI Alt 3 bölümü atlanır
```

**Anti-pattern:** Kullanıcı "SUI Alt 3 atla" dedikten sonra onu screenshot alıp referans göstermek. v1.9.6'da bu explicit yasak — pre-flight'ta `exclude_references` kontrolü yapılır.

**State persist:** `exclude_references` last-intent.md'ye yazılır; aynı oturum boyunca geçerli.

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

## Tool Failure Recovery Protocol (v1.8.2+)

Tool çağrısı başarısız olursa (timeout, error, unexpected result),
şu protokolü izle. **ASLA körü körüne retry yapma** — çöp birikir.

### Retry Kuralları

1. **İlk hata (timeout/error):** 1 kez retry et, **farklı parametre** ile:
   - `figma_clone_screen_to_device` timeout → küçük source node dene veya farklı targetDevice
   - `figma_execute` timeout → kod parçalarına böl, timeout param artır (max 30000)
   - `figma_validate_screen` timeout → minScore düşür veya daha küçük alt-node'a uygula
2. **İkinci hata (aynı tool):** **DUR**. Kullanıcıya git, strateji iste.
3. **ASLA** aynı tool + aynı param ile 3 kez çağırma.

### Orphan Cleanup (ZORUNLU)

Clone/create tool'ları timeout aldıysa **dosyada yarım iş kalmış olabilir**.
Her başarısız write-tool denemesi sonrası Claude cleanup protokolünü çalıştırır:

1. `figma_get_file_data(depth=1, verbosity="summary")` ile hedef sayfayı tara
2. Son 5 dakikada oluşmuş, beklenmedik isimde veya duplicate node'ları tespit et
3. Her şüpheli node için `figma_get_design_context` ile detayına bak (content sağlamı mı?)
4. Kullanıcıya listele:
   ```
   ⚠️ Timeout sonrası şu orphan node'ları buldum:
    1. 175:12172 "Hesaplarım — Hero Card — iPhone 17" (yarım, child count: 4)
    2. 175:12302 "Hesaplarım — Hero Card — iPhone 17" (yarım, child count: 8)
   
   Silmemi ister misin?
   [✅ Sil] [👁️ Önce screenshot göster] [❌ Kalsın]
   ```
5. Onay sonrası `figma_execute` ile `node.remove()` uygula

### Failure Escalation Template

2+ retry sonrası kullanıcıya şu formatla git:

```
⚠️ Alternatif N ({name}) oluşturulamadı.

**Denenen:**
- figma_clone_screen_to_device (2 timeout)
- figma_execute manual fallback (failed)

**Orphan node'lar (dosyada kaldı):** [list of IDs]

**Seçenekler:**
[A] Orphan'ları sil ve farklı kaynak node ile yeniden dene
[B] Orphan'ları sil ve bu alternatifi atla, Turn N+1'e geç
[C] Dur, test iptal — orphan'ları manuel sileyim
```

## Benchmark Selection Validation (v1.8.2+)

Kullanıcı benchmark node ID verdiğinde, Claude **HEMEN klonlamaya geçme**.
Önce benchmark'ı DOĞRULA:

### Adım 1: Node Tipini Kontrol Et

`figma_get_design_context(nodeId=<user_input>)` çağır ve `node.type`'ı kontrol et:

#### Eğer tip **PAGE** ise → Altındaki child'ları listele, kullanıcıya sor

```
Verdiğin node bir sayfa (PAGE). Altında şu adaylar var:

 1. Vadesiz TL — SUI v10 (Hero Card)       — 4 child (temiz, hızlı clone)
 2. Vadesiz TL — SUI v11 (Segmented)       — 5 child (temiz, hızlı clone)
 3. Vadesiz TL — SUI v12 (Dark Header)     — 3 child (temiz, hızlı clone)
 4. Hesaplarım                              — 14 child (kaba draft, yavaş)

Hangisi asıl benchmark? Önerim: 1/2/3 (temiz v-numaralı alternatifler).
```

#### Eğer tip **FRAME** ise → `childCount` kontrol et

- **≤ 5 child:** Kullan, hızlı
- **5-15 child:** Kullan ama kullanıcıyı bilgilendir: "Benchmark orta büyüklükte, clone ~30s sürebilir"
- **15-25 child:** **Uyar:**
  ```
  ⚠️ Benchmark {N} child içeriyor. Clone 60+ saniye sürebilir.
  
  Önerim:
  [A] Yine de kullan (sabırlı ol)
  [B] Parent'ın siblings'ini tara, daha küçük bir alternatif öner
  [C] Farklı bir benchmark seç
  ```
- **25+ child:** **DUR**. Otomatik parent'ın siblings'ini tara, daha küçük alternatifler öner. Büyük benchmark'ı onaysız kullanma.

#### Eğer tip başka ise (INSTANCE, COMPONENT, vs.) → Hata

"Benchmark FRAME olmalı. {type} tipinde node benchmark olarak kullanılamaz."

### Adım 2: Siblings Tara (PAGE/FRAME için)

Parent'ta sibling node'lar varsa, `✦`, `v10`, `v11`, `alternative`, `variant`
gibi keyword'lerle filtrele ve kullanıcıya alternatif öner:

```
Verdiğin benchmark: Hesaplarım (14 child)
Aynı parent'ta daha küçük ve temiz alternatifler var:
 - v10 Hero Card (4 child)
 - v11 Segmented (5 child)
Bunlardan birini kullanmak ister misin?
```

### Adım 3: Responsive/Auto-Layout Ön-Kontrol

Benchmark'ı klonlamadan önce onun **zaten** responsive olup olmadığını
kontrol et:

```js
// Claude figma_execute ile çalıştırır:
var n = await figma.getNodeByIdAsync(benchmarkId);
return {
  layoutMode: n.layoutMode,
  primaryAxisSizingMode: n.primaryAxisSizingMode,
  counterAxisSizingMode: n.counterAxisSizingMode,
  hasAutoLayout: n.layoutMode !== 'NONE',
};
```

Eğer `layoutMode === 'NONE'` ise **uyar:**
```
⚠️ Bu benchmark'ın auto-layout'u yok (layoutMode=NONE).
   Clone yaparsan yeni ekran da responsive olmayacak.
   
   Önerilen: clone yerine Step 5 "Build from Scratch" akışı kullan.
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
