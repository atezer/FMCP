---
name: fmcp-screen-orchestrator
description: DS-compliant Figma ekran üretimi için platform-agnostic orkestratör skill. Text / image_uploaded / image_url / figma_benchmark / no_idea girdilerinden yola çıkıp DS component + token binding + auto-layout ile ekran üretir. Her platformda çalışır (Claude Code agent / Cursor / Claude Desktop / Claude Web). Condensed-first: Essentials bölümü %80 case'i kapsar, Advanced yalnızca edge case'lerde okunur.
metadata:
  mcp-server: user-figma-mcp-bridge
  version: 1.9.0
  priority: 95
  phase: orchestrator
  personas:
    - designer
    - uidev
  token_budget: condensed-first
required_inputs:
  - name: intake_mode
    type: "enum: text_only | figma_benchmark | image_uploaded | image_url | no_idea"
    description: "Kullanıcı girdisinin tipi. Claude otomatik tespit eder: Figma URL → figma_benchmark; HTTP URL → image_url; sohbette görsel → image_uploaded; 'bilmiyorum/öner' → no_idea; diğer → text_only"
  - name: task_description
    type: string
    description: "Kullanıcının ekran talebi (serbest metin)"
  - name: source_ref
    type: "string | null"
    description: "image_url için URL, figma_benchmark için nodeId, image_uploaded için 'chat_attachment', diğer → null"
---

# FMCP Screen Orchestrator

## Essentials (Üst Bölüm — %80 Case İçin Yeterli)

### Ortak Protokol (Condensed — full: `agents/_orchestrator-protocol.md`)

1. **Skill Registry** açık (aşağıdaki tabloda) — tahmin yasak, sezgisel Read() yasak
2. **Intent Routing** — belirsiz istekte önce `Read("skills/fmcp-intent-router/SKILL.md")`
3. **Cheap-First** — `figma_get_design_context`: `depth=1`, `verbosity="summary"`; screenshot sadece onay kapısında; ≤5 `figma_execute`
4. **Cache-First** — `.claude/design-systems/<lib>/` cache'i API çağırmadan ÖNCE oku (24h freshness)
5. **User Onay Kapıları** — approach seçimi / destructive action / skill evolution / 3. self-audit fail
6. **Self-Audit** — `figma_validate_screen(nodeId, minScore=80)` ZORUNLU (minScore her çağrıda explicit)
7. **Skill Evolution** — iki aşamalı onay, `# DRAFT — PENDING APPROVAL` banner ile yeni skill
8. **Türkçe Raporlama** — metrik bloğu zorunlu (skill listesi, API call, cache hit/miss, validate score)

### Skill Registry (Ref Only — Read() sadece karar anında)

| Skill | Dosya yolu | Trigger | Common case lazım mı? |
|---|---|---|---|
| `fmcp-intent-router` | `skills/fmcp-intent-router/SKILL.md` | Belirsiz intent | Sadece belirsizlikte |
| `inspiration-intake` | `skills/inspiration-intake/SKILL.md` | image_uploaded / image_url / figma_benchmark | Sadece bu 3 modda |
| `generate-figma-screen` | `skills/generate-figma-screen/SKILL.md` | Net screen creation | **HER ZAMAN** (ana motor) |
| `figma-canvas-ops` | `skills/figma-canvas-ops/SKILL.md` | Her `figma_execute` öncesi | **HER ZAMAN** (pre-flight) |
| `apply-figma-design-system` | `skills/apply-figma-design-system/SKILL.md` | Mevcut ekranı DS'ye hizala | Sadece remediation |
| `figma-screen-analyzer` | `skills/figma-screen-analyzer/SKILL.md` | Üretim sonrası PO rapor | Sadece açıkça istenirse |

### 🚨 Adım 0 — DS GATE (MUTLAK İLK KAPI — v1.9.1+)

**Karar Akışı'ndan ÖNCE, herhangi bir `figma_*` tool çağrısından ÖNCE, herhangi bir sub-skill Read'inden ÖNCE İLK İŞ:**

```
1. Read(".claude/design-systems/active-ds.md")
2. Status kontrolü:
   ├─ Status: ✅ Aktif      → DS net, Karar Akışı'na geç
   ├─ Status: ❌ Henüz seçilmedi → DUR, HİÇBİR TOOL ÇAĞIRMA, kullanıcıya sor
   └─ Dosya yok             → DUR, HİÇBİR TOOL ÇAĞIRMA, kullanıcıya sor
```

**DS belirsizse kullanıcıya sorulacak mesaj (kelime kelime kalıp değil, öz):**
> "Aktif bir design system belirlenmemiş. Nasıl ilerleyelim?
>
> 1. Mevcut library'lerden birini seçelim — hangi DS'leri kullanmak istediğinizi söyleyin
> 2. Default olarak SUI kullanılsın (kayıtlı ise)
> 3. Alternatif spesifik bir DS adı / library key verin
>
> Cevabınızı bekliyorum. Yanıt gelmeden hiçbir keşif veya tarama yapmayacağım."

Kullanıcı cevapladıktan sonra:
1. `active-ds.md`'yi güncelle (`Status: ✅ Aktif`, `Library Name: <seçim>`)
2. **SONRA** Karar Akışı'na geç

**Neden bu kadar katı:** DS belirsizken `figma_get_file_data`, `figma_search_assets`, `figma_get_library_variables` çağırmak → **kullanıcının istemediği library'ler taranır**, token israfı, yanlış component önerisi, çelişkili rapor. Test geçmişinde gözlenen hata: benchmark Figma dosyasının tüm library component'leri enumere edildi (24+), sonra "hangi DS?" soruldu. **Bu sıra YASAK.**

**İstisnalar (DS gate'ten ÖNCE çağrılabilir):**
- `figma_get_status()` — plugin bağlantı kontrolü, DS bağımsız
- `mcp__fmcp-filesystem__read_file` — state dosyalarını okumak için (active-ds.md, last-intent.md)
- Kullanıcının yüklediği görsele Claude vision erişimi — local, MCP değil

**Başka hiçbir figma_* tool DS gate geçmeden çağrılmaz.**

### Karar Akışı (Hangi Sub-Skill'i Read Edeceğim?)

> **Ön koşul:** Adım 0 (DS GATE) geçildi, `active-ds.md` Status: ✅ Aktif.

```
1. Intent net mi?
   ├─ EVET → text_only / net açıklama: direkt sub-skill'e in
   └─ HAYIR / belirsiz → Read fmcp-intent-router, karar ver, SONRA hedef sub-skill

2. Intake modu image_uploaded / image_url / figma_benchmark mi?
   ├─ EVET → Read inspiration-intake, structural_intent JSON al
   │        (Not: inspiration-intake Figma file enumeration yapmaz —
   │         sadece görsel analizi veya nodeId bazlı structural read)
   └─ HAYIR → inspiration-intake'e DOKUNMA

3. Figma'ya gerçekten yazacak mıyım (figma_execute)?
   ├─ EVET → Read figma-canvas-ops (pre-flight rules, 20 kural)
   └─ HAYIR (sadece analiz) → canvas-ops'a DOKUNMA

4. Ana üretim motoru → Read generate-figma-screen (7 adımlı workflow)

5. Build-from-scratch mi clone-to-device mi?
   ├─ "alternatif/varyasyon/farklı/yeni/tasarla/redesign" keyword'leri →
   │   build-from-scratch KİLİTLİ, clone ASLA
   │   (authoritative: skills/fmcp-intent-router/SKILL.md:68-80)
   └─ "aynı ekranı X device'a klonla" → clone-to-device
```

### DS Fallback Chain

Her UI öğesi için sırayla dene:
1. **DS component instance** (`figma_search_assets` → `figma_instantiate_component`)
2. **DS primitive variant** (Button/Card/Text yakın variant, `setProperties` override)
3. **Token-bound frame** (`figma_create_frame` + her property `setBoundVariable`)
4. **HAM SHAPE ASLA** — bu katmana inersen DUR, kullanıcıya gap raporu ver

### Self-Audit Gate (Teslim Öncesi Zorunlu)

```
figma_validate_screen(nodeId=<wrapper_id>, minScore=80)
```
- Skor 3 boyutlu: instance coverage %40 + token binding %30 + auto-layout %30
- `< 80` → `_designSystemViolations` array'inden SEVERE'leri oku → hedefli düzelt → yeniden validate
- 3 deneme hâlâ fail → Advanced bölümüne in (error recovery matrix) ve kullanıcıdan "rebuild from scratch" onayı al

### Rapor Formatı (Çıktı Şablonu)

```markdown
## 🎨 Ekran Üretimi — <ekran_adı>

**Mod:** <text_only|figma_benchmark|image_uploaded|image_url|no_idea>
**DS:** <active-ds>
**Yaklaşım:** build-from-scratch | apply-ds | clone-device

### Sonuç
<Figma node link veya özet>

---
📊 Metrikler
- Kullanılan skill'ler: <liste>
- API çağrı sayısı: <n>
- Cache hit / miss: <h> / <m>
- figma_execute: <n> / 5 (hedef)
- figma_validate_screen score: <n> / 100
```

---

## Advanced — Only Load If Needed

**Bu bölümü Claude aşağıdaki koşullarda tarar ve uygular:**
- ⚠️ Intake modu karmaşık (nested benchmark, hybrid image + metin)
- ⚠️ 3. self-audit denemesi başarısız (skor <80 kalıcı)
- ⚠️ Skill evolution ihtiyacı (mevcut skill'lerden hiçbiri yetmiyor)
- ⚠️ Non-obvious error (örn. plugin bağlantı kaybı, timeout döngüsü)

Common case'de bu bölüm OKUNMAZ. Claude Essentials'ta kararı verdikten sonra doğrudan sub-skill'e geçer.

### Detay 1.0 — Inspiration Handoff Contract (KRİTİK — v1.9.0+)

`inspiration-intake` skill'inin çıktısı `structural_intent_json` formatındadır:
```json
{
  "layout_direction": "vertical|horizontal|grid",
  "sections": [
    { "role": "hero|nav|list|cta|...", "child_type_hints": [...] }
  ],
  "hierarchy_notes": "...",
  "spacing_intent": "dense|airy|standard"
}
```

`generate-figma-screen` skill'inin `required_inputs.reference_benchmark` parametresi ise `node_id_or_none` tipinde — yani **bir Figma nodeId bekler, JSON değil**. Doğrudan handoff yapılamaz (tip uyuşmazlığı).

**Doğru handoff protokolü:**

1. `inspiration-intake` çalıştıktan sonra `structural_intent_json`'u orchestrator context'inde tut
2. `generate-figma-screen`'i çağırırken required_inputs'a şöyle yedir:
   - `reference_benchmark`: `"none"` (literal string, Figma nodeId yok — görsel veya benchmark link'inden geldik)
   - `variants`: kullanıcının istediği varyantlar
   - `device`: kullanıcının belirttiği veya router'dan gelen cihaz
   - `design_direction`: aşağıda nasıl oluşturulacağı
3. **Structural hints'i prompt-level context olarak ekle** (ayrı bir required_input değil, Claude'un ana prompt bağlamına ilave):
   ```
   Structural intent (layout ipuçları, DEĞER ASLA):
   - Layout direction: <layout_direction>
   - Sections (sırayla): <sections summary>
   - Hierarchy: <hierarchy_notes>
   - Spacing intent: <spacing_intent>
   
   Bu ipuçları yalnızca layout/hiyerarşi içindir. Tüm renk/font/spacing DEĞERLERİ
   active-ds'ten gelir — structural_intent'ten ASLA pixel/color/font alınmaz.
   ```
4. `generate-figma-screen` Step 2 "screen understanding" bu hint bloğunu okur, section listesini ve hierarchy_notes'u layout kararlarına katar. Step 2.5 aesthetic direction `design_direction` parametresinden + active-ds'ten gelir.

**Önemli:** `design_direction` parametresini orchestrator kendisi **doldurmaz** — ya kullanıcıdan açıkça alır ya da brand profile'dan / DS default'tan üretir. Structural intent'ten "airy" gibi bir ipucu varsa design_direction'a **yorum olarak** eklenebilir ama değer olarak değil (örn. `design_direction: "minimal, bolca boşluk (structural intent: airy)"`).

**Özet:** Handoff script-level'da değil, prompt-level'da yapılır. `reference_benchmark` parametresi nodeId için ayrılmış, JSON handoff ayrı kanaldan (context injection) geçer.

### Detay 1 — Intake Mode Router (Genişletilmiş)

```
INPUT → detect mode → preprocess → handoff
├─ text_only         → (belirsizse Read fmcp-intent-router) → Read generate-figma-screen
├─ figma_benchmark   → Read inspiration-intake (figma_get_design_context
│  (Figma URL veya     depth=1 verbosity=summary, structural_intent JSON
│   node-id içerir)    — DEĞER ASLA) →
│                      Read generate-figma-screen (build-from-scratch)
├─ image_uploaded    → Read inspiration-intake (Claude vision — kullanıcı
│  (sohbette görsel)   görseli görür; yapısal analiz) →
│                      Read generate-figma-screen
├─ image_url         → 1. Read inspiration-intake
│  (dribbble vb.)      2. Skill Step 0a: WebFetch dener
│                      3. Text-only dönerse → kullanıcıdan sohbete yükleme iste
│                      4. Yükleme gelince image_uploaded moduna düş
└─ no_idea           → AskUserQuestion (tek turda 4 soru):
                       1. Ekran türü (listing/detail/form/dashboard)
                       2. Kitle/kullanım (B2C/B2B, mobile/desktop/web)
                       3. İçerik blokları (hero/liste/CTA/form/...)
                       4. Estetik yön (brand profile varsa o, yoksa sor)
                       → Read generate-figma-screen
```

**Not:** Platformlar arası fark:
- Claude Code: `AskUserQuestion` tool kullanılabilir
- Cursor / Claude Desktop / Claude Web: `AskUserQuestion` yok → Claude düz metinle sorar, kullanıcı düz metinle cevaplar, Claude cevabı parse eder

### Detay 2 — "Inspiration Only" Absolute Rule

- Benchmark'tan / görselden **değer alma** YASAK (renk hex, font ismi, radius px, spacing sayıları)
- Sadece **niyet** al: layout yönü, hiyerarşi, bölüm sırası, odak alanı, spacing intent (dense/airy/standard)
- Tüm değerler yüklü DS'in token/style'larından gelir
- `inspiration-intake` skill'i bu self-check'i yapar — orchestrator çıktıyı ikinci kez doğrular
- v1.8.2 keyword guard (authoritative: `skills/fmcp-intent-router/SKILL.md:68-80`): `"alternatif"`, `"varyasyon"`, `"farklı"`, `"yeni"`, `"tasarla"`, `"redesign"` → `approach=build-from-scratch` KİLİTLİ

### Detay 3 — Step-by-Step Mode (≤5 execute)

Büyük ekranlarda 3 aşama + onay kapısı:
1. **Skeleton** — wrapper frame + section frame'leri (auto-layout, padding token binding) → `figma_capture_screenshot` → kullanıcıya göster → onay kapısı
2. **Content** — DS instance yerleşimi + `setProperties` overrides (text, variant, state) → `figma_capture_screenshot` → onay kapısı
3. **Polish** — spacing fine-tune (Gestalt proximity), state variants, edge cases → son screenshot → self-audit gate

Screenshot **sadece** onay kapılarında. Ara adımlarda screenshot almaz.

### Detay 4 — Error Recovery Matrix

| Hata | Aksiyon |
|---|---|
| Plugin bağlantı kopması | `figma_get_status()` ile tekrar kontrol → geri gelmezse kullanıcıya bildir, devam etme |
| Tool timeout | Kapsamı daralt (`depth=0`, daha az node, `verbosity="summary"`), 1 kez retry, ikinci hatada raporla |
| `_designSystemViolations` SEVERE | Response'tan oku, her ihlali düzelt, self-audit döngüsüne sok |
| `_responseGuard` truncated | Daha küçük scope ile yeniden iste (single node, depth=0) |
| Transient MCP hatası | 1 kez retry, sonra dur ve raporla — sonsuz retry YASAK |
| Validate 3. denemede fail | Kullanıcıya raporla, "rebuild from scratch" önerisi için onay al |

### Detay 5 — Skill Evolution (Ortak Protokol Madde 7)

Mevcut skill ihtiyacı karşılamıyorsa:

**Aşama 1 — Gap onayı:** `AskUserQuestion` / düz metin soru ile kullanıcıya "yeni skill mi yarat, mevcut skill mi edit et?" sor. Gap'i ve kapsamı açıkla.

**Aşama 2 — İçerik onayı:**
- **Yeni skill:** `skills/<name>/SKILL.md` dosyasının en üstüne banner ile yaz:
  ```
  # DRAFT — PENDING APPROVAL
  # Bu skill henüz onaylanmadı. İkinci onay alınana kadar bu banner kalır.
  ```
  Path'i bildir, içerik onayı iste. Onay → banner'ı Edit ile kaldır, skill aktif.
- **Mevcut skill edit:** Önce unified diff'i mesaj olarak göster (Edit yapma). Onay → Edit ile uygula.

### Detay 6 — Platform-Specific Notes

**Claude Code (agent olarak çağrıldığında):**
- Sub-agent isolation: ana conversation context temiz kalır, orchestrator skill sub-agent context'e yüklenir
- `Task(subagent_type: "screen-builder")` → agent delegator bu skill'i Read eder
- Cache path: `.claude/design-systems/` → worktree/cwd'ye göre

**Cursor:**
- `.cursor/rules/fmcp-orchestration.md` bu orchestrator'ı referans eder
- Sub-agent yok → main context'te çalışır (~4K orchestrator yüklemesi)
- MCP: `.cursor/mcp.json` içinde `figma-mcp-bridge` tanımlı olmalı

**Claude Desktop:**
- Project knowledge'a yüklenmiş SKILL.md olarak erişilebilir
- **KRİTİK:** İlk prompt'ta kullanıcı explicit yazmalı: "Project knowledge'daki fmcp-screen-orchestrator.md'yi referans al ve uygula"
- Sonraki prompt'larda aynı oturumda otomatik kalır
- MCP: `claude_desktop_config.json` içinde `figma-mcp-bridge` tanımlı

**Claude Web:**
- Bridge cloud hosting yok (ertelenmiş milestone) → `figma_*` tool'ları çalışmaz
- Orchestrator skill plan-only modda çalışır: adımları metinle anlatır, "bunu Code'da çalıştır" uyarısı verir
- Project knowledge upload ile içerik erişilebilir, MCP Connector eklenene kadar mutation'sız

### Detay 7 — Verification Checklist (Self-Check)

Rapor teslimi öncesi orchestrator kendi kendini denetler:
- [ ] `figma_validate_screen(nodeId, minScore=80)` çalıştırıldı ve sonuç ≥80
- [ ] DS fallback chain'de ham shape kullanılmadı
- [ ] Tüm renk/radius/spacing token'a bağlı
- [ ] Auto-layout hiyerarşide eksiksiz
- [ ] Türkçe rapor metrik bloğu ile bitiyor
- [ ] Cache hit/miss rakamları raporda var

Bu checklist'ten biri fail → Advanced Error Recovery Matrix'e in.
