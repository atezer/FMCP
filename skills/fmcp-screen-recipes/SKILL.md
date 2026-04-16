---
name: fmcp-screen-recipes
description: Fast path cookbook — standart ekran tipleri (login/payment/profile/list/detail/form/onboarding/dashboard/settings) için linear 9-adımlı recipe. Figma native frame presets, SUI native variable modes, chunking built-in (max 8 op/execute), her adımda Türkçe micro-report. Common case'de generate-figma-screen ağır workflow'unu atlayıp %40-50 daha hızlı üretim sağlar.
metadata:
  mcp-server: user-figma-mcp-bridge
  version: 2.0.0
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

## 5 Mega-Adımlı Fast Path Akışı (v2.0 — Hız Odaklı)

**Eski 12-adım yapısı 5 mega-adıma sıkıştırıldı.** Rule 5a v2.0: max **15 op/execute** (gerçek test: 7 op = 88ms, 15 op güvenli). Her mega-adım sonrası **tek satır Türkçe micro-report**.

```
MEGA-ADIM 1: Pre-Flight Discovery + Token + Text Style  (1 execute, ~15 op)
MEGA-ADIM 2: Frame + Structure + Modes                   (1 execute, ~12-14 op)
MEGA-ADIM 3: Component Placement (toplu, 3-4/execute)    (2-3 execute, ~12-15 op each)
MEGA-ADIM 4: Dark Variant                                (1 execute, ~4 op)
MEGA-ADIM 5: Validate + Final Report                     (1-2 validate çağrısı)
```

**Toplam execute sayısı:** ~6-8. **Hedef süre:** ~10-12 dk (eski 30+ dk yerine).

### 🚨 3 MUTLAK KURAL (v2.0 — her mega-adımda geçerli)

**KURAL 1 — Fill Bind MUTLAK Zorunluluk:**
Her `createFrame` / `createRectangle` sonrası fill'i DS renk token'a bağla:
```js
const paint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } }; // initial, override edilecek
const bound = figma.variables.setBoundVariableForPaint(paint, 'color', dsColorVar);
node.fills = [bound];
```
Fill panel'de **variable icon 🎨 GÖRÜNMELI**. Hardcoded hex (000000, ffffff) **YASAK**. Bu kural primitive fallback dahil TÜM node'lar için geçerlidir.

**KURAL 2 — Variant Seçim: DEFAULT Koru:**
Component instance oluşturduktan sonra:
- `setProperties` ile SADECE recipe'de explicit belirtilen property'leri set et (örn. `Title Text = "Ödeme"`)
- Diğer TÜM property'leri **DEFAULT** değerinde bırak (`componentPropertyDefinitions.defaultValue`)
- `Product` → **main** (default, değiştirme)
- Boolean kontroller (Right Controls, Left Logo vb.) → recipe'de explicit "true/false" yoksa **DEFAULT bırak**
- NavigationTopBar için ödeme sayfası: `{ "Title Text": "Ödeme" }` — başka override YOK

**KURAL 3 — Token Bind, Alias Resolve ETME:**
`setBoundVariable(property, importedVariable)` ile bind et. Figma runtime alias chain'i otomatik çözer. `valuesByMode` okuma, `getVariableByIdAsync` traversal **YASAK** (plugin timeout riski).

### ⚠️ MEGA-ADIM UYGULAMA UYARISI (v2.0 — ZORUNLU OKU)

Aşağıdaki eski adımlar (1, 1.5, 1.6, 2, 3, 4, 5, 5.5, 6, 7, 8, 9) **REFERANS ve DETAY** amaçlıdır.

**AYRI AYRI execute ETME.** Yukarıdaki 5 MEGA-ADIM tablosunu takip et:
- **M1:** Adım 1 (validation, execute dışı) + 1.5 (discovery+import) + 1.6 (text style) → **TEK execute**
- **M2:** Adım 2 (frame) + 3 (breakpoint) + 4b (mode) + 5.5 (content body) → **TEK execute**
- **M3:** Adım 6 (discovery) + 7 (placement) → **2-3 execute** (3-4 component per execute)
- **M4:** Adım 8 (dark) → **TEK execute**
- **M5:** Adım 9 (validate) → **1-2 validate call**

Her mega-adımın alt detayları aşağıdaki eski adımlarda açıklanır, ama execute birleşik yapılır.

---

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

### Adım 1.5 — Unified Pre-Flight Discovery (v1.9.7+)

**Amaç:** Recipe başlamadan önce **iki execute'ta** tüm keşif işlerini tamamla. Adım 2, 3, 4b, 5.5, 7 için gereken TÜM key'ler ve collection bilgileri burada hazırlanır — sonraki adımlarda tanımsız değişken olmaz.

**Bu adım şunları birleştirir:**
1. Collection listesi + keyword match (eski Adım 4a tekrarını ortadan kaldırır)
2. Critical spacing token import key'leri (bind için, alias resolve ETME)
3. Semantic Colors + Size collection ID ve mode listesi (Adım 4b için)
4. Surface background token key (Adım 2 için)
5. Breakpoint Screen token key (Adım 3 için)

**🚨 Alias resolve neden YOK (v1.9.7 kritik değişiklik):**
`setBoundVariable(property, variable)` çağrıldığında Figma runtime alias chain'i (semantic → primitive → px) **otomatik çözer**. Recipe token'ı BIND eder, px değerini BİLMEK gereksiz ve TEHLİKELİ. FP-1-R-v3 (2026-04-16): `valuesByMode` VARIABLE_ALIAS döndü → alias traverse denemesi → plugin 4 dk timeout → bridge crash → recipe tamamen çöktü. **Alias resolve KALDIRILDI, px değeri OKUNMAZ.**

**🚨 Token name matching (v1.9.7 kritik düzeltme):**
SUI token'lar nested path formatı kullanır (`"Spacing/spacing-100"`, flat `"spacing-100"` DEĞİL). Exact match (`===`) sıfır sonuç verir. `endsWith` match kullanılır:
```js
vars.find(v => v.name.endsWith("/" + suffix) || v.name === suffix)
```

#### Execute 1 — Collection & Mode Discovery (7-8 op)

```js
// figma_execute (tek call, 7-8 async op — Rule 5a sınırında)
const colls = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();

// Keyword match (case-insensitive, trim'li, multi-keyword fallback)
function findColl(keywords) {
  return colls.find(c => {
    const n = c.name.toLowerCase().trim();
    return keywords.some(kw => n.includes(kw));
  });
}

const sizeColl = findColl(["semantic size", "semantic sizes", "size"]);
const colorsColl = findColl(["semantic color", "s theme", "theme"]);
const bpColl = findColl(["breakpoint"]);

const result = {
  availableColls: colls.map(c => ({name: c.name, key: c.key})),
  spacingTokenKeys: {},
  collectionInfo: { colors: null, size: null },
  surfaceKey: null,
  breakpointKey: null
};

// 1. Spacing token key'lerini listele (endsWith match, import Execute 2'de)
if (sizeColl) {
  const sizeVars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(sizeColl.key);
  const criticalSuffixes = [
    "spacing-none", "spacing-050", "spacing-075", "spacing-100",
    "spacing-125", "spacing-150", "spacing-200"
  ];
  for (const suffix of criticalSuffixes) {
    const found = sizeVars.find(v =>
      v.name.endsWith("/" + suffix) || v.name === suffix
    );
    if (found) result.spacingTokenKeys[suffix] = found.key;
  }

  // Size collection mode discovery (Adım 4b için)
  if (sizeVars.length > 0) {
    const first = await figma.variables.importVariableByKeyAsync(sizeVars[0].key);
    const coll = await figma.variables.getVariableCollectionByIdAsync(first.variableCollectionId);
    result.collectionInfo.size = {
      collId: coll.id,
      modes: coll.modes.map(m => ({name: m.name, modeId: m.modeId}))
    };
  }
}

// 2. Colors collection mode discovery + surface background token
if (colorsColl) {
  const colorsVars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(colorsColl.key);

  // Surface background token (Adım 2 için)
  const bgVar = colorsVars.find(v =>
    v.name.toLowerCase().includes("background") &&
    v.name.toLowerCase().includes("level-0")
  );
  if (bgVar) result.surfaceKey = bgVar.key;

  // Colors mode discovery (Adım 4b için — light/dark mode ID'leri)
  if (colorsVars.length > 0) {
    const first = await figma.variables.importVariableByKeyAsync(colorsVars[0].key);
    const coll = await figma.variables.getVariableCollectionByIdAsync(first.variableCollectionId);
    result.collectionInfo.colors = {
      collId: coll.id,
      modes: coll.modes.map(m => ({name: m.name, modeId: m.modeId}))
    };
  }
}

// 3. Breakpoint token (Adım 3 için)
if (bpColl) {
  const bpVars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(bpColl.key);
  const screenVar = bpVars.find(v => v.name.toLowerCase().includes("screen"));
  if (screenVar) result.breakpointKey = screenVar.key;
}

return result;
```

**Atomic operations:** 1 (colls) + 1 (sizeVars) + 1 (import size first) + 1 (getCollection size) + 1 (colorsVars) + 1 (import colors first) + 1 (getCollection colors) + 1 (bpVars, opsiyonel) = **7-8 async op**. Rule 5a sınırında, bpColl yoksa 7.

#### Execute 2 — Critical Token Import (7 op)

```js
// figma_execute (tek call, 7 async op — Rule 5a uyumlu)
// Execute 1'den dönen spacingTokenKeys kullanılır

const tokenKeyMap = {};
const spacingKeys = { /* Execute 1 return'ünden gelen spacingTokenKeys */ };

for (const [suffix, key] of Object.entries(spacingKeys)) {
  try {
    const imported = await figma.variables.importVariableByKeyAsync(key);
    tokenKeyMap[suffix] = imported.id;  // Variable ID — setBoundVariable için yeterli
  } catch(e) {
    // Token import fail → Adım 5.5/7'de fallback (hardcoded 0 veya skip)
  }
}

return { tokenKeyMap };
```

**Atomic operations:** 7 (importVariableByKeyAsync × critical token count). Rule 5a uyumlu.

**🚨 Plugin restart notu:** Plugin restart sonrası import cache sıfırlanır. Eğer token import fail olursa recipe'i en baştan çalıştır — Adım 1.5 Execute 1+2'yi tekrarla.

**Beklenen çıktı (Execute 1+2 birleşik):**
```json
{
  "spacingTokenKeys": {
    "spacing-none": "key_abc",
    "spacing-050": "key_def",
    "spacing-100": "key_ghi"
  },
  "collectionInfo": {
    "colors": { "collId": "...", "modes": [{"name":"Light","modeId":"..."}, {"name":"Dark","modeId":"..."}] },
    "size": { "collId": "...", "modes": [{"name":"Mobil & Web Mobil","modeId":"..."}, ...] }
  },
  "surfaceKey": "key_surface",
  "breakpointKey": "key_bp",
  "tokenKeyMap": {
    "spacing-none": "varId_1",
    "spacing-100": "varId_2"
  }
}
```

**Sonraki adımlar bu çıktıyı kullanır:**
- Adım 2: `surfaceKey` → `importVariableByKeyAsync(surfaceKey)` → background bind
- Adım 3: `breakpointKey` → `importVariableByKeyAsync(breakpointKey)` → width bind
- Adım 4b: `collectionInfo.colors/size` → `setExplicitVariableModeForCollection`
- Adım 5.5: `tokenKeyMap["spacing-100"]` → `setBoundVariable("paddingLeft", ...)`
- Adım 7: `tokenKeyMap` → component padding/gap bind

**Micro-report:** `✅ Pre-Flight Discovery: <N> collection, <M> spacing token imported, colors=<modes>, size=<modes>, surface=<found/missing>, breakpoint=<found/missing>`

### Adım 1.6 — Text Style Resolution Verification (YENİ v1.9.5+, Gerçek Test FP-1-R-v2 #10)

**Amaç:** Recipe başlamadan önce dosyadaki **mevcut (çalışan) text style'ları** tara, unique style ID'leri topla, role mapping üret. Sonraki Adım 7 her text rolü için bu `roleMap`'i **referans alır** — `importStyleByKeyAsync` fail'ine düşmeden `setTextStyleIdAsync(id)` ile direkt bağlar.

**Neden:** Gerçek test FP-1-R-v2 (2026-04-15) — `importStyleByKeyAsync("774cf1886...")` "Failed to import style by key" hatası verdi, ama dosyadaki SUI instance'larının (NavigationTopBar, Button vs.) içindeki text node'lar zaten `getStyleByIdAsync` ile erişilebilir çalışan style'lara sahipti (5 style: `section-title`, `body-semibold`, `body-small`, `body-small-semibold`, `body-bold`). Claude canlı keşif yaptı ama **sistemik kullanmadı** — her text node için ayrı discovery + rebind turu → **7 ek figma_execute** harcandı (27 vs hedef 20). Bu adım sistemik yapar, keşfi Adım 1.5 `tokenMap` gibi tek execute'ta tamamlar.

```js
// figma_execute (tek call, 5-8 op — Rule 5a CHUNKING'e uyumlu)

// 1. Tüm text node'ları tara, unique style ID'leri topla
const allTexts = figma.currentPage.findAll(n => n.type === "TEXT");
const uniqueStyleIds = new Set();
for (const t of allTexts) {
  if (t.textStyleId && typeof t.textStyleId === 'string') {
    uniqueStyleIds.add(t.textStyleId);
  }
}

// 2. Her unique style için metadata oku
const styleMap = {};
for (const id of uniqueStyleIds) {
  try {
    const style = await figma.getStyleByIdAsync(id);
    if (style) {
      styleMap[style.id] = {
        id: style.id,
        name: style.name,         // örn. "global/surface/body-semibold"
        fontSize: style.fontSize || null,
        fontName: style.fontName || null
      };
    }
  } catch(e) {
    // Silent skip — bozuk style ID varsa atla
  }
}

// 3. Role mapping — recipe text rolleri için en yakın style'ı seç
// Keyword match: role → style name substring (case-insensitive)
const roleKeywords = {
  display:   ["display", "hero", "amount", "title-xl"],
  title:     ["section-title", "title", "heading", "h1", "h2"],
  subtitle:  ["subtitle", "body-semibold", "body-bold"],
  body:      ["body-medium", "body-regular", "body"],
  caption:   ["small", "caption", "footnote"],
  button:    ["button"]
};

function findStyleByKeywords(kws) {
  // Öncelik: ilk isim substring eşleşmesi (sıraya göre)
  for (const kw of kws) {
    const match = Object.values(styleMap).find(s => {
      const n = (s.name || "").toLowerCase();
      return n.includes(kw.toLowerCase());
    });
    if (match) return match;
  }
  return null;
}

const roleMap = {};
for (const [role, kws] of Object.entries(roleKeywords)) {
  const match = findStyleByKeywords(kws);
  if (match) {
    roleMap[role] = { id: match.id, name: match.name, fontSize: match.fontSize };
  }
}

// Display için özel fallback — bulunamazsa en büyük fontSize'lı style'ı kullan
if (!roleMap.display) {
  const sorted = Object.values(styleMap)
    .filter(s => s.fontSize)
    .sort((a, b) => b.fontSize - a.fontSize);
  if (sorted.length > 0) {
    roleMap.display = {
      id: sorted[0].id,
      name: sorted[0].name,
      fontSize: sorted[0].fontSize,
      note: "display yok, en büyük mevcut style fallback"
    };
  }
}

return {
  totalStyles: Object.keys(styleMap).length,
  styleMap,
  roleMap
};
```

**Beklenen çıktı (FP-1-R-v2 keşfinden):**
```json
{
  "totalStyles": 5,
  "styleMap": {
    "S:xxx1": { "name": "global/surface/section-title", "fontSize": 18 },
    "S:xxx2": { "name": "global/surface/body-semibold", "fontSize": 14 },
    "S:xxx3": { "name": "global/surface/body-small", "fontSize": 12 },
    "S:xxx4": { "name": "global/surface/body-small-semibold", "fontSize": 12 },
    "S:xxx5": { "name": "global/surface/body-bold", "fontSize": 14 }
  },
  "roleMap": {
    "display":  { "name": "global/surface/section-title", "fontSize": 18, "note": "display yok, en büyük mevcut style fallback" },
    "title":    { "name": "global/surface/section-title", "fontSize": 18 },
    "subtitle": { "name": "global/surface/body-semibold", "fontSize": 14 },
    "body":     { "name": "global/surface/body-small", "fontSize": 12 },
    "caption":  { "name": "global/surface/body-small", "fontSize": 12 }
  }
}
```

**Adım 7 placement bu map'i kullanır — kritik kural:**

- `importStyleByKeyAsync(key)` **ÇAĞIRMA** — FP-1-R-v2'de fail etti, zaman kaybı.
- Yerine: `await textNode.setTextStyleIdAsync(roleMap[role].id)` → direkt bağla.
- Style ID **tam form** (`S:xxx...`) olmalı, kısa form değil — `getStyleByIdAsync` return'ü zaten full ID verir.
- Display rolü için `roleMap.display` mevcutsa o style ile bağla, **fontSize override ETME** (Rule 19 yasak). Büyüklük için `characters` field'ında büyük metin yaz ("₺2.450,00"). Okunurluk stil seçimiyle gelir, hardcoded fontSize ile DEĞİL.

**Known Limitation #7 Workaround Revizesi (v1.9.5):**
- Eski (v1.9.4 Part 4): "display fail → `body-semibold + hardcoded fontSize=36` kabul, minimum violation"
- Yeni (v1.9.5 Part 5): "display fail → `roleMap.display` (en büyük mevcut style fallback) + `characters` ile büyük metin → HARDCODED_FONT_SIZE **sıfır**, Rule 19 ihlali yok"

**Dosyada hiç text instance yoksa (boş file):**
- `findAll(TEXT)` boş döner → `styleMap` boş
- `roleMap` tüm roller için `null`
- Fallback: `figma_search_assets({query: "text style"})` VEYA `generate-figma-screen` full workflow'u
- Bu nadiren Fast Path tetiklendiğinde olur çünkü DS GATE zaten `active-ds.md ✅ Aktif` gerektiriyor ve DS instance'lar dosyada bekleniyor.

**Atomic operations:** 1 (findAll) + 1 (Set dedup) + N (`getStyleByIdAsync` × unique count, genelde 3-6 style) + role mapping (CPU-only) = ~5-8 op. Rule 5a sınırında — `getStyleByIdAsync` çağrıları her style için 1 async round-trip, 8'den fazla unique style beklenirse execute'u ikiye böl (tarama + metadata ayrı).

**Micro-report:** `✅ Text Style Resolution: <N> style resolved, <M> role eşleştirildi (display→<name>, title→<name>, body→<name>, caption→<name>)`

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

// Background variable bind — surfaceKey Adım 1.5 Execute 1'den gelir
// (eski surfaceColKey tanımsız sorunu v1.9.7'de çözüldü)
let bgVar = null;
try {
  if (surfaceKey) {
    bgVar = await figma.variables.importVariableByKeyAsync(surfaceKey);
  }
} catch(e) {}

if (bgVar) {
  const paint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } };
  const bound = figma.variables.setBoundVariableForPaint(paint, 'color', bgVar);
  frame.fills = [bound];
}

return { frameId: frame.id, width: <width>, height: <height> };
```

**Atomic operations (4-5):** createFrame, resize, layoutMode/sizing/padding setters (grouped), importVariableByKeyAsync (surfaceKey — Adım 1.5'ten), setBoundVariableForPaint. **Not:** Eski `getVariablesInLibraryCollectionAsync(surfaceColKey)` kaldırıldı — collection search artık Adım 1.5'te yapıldı, burada sadece import + bind.

**Micro-report:** `✅ Frame oluşturuldu: <device_preset> (<w>×<h>), edge-to-edge (padding=0, gap=0), background: <DS>/Surface/background level-0`

### Adım 3 — Breakpoint Variable Binding

**Amaç:** `frame.width`'i DS'in Breakpoints/Screen variable'ına bağla (responsive davranış için).

```js
// figma_execute (tek call, 2-3 op)
// breakpointKey: Adım 1.5 Execute 1'den gelir (eski breakpointsColKey tanımsız sorunu v1.9.7'de çözüldü)
const frame = await figma.getNodeByIdAsync(frameId);

let screenVar = null;
try {
  if (breakpointKey) {
    screenVar = await figma.variables.importVariableByKeyAsync(breakpointKey);
  }
} catch(e) {}

if (screenVar) {
  frame.setBoundVariable("width", screenVar);
  return { boundBreakpoint: true };
} else {
  return { boundBreakpoint: false, note: "Breakpoint variable bulunamadı, frame fixed width" };
}
```

**Atomic operations:** 2-3 (getNodeByIdAsync, importVariableByKeyAsync (breakpointKey — Adım 1.5'ten), setBoundVariable). **Not:** Eski `getVariablesInLibraryCollectionAsync(breakpointsColKey)` kaldırıldı — breakpoint key Adım 1.5'te keşfedildi, burada direkt import + bind.

**Micro-report:** `✅ Breakpoint: <DS>/Breakpoints/Screen bound` VEYA `⚠️ Breakpoint bulunamadı, fixed width devam`

### Adım 4 — Theme + Size Mode Setup (v1.9.7+ Unified)

**Adım 4a — Collection & Mode Enumeration: ⏭️ NO-OP (v1.9.7+)**

Collection discovery ve mode enumeration artık **Adım 1.5 Unified Pre-Flight Discovery** Execute 1'de tamamlanır. Bu adım ayrı execute **HARCAMAZ**.

Adım 1.5'ten gelen `collectionInfo` kullanılır:
```json
{
  "colors": { "collId": "...", "modes": [{"name":"Light","modeId":"..."}, {"name":"Dark","modeId":"..."}] },
  "size": { "collId": "...", "modes": [{"name":"Mobil & Web Mobil","modeId":"..."}, ...] }
}
```

**Eski davranış (v1.9.4-v1.9.6):** Ayrı execute'ta `getAvailableLibraryVariableCollectionsAsync` çağırıp collection + mode listesi alıyordu. Adım 1.5 ile aynı API'yi tekrarlıyordu → gereksiz execute. v1.9.7'de kaldırıldı.

**Micro-report:** `⏭️ Adım 4a no-op — collection/mode bilgisi Adım 1.5'ten mevcut`

**Adım 4b — Mode apply to frame (ayrı execute):**

Adım 1.5'ten gelen `collectionInfo` kullanarak frame'e mode'ları uygula. Mode seçimi keyword match ile (Turkish + English toleranslı, karışık isimlere dayanıklı):

```js
// figma_execute (tek call, 3-5 op)
const frame = await figma.getNodeByIdAsync(frameId);

// collectionInfo: Adım 1.5 Execute 1'den gelir
// Light mode (Semantic Colors)
if (collectionInfo.colors) {
  const coll = await figma.variables.getVariableCollectionByIdAsync(collectionInfo.colors.collId);
  const lightMode = collectionInfo.colors.modes.find(m => {
    const mn = m.name.toLowerCase();
    return mn === "light" || mn === "açık" || mn.includes("light");
  });
  if (lightMode) {
    frame.setExplicitVariableModeForCollection(coll, lightMode.modeId);
  }
}

// Platform mode (Semantic Size)
if (collectionInfo.size) {
  const coll = await figma.variables.getVariableCollectionByIdAsync(collectionInfo.size.collId);
  const platformKeywords = {
    "mobile": ["mobil", "mobile"],
    "tablet": ["tablet"],
    "desktop": ["web", "desktop"],
    "web": ["web", "desktop"]
  };
  const targetKws = platformKeywords[platform] || ["mobil"];
  const sizeMode = collectionInfo.size.modes.find(m => {
    const mn = m.name.toLowerCase();
    return targetKws.some(kw => mn.includes(kw));
  });
  if (sizeMode) {
    frame.setExplicitVariableModeForCollection(coll, sizeMode.modeId);
  }
}

return { modesApplied: true };
```

**Atomic operations:** 3-5 (getNodeByIdAsync, 2× getCollectionByIdAsync, 2× setExplicitMode).

**Micro-report:** `✅ Theme: Light (<colors collName>), Size: <size modeName> (<size collName>)`

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

**Amaç:** Recipe'teki component'leri toplu olarak doğru parent'a yerleştir. **v2.0: 3-4 COMPONENT TEK execute'ta** (eski: her component ayrı → 6-8 execute harcıyordu). Rule 5a v2.0 max 15 op sınırı bunu mümkün kılıyor.

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
const edgeNames = /^(navigation|nav|top|bottom|status|tabbar|tab_bar)/i;

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
  //   7. Text node'lar varsa: setTextStyleIdAsync(roleMap[role].id)
  //      — Adım 1.6'da hazırlanan roleMap'ten direkt bağla,
  //        importStyleByKeyAsync ASLA çağırma.

  // Micro-report: "✅ <spec.name> eklendi (parent: <Ana Frame|Content Body>)"
  //            or "⚠️ <spec.name> eksik, primitive fallback"
}
```

**🚨 Text Style Binding Kuralı (v1.9.5+, Fix J zorunlu):**

Component içindeki her text node için:
1. Recipe spec'indeki text role'üne göre `roleMap[role].id` oku (Adım 1.6'dan geldi)
2. `await textNode.setTextStyleIdAsync(roleMap[role].id)` — DİREKT bağla
3. `importStyleByKeyAsync(key)` **ASLA** çağırma — FP-1-R-v2'de fail etti, zaman kaybı
4. `textNode.fontSize = X` **ASLA** set etme (Rule 19 yasak, HARDCODED_FONT_SIZE violation)
5. Büyük metin gerekiyorsa (örn. Amount Display): `characters` field'ında büyük string ("₺2.450,00"), style değişmez

**Text rolü → recipe mapping (öneri):**
- Amount Display / Hero text → `roleMap.display`
- Section Header → `roleMap.title`
- Card Title → `roleMap.subtitle`
- Card Subtitle / Body → `roleMap.body`
- Small / Caption / Security Info → `roleMap.caption`
- Button label → `roleMap.button` (yoksa subtitle'a düş)

**Text rolü `roleMap`'te yoksa:**
- En yakın fontSize'lı style'ı kullan (fallback: `roleMap.body` veya `roleMap.caption`)
- Kullanıcıya bildir: `⚠️ Text style '<role>' bulunamadı, <fallback> kullanıldı`
- HARDCODED_FONT_SIZE hâlâ sıfır olmalı.

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
// resize sadece initial boyut — appendChild sonrası layoutSizingHorizontal='FILL' ile override
card.resize(340, 80);
card.layoutMode = "HORIZONTAL";
card.primaryAxisSizingMode = "FIXED";
card.counterAxisSizingMode = "AUTO";  // v1.9.7: FIXED → AUTO (içeriğe göre)
// itemSpacing: tokenKeyMap["spacing-075"] ile bind edilecek (Adım 1.5'ten)
// fallback: tokenKeyMap yoksa 12px hardcoded, ama tokenKeyMap her zaman hazır olmalı
card.itemSpacing = 12;  // geçici — aşağıda setBoundVariable ile override

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

## Tool Chunking Kuralları (v2.0 — Recipe-Specific)

Her recipe çalıştırırken **Rule 5a v2.0 CHUNKING** zorunlu:

- **Max 15 atomic op / figma_execute** (eski 8 → 15, gerçek test verisiyle revize)
- **3-4 component TEK execute'ta** yerleştir (eski: her component ayrı → çok yavaş)
- Execute'ler arası state: `return { nodeIds }` → sonraki execute `getNodeByIdAsync(id)` veya tekrar `importVariableByKeyAsync(key)` ile al

**Timeout konfigürasyonu:** Her execute için `timeout: 15000` (15 sn) yeterli. 15 op = ~200-300ms beklenen (gerçek test: 7 op = 88ms).

**Anti-pattern (YASAK):**
```js
// ❌ Her component için AYRI execute (v1.x eski yaklaşım — 6-8 execute harcıyordu)
// figma_execute #1: 1 component
// figma_execute #2: 1 component
// ...
// figma_execute #8: 1 component
```

**Doğru pattern (v2.0):**
```
// figma_execute #1: NavigationTopBar + Amount Display + Section Header (3 component, ~12 op)
// figma_execute #2: Payment Card ×3 + Divider (4 component, ~14 op)
// figma_execute #3: CTA Button + Security Info (2 component, ~8 op)
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
