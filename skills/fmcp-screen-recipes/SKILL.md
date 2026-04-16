---
name: fmcp-screen-recipes
description: Fast path cookbook — standart ekran tipleri (login/payment/profile/list/detail/form/onboarding/dashboard/settings) için 5 mega-adımlı recipe. Max 15 op/execute, cache-first discovery, her adımda Türkçe micro-report.
metadata:
  mcp-server: user-figma-mcp-bridge
  version: 3.0.0
  priority: 96
  phase: fast-path
  personas:
    - designer
    - uidev
  token_budget: condensed-first
required_inputs:
  - name: screen_type
    type: "enum: login | payment | profile | list | detail | form | onboarding | dashboard | settings"
  - name: platform
    type: "enum: mobile | tablet | desktop | web"
  - name: device_preset
    type: string
  - name: variants
    type: "array: [light] | [light, dark]"
  - name: active_ds
    type: string
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
- ✅ Tek ekran üretimi
- ✅ Standart ekran tipi: 9 recipe'ten biri match ediyor
- ✅ DS tanımlı: `active-ds.md` Status: ✅ Aktif
- ✅ Platform belli
- ✅ Custom animation / prototype YOK

**Devreye GİRMEZ:** Multi-screen flow, custom layout, animation, explicit generate-figma-screen talebi, DS GATE geçilmemişse.

---

## 5 Mega-Adımlı Akış

Max **15 op/execute**. Her mega-adım sonrası tek satır Türkçe micro-report.

```
M1: Pre-Flight Discovery + Token + Text Style  (1 execute, ~15 op)
M2: Frame + Structure + Modes                   (1 execute, ~12-14 op)
M3: Component Placement (toplu, 3-4/execute)    (2-3 execute, ~12-15 op each)
M4: Dark Variant                                (1 execute, ~4 op)
M5: Validate + Final Report                     (1-2 validate çağrısı)
```

**Toplam execute:** ~6-8. **Hedef süre:** ~10 dk.

### 3 MUTLAK KURAL

**KURAL 1 — Fill Bind Zorunlu (frame + text dahil):**
```js
const paint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } };
const bound = figma.variables.setBoundVariableForPaint(paint, 'color', dsColorVar);
node.fills = [bound];
```
Fill panel'de variable icon 🎨 GÖRÜNMELI. Hardcoded hex YASAK. Frame fill + text fill + primitive dahil TÜM node'lar.

**KURAL 2 — Variant Seçim: DEFAULT Koru:**
- `setProperties` ile SADECE recipe'de explicit belirtilen property'leri set et
- Diğer TÜM property'leri DEFAULT bırak
- `Product` → main (default), Boolean kontroller → recipe'de explicit yoksa DEFAULT

**KURAL 3 — Token Bind, Alias Resolve ETME:**
`setBoundVariable(property, importedVariable)` ile bind et. Figma runtime alias chain'i otomatik çözer. `valuesByMode` okuma, alias traversal YASAK (timeout riski).

### Mega-Adım Mapping

Aşağıdaki eski adımlar REFERANS amaçlıdır. AYRI AYRI execute ETME — mega-adım tablosunu takip et:
- **M1:** Adım 1 (validation) + 1.5 (discovery) + 1.6 (text style) → TEK execute
- **M2:** Adım 2 (frame) + 4b (mode) + 5.5 (content body) → TEK execute
- **M3:** Adım 6 (discovery) + 7 (placement) → 2-3 execute
- **M4:** Adım 8 (dark) → TEK execute
- **M5:** Adım 9 (validate) → 1-2 validate call

---

### Adım 1 — Pre-Flight Check

Hiçbir figma_execute çağırma. Doğrula: active-ds.md ✅, screen_type geçerli, platform + device_preset geçerli, variants ≥1.

**Micro-report:** `✅ Pre-flight: screen_type=<X>, platform=<Y>, device=<Z>, variants=<V>`

### Adım 1.5 — Unified Pre-Flight Discovery

**Cache-First (v3.0+):** Önce `.claude/design-systems/sui/tokens.md` oku. Cache varsa ve <7 gün → token discovery ATLA, cache'ten kullan. Yoksa aşağıdaki execute'ları çalıştır, sonra cache'i güncelle.

Token name matching: SUI nested path formatı (`"Spacing/spacing-100"`). `endsWith` match kullan:
```js
vars.find(v => v.name.endsWith("/" + suffix) || v.name === suffix)
```

#### Execute 1 — Collection & Mode Discovery (7 op)

```js
const colls = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
function findColl(keywords) {
  return colls.find(c => {
    const n = c.name.toLowerCase().trim();
    return keywords.some(kw => n.includes(kw));
  });
}
const sizeColl = findColl(["semantic size", "semantic sizes", "size"]);
const colorsColl = findColl(["semantic color", "s theme"]);
const result = { availableColls: colls.map(c => ({name: c.name, key: c.key})), spacingTokenKeys: {}, collectionInfo: { colors: null, size: null }, surfaceKey: null };

if (sizeColl) {
  const sizeVars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(sizeColl.key);
  const suffixes = ["spacing-none","spacing-050","spacing-075","spacing-100","spacing-125","spacing-150","spacing-200"];
  for (const s of suffixes) {
    const f = sizeVars.find(v => v.name.endsWith("/"+s) || v.name === s);
    if (f) result.spacingTokenKeys[s] = f.key;
  }
  if (sizeVars.length > 0) {
    const first = await figma.variables.importVariableByKeyAsync(sizeVars[0].key);
    const coll = await figma.variables.getVariableCollectionByIdAsync(first.variableCollectionId);
    result.collectionInfo.size = { collId: coll.id, modes: coll.modes.map(m => ({name: m.name, modeId: m.modeId})) };
  }
}
if (colorsColl) {
  const colorsVars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(colorsColl.key);
  const bgVar = colorsVars.find(v => v.name.toLowerCase().includes("background") && v.name.toLowerCase().includes("level-0"));
  if (bgVar) result.surfaceKey = bgVar.key;
  if (colorsVars.length > 0) {
    const first = await figma.variables.importVariableByKeyAsync(colorsVars[0].key);
    const coll = await figma.variables.getVariableCollectionByIdAsync(first.variableCollectionId);
    result.collectionInfo.colors = { collId: coll.id, modes: coll.modes.map(m => ({name: m.name, modeId: m.modeId})) };
  }
}
return result;
```

#### Execute 2 — Critical Token Import (7 op)

```js
const tokenKeyMap = {};
const spacingKeys = { /* Execute 1'den gelen spacingTokenKeys */ };
for (const [suffix, key] of Object.entries(spacingKeys)) {
  try {
    const imported = await figma.variables.importVariableByKeyAsync(key);
    tokenKeyMap[suffix] = imported.id;
  } catch(e) {}
}
return { tokenKeyMap };
```

**Micro-report:** `✅ Pre-Flight Discovery: <N> collection, <M> token imported, surface=<found/missing>`

### Adım 1.6 — Text Style Resolution

Dosyadaki mevcut text style'ları tara, role mapping üret. `importStyleByKeyAsync` ÇAĞIRMA — direkt `setTextStyleIdAsync(roleMap[role].id)` kullan.

```js
const allTexts = figma.currentPage.findAll(n => n.type === "TEXT");
const uniqueStyleIds = new Set();
for (const t of allTexts) { if (t.textStyleId && typeof t.textStyleId === 'string') uniqueStyleIds.add(t.textStyleId); }

const styleMap = {};
for (const id of uniqueStyleIds) {
  try { const style = await figma.getStyleByIdAsync(id); if (style) styleMap[style.id] = { id: style.id, name: style.name, fontSize: style.fontSize || null }; } catch(e) {}
}

const roleKeywords = {
  display: ["display","hero","amount","title-xl"], title: ["section-title","title","heading"],
  subtitle: ["subtitle","body-semibold","body-bold"], body: ["body-medium","body-regular","body"],
  caption: ["small","caption","footnote"], button: ["button"]
};
function findStyle(kws) { for (const kw of kws) { const m = Object.values(styleMap).find(s => (s.name||"").toLowerCase().includes(kw.toLowerCase())); if (m) return m; } return null; }
const roleMap = {};
for (const [role, kws] of Object.entries(roleKeywords)) { const m = findStyle(kws); if (m) roleMap[role] = { id: m.id, name: m.name, fontSize: m.fontSize }; }
if (!roleMap.display) {
  const sorted = Object.values(styleMap).filter(s => s.fontSize).sort((a,b) => b.fontSize - a.fontSize);
  if (sorted.length > 0) roleMap.display = { id: sorted[0].id, name: sorted[0].name, fontSize: sorted[0].fontSize };
}
return { totalStyles: Object.keys(styleMap).length, styleMap, roleMap };
```

**Micro-report:** `✅ Text Style: <N> style, <M> role eşleşti`

---

### Adım 2 — Wrapper Frame + Background (Edge-to-Edge)

Ana frame: device preset boyutu, auto-layout VERTICAL, padding=0, gap=0, background DS variable'a bağlı.

**Edge-to-Edge yapı:**
```
Ana Frame (padding:0, gap:0, VERTICAL)
├── NavigationTopBar (FILL — edge-to-edge)
├── Content Body (FILL both, padding:spacing-100, gap:spacing-075)
│   └── Recipe component'leri
└── BottomNavBar (FILL — edge-to-edge, varsa)
```

```js
const frame = figma.createFrame();
frame.name = "<Screen Name> — <Device Preset>";
frame.resize(<width>, <height>);
frame.layoutMode = "VERTICAL";
frame.primaryAxisSizingMode = "FIXED";
frame.counterAxisSizingMode = "FIXED";
frame.paddingTop = 0; frame.paddingBottom = 0; frame.paddingLeft = 0; frame.paddingRight = 0;
frame.itemSpacing = 0;
if (surfaceKey) {
  const bgVar = await figma.variables.importVariableByKeyAsync(surfaceKey);
  const paint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } };
  frame.fills = [figma.variables.setBoundVariableForPaint(paint, 'color', bgVar)];
}
return { frameId: frame.id };
```

**Micro-report:** `✅ Frame: <device> (<w>×<h>), edge-to-edge, background bound`

### Adım 3 — ⏭️ DEVRE DIŞI

Breakpoint bind frame boyutunu bozuyor (375 vs 402). Device preset boyutu korunur.

### Adım 4 — Theme + Size Mode Setup

Collection/mode bilgisi Adım 1.5'ten gelir (ayrı execute yok).

**Adım 4b — Mode apply:**
```js
const frame = await figma.getNodeByIdAsync(frameId);
if (collectionInfo.colors) {
  const coll = await figma.variables.getVariableCollectionByIdAsync(collectionInfo.colors.collId);
  const lightMode = collectionInfo.colors.modes.find(m => m.name.toLowerCase().includes("light"));
  if (lightMode) frame.setExplicitVariableModeForCollection(coll, lightMode.modeId);
}
if (collectionInfo.size) {
  const coll = await figma.variables.getVariableCollectionByIdAsync(collectionInfo.size.collId);
  const kws = { mobile:["mobil","mobile"], tablet:["tablet"], desktop:["web","desktop"], web:["web","desktop"] };
  const sizeMode = collectionInfo.size.modes.find(m => (kws[platform]||["mobil"]).some(k => m.name.toLowerCase().includes(k)));
  if (sizeMode) frame.setExplicitVariableModeForCollection(coll, sizeMode.modeId);
}
return { modesApplied: true };
```

**Micro-report:** `✅ Theme: Light, Size: <modeName>`

### Adım 5.5 — Content Body Wrapper

```js
const parentFrame = await figma.getNodeByIdAsync(frameId);
const contentBody = figma.createFrame();
contentBody.name = "Content Body";
contentBody.layoutMode = "VERTICAL";
parentFrame.appendChild(contentBody);  // ÖNCE (Rule 11)
contentBody.layoutSizingHorizontal = "FILL";  // SONRA
contentBody.layoutSizingVertical = "FILL";
const paddingVar = await figma.variables.importVariableByKeyAsync(spacing100Key);
const gapVar = await figma.variables.importVariableByKeyAsync(spacing075Key);
contentBody.setBoundVariable("paddingLeft", paddingVar);
contentBody.setBoundVariable("paddingRight", paddingVar);
contentBody.setBoundVariable("paddingTop", paddingVar);
contentBody.setBoundVariable("paddingBottom", paddingVar);
contentBody.setBoundVariable("itemSpacing", gapVar);
contentBody.fills = [];
return { contentBodyId: contentBody.id };
```

**Micro-report:** `✅ Content Body: FILL both, padding=spacing-100, gap=spacing-075`

### Adım 6 — Component Discovery

**Cache-First (v3.0+):** Önce `.claude/design-systems/sui/components.md` oku. Cache varsa → `figma_search_assets` ATLA, direkt `importComponentByKeyAsync` kullan. Yoksa: `figma_search_assets(query="<keywords>")` + Rule 24 fallback.

**Micro-report:** `✅ Component keşfi: <N> bulundu, <M> eksik`

### Adım 7 — Recipe Component Placement

3-4 component TEK execute'ta. Parent routing: edge-to-edge (NavigationTopBar, BottomNavBar) → Ana Frame, diğer her şey → Content Body.

```
const edgeNames = /^(navigation|nav|top|bottom|status|tabbar|tab_bar)/i;
const parentId = edgeNames.test(spec.name) ? frameId : contentBodyId;
```

**Text Style Binding:** `await textNode.setTextStyleIdAsync(roleMap[role].id)` — DİREKT bağla, `importStyleByKeyAsync` ÇAĞIRMA, `fontSize` set ETME.

**Text rolü mapping:** display→Amount/Hero, title→Section Header, subtitle→Card Title, body→Body text, caption→Small/Info.

### Adım 8 — Dark Variant

```js
const lightFrame = await figma.getNodeByIdAsync(lightFrameId);
const darkFrame = lightFrame.clone();
figma.currentPage.appendChild(darkFrame);
darkFrame.x = lightFrame.x + lightFrame.width + 80;
darkFrame.name = lightFrame.name + " — Dark";
const coll = await figma.variables.getVariableCollectionByIdAsync(semColorsCollId);
darkFrame.setExplicitVariableModeForCollection(coll, darkModeId);
return { darkFrameId: darkFrame.id };
```

### Adım 9 — Validation + Final Report

`figma_validate_screen(frameId, minScore=80)` her frame için. 3 deneme fail → kullanıcıya sor.

**Son Rapor:** Screen type, DS, device, variants, frame ID'leri, validate skorları, kullanılan component listesi, primitive fallback listesi, token binding sayıları, toplam execute, süre.

---

## Device Presets Lookup Table

### Mobile

| Device | W | H | Keywords |
|---|---|---|---|
| iPhone 17 | 402 | 874 | mobile, iphone, ios |
| iPhone 16 & 17 Pro | 402 | 874 | iphone pro |
| iPhone 16 | 393 | 852 | iphone 16 |
| iPhone 16 Pro Max | 440 | 956 | pro max |
| iPhone 16 Plus | 430 | 932 | iphone plus |
| iPhone Air | 420 | 912 | iphone air |
| iPhone 13 & 14 | 390 | 844 | iphone 13, iphone 14 |
| Android Compact | 412 | 917 | android |
| Android Medium | 700 | 840 | android tablet |

**Default:** mobile → iPhone 17, android → Android Compact.

### Tablet

| Device | W | H |
|---|---|---|
| iPad Pro 11" | 834 | 1194 |
| iPad Pro 12.9" | 1024 | 1366 |

**Default:** tablet → iPad Pro 11".

### Desktop / Web

| Device | W | H |
|---|---|---|
| Desktop | 1440 | 900 |
| Desktop HD | 1920 | 1080 |
| MacBook Pro 14" | 1512 | 982 |
| MacBook Pro 16" | 1728 | 1117 |

**Default:** desktop/web → Desktop 1440×900.

---

## 9 Screen Type Recipes

Her recipe = component listesi + yerleşim sırası + search keyword'leri + setProperties.

### Recipe 1: Login
**Trigger:** login, giriş, oturum aç, sign in

1. **AppBar** — `["navigation top", "appbar"]`
   **setProperties:** `{ "Subtitle": false, "Right Controls": false }`
2. **Logo** — `["logo", "brand"]`
3. **Welcome Text** (H1) — `["heading", "display"]`
4. **Subtitle Text** — `["body medium", "text body"]`
5. **Email Input** — `["text field", "input", "email"]`
6. **Password Input** — `["password", "text field password"]`
7. **Primary Button** ("Giriş Yap") — `["button primary"]`
   **setProperties:** `{ "Value": "Giriş Yap" }`
8. **Forgot Password Link** — `["link", "text button"]`
9. **Divider** — `["divider"]`
10. **Register Link** — `["text button", "link"]`

### Recipe 2: Payment
**Trigger:** ödeme, payment, checkout, satın al

1. **NavigationTopBar** — `["navigation top", "appbar"]`
   **setProperties:** `{ "Title Text": "Ödeme", "Right Controls": false, "Subtitle": false, "Product": "main" }`
2. **Amount Display** — `["display large", "hero text"]`
3. **Currency Label** — `["body small", "caption"]`
4. **Section Header** — `["section header", "subtitle"]`
5. **Payment Method Cards** (×3) — `["card payment", "list item"]`
6. **Add New Method Button** — `["button secondary"]`
7. **Divider** — `["divider"]`
8. **CTA Button** — `["button primary large"]`
   **setProperties:** `{ "Value": "Ödemeyi Tamamla" }`
9. **Security Info** — `["text small", "caption"]`

### Recipe 3: Profile
**Trigger:** profil, profile, hesap, account

1. **AppBar** — `["navigation top"]`
   **setProperties:** `{ "Title Text": "Profilim" }`
2. **Avatar** — `["avatar large", "profile picture"]`
3. **User Name Text** — `["heading", "display medium"]`
4. **User Email Text** — `["body", "text secondary"]`
5. **Divider** — `["divider"]`
6. **Menu List Items** (×4) — `["list item", "menu row"]`
7. **Destructive Button** ("Çıkış Yap") — `["button destructive"]`
   **setProperties:** `{ "Value": "Çıkış Yap" }`

### Recipe 4: List
**Trigger:** liste, list, arama, search, katalog

1. **AppBar** — `["navigation top"]`
   **setProperties:** `{ "Title Text": "Arama" }`
2. **Search Bar** — `["search", "search bar"]`
3. **Filter Chips Row** — `["chip", "filter chip"]`
4. **Card List Items** (×N) — `["card", "list card"]`
5. **Pagination** — `["pagination"]`
6. **FAB** (opsiyonel) — `["fab", "floating button"]`

### Recipe 5: Detail
**Trigger:** detay, detail, ürün detay, product

1. **AppBar** — `["navigation top"]`
   **setProperties:** `{ "Right Controls": true }`
2. **Hero Image** — `["image large", "hero"]`
3. **Title Text** — `["heading large", "display"]`
4. **Price + Rating Row** — `["price", "rating"]`
5. **Description Text** — `["body", "text body"]`
6. **Stats Section** — `["stat", "info row"]`
7. **CTA Button** — `["button primary"]`
   **setProperties:** `{ "Value": "Sepete Ekle" }`

### Recipe 6: Form
**Trigger:** form, başvuru, kayıt, application

1. **AppBar** — `["navigation top"]`
   **setProperties:** `{ "Title Text": "Başvuru" }`
2. **Progress Indicator** — `["stepper", "progress"]`
3. **Field Group 1** (3-4 input) — `["text field", "input"]`
4. **Field Group 2** — `["select", "dropdown", "date picker"]`
5. **Checkbox / Terms** — `["checkbox", "agreement"]`
6. **Submit Button** — `["button primary"]`
   **setProperties:** `{ "Value": "Gönder" }`

### Recipe 7: Onboarding
**Trigger:** onboarding, tanıtım, karşılama, welcome

1. **Hero Image** — `["illustration", "image hero"]`
2. **Title Text** — `["display", "heading large"]`
3. **Subtitle Text** — `["body", "text secondary"]`
4. **Pagination Dots** — `["dots", "page indicator"]`
5. **Primary Button** — `["button primary"]`
   **setProperties:** `{ "Value": "Başla" }`
6. **Skip Link** — `["text button", "link"]`

### Recipe 8: Dashboard
**Trigger:** dashboard, özet, summary, panel

1. **AppBar** — `["navigation top"]`
   **setProperties:** `{ "Title Text": "Özet" }`
2. **Stats Cards** (×4) — `["stat card", "metric card"]`
3. **Chart** — `["chart", "graph"]`
4. **Section Header** — `["section header"]`
5. **Activity List Items** (×N) — `["list item", "activity row"]`

### Recipe 9: Settings
**Trigger:** ayarlar, settings, tercihler

1. **AppBar** — `["navigation top"]`
   **setProperties:** `{ "Title Text": "Ayarlar" }`
2. **Section Headers** — `["section header"]`
3. **Toggle Rows** — `["list item toggle", "setting row"]`
4. **Info Row** — `["list item", "nav row"]`
5. **Destructive Button** — `["button destructive"]`
   **setProperties:** `{ "Value": "Hesabı Sil" }`

---

## Primitive Fallback Pattern

Component bulunamazsa token-bound primitive ile inşa et. Tüm visual properties variable'a bağlı olmalı:
```js
const card = figma.createFrame();
card.name = "... (primitive fallback)";
card.layoutMode = "HORIZONTAL";
card.setBoundVariable("cornerRadius", radiusSmVar);
card.setBoundVariable("paddingLeft", spacingMdVar);
// ... diğer padding/gap bind'ları
const paint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } };
card.fills = [figma.variables.setBoundVariableForPaint(paint, 'color', surfaceVar)];
parent.appendChild(card);  // ÖNCE
card.layoutSizingHorizontal = "FILL";  // SONRA (Rule 11)
```

---

## Chunking Kuralları

- Max **15 atomic op / figma_execute**
- **3-4 component TEK execute'ta** yerleştir
- Timeout: `15000` ms yeterli (15 op ≈ 200-300ms)
- Her component için AYRI execute YASAK

## Error Recovery

| Hata | Aksiyon |
|---|---|
| DS GATE yok | Fast Path iptal, orchestrator'a dön |
| Device bulunamadı | Default kullan (iPhone 17 / Desktop 1440) |
| Colors collection yok | Light-only, dark skip |
| Component 0 sonuç | Primitive fallback |
| Execute timeout | Op sayısını azalt, böl |
| Style import fail | Rule 23 try-catch, roleMap fallback |
| 3× validate fail | Kullanıcıya generate-figma-screen öner |

## Known Limitations

1. SUI dışında test edilmedi — başka DS için isim farkı olabilir
2. Dark mode validate ayrı ölçülmez — manuel göz kontrolü gerekli
3. 9 recipe sabit — yeni tip → generate-figma-screen
4. Multi-screen ve prototype/interactions YOK
5. Component search false match riski — setProperties ile doğrula

---

## Skill References

- `skills/fmcp-screen-orchestrator/SKILL.md` — Fast Path tetiklenme
- `skills/figma-canvas-ops/SKILL.md` — Rule 5a CHUNKING + Rule 22 Async + Rule 23 Style zorunlu
- `.claude/design-systems/active-ds.md` — DS GATE state
- `.claude/design-systems/sui/tokens.md` — Token cache
- `.claude/design-systems/sui/components.md` — Component cache
