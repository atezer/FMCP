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

### DS Library Registry (v3.3+ — Agent Just Knows)

Registry'nin **iki kaynağı** var; okuma sırası:

1. **`.claude/design-systems/registry.local.md`** (kullanıcıya özel, gitignore'lu) — Adım -2 oto-uyumlanma veya `/ds-add` tarafından otomatik yazılır. VARSA tek doğru kaynak budur.
2. Aşağıdaki şablon tablo (repo'da paylaşılan takım varsayılanları — placeholder ise yok say).

| Library Name | libraryFileKey | Açıklama |
|---|---|---|
| ❖ Ana-DS *(örnek)* | `<ANA_DS_FILE_KEY>` | Ana DS (web + mobile ortak bileşenler, tokenlar) |
| ❖ Ana-DS Mobil *(örnek)* | `<MOBIL_DS_FILE_KEY>` | Mobile-only bileşenler (navbar, bottomsheet, input...) |
| 🙂 Icons *(örnek)* | `<ICONS_FILE_KEY>` | Icon component library |
| 💼 Assets *(örnek)* | `<ASSETS_FILE_KEY>` | Illüstrasyon / asset kütüphanesi |

Kullanıcı registry'deki bir DS ile "X yap" dediğinde agent **otomatik** ilgili library'leri enumerate eder. Registry doluysa URL/file key SORMAZ.

### Adım -2 — Sıfır-Kurulum Oto-Uyumlanma (v3.5+ AUTO-ONBOARD)

**Amaç:** Kullanıcı HİÇBİR kurulum yapmadan "tasarım sistemimle bir ekran yap" diyebilmeli. Registry boşsa agent kullanıcının Figma ortamından DS'i KENDİSİ keşfeder ve kalıcılaştırır.

**Tetik:** DS gerektiren herhangi bir istek + `registry.local.md` YOK + şablon tablo placeholder.

**Keşif zinciri (sırayla, kullanıcıya SORMADAN):**

```
1. figma_list_connected_files
   → Bağlı dosyalar içinde library görünümlü olanlar (❖/icons/assets/DS/UI kit
     adlandırması, veya birden çok dosya açıksa hedef-dışı olanlar) → aday {name, fileKey}
2. figma_get_library_variables (hedef dosyada, query'siz, limit=20)
   → Subscribe edilmiş variable library'lerinin ADLARI (file key gerekmez).
     Bu adlar DS'in kimliğidir; token kaynağı da budur.
3. figma_search_assets(currentPageOnly=false)
   → Hedef dosyadaki instance'lardan mainComponent key'leri + kaynak library adları.
     importComponentByKeyAsync için file key GEREKMEZ — component key yeterli.
4. figma_get_status → REST token varsa ve adım 1'den fileKey geldiyse
   figma_enumerate_published_components ile envanteri zenginleştir.
```

**Kalıcılaştırma:** Bulguları `.claude/design-systems/registry.local.md` dosyasına yaz (Write tool):

```markdown
# DS Registry (otomatik keşif — <tarih>)
| Library Name | libraryFileKey | Keşif yöntemi |
|---|---|---|
| <ad> | <key veya bilinmiyor> | connected-file / team-library / instance-scan |
```

Sonraki tüm oturumlar bu dosyayı okur — keşif TEKRARLANMAZ (kullanıcı "DS'i yeniden tara" demedikçe).

**Soru hakkı = en fazla 1:** Zincirin 4 adımı da boş dönerse (hedef dosya hiçbir library'ye subscribe değil, hiç instance yok, hiçbir library dosyası açık değil) → kullanıcıya TEK soru: *"Design system kütüphanenin Figma linkini paylaşır mısın? (bir kez — kaydedeceğim)"* → cevabı registry.local.md'ye yaz. Aynı soru bir daha SORULMAZ.

**YASAK:** Registry veya keşif sonucu varken kullanıcıdan URL/file key/kütüphane adı istemek; keşfi her istekte baştan koşmak; kullanıcıdan manuel dosya düzenlemesi beklemek.

### Adım -1 — Live DS Discovery (v3.3+ MUTLAK İLK ADIM, cache-free, zero user input)

**Prensip (v3.3+):** Lokal cache YOK, kullanıcı input YOK. Agent DS Library Registry'den (yukarıda) URL'leri bilir, REST API ile canlı enumerate eder.

**Standart akış (kullanıcı registry'deki DS ile "X yap" dedikten sonra):**

```
1. figma_get_status()
   → plugin bağlantısı OK mi?

2. DS Library Registry'den libraryFileKey'leri oku (yukarıdaki tablo)
   → registry'deki library'ler (ana DS, mobil DS, icons...)

3. figma_enumerate_published_components(libraryFileKey, filter?) × 3  (REST)
   → Her library'nin published component'leri (name, key, kind)
   → Library file'ları AÇIK olmasına gerek YOK
   → REST token ilk kullanımda figma_set_rest_token ile set edilmiş olmalı
   → **KRİTİK — filter zorunlu (büyük library'lerde):**
     Büyük DS'lerde (1000+ component) filtersiz response 200K+ char → context patlar.
     Screen tipi için gerekli komponent'leri NAMED filter'la çek:
     - Payment: filter="button" → filter="input" → filter="radio" → filter="checkbox" → filter="divider" → filter="caption" → filter="label"
     - Sadece gereken component'leri al, "all" çağırma
     - Örnek: aranan component'in library'deki tam adını kullanın (örn. "NavigationTopBar")

4. figma_get_library_variables()  (teamLibrary API, live, open değil gerek)
   → Tüm variable'lar (spacing, radius, color) — cross-library

5. figma_execute (build):
   - seed component import (NavigationTopBar — text style discovery için)
   - Adım 1.6 (fmcp-screen-recipes) → roleMap + fontFamilies
   - loadFontAsync({ family: fontFamilies[0] })  (DS'inizin fontu)
   - skeleton + sections + bindings

6. figma_validate_screen → score ≥80
```

**Alt-patika (library file açıksa):** Agent `figma_list_connected_files` çıktısında registry'deki library file'ı varsa `figma_enumerate_library_components` (plugin, daha hızlı) tercih eder. Yoksa REST path.

**REST token eksikse:** `figma_set_rest_token`'ı TEK call ile (interactive wizard) set etmesini kullanıcıya öner. Olmadan devam ETME.

**URL SORMA YASAK:** Registry tablosu doluysa kullanıcıya "DS URL ver" sorusu **yasaktır**. Tablo boşsa bir kez sorup tabloya kaydedin.

### Auto-Defaults — Soru SORMA Tablosu (v3.3+ MUTLAK)

Kullanıcı bu bilgiyi zaten VERMİŞSE agent TEKRAR SORMAZ. User prompt'taki keyword'leri parse edip tablodan auto-resolve eder:

| User prompt keyword | Auto-resolve | Soru yasak |
|---|---|---|
| "iOS" / "iPhone" / "mobil" + payment/checkout/ödeme | `device: iPhone 17 (402×874)` | ❌ iPhone modeli sorma |
| "Android" + [screen_type] | `device: Android Compact (412×917)` | ❌ Android modeli sorma |
| "tablet" / "iPad" | `device: iPad Pro 11 (834×1194)` | ❌ Tablet boyutu sorma |
| Referans ekran görüntüsü verildi | `sections`: görseldeki bölümleri otomatik çıkar | ❌ "Hangi bölümler?" sorma |
| Library DS | `design_system: <registry'deki DS adı>` (+ mobile alt library otomatik) | ❌ "Hangi DS?" sorma |
| Tema belirtilmedi | `variants: Tek varyant (Light)` — Semantic Colors mode-aware, Dark toggle'la görülür | ❌ "Light/Dark?" sorma |

**Kullanıcı BİLDİRMEDİYSE** (prompt'ta keyword yoksa), default'ları **sessiz uygula**, tool call response'larına `auto_resolved: {...}` alanı ekle, kullanıcıya özet bildir. Sessiz devam.

**TEK İSTİSNA — onay gereken durumlar:**
- Destructive operation (mevcut ekranı sil/overwrite et)
- 3+ `figma_validate_screen` fail → rebuild önerisi
- Library yok veya key resolve fail (Phase G LIBRARY_MISMATCH)

Bunların dışında **figma_* çağrılarına direkt başla**. Soru sorma. User zaten onay vermiş sayılır.

**Cache tool'ları (KALDIRILDI — v3.3):**
- Eski cache tool'ları (`…resolve_active_ds`, `…get_library_components`, `…get_library_tokens`) artık MEVCUT DEĞİL. Çağırma — "unknown tool" hatası alırsın.
- Canlı karşılıkları: `figma_enumerate_published_components` (REST) / `figma_enumerate_library_components` (plugin) + `figma_get_library_variables`.

**Yeni keşif akışının YASAKları:**
- Local cache dosyasına (`~/.claude/data/fcm-ds/...`) bakma, hatta okuma — live path kullan
- Cache subset'e güvenip missing component olduğunda hemen fallback'e düşmek — önce LIVE enumerate'i deneyip gerçek durumu gör
- "Cache'te yok" diye pes etme — library file subscribe + enumerate yeterli

**⚠️ CACHE KAPSAM SINIRI (v3.1+ MUTLAK — text styles + mode swap):**

Cache SADECE variable key'leri (renk/spacing/radius) ve component key'leri içerir. Text styles ve mode ID'leri için **farklı yollar** gerekir — bunları REST API ile çekmeye çalışma, cache miss değil, **mimari olarak başka kaynak**:

**1. Text styles (typography) → SEED INSTANCE + `findAll(TEXT)` + `getStyleByIdAsync`:**

DS genellikle remote library'dir; `getLocalTextStylesAsync()` 0 döner. Canonical pattern `fmcp-screen-recipes` **Adım 1.6**'dadır — orchestrator bu adımı çağırır, kod duplicate etmez:

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
- `getLocalTextStylesAsync()` — remote library styles'ı dönmez, remote DS'lerde 0 döner
- `figma_rest_api /v1/files/<consumer_file>/styles` — tüketici file'da style metadata yok
- Hardcoded `family: "Inter"` — Adım 1.6'dan dönen `fontFamilies[0]` kullan (DS'inizin gerçek font ailesi)

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

**3. COMPONENT vs COMPONENT_SET — Doğru Import API (v3.1.5+ Phase H — KRİTİK):**

Figma Plugin API'de iki ayrı import fonksiyonu var:
- `figma.importComponentByKeyAsync(key)` → **sadece tekil COMPONENT** için. SET key verirsen **"Could not find a published component with the key"** hatası alırsın (yanıltıcı hata mesajı — gerçek sebep yanlış API kullanımı).
- `figma.importComponentSetByKeyAsync(key)` → **COMPONENT_SET (variant'lı)** için. Dönen `ComponentSetNode`'u `.defaultVariant.createInstance()` ile instance yap, sonra `setProperties()` ile variant seç.

**Kural:** `figma_enumerate_published_components` ve `figma_enumerate_library_components` response'ları her item'da `kind: "COMPONENT" | "COMPONENT_SET"` field döner — import fonksiyonunu buna göre seç.

```js
// DOĞRU pattern (kind'a göre dallan):
if (item.kind === "COMPONENT_SET") {
  const set = await figma.importComponentSetByKeyAsync(item.key);
  const inst = set.defaultVariant.createInstance();
  inst.setProperties({ "Type": "primary", "State": "default" });
} else {
  const comp = await figma.importComponentByKeyAsync(item.key);
  const inst = comp.createInstance();
}
```

**YASAK:** Variant'lı component'e (Button, NavigationTopBar, Badge vb.) `importComponentByKeyAsync` çağırmak. Daima `item.kind` kontrol et.

**4. Multi-Library Subscription (v3.1.4+ Phase G):**

Çoklu-library DS ekosistemleri tek library değildir — ana DS + mobil DS + icon/asset library'leri. Her component belirli bir library'de yayımlanmıştır; `importComponentByKeyAsync(key)` hedef Figma dosyasının **ilgili library'yi subscribe etmiş olması** durumunda çalışır.

**Kaynak:** `figma_enumerate_library_components` response'u top-level `sourceLibrary` (taranan library'nin adı) döner; her library ayrı çağrıyla taranır. Hangi library'lerden key kullandıysan, gereken library seti de odur.

**Kural — ilk figma_execute öncesi kontrol:**
1. Kullanacağın componentKey'lerin hangi library çağrılarından geldiğini not et (registry'deki library listesi)
2. Eğer birden çok library'den key kullanıyorsan (yani mobil + ana gibi) → kullanıcıya **onay sorusu sor**:
   > *"Bu ekran için `<Ana-DS>` ve `<Ana-DS Mobil>` library'lerinin ikisi de subscribe olmalı. Figma'da Assets panelini açıp her ikisinin enabled olduğunu onaylar mısınız?"*
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

**`_nextStep` izleme:** Bazı `figma_*` tool response'ları `_nextStep` string hint'i taşır (örn. "continue_with_next_section..."). Hint'i oku ve mantıklıysa uygula; karar ağacını yine bu skill'deki akış belirler. (Not: eski `_nextStepObj` typed sequencing v1.9.13'te kaldırıldı — cache zinciriyle birlikte ölmüştü.)

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
