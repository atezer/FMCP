---
name: fmcp-screen-orchestrator
description: DS-compliant Figma ekran üretimi için platform-agnostic orkestratör skill. DS GATE, Fast Path routing, intake mode, error recovery.
metadata:
  mcp-server: user-figma-mcp-bridge
  version: 3.0.0
  priority: 95
  phase: orchestrator
  personas:
    - designer
    - uidev
  token_budget: condensed-first
required_inputs:
  - name: intake_mode
    type: "enum: text_only | figma_benchmark | image_uploaded | image_url | no_idea"
  - name: task_description
    type: string
  - name: source_ref
    type: "string | null"
---

# FMCP Screen Orchestrator

## Essentials

### Ortak Protokol

1. **Skill Registry** açık — tahmin yasak, sezgisel Read() yasak
2. **Intent Routing** — belirsiz → Read fmcp-intent-router
3. **Cheap-First** — `depth=1`, `verbosity="summary"`, screenshot sadece onay kapısında, ≤5 execute
4. **Cache-First** — `.claude/design-systems/<lib>/` cache'i API'den ÖNCE oku
5. **Onay Kapıları** — approach / destructive / evolution / 3. audit fail
6. **Self-Audit** — `figma_validate_screen(nodeId, minScore=80)` ZORUNLU
7. **Skill Evolution** — iki aşamalı onay + `# DRAFT — PENDING APPROVAL` banner
8. **Türkçe Raporlama** — metrik bloğu zorunlu

### Skill Registry

| Skill | Trigger | Common case? |
|---|---|---|
| `fmcp-intent-router` | Belirsiz intent | Sadece belirsizlikte |
| `inspiration-intake` | image/figma_benchmark | Sadece bu modlarda |
| `generate-figma-screen` | Net screen creation | HER ZAMAN (ana motor) |
| `figma-canvas-ops` | Her figma_execute öncesi | HER ZAMAN (pre-flight) |
| `fmcp-screen-recipes` | Fast Path match | Sadece Fast Path'te |
| `apply-figma-design-system` | Mevcut ekranı DS'ye hizala | Sadece remediation |

### Adım 0 — DS GATE (MUTLAK İLK KAPI)

```
1. Read(".claude/design-systems/active-ds.md")
2. ✅ Aktif → Library Name not al, devam
   ❌ Seçilmedi veya dosya yok → DUR, kullanıcıya "Hangi DS?" sor, hiçbir figma_* çağırma
```

DS belirsizken `figma_get_file_data`, `figma_search_assets` çağırmak YASAK. İstisnalar: `figma_get_status()`, filesystem read, Claude vision.

### Adım 0.5 — Fast Path Check

5 koşulun HEPSİ TRUE → `fmcp-screen-recipes` Read, recipe uygula:
1. Tek ekran (multi-screen değil)
2. Standart tip (login/payment/profile/list/detail/form/onboarding/dashboard/settings)
3. DS aktif
4. Platform belli (explicit keyword VEYA önceki intent'ten saved). Yoksa DUR, kullanıcıya sor. Default varsayım YASAK.
5. Animation/prototype YOK

Biri bile FALSE → Karar Akışı'na geç. Recipe kırılırsa da fallback.

### Karar Akışı

```
1. Intent net mi? EVET → sub-skill / HAYIR → Read fmcp-intent-router
2. image/figma_benchmark → Read inspiration-intake → structural_intent JSON
3. figma_execute yazacak mı? EVET → Read figma-canvas-ops
4. Ana motor → Read generate-figma-screen
5. build-from-scratch vs clone-to-device
```

### DS Fallback Chain

1. **DS component instance** — en çok tercih
2. **DS primitive variant** — yakın variant + setProperties
3. **Token-bound primitive** — createFrame + tüm fill/padding/radius variable'a bağlı → meşru, ihlal DEĞİL
4. **Hardcoded shape** → GERÇEK İHLAL, DUR, kullanıcıya bildir

### Resmi Figma MCP Yasağı

`Figma:*` prefix'li tool'lar (mcp.figma.com) ASLA çağrılmaz. Sadece `figma_*` (figma-mcp-bridge) kullan. `figma_search_assets` boş → Rule 24 fallback (manuel instance scan), `Figma:search_design_system`'e düşME.

### Filesystem MCP

Skill Read için: `mcp__fmcp-filesystem__read_text_file(path="<absolute_path>/skills/<skill>/SKILL.md")`. Claude Desktop'ta prompt'ta absolute path belirtilmeli.

### Self-Audit Gate + Verification

```
figma_validate_screen(nodeId=<wrapper_id>, minScore=80)
```
- `<80` → SEVERE violation'ları oku, düzelt, yeniden validate
- 3 deneme fail → kullanıcıdan rebuild onayı al

Teslim öncesi kontrol: validate ≥80, ham shape yok, tüm değerler token'a bağlı, auto-layout eksiksiz, Türkçe rapor + metrikler.

### Rapor Formatı

```markdown
## 🎨 Ekran Üretimi — <ekran_adı>
**Mod:** <intake_mode> | **DS:** <active-ds> | **Yaklaşım:** <approach>
### Sonuç
<Figma node link>
📊 Metrikler: skill'ler, API çağrı, cache hit/miss, execute sayısı, validate score
```

---

## Advanced — Only Load If Needed

Bu bölüm: karmaşık intake, 3. audit fail, skill evolution, non-obvious error durumlarında okunur.

### Inspiration Handoff Contract

`inspiration-intake` → `structural_intent_json` üretir (layout_direction, sections, hierarchy_notes, spacing_intent). `generate-figma-screen` ise `reference_benchmark` olarak nodeId bekler. Handoff prompt-level'da yapılır:
1. structural_intent_json'u orchestrator context'te tut
2. generate-figma-screen'e: `reference_benchmark: "none"`, structural hints'i prompt context olarak ekle
3. Hints'ten sadece layout/hiyerarşi al, DEĞER ASLA (renk/font/spacing DS'den gelir)

### Intake Mode Router

```
text_only         → (belirsizse intent-router) → generate-figma-screen
figma_benchmark   → inspiration-intake → generate-figma-screen (build-from-scratch)
image_uploaded    → inspiration-intake (vision) → generate-figma-screen
image_url         → inspiration-intake → WebFetch dener → başarısızsa kullanıcıdan upload iste
no_idea           → Kullanıcıya sor: ekran türü, kitle, içerik blokları, estetik → generate-figma-screen
```

### Inspiration Only Rule

Benchmark/görselden DEĞER alma YASAK. Sadece NİYET: layout yönü, hiyerarşi, bölüm sırası, spacing intent. Tüm değerler DS'ten.

### Step-by-Step Mode (≤5 execute)

1. **Skeleton** — wrapper + section frame'leri → screenshot → onay
2. **Content** — DS instance yerleşimi → screenshot → onay
3. **Polish** — spacing, states, edge cases → son screenshot → audit

### v1.9.5 Discovery Budget Rule (SERT)

- **Maks 3 discovery çağrısı** (figma_get_*, figma_search_*, figma_execute read-only) sonra plan sun.
- Plan kullanıcıya 1-2 cümle + varsa özet: "Şu ekran/section'ları oluşturacağım: [liste]. Onay veriyor musun?"
- Kullanıcı onay verdikten sonra **mutation** aşamasına geç (figma_execute createFrame/setFills/setBoundVariable) — discovery counter reset olur.
- Plugin 8 çağrıdan sonra `_warnings: ["DISCOVERY_BUDGET_WARNING..."]` döner — görünce üretime geçmek zorundasın.
- 12 çağrıdan sonra `_DISCOVERY_BUDGET_EXCEEDED_BLOCKING: true` döner — **skip edilemez**, plan sun veya dur.

### v1.9.5 Screenshot Method Selection (KARAR AĞACI)

Ekran yakalama isteği olduğunda şu ağacı takip et:

```
İhtiyaç ne?
├── "Planlama yapacağım, layout anlamak istiyorum" → returnMode: "summary" (metadata, screenshotsuz)
├── "Kullanıcıya son halini göstereyim" → returnMode: "file" (1 screenshot dosyaya)
├── "Büyük/scroll'lu ekran, bölümleri görmek istiyorum" → returnMode: "regions", regionStrategy: "children"
├── "Üretim sonrası hızlı validation" → returnMode: "file"
├── "Spesifik region (örn Hero)" → single-node file veya regions children maxRegions=3
└── "Base64 context'te gerekli (nadiren)" → returnMode: "base64" (explicit, _warning ile)
```

**Budget farkındalığı:**
- Bir oturumda >3 farklı nodeId için screenshot → 4. için zorunlu `summary` veya `regions`
- Response'da `_warnings: ["CONTEXT_NEAR_LIMIT"]` veya `"DISCOVERY_BUDGET_..."` görürsen → sonraki screenshot zorunlu `summary`
- Pixel-perfect değil, **region-perfect** düşün: "Hero'yu göreyim, gerekirse Actions'ı da" — hepsi birden değil

**Kritik:** Screenshot YASAK değil. "Yasak" yerine **doğru yöntem** kullan. Her mode'un kullanım amacı var.

### Error Recovery

| Hata | Aksiyon |
|---|---|
| Plugin kopması | `figma_get_status()` kontrol, gelmezse bildir |
| Tool timeout | Scope daralt, 1 retry, sonra raporla |
| SEVERE violation | Oku, düzelt, audit döngüsüne sok |
| Truncated response | Küçük scope ile yeniden iste |
| 3. validate fail | Kullanıcıya raporla, rebuild öner |

### Skill Evolution

1. Gap onayı: kullanıcıya "yeni skill mi, mevcut edit mi?" sor
2. İçerik onayı: yeni skill `# DRAFT — PENDING APPROVAL` banner ile, edit ise unified diff göster, onay → uygula

### Platform Notes

- **Claude Code:** Sub-agent isolation, cache: `.claude/design-systems/`
- **Cursor:** `.cursor/rules/` referans, sub-agent yok, `.cursor/mcp.json` gerekli
- **Claude Desktop:** Project knowledge'a yükle, ilk prompt'ta explicit referans ver
