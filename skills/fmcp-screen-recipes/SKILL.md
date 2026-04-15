---
name: fmcp-screen-recipes
description: Fast path cookbook — standart ekran tipleri (login/payment/profile/list/detail/form/onboarding/dashboard/settings) için linear 9-adımlı recipe. Figma native frame presets, SUI native variable modes, chunking built-in (max 8 op/execute), her adımda Türkçe micro-report. Common case'de generate-figma-screen ağır workflow'unu atlayıp %40-50 daha hızlı üretim sağlar.
metadata:
  mcp-server: user-figma-mcp-bridge
  version: 1.9.3
  priority: 96
  phase: fast-path
  personas:
    - designer
    - uidev
  token_budget: condensed-first
required_inputs:
  - name: screen_type
    type: "enum: login | payment | profile | list | detail | form | onboarding | dashboard | settings"
    description: "Intent'ten keyword ile tespit edilen ekran tipi"
  - name: platform
    type: "enum: mobile | tablet | desktop | web"
    description: "Hedef platform"
  - name: device_preset
    type: string
    description: "Figma native frame preset adı (örn. 'iPhone 17', 'Android Compact')"
  - name: variants
    type: "array: [light] | [light, dark]"
    description: "İstenen tema varyantları"
  - name: active_ds
    type: string
    description: "Aktif DS adı (active-ds.md'den, DS gate'ten gelir)"
outputs:
  - name: light_frame_id
    type: string
  - name: dark_frame_id
    type: "string | null"
  - name: validate_scores
    type: "{ light: number, dark: number | null }"
---

# FMCP Screen Recipes — Fast Path Cookbook

## Ne Zaman Kullanılır

**Fast Path DEVREYE GİRER** (hepsi TRUE olmalı):

- ✅ Tek ekran üretimi (multi-screen dashboard değil)
- ✅ Standart ekran tipi: 9 recipe'ten biri match ediyor
- ✅ DS tanımlı: `active-ds.md` Status: ✅ Aktif (DS GATE geçilmiş)
- ✅ Platform belli: mobile/tablet/desktop/web keyword veya intent-router'dan
- ✅ Custom animation / prototype / complex interaction YOK

**Fast Path DEVREYE GİRMEZ** (birisi bile TRUE ise):

- ❌ Multi-screen flow (checkout 3 sayfa, onboarding wizard 5 sayfa)
- ❌ Karmaşık custom layout (9 recipe tiplerinden hiçbirine uymayan)
- ❌ Custom animation, micro-interaction, prototype flow
- ❌ Kullanıcı "generate-figma-screen tam workflow'u uygula" derse explicit
- ❌ DS GATE geçilmemişse (active-ds.md Status: ❌)

Bu koşullarda mevcut `generate-figma-screen` 7-adımlı workflow devreye girer (orchestrator Karar Akışı).

---

## 9-Adımlı Fast Path Akışı (Linear, Chunked)

**Her adım 1 `figma_execute` çağrısı** — Rule 5a CHUNKING'e tam uyum (max 8 op/execute). Her adım sonrası **tek satır Türkçe micro-report** yazılır.

```
ADIM 1: Pre-Flight Check           (0 figma_execute, sadece validation)
ADIM 2: Wrapper Frame + Background  (3-5 op)
ADIM 3: Breakpoint Variable Binding (2-3 op)
ADIM 4: Theme + Size Mode Setup     (4-6 op)
ADIM 5: Auto-Layout Structure       (5-8 op)
ADIM 6: Component Discovery         (1-2 op, tek arama)
ADIM 7: Recipe Component Placement  (HER COMPONENT AYRI EXECUTE — 6-10 execute)
ADIM 8: Dark Variant (isteğe bağlı) (2-3 op)
ADIM 9: Validation + Final Report   (2 figma_validate_screen çağrısı)
```

**Toplam execute sayısı:** ~12-18 (component sayısına göre). Her biri hızlı (<100ms plugin-side).

### Adım 1 — Pre-Flight Check (Validation)

**Amaç:** Recipe başlamadan önce gerekli varsayımları doğrula. Hiçbir figma_execute çağırma.

```
1. active-ds.md Status: ✅ Aktif mi? (DS GATE — orchestrator'dan gelmiş olmalı)
2. screen_type 9 recipe'ten biri mi?
3. platform belli mi? device_preset geçerli mi?
4. variants en az 1 mode içeriyor mu?

Herhangi biri FAIL → Fast Path iptal, orchestrator Karar Akışı'na dön.
```

**Micro-report:** `✅ Pre-flight: screen_type=<X>, platform=<Y>, device=<Z>, variants=<V>`

### Adım 1.5 — Token Resolution Verification (YENİ v1.9.4+, Gerçek Test #4/5/12/13)

**Amaç:** Recipe başlamadan önce kullanılacak **critical spacing/radius token'ların resolved px değerlerini** öğren. Tahmin YASAK — gerçek değerler orchestrator context'inde `tokenMap` olarak tutulur, sonraki adımlar bu map'i referans alır.

**Neden:** Gerçek test (2026-04-15) `spacing-400` varsayıldı ~16px, gerçek 64px çıktı. Ekran kullanılamaz hale geldi (Payment Card'larda text dikey harflerle görüntülendi). 4-5 ek execute gerekti düzeltme için.

```js
// figma_execute (tek call, 6-8 op — Rule 5a CHUNKING'e uyumlu)
const colls = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();

// Spacing collection bul (name keyword match, trailing space vb. toleranslı)
const spacingColl = colls.find(c => {
  const n = c.name.toLowerCase().trim();
  return n.includes("spacing") || n.includes("size");
});

if (!spacingColl) {
  return { error: "Spacing collection bulunamadı", fallback: "manual px values" };
}

// Critical token listesi (recipe'de kullanılan isimler)
const criticalTokenNames = [
  "spacing-none", "spacing-050", "spacing-075", "spacing-100",
  "spacing-125", "spacing-150", "spacing-200"
];

const vars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(spacingColl.key);
const tokenMap = {};

for (const name of criticalTokenNames) {
  const found = vars.find(v => v.name === name);
  if (found) {
    const localVar = await figma.variables.importVariableByKeyAsync(found.key);
    // valuesByMode'den ilk mode'un değerini oku (genelde default/mobile)
    const modeIds = Object.keys(localVar.valuesByMode);
    if (modeIds.length > 0) {
      tokenMap[name] = localVar.valuesByMode[modeIds[0]];
    }
  }
}

return { tokenMap, spacingCollKey: spacingColl.key };
```

**Beklenen çıktı (örnek):**
```json
{
  "tokenMap": {
    "spacing-none": 0,
    "spacing-050": 8,
    "spacing-075": 12,
    "spacing-100": 16,
    "spacing-125": 20,
    "spacing-150": 24,
    "spacing-200": 32
  }
}
```

**Kullanım:** Adım 2-5 bu map'i referans alır: "padding = spacing-100 (16px, tokenMap'ten)" diyerek bind eder, **varsayım yapmaz**. Token adı map'te yoksa o adımda fallback uygular ve kullanıcıya bildirir.

**Atomic operations:** 1 (collections) + 1 (vars fetch) + 7 (import × critical token count) = ~9 op. Rule 5a sınırında — 7 token üst sınır; 8. eklenirse execute'u ikiye böl.

**Micro-report:** `✅ Token Resolution: <N> token resolved (spacing-none=0, spacing-100=16, ...)`

### Adım 2 — Wrapper Frame + Background (Edge-to-Edge, v1.9.4+)

**Amaç:** Ana frame'i Figma native device preset boyutunda oluştur, background'u DS variable'a bağla, **edge-to-edge yapı için padding=0 + gap=0** kuruluşu hemen burada yap.

**🚨 Edge-to-Edge Frame Structure Kuralı (v1.9.4+, Gerçek Test #16):**

Mobile/tablet/desktop **tüm** platformlar için:

**Ana frame (bu adımda):**
- Background renk token'ı (Surface/background level-0 vb.)
- Auto-layout VERTICAL
- **padding = spacing-none (0)** ← kritik, edge-to-edge için
- **gap = spacing-none (0)** ← kritik, iç wrapper kendi spacing'ini yönetir
- SADECE edge-to-edge component'leri doğrudan child olarak alır (NavigationTopBar, BottomNavBar, StatusBar, vb.)

**Content Body wrapper** (Adım 5.5'te kurulur):
- Padding ve gap BURADA (örn. spacing-100 = 16px, spacing-075 = 12px)
- Recipe component'leri (Amount Display, Payment Cards, CTA, vb.) burada yaşar

**Doğru yapı (tüm recipes için standart):**

```
Ana Frame (padding: spacing-none, gap: spacing-none, auto-layout VERTICAL)
├── NavigationTopBar (FILL — edge-to-edge)
├── Content Body Wrapper (FILL both, padding: spacing-100, gap: spacing-075)
│   ├── Amount Display
│   ├── Section Header
│   ├── Payment Method Card × 3
│   ├── Divider
│   ├── CTA Button
│   └── Security Info
└── BottomNavBar (FILL — edge-to-edge) [varsa]
```

```js
// figma_execute (tek call, 5-7 op)
const frame = figma.createFrame();
frame.name = "<Screen Name> — <Device Preset>";
frame.resize(<width>, <height>);  // Device Presets Lookup'tan

// Auto-layout VERTICAL + edge-to-edge padding/gap sıfır
frame.layoutMode = "VERTICAL";
frame.primaryAxisSizingMode = "FIXED";
frame.counterAxisSizingMode = "FIXED";
frame.paddingTop = 0; frame.paddingBottom = 0;
frame.paddingLeft = 0; frame.paddingRight = 0;
frame.itemSpacing = 0;

// (Opsiyonel) spacing-none variable bind — tokenMap'ten geliyorsa
// Not: direkt 0 da kabul, ama token bind DS-compliant için tercih edilen
// const noneVar = await figma.variables.importVariableByKeyAsync(spacingNoneKey);
// frame.setBoundVariable("paddingLeft", noneVar);
// ... aynısı paddingRight/Top/Bottom + itemSpacing için

// Background variable bind (try-catch with fallback)
let bgVar = null;
try {
  const bgVars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(surfaceColKey);
  const bgMatch = bgVars.find(v => v.name.includes("background level-0"));
  if (bgMatch) bgVar = await figma.variables.importVariableByKeyAsync(bgMatch.key);
} catch(e) {}

if (bgVar) {
  const paint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } };
  const bound = figma.variables.setBoundVariableForPaint(paint, 'color', bgVar);
  frame.fills = [bound];
}

return { frameId: frame.id, width: <width>, height: <height> };
```

**Atomic operations (5-7):** createFrame, resize, layoutMode/sizing/padding setters (grouped), getVariables, importVariableByKeyAsync, setBoundVariableForPaint.

**Micro-report:** `✅ Frame oluşturuldu: <device_preset> (<w>×<h>), edge-to-edge (padding=0, gap=0), background: <DS>/Surface/background level-0`

### Adım 3 — Breakpoint Variable Binding

**Amaç:** `frame.width`'i DS'in Breakpoints/Screen variable'ına bağla (responsive davranış için).

```js
// figma_execute (tek call, 2-3 op)
const frame = await figma.getNodeByIdAsync(frameId);

let screenVar = null;
try {
  const bpVars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(breakpointsColKey);
  const screenMatch = bpVars.find(v => v.name === "Screen" || v.name.includes("screen"));
  if (screenMatch) screenVar = await figma.variables.importVariableByKeyAsync(screenMatch.key);
} catch(e) {}

if (screenVar) {
  frame.setBoundVariable("width", screenVar);
  return { boundBreakpoint: true };
} else {
  return { boundBreakpoint: false, note: "Breakpoint variable bulunamadı, frame fixed width" };
}
```

**Atomic operations:** 3 (getNodeByIdAsync, getVariables, importVariable, setBoundVariable — optional).

**Micro-report:** `✅ Breakpoint: <DS>/Breakpoints/Screen bound` VEYA `⚠️ Breakpoint bulunamadı, fixed width devam`

### Adım 4 — Theme + Size Mode Setup (Enumeration First, v1.9.4+)

**Amaç:** Collection ve mode isimlerini **ASLA varsayma**. Önce `getAvailableLibraryVariableCollectionsAsync()` ile tam listeyi al, keyword match ile doğru collection'ı bul. Mode listesini de tam oku, keyword match ile doğru mode'u seç. Sonuç: trailing space, karışık isimler (`"Semantic Sizes (Web/Mobil) "`), çoklu-kelime mode isimleri (`"Mobil & Web Mobil"`) gibi tüm varyasyonlara dayanıklı.

**Neden:** Gerçek test (2026-04-15) `"Semantic Size"` varsayıldı, gerçek `"Semantic Sizes (Web/Mobil) "` (trailing space); `"Mobil"` varsayıldı, gerçek `"Mobil & Web Mobil"`. Enumeration-first yaklaşımı iki sorunu da önler.

**Adım 4a — Collection & mode enumeration (ayrı execute):**

```js
// figma_execute #1 — Enumeration (tek call, 6-8 op)
const colls = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();

// Collection bul — keyword match (case-insensitive, trim'li, multi-keyword fallback)
function findCollByKeywords(keywords) {
  return colls.find(c => {
    const name = c.name.toLowerCase().trim();
    return keywords.some(kw => name.includes(kw.toLowerCase()));
  });
}

const semColorsColl = findCollByKeywords(["semantic color", "s theme", "theme"]);
const semSizeColl = findCollByKeywords(["semantic size", "semantic sizes", "size"]);

const result = {
  semColors: null,
  semSize: null,
  availableColls: colls.map(c => c.name)  // debug için
};

// Semantic Colors mode discovery
if (semColorsColl) {
  const vars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(semColorsColl.key);
  if (vars.length > 0) {
    const firstVar = await figma.variables.importVariableByKeyAsync(vars[0].key);
    const localColl = await figma.variables.getVariableCollectionByIdAsync(firstVar.variableCollectionId);
    // Mode'ları keyword match ile bul (Turkish + English toleranslı)
    const lightMode = localColl.modes.find(m => {
      const mn = m.name.toLowerCase();
      return mn === "light" || mn === "açık" || mn.includes("light") || mn.includes("açık");
    });
    const darkMode = localColl.modes.find(m => {
      const mn = m.name.toLowerCase();
      return mn === "dark" || mn === "koyu" || mn.includes("dark") || mn.includes("koyu");
    });
    result.semColors = {
      collId: localColl.id,
      lightModeId: lightMode && lightMode.modeId,
      darkModeId: darkMode && darkMode.modeId,
      availableModes: localColl.modes.map(m => m.name)
    };
  }
}

// Semantic Size mode discovery
if (semSizeColl) {
  const vars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(semSizeColl.key);
  if (vars.length > 0) {
    const firstVar = await figma.variables.importVariableByKeyAsync(vars[0].key);
    const localColl = await figma.variables.getVariableCollectionByIdAsync(firstVar.variableCollectionId);
    // Platform → mode keyword eşleme (karmaşık isimlere dayanıklı)
    const platformKeywords = {
      "mobile": ["mobil", "mobile"],
      "tablet": ["tablet"],
      "desktop": ["web", "desktop"],
      "web": ["web", "desktop"]
    };
    const targetKws = platformKeywords[platform] || ["mobil"];
    const sizeMode = localColl.modes.find(m => {
      const mn = m.name.toLowerCase();
      return targetKws.some(kw => mn.includes(kw));
    });
    result.semSize = {
      collId: localColl.id,
      modeId: sizeMode && sizeMode.modeId,
      modeName: sizeMode && sizeMode.name,
      availableModes: localColl.modes.map(m => m.name)
    };
  }
}

return result;
```

**Atomic operations:** ~7 (collections, 2× vars fetch, 2× import, 2× getCollection).

**Micro-report:** `✅ Collection/Mode enum: Semantic Colors=<light+dark modes>, Semantic Size=<matched mode>`

**Adım 4b — Mode apply to frame (ayrı execute):**

Enumeration sonucunu kullanarak frame'e mode'ları uygula:

```js
// figma_execute #2 — Apply (tek call, 3-4 op)
const frame = await figma.getNodeByIdAsync(frameId);

if (semColorsCollId && lightModeId) {
  const semColorsColl = await figma.variables.getVariableCollectionByIdAsync(semColorsCollId);
  frame.setExplicitVariableModeForCollection(semColorsColl, lightModeId);
}

if (semSizeCollId && sizeModeId) {
  const semSizeColl = await figma.variables.getVariableCollectionByIdAsync(semSizeCollId);
  frame.setExplicitVariableModeForCollection(semSizeColl, sizeModeId);
}

return { modesApplied: true };
```

**Atomic operations:** 3-4 (getNodeByIdAsync, 2× getCollectionByIdAsync, 2× setExplicitMode).

**Micro-report:** `✅ Theme: Light (<semColors collName>), Size: <semSize modeName> (<semSize collName>)`

### Adım 5 — Auto-Layout Finalization (v1.9.4+)

**Amaç:** Ana frame'in auto-layout kuruluşu zaten **Adım 2'de** tamamlandı (VERTICAL + padding=0 + gap=0). Bu adımda yalnızca finalization kontrolleri yapılır:

- `counterAxisAlignItems = "CENTER"` (eğer Content Body dikey merkezlemek istenirse)
- Ana frame'in sizing mode'larının doğru olduğunu teyit et (FIXED × FIXED — device preset)
- Edge-to-edge component'lerin FILL horizontal alabildiğini garanti et (parent layoutMode mevcut olmalı — Adım 2 bunu kurdu)

**Eğer her şey Adım 2'de doğru kurulmuşsa bu adım no-op**, tek satır rapor yazılır ve geçilir.

**Micro-report:** `✅ Auto-layout finalized: VERTICAL, ana frame padding=0, Content Body wrapper Adım 5.5'te kurulacak`

### Adım 5.5 — Content Body Wrapper (YENİ v1.9.4+, Gerçek Test #16)

**Amaç:** Ana frame'in içinde, NavigationTopBar (varsa) ile BottomNavBar (varsa) arasında, gerçek padding + gap değerlerini taşıyan iç bir auto-layout frame oluştur. Recipe'in NON-edge component'leri buraya appendChild edilir.

**Neden:** Edge-to-edge component'ler (NavigationTopBar) ana frame kenarına dayanmalı. İçerik component'leri ise padding'li alan içinde yaşamalı. İki kuralı aynı container'da çözmek mümkün değil — iki katmanlı frame yapısı gerekli.

```js
// figma_execute (tek call, 5-8 op — Rule 5a CHUNKING'e uyumlu)
const parentFrame = await figma.getNodeByIdAsync(frameId);

const contentBody = figma.createFrame();
contentBody.name = "Content Body";
contentBody.layoutMode = "VERTICAL";

// 🚨 KRİTİK SIRA: ÖNCE appendChild, SONRA layoutSizing — Rule 11
parentFrame.appendChild(contentBody);
contentBody.layoutSizingHorizontal = "FILL";
contentBody.layoutSizingVertical = "FILL";

// Padding + gap — tokenMap'ten (Adım 1.5'te resolve edildi)
// Örn: spacing-100 = 16px padding, spacing-075 = 12px gap
const paddingVar = await figma.variables.importVariableByKeyAsync(spacing100Key);
const gapVar = await figma.variables.importVariableByKeyAsync(spacing075Key);

contentBody.setBoundVariable("paddingLeft", paddingVar);
contentBody.setBoundVariable("paddingRight", paddingVar);
contentBody.setBoundVariable("paddingTop", paddingVar);
contentBody.setBoundVariable("paddingBottom", paddingVar);
contentBody.setBoundVariable("itemSpacing", gapVar);

// Transparent background (parent surface'i geçecek)
contentBody.fills = [];

return { contentBodyId: contentBody.id };
```

**Atomic operations (5-8):** getNodeByIdAsync, createFrame, appendChild, layoutSizing×2, importVariable×2, setBoundVariable×5. Üst sınır — 5 setBoundVariable bir "atomic grouping" sayılsa da Rule 5a tehlikesi varsa ikiye böl (padding execute + gap execute).

**Micro-report:** `✅ Content Body oluşturuldu: FILL both, padding=spacing-100 (16px), gap=spacing-075 (12px)`

### Adım 6 — Component Discovery

**Amaç:** Recipe için gereken component'leri tek aramada topla. Cache-first davranış.

```
1. figma_search_assets(query="<comma-joined keywords>", includeComponents=true)
   Örn: "AppBar, Button, Input, Card"
2. Sonuç boşsa Rule 24 Component Discovery Fallback ile manuel tara
3. Her recipe component'i için best match'i kaydet
4. Eksik component'leri listele (Adım 7'de primitive fallback kullanılacak)
```

**Atomic operations:** 1-2 (tek search, optional manual discovery).

**Micro-report:** `✅ Component keşfi: <N> component bulundu, <M> eksik (primitive fallback kullanılacak)`

### Adım 7 — Recipe Component Placement

**Amaç:** Recipe'teki her component'i sırayla doğru parent'a yerleştir. **HER COMPONENT AYRI `figma_execute` ÇAĞRISI** — chunking mandate gereği.

**🚨 Parent Routing Kuralı (v1.9.4+, Fix B Edge-to-Edge):**

Her component için parent iki kaynaktan birinden seçilir:

| Component Tipi | Parent | Neden |
|---|---|---|
| NavigationTopBar / TopBar / StatusBar | **Ana Frame** (`frameId`) | Edge-to-edge, kenarlara dayanmalı |
| BottomNavBar / TabBar / BottomSheet | **Ana Frame** (`frameId`) | Edge-to-edge |
| Diğer her şey (Amount Display, Cards, Buttons, List Items, Text, vb.) | **Content Body** (`contentBodyId` — Adım 5.5'te kuruldu) | Padding'li alan içinde |

Component sırası korunur (yukarıdan aşağı), ama parent ID'leri farklı olabilir. Recipe loop'u parent seçimini isme/role bazlı yapar.

```
recipe = getRecipe(screen_type)  // 9 recipe'ten biri
const edgeNames = /^(navigation|nav|top|bottom|status|tab)/i;

for (let i = 0; i < recipe.components.length; i++) {
  const spec = recipe.components[i]
  const comp = foundComponents[spec.name] || fallbackPrimitive(spec)

  // Parent routing — edge-to-edge vs. Content Body
  const parentId = edgeNames.test(spec.name) ? frameId : contentBodyId;

  // figma_execute #(7+i): Tek component yerleştir (3-5 op)
  //   1. importComponentByKeyAsync (varsa)
  //   2. createInstance / createFrame (fallback)
  //   3. setProperties (component instance için)
  //   4. parent = await figma.getNodeByIdAsync(parentId)
  //   5. parent.appendChild(child)  ← ÖNCE (Rule 11)
  //   6. child.layoutSizingHorizontal = "FILL"  ← SONRA

  // Micro-report: "✅ <spec.name> eklendi (parent: <Ana Frame|Content Body>)"
  //            or "⚠️ <spec.name> eksik, primitive fallback"
}
```

**Atomic operations:** 3-5 per component (importComponent, createInstance, setProperties, appendChild, layoutSizing).

**Micro-reports (sıralı):**
```
✅ AppBar eklendi: <DS>/Navigation/AppBar
✅ Amount Display eklendi: <DS>/Display/Large
⚠️ Payment Method Card eksik → token-bound primitive ile inşa
✅ CTA Button eklendi: <DS>/Button/Primary
```

**Kritik kural:** Her component için **yeni figma_execute çağrısı**. Tek execute'ta tüm component'leri yerleştirmeye çalışma — timeout garantili.

### Adım 8 — Dark Variant (variants=light+dark ise)

**Amaç:** Light frame'i clone + dark mode uygula. `skills/generate-figma-screen/SKILL.md:Step 5.6` pattern'i ile aynı.

```js
// figma_execute (tek call, 3-4 op)
const lightFrame = await figma.getNodeByIdAsync(lightFrameId);
const darkFrame = lightFrame.clone();
figma.currentPage.appendChild(darkFrame);
darkFrame.x = lightFrame.x + lightFrame.width + 80;
darkFrame.name = lightFrame.name + " — Dark";

// Semantic Colors'a Dark mode uygula
const coll = await figma.variables.getVariableCollectionByIdAsync(semColorsCollId);
darkFrame.setExplicitVariableModeForCollection(coll, darkModeId);

return { darkFrameId: darkFrame.id };
```

**Atomic operations:** 4 (getNodeByIdAsync, clone, appendChild, getCollection, setMode).

**Micro-report:** `✅ Dark variant oluşturuldu: mode=Dark uygulandı`

### Adım 9 — Validation + Final Report

**Amaç:** Her frame için `figma_validate_screen(minScore=80)` çağır, Türkçe rapor üret.

```
validateLight = figma_validate_screen(lightFrameId, minScore=80)
if (variants.includes("dark")) {
  validateDark = figma_validate_screen(darkFrameId, minScore=80)
}

// Türkçe rapor
```

**Atomic operations:** 1-2 figma_validate_screen çağrısı (figma_execute değil, ayrı tool).

**Micro-report:** `✅ Validate Light: <score>/100, Dark: <score>/100`

**Son Rapor Şablonu:**

```markdown
## 🎨 <Screen Type> Ekranı Üretildi

**Mod:** Fast Path Recipe (fmcp-screen-recipes)
**DS:** <active_ds>
**Device:** <device_preset> (<w>×<h>)
**Variants:** <light/dark>

### Sonuç
- Light Frame: <nodeId>, Validate: <score>/100
- Dark Frame: <nodeId>, Validate: <score>/100 (varsa)

### Kullanılan Component'ler
- <DS>/Navigation/AppBar (1×)
- <DS>/Display/Large (1×)
- ...

### Primitive Fallback Kullanılanlar (DS'de bulunamayan)
- Payment Method Card → token-bound primitive (4 adet)

### Token Binding
- Colors: <N> fill binding
- Spacing: <M> padding/gap binding
- Typography: <K> text style binding

---
📊 Metrikler
- Kullanılan skill'ler: fmcp-screen-orchestrator, fmcp-screen-recipes, figma-canvas-ops
- Toplam figma_execute: <N>
- Süre: <Y> sn
- Validate skorları: Light <A>/100, Dark <B>/100
- Fast Path: AKTIF (orchestrator generate-figma-screen'i atladı)
```

---

## Device Presets Lookup Table

Figma native device preset boyutları. Intent keyword'ünden device adına mapping + boyut.

### Mobile

| Device Adı | Width | Height | Intent Keywords |
|---|---|---|---|
| iPhone 17 | 402 | 874 | mobile, iphone, ios, iphone 17 |
| iPhone 16 & 17 Pro | 402 | 874 | iphone pro, iphone 16 pro, iphone 17 pro |
| iPhone 16 | 393 | 852 | iphone 16 |
| iPhone 16 Pro Max | 440 | 956 | iphone pro max, pro max |
| iPhone 16 Plus | 430 | 932 | iphone plus |
| iPhone Air | 420 | 912 | iphone air |
| iPhone 14 & 15 Pro Max | 430 | 932 | |
| iPhone 14 & 15 Pro | 393 | 852 | |
| iPhone 13 & 14 | 390 | 844 | iphone 14, iphone 13 |
| iPhone 14 Plus | 428 | 926 | |
| **Android Compact** | 412 | 917 | android, mobile android |
| Android Medium | 700 | 840 | android tablet |

**Default:** `mobile` intent → `iPhone 17` (402×874). `android` intent → `Android Compact` (412×917).

### Tablet

| Device Adı | Width | Height |
|---|---|---|
| iPad Pro 11" | 834 | 1194 |
| iPad Pro 12.9" | 1024 | 1366 |

**Default:** `tablet` intent → `iPad Pro 11"` (834×1194).

### Desktop / Web

| Device Adı | Width | Height |
|---|---|---|
| Desktop (common) | 1440 | 900 |
| Desktop HD | 1920 | 1080 |
| MacBook Pro 14" | 1512 | 982 |
| MacBook Pro 16" | 1728 | 1117 |

**Default:** `desktop` / `web` intent → `Desktop (common)` 1440×900.

---

## 9 Screen Type Recipes

Her recipe = component listesi + yerleşim sırası + her component için search keyword'leri.

### Recipe 1: Login

**Trigger:** login, giriş, oturum aç, sign in, log in

**Components (top-to-bottom):**
1. **AppBar** (minimal, sadece back arrow) — `["navigation top", "appbar", "topbar"]`
2. **Logo** (brand logo) — `["logo", "brand", "app icon"]`
3. **Welcome Text** (H1) — `["heading", "title large", "display"]`
4. **Subtitle Text** (body) — `["body medium", "text body"]`
5. **Email Input** — `["text field", "input", "email"]`
6. **Password Input** (with show/hide) — `["password", "text field password"]`
7. **Primary Button** ("Giriş Yap") — `["button primary", "button filled"]`
8. **Forgot Password Link** — `["link", "text button", "link inline"]`
9. **Divider** — `["divider", "separator"]`
10. **Register Link** ("Hesabın yok mu? Kayıt ol") — `["text button", "link"]`

### Recipe 2: Payment

**Trigger:** ödeme, payment, checkout, satın al

**Components:**
1. **AppBar** ("Ödeme", back arrow) — `["navigation top", "appbar"]`
2. **Amount Display** (büyük, merkez) — `["display large", "hero text", "amount"]`
3. **Currency Label** — `["body small", "caption"]`
4. **Payment Method Section Header** — `["section header", "subtitle"]`
5. **Payment Method Cards** (×3) — `["card payment", "list item", "radio card"]`
6. **Add New Method Button** — `["button secondary", "button outlined"]`
7. **Divider** — `["divider"]`
8. **CTA Button** ("Ödemeyi Tamamla") — `["button primary large"]`
9. **Security Info Text** (lock icon + text) — `["text small", "caption secure"]`

### Recipe 3: Profile

**Trigger:** profil, profile, hesap, account, kullanıcı, user

**Components:**
1. **AppBar** ("Profilim", settings icon) — `["navigation top"]`
2. **Avatar** (büyük, merkez) — `["avatar large", "profile picture"]`
3. **User Name Text** (H2) — `["heading", "display medium"]`
4. **User Email Text** (body, secondary) — `["body", "text secondary"]`
5. **Divider** — `["divider"]`
6. **Menu List Items** (Settings, Orders, Help, Logout) — `["list item", "menu row"]`
7. **Destructive Button** ("Çıkış Yap") — `["button destructive", "button danger"]`

### Recipe 4: List (Search / Catalog)

**Trigger:** liste, list, arama, search, katalog, ürünler

**Components:**
1. **AppBar** (title + search icon) — `["navigation top"]`
2. **Search Bar** — `["search", "search bar", "text field search"]`
3. **Filter Chips Row** — `["chip", "filter chip", "tag"]`
4. **Card List Items** (×N) — `["card", "list card", "product card"]`
5. **Pagination** — `["pagination", "page navigator"]`
6. **FAB** (Floating Action Button, opsiyonel) — `["fab", "floating button"]`

### Recipe 5: Detail

**Trigger:** detay, detail, ürün detay, product

**Components:**
1. **AppBar** (back + share) — `["navigation top"]`
2. **Hero Image** — `["image large", "hero", "banner"]`
3. **Title Text** (H1) — `["heading large", "display"]`
4. **Price + Rating Row** — `["price", "rating", "stat row"]`
5. **Description Text** — `["body", "text body"]`
6. **Stats Section** (kategoriler, özellikler) — `["stat", "info row"]`
7. **CTA Button** ("Sepete Ekle" vb.) — `["button primary"]`

### Recipe 6: Form

**Trigger:** form, başvuru, kayıt, application

**Components:**
1. **AppBar** (title) — `["navigation top"]`
2. **Progress Indicator** (stepper) — `["stepper", "progress"]`
3. **Field Group 1** (3-4 input) — `["text field", "input", "form field"]`
4. **Field Group 2** (select, date picker, vs.) — `["select", "dropdown", "date picker"]`
5. **Checkbox / Terms** — `["checkbox", "agreement"]`
6. **Submit Button** — `["button primary"]`

### Recipe 7: Onboarding

**Trigger:** onboarding, tanıtım, karşılama, welcome

**Components:**
1. **Hero Image** (illustration) — `["illustration", "image hero"]`
2. **Title Text** — `["display", "heading large"]`
3. **Subtitle Text** — `["body", "text secondary"]`
4. **Pagination Dots** — `["dots", "pagination dots", "page indicator"]`
5. **Primary Button** ("İleri" / "Başla") — `["button primary"]`
6. **Skip Link** — `["text button", "link"]`

### Recipe 8: Dashboard

**Trigger:** dashboard, özet, summary, panel

**Components:**
1. **AppBar** (title + profile avatar) — `["navigation top"]`
2. **Stats Cards** (×4 grid 2×2) — `["stat card", "metric card"]`
3. **Chart** (line/bar) — `["chart", "graph"]`
4. **Recent Activity Section Header** — `["section header"]`
5. **Activity List Items** (×N) — `["list item", "activity row"]`

### Recipe 9: Settings

**Trigger:** ayarlar, settings, tercihler, preferences

**Components:**
1. **AppBar** ("Ayarlar") — `["navigation top"]`
2. **Section Headers** ("Hesap", "Bildirimler", "Gizlilik") — `["section header"]`
3. **Toggle Rows** (setting + switch) — `["list item toggle", "setting row"]`
4. **Info Row** (tıklanabilir, chevron) — `["list item", "nav row"]`
5. **Destructive Button** ("Hesabı Sil") — `["button destructive"]`

---

## Primitive Fallback Pattern

Component bulunamadığı durumda (örn. SUI'de "Payment Method Card" yok), recipe durmaz — token-bound primitive ile inşa eder:

```js
// figma_execute (tek call, 5-7 op)
const card = figma.createFrame();
card.name = "Payment Method Card (primitive fallback)";
card.resize(340, 80);
card.layoutMode = "HORIZONTAL";
card.primaryAxisSizingMode = "FIXED";
card.counterAxisSizingMode = "FIXED";
card.itemSpacing = 12;

// All visual properties → token bind (NO hardcoded values)
card.setBoundVariable("cornerRadius", radiusSmVar);
card.setBoundVariable("paddingLeft", spacingMdVar);
card.setBoundVariable("paddingRight", spacingMdVar);
card.setBoundVariable("paddingTop", spacingSmVar);
card.setBoundVariable("paddingBottom", spacingSmVar);

const paint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } };
const bound = figma.variables.setBoundVariableForPaint(paint, 'color', surfaceVar);
card.fills = [bound];

parent.appendChild(card);  // ÖNCE
card.layoutSizingHorizontal = "FILL";  // SONRA (Rule 11)

return { cardId: card.id };
```

**Önemli:** Bu primitive **DS ihlali DEĞİL** — tüm görsel properties variable'a bağlı. Plugin `_designSystemViolations` flag atmaz. Kullanıcıya bildir:

> `⚠️ Payment Method Card: SUI'de component bulunamadı, DS token'larına bağlı primitive ile inşa edildi (4 adet).`

---

## Tool Chunking Kuralları (Recipe-Specific)

Her recipe çalıştırırken **Rule 5a CHUNKING MANDATE** zorunlu:

- **Max 8 atomic op / figma_execute**
- **Her recipe component'i için AYRI figma_execute** (tek execute'ta 3+ component yerleştirme YASAK)
- Execute'ler arası state: `return { nodeIds }` → sonraki execute `getNodeByIdAsync(id)` ile al

**Timeout konfigürasyonu:** Her execute için `timeout: 15000` (15 sn) yeterli. Eğer 15 sn aşıyorsa op sayısı 8'den fazla demektir, küçült.

**Anti-pattern (YASAK):**
```js
// ❌ Tek execute'ta 10 component yerleştirme
for (const spec of recipe.components) {
  // 10+ component × 3-5 op each = 30-50 op, timeout garantili
}
```

**Doğru pattern:**
```
// figma_execute #1: 1 component
// figma_execute #2: 1 component
// ...
// figma_execute #10: 1 component
```

---

## Error Recovery (Recipe-Specific)

| Hata | Aksiyon |
|---|---|
| Pre-flight fail (DS GATE yok) | Orchestrator'a "Fast Path iptal, Karar Akışı'na dön" raporla |
| Device preset bulunamadı | Default (iPhone 17 / Android Compact / Desktop 1440×900) kullan, uyarı ver |
| Semantic Colors collection yok | Light-only mode, dark variant skip, uyarı ver |
| Breakpoint variable yok | Fixed width devam, uyarı ver |
| Component search 0 sonuç | Primitive fallback + uyarı |
| figma_execute timeout | Chunking ihlali — op sayısı 8'den fazla olabilir, böl |
| Style import fail | figma-canvas-ops Rule 23 try-catch pattern, font fallback |
| Dark variant validate fail | Quality Gate'e dön, hardcoded var mı kontrol |
| 3 validate denemesi hâlâ fail | Kullanıcıya "recipe ile yeterli kalite alınamadı, generate-figma-screen tam workflow'u deneyelim mi?" sor |

---

## Known Limitations

1. **SUI dışında test edilmedi** — Recipe'ler SUI semantik token isimleriyle çalışıyor (background level-0, Screen, Mobil mode). Başka DS için isim farkı olabilir, manuel fallback.

2. **Dark mode plugin scoring** — `figma_validate_screen` dark mode binding coverage'ı ayrı ölçmez. Dark validate ≥80 geçse bile manuel göz kontrolü yapılmalı (figma-canvas-ops Rule 23 sequence).

3. **9 recipe sabit** — Kullanıcı 10. recipe tipi isterse (örn. "comparison page", "wizard step"), fast path match etmez → generate-figma-screen full workflow.

4. **Multi-screen YOK** — Fast path sadece tek ekran. Checkout flow (3 ekran), onboarding wizard (5 ekran) → generate-figma-screen + inter-screen checkpoint.

5. **Prototype / interactions YOK** — Static layout. Hover state, navigation flow yok. Scope dışı.

6. **Component search false match riski** — "button primary" araması birden fazla variant döndürebilir. İlk result her zaman en doğru değil, `setProperties` ile variant doğrulaması gerekir.

---

## Evolution Triggers

Bu skill revize edilmeli şunlar doğduğunda:

- Yeni bir screen type popüler olur (örn. "chat", "feed")
- Başka bir DS test edilir (SUI dışında)
- Multi-screen flow support ihtiyacı doğar
- Fast path scoring için yeni metrik eklenir

Her evolution için `skills/fmcp-screen-orchestrator/SKILL.md` Skill Evolution Protocol Aşama 1 (gap onayı) + Aşama 2 (içerik onayı) zorunludur.

---

## Skill References

Bu skill aşağıdaki skill'leri okumalı veya onlara referans vermeli:

- `skills/fmcp-screen-orchestrator/SKILL.md` — Fast Path tetiklenme (Adım 0.5)
- `skills/figma-canvas-ops/SKILL.md` — **HER `figma_execute` ÖNCESİ Rule 5a CHUNKING + Rule 22 Async + Rule 23 Style + Rule 24 Discovery zorunlu**
- `agents/_orchestrator-protocol.md` — Ortak protokol (8 madde)
- `.claude/design-systems/active-ds.md` — DS GATE state

Test prompt şablonu için: `install/claude-desktop/TEST-PROMPTS.md` (planlanan, henüz yok).
