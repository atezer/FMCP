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

### Adım -1 — FMCP Cache Pre-Flight (BLOCKING — v3.1+ MUTLAK İLK ADIM)

ANY `figma_*` tool çağırmadan ÖNCE:

```
1. figma_resolve_active_ds()  ← server-side cache read, plugin gerekmez
2. response.status'a göre:
   ✅ "fresh" → cache_mode = FMCP_CACHE_HIT, libraryName not al, Adım 0.5'e atla
   ⚠️ "stale" → cache_mode = FMCP_CACHE_STALE, fallback chain (Rule 24.1+) hazır
   ❌ "missing" → cache_mode = FMCP_CACHE_MISS, Adım 0'a düş (klasik DS GATE)
```

**Cache hit'te YASAK eylemler:**
- `figma_execute` ile token discovery (`getAvailableLibraryVariableCollectionsAsync` vb.)
- `figma_search_components(currentPageOnly=false)` runtime instance scan
- `figma.currentPage.findAll(INSTANCE)` — başka sayfaları tarama
- Kullanıcıya "library URL/file-key ver?" sorusu — cache zaten cevaplıyor

**Cache hit'te ZORUNLU akış:**
1. `figma_get_library_components(libraryName, filter?)` → componentKey listesi
2. `figma_get_library_tokens(libraryName, filter?)` → variableKey listesi
3. `importComponentByKeyAsync(key)` + `importVariableByKeyAsync(key)` → direkt üretim

**⚠️ CACHE KAPSAM SINIRI (v3.1+ MUTLAK — text styles + mode swap):**

Cache SADECE variable key'leri (renk/spacing/radius) ve component key'leri içerir. Text styles ve mode ID'leri için **farklı yollar** gerekir — bunları REST API ile çekmeye çalışma, cache miss değil, **mimari olarak başka kaynak**:

**1. Text styles (typography) → SEED INSTANCE + `findAll(TEXT)` + `getStyleByIdAsync`:**

SUI remote library'dir; `getLocalTextStylesAsync()` 0 döner. Canonical pattern `fmcp-screen-recipes` **Adım 1.6**'dadır — orchestrator bu adımı çağırır, kod duplicate etmez:

```js
// Adım A: Sayfa boşsa (Page 4 senaryosu) seed instance — componentKey cache'ten
const seedInst = (await figma.importComponentByKeyAsync(navTopBarKey)).createInstance();
figma.currentPage.appendChild(seedInst);

// Adım B: findAll(TEXT) → her textStyleId için getStyleByIdAsync
// → styleMap (id/name/fontSize/fontName) + roleMap (display/title/body/caption/button)
// → fontFamilies = unique style.fontName.family listesi
// (Tam kod fmcp-screen-recipes Adım 1.6'da)

// Adım C: seedInst.remove() ile temizle (veya ekranın parçası olacaksa tut)
```

Sonuç: `roleMap[role].id` → `setTextStyleIdAsync(id)`, `fontFamilies[0]` → `loadFontAsync({family})`.

YASAK:
- `getLocalTextStylesAsync()` — remote library styles'ı dönmez, SUI'de 0 döner
- `figma_rest_api /v1/files/<consumer_file>/styles` — tüketici file'da style metadata yok
- Hardcoded `family: "Inter"` — Adım 1.6'dan dönen `fontFamilies[0]` kullan (SUI için: `SHBGrotesk`)

**2. Dark variant — VARSAYILAN: TEK FRAME, Figma toggle ile preview**

Semantic Colors collection zaten **mode-aware**. Frame Light fill'leriyle (ve tüm bound variable'larla) oluşturulduğunda, kullanıcı Figma'da `Semantic Colors (S Theme)` dropdown'undan **Auto/Light/Dark** arasında **preview** eder. İki ayrı frame YAYGIN OLARAK GEREKMEZ.

**Kural:**
- **Default (kullanıcı sadece "ekran yap" dedi):** Tek frame üret, Light mode'da bıraj. Kullanıcı Dark'ı Figma UI'dan görebilir.
- **Clone YAP — SADECE şu durumlarda:**
  - Kullanıcı explicit "Light + Dark iki ayrı frame" istedi
  - Deliverable "Light + Dark yan yana karşılaştırma" gerektiriyor (spec dokümanı, handoff)

**Clone gerektiğinde uygulama:**
```js
// tokens.md "Collection Info" — cache'ten hazır:
// Semantic Colors collectionKey: 6041ac29aa893c975d9e5da4a5f4cf5a3e5d65e1
// Light modeId: 3015:2  |  Dark modeId: 3019:3

const coll = await figma.variables.importVariableCollectionByKeyAsync("6041ac29aa893c975d9e5da4a5f4cf5a3e5d65e1");
const darkFrame = lightFrame.clone();
darkFrame.setExplicitVariableModeForCollection(coll.id, "3019:3");
// fill rebind YOK, variable swap YOK, ayrı component import YOK.
```

YASAK:
- Kullanıcı istemeden Dark klonu oluşturma (Figma toggle zaten var)
- Tek tek fill'leri Dark'a yeniden bağlama
- "Dark" isimli token arama — mode collection zaten işi yapıyor

**3. Multi-Library Subscription (v3.1.4+ Phase G):**

SUI ekosistemi tek library değil — `❖ SUI` (ana) + `❖ SUI Mobil` (mobil UI) + başkaları. Her component belirli bir library'de yayımlanmıştır; `importComponentByKeyAsync(key)` hedef Figma dosyasının **ilgili library'yi subscribe etmiş olması** durumunda çalışır.

**Kaynak:** `figma_get_library_components` response'u her item'da `sourceLibrary` (örn. `❖ SUI Mobil`) field'ı döner. Ayrıca top-level `requiredLibraries: string[]` ve gerekirse `_warnings: ["REQUIRED_LIBRARIES: ..."]` verir.

**Kural — ilk figma_execute öncesi kontrol:**
1. `figma_get_library_components` response'undan `requiredLibraries` oku
2. Eğer `requiredLibraries.length > 1` (yani mobil + ana gibi birden çok library) → kullanıcıya **onay sorusu sor**:
   > *"Bu ekran için `❖ SUI` ve `❖ SUI Mobil` library'lerinin ikisi de subscribe olmalı. Figma'da Assets panelini açıp her ikisinin enabled olduğunu onaylar mısınız?"*
3. Onay geldikten sonra üretime geç.

**importComponentByKeyAsync fail ederse** (`Could not find a published component with the key`):
- Component'in item'ına bak → `sourceLibrary` değeri ne?
- Kullanıcıya **kesin olarak** söyle: *"`<component name>` `<sourceLibrary>` library'sinde. Assets → Libraries → `<sourceLibrary>`'yi enable edin, sonra tekrar deneyin."*
- YASAK: fallback olarak `figma_search_assets` ile aynı component'i başka yerden aramak — key zaten scope'lu, boşuna denenir.

**4. LIBRARY_MISMATCH error handling:**
Server tool `_warnings: ["LIBRARY_MISMATCH"]` dönerse (user istediği library ≠ active.md'dekiyle):
- Kullanıcıya: *"active-ds.md'deki library `<ctx.libraryName>` olarak kayıtlı, siz `<requested>` dediniz. Hangisini kullanayım?"*
- Yanıta göre `~/.claude/data/fcm-ds/active.md`'yi güncellemek için `/ds-select` komutunu öner.
- YASAK: sessizce farklı library'ye geçmek, başka file'ları taramak.

**Token hedefi:** Cache hit'te bir ödeme/login/form ekranı **≤8 tool call** total (variable cache + component cache + 1 runtime text style discovery + 2-3 execute + validate).

**`_nextStepObj` izleme (v2.0+ — server-driven sequencing):** Her `figma_*` tool response'unda `_nextStepObj: { tool, args_hint?, reason }` alanı varsa, agent BİR SONRAKİ tool'u bu öneriden çağırır. Kullanım akışı:

```
response.json.parse → _nextStepObj varsa →
  next_tool_name = obj.tool
  next_args = obj.args_hint  (opsiyonel override)
  rationale = obj.reason  (kullanıcıya/rapora yaz)
→ tool çağır
```

Server cache zincirinde otomatik sequencing: `figma_resolve_active_ds` (fresh) → `_nextStepObj: figma_get_library_components` → `_nextStepObj: figma_get_library_tokens` → `_nextStepObj: figma_execute`. Agent karar ağacını her call'da yeniden yürütmez — server seqüans gönderir.

**Backward compat:** Legacy `_nextStep` string alanı hâlâ mevcut (v1.9.7+); `_nextStepObj` yoksa agent klasik karar ağacına düşer. İki alan bir arada ise **objeyi tercih et**.

### Adım 0 — DS GATE (Cache MISS yolu)

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

### v1.9.7 Anti-Suppression Kuralı (MUTLAK — HARD enforcement)

BLOCKING response gördüğünde YASAK ifadeler:
- "bu projede geçerli değil"
- "dosyada DS yok, bu uyarılar önemsiz"
- "şimdilik skip edelim"
- "sonra düzeltiriz"
- "yine de devam ediyorum"

**Server seviyesi enforcement (Katman 3):** Claude BLOCKING flag gördükten sonra **aynı nodeId** üzerinde ikinci `figma_execute` mutation yaparsa server **HARD_ERROR** döndürür — tool fail eder, response değil error. Claude bunu skip edemez.

**Override escape hatch:** Sadece kullanıcı onayı ile `// FORCE_OVERRIDE` comment'i kod başına ekleyerek bypass edilebilir.

**ZORUNLU davranış BLOCKING gördüğünde:**
1. BLOCKING'i OKU — hangi nodeId, hangi kategori? (_postExecuteViolations.violations)
2. Kök nedeni analiz et:
   - UNBOUND_FILL → setBoundVariableForPaint eksik
   - UNBOUND_PADDING → setBoundVariable eksik
   - UNBOUND_TEXTSTYLE → setTextStyleIdAsync eksik
   - NO_INSTANCE_USAGE → DS component yok, import edilmeli
3. Kullanıcıya sor SADECE şu koşullarda:
   - DS gerçekten yok → Adım 0 Blank File sub-check'e dön (4 option)
   - Override gerekli → "BLOCKING'i geçici bypass etmek istiyor musun?"
4. Kullanıcı override isterse `// FORCE_OVERRIDE` comment ile kod tekrar çalıştır
5. Aksi takdirde kodu DÜZELT ve retry

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
