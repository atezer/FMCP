---
name: figma-canvas-ops
description: F-MCP Bridge ile Figma tuvalinde güvenli yazma/düzenleme için zorunlu önkoşul kılavuzu. figma_execute çağrısı öncesi bu skill yüklenmelidir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designer
    - designops
---

# Figma Canvas Ops — figma_execute Güvenli Kullanım Kılavuzu

## Araç Eşleme (topluluk → F-MCP)

| Topluluk | F-MCP Bridge | Not |
|---|---|---|
| `use_figma` | `figma_execute` | JS çalıştırma |
| `get_metadata` | `figma_get_file_data` | Yapı/metadata |
| `get_screenshot` | `figma_capture_screenshot` | Görsel doğrulama |
| `search_design_system` | `figma_search_components` + `figma_get_design_system_summary` | İki araç birlikte |

## Prerequisites

- F-MCP Bridge plugin bağlı olmalı (`figma_get_status()`)
- Aktif DS context: `.claude/design-systems/active-ds.md` → `Status: ✅`

## 0. Design System Context (ZORUNLU)

### 0a — Active DS check
```
1. Read .claude/design-systems/active-ds.md
2. ✅ Aktif → Library Name not al, 0b'ye geç
   ❌ Seçilmedi → 0c'ye geç
   "DS bypass mode" → DS'siz devam
```

### 0b — DS asset cache hazırlığı
```
1. .claude/design-systems/<library-id>/components.md var mı?
2. .claude/design-systems/<library-id>/tokens.md var mı?
3. Yoksa: figma_get_library_variables + figma_search_assets ile keşfet, cache'e yaz
```

### 0c — Kullanıcıya DS seçimi sor
active-ds.md `❌` ise: "Hangi DS? (SUI / Material / HIG / Kendi / Hiçbiri)". Yanıt sonrası active-ds.md güncelle, 0b'ye geç. Sonraki turlarda TEKRAR SORMA.

## 1. Kritik Kurallar

1. **`return` ile veri dön.** `figma.closePlugin()` çağırma.

2. **Düz JS, top-level `await`.** Kod otomatik async sarılır. `(async()=>{})()` sarma. **Async API zorunlu** — dynamic-page mode'da sync API'ler throws:

   | ❌ YASAK (sync) | ✅ ZORUNLU (async) |
   |---|---|
   | `instance.mainComponent` | `await instance.getMainComponentAsync()` |
   | `figma.getNodeById(id)` | `await figma.getNodeByIdAsync(id)` |
   | `figma.variables.importVariableByKey(key)` | `await figma.variables.importVariableByKeyAsync(key)` |
   | `figma.importComponentByKey(key)` | `await figma.importComponentByKeyAsync(key)` |
   | `figma.importStyleByKey(key)` | `await figma.importStyleByKeyAsync(key)` |
   | `node.effectStyleId = x` | `await node.setEffectStyleIdAsync(x)` |
   | `node.textStyleId = x` | `await node.setTextStyleIdAsync(x)` |
   | `figma.listAvailableFonts()` | `await figma.listAvailableFontsAsync()` |
   | `figma.loadFont(...)` | `await figma.loadFontAsync(...)` |
   | `figma.variables.getVariableCollectionById(id)` | `await figma.variables.getVariableCollectionByIdAsync(id)` |

3. **`figma.notify()` çalışmaz** — kullanma.

4. **`console.log()` dönmez** — `return` kullan.

5. **Küçük adımlarla çalış.** Timeout: varsayılan 15000ms, max 30000ms.

   ### 5a. CHUNKING MANDATE (v2.0)

   Her `figma_execute` **max 15 atomic operation**. Atomic op'lar: node/instance oluşturma, variable/style/component import, font load, bind operasyonu, getNodeByIdAsync, getMainComponentAsync.

   - 1 execute = 1 mega-goal (discovery, frame+structure, 3-4 component placement)
   - 25+ op → 2-3 execute'a böl
   - Execute arası state: nodeId'leri `return` et, sonraki execute `getNodeByIdAsync` ile al
   - Her execute sonrası 1 satır Türkçe micro-report

6. **Renkler 0–1 aralığında** (0–255 değil). Hardcoded renk YASAK — DS'den oku.

7. **Fills/strokes read-only array** — klonla, değiştir, ata:
   ```js
   const fills = [...node.fills];
   fills[0] = { ...fills[0], color: DS_COLOR };
   node.fills = fills;
   ```

8. **Font yükleme zorunlu.** Sıra: (a) DS cache'ten font oku → (b) Yoksa kullanıcıya sor → (c) "Sen seç" → Inter.

   **8a-1) Font weight check (ZORUNLU):** `loadFontAsync` öncesi `listAvailableFontsAsync` ile kontrol et. Fallback helper:
   ```js
   const allFonts = await figma.listAvailableFontsAsync();
   const styles = allFonts.filter(f => f.fontName.family === "SHBGrotesk").map(f => f.fontName.style);
   function pickStyle(desired, available) {
     if (available.indexOf(desired) >= 0) return desired;
     var fb = { "Medium":["Semi Bold","Regular"], "ExtraBold":["Bold"], "Black":["Bold"], "Thin":["Light","Regular"] };
     var alts = fb[desired] || [];
     for (var i = 0; i < alts.length; i++) { if (available.indexOf(alts[i]) >= 0) return alts[i]; }
     return available.find(s => s.indexOf("Italic") < 0) || available[0];
   }
   await figma.loadFontAsync({ family: "SHBGrotesk", style: pickStyle("Medium", styles) });
   ```
   **FigJam:** `createShapeWithText()` varsayılan "Inter Medium". Metin düzenlemeden önce `await figma.loadFontAsync(shape.text.fontName)`.

9. **Sayfa konteksti her çağrıda sıfırlanır.** Farklı sayfa: `await figma.setCurrentPageAsync(page)`.

10. **Tüm tasarım değerleri DS variable'a BAĞLANMALI (ZORUNLU).**

    Renk, spacing, padding, radius — HİÇBİR değer hardcoded yazılmaz. Token yoksa DURDUR, kullanıcıya sor.

    **Akış:**
    - **Variable import:** `const v = await figma.variables.importVariableByKeyAsync("KEY")`
    - **Renk bind:** `node.fills = [figma.variables.setBoundVariableForPaint(fills[0], "color", v)]`
    - **Spacing bind:** `node.setBoundVariable("paddingLeft", v)`
    - **Text style:** `await textNode.setTextStyleIdAsync(style.id)`
    - **Text renk:** `textNode.fills = [figma.variables.setBoundVariableForPaint(textFills[0], "color", textColorVar)]`

    Hardcoded `node.fills = [{ type: "SOLID", color: {...} }]` YASAK.

10a. **Inline Bind Verification (v1.9.4, ZORUNLU).** Her execute sonunda oluşturulan node'ları tara. Bind eksikse `throw` atılır — execute başarısız sayılır, Claude retry eder. Şablon:

    ```js
    // Execute'un sonunda, createdNodes listesini tarayıp bind kontrolü yap:
    function assertBound(node) {
      // Fill bind
      if (Array.isArray(node.fills)) {
        for (var i = 0; i < node.fills.length; i++) {
          var f = node.fills[i];
          if (f && f.visible !== false && f.type === "SOLID") {
            var fbv = node.boundVariables && node.boundVariables.fills;
            var bound = fbv && (Array.isArray(fbv) ? fbv[i] : true);
            if (!bound) throw new Error("UNBOUND_FILL: " + node.name + " — setBoundVariableForPaint cagrisi eksik");
          }
        }
      }
      // Padding/itemSpacing/radius bind (auto-layout frame)
      if (node.type === "FRAME" || node.type === "COMPONENT") {
        var padProps = ["paddingTop","paddingBottom","paddingLeft","paddingRight"];
        for (var j = 0; j < padProps.length; j++) {
          var p = padProps[j];
          if (typeof node[p] === "number" && node[p] > 0 && !(node.boundVariables && node.boundVariables[p])) {
            throw new Error("UNBOUND_PADDING: " + node.name + "." + p + "=" + node[p] + " — setBoundVariable cagrisi eksik");
          }
        }
        if (typeof node.itemSpacing === "number" && node.itemSpacing > 0 && !(node.boundVariables && node.boundVariables.itemSpacing)) {
          throw new Error("UNBOUND_ITEMSPACING: " + node.name + " — setBoundVariable('itemSpacing', v) cagrisi eksik");
        }
        var radProps = ["cornerRadius","topLeftRadius","topRightRadius","bottomLeftRadius","bottomRightRadius"];
        for (var k = 0; k < radProps.length; k++) {
          var r = radProps[k];
          if (typeof node[r] === "number" && node[r] > 0 && !(node.boundVariables && node.boundVariables[r])) {
            throw new Error("UNBOUND_RADIUS: " + node.name + "." + r + "=" + node[r]);
          }
        }
      }
      // Text style
      if (node.type === "TEXT" && !(node.textStyleId && typeof node.textStyleId === "string" && node.textStyleId !== "")) {
        throw new Error("UNBOUND_TEXTSTYLE: '" + (node.characters||"").slice(0,30) + "' — setTextStyleIdAsync(style.id) cagrisi eksik");
      }
    }

    // Tüm oluşturulan node'ları doğrula:
    for (var n = 0; n < createdNodes.length; n++) assertBound(createdNodes[n]);
    ```

    Bu kontrol atlanırsa `figma_scan_ds_compliance` final gate'te sonuç zaten BLOCKING olur — ama inline check erkendedir ve context'i az yer. **v1.9.4 önerisi:** Her mega-step sonunda bu assertion bloğunu execute'un sonuna koy.

11. **appendChild sıralaması kritik.** ÖNCE `parent.appendChild(child)`, SONRA `child.layoutSizingHorizontal = "FILL"` / `layoutPositioning = "ABSOLUTE"`:
    ```js
    parent.appendChild(child);              // ÖNCE
    child.layoutSizingHorizontal = "FILL";  // SONRA
    ```
    Hata: "Can only set layoutPositioning = ABSOLUTE if parent has layoutMode !== NONE" → child append edilmemiş.

12. **Yeni node'ları (0,0)'dan uzağa konumlandır.** Boş alan bul.

13. **Hata durumunda DUR.** Hata oku, düzelt, tekrar çalıştır. Atomik — hata olursa değişiklik uygulanmaz.

14. **Tüm node ID'lerini RETURN ET:** `return { createdNodeIds: [...] }`

15. **Variable scope'ları:** Arka plan: `["FRAME_FILL"]`, Metin: `["TEXT_FILL"]`, Boşluk: `["GAP"]`

16. **Her Promise'i `await` et.**

## 2. Sayfa Kuralları

```js
const page = figma.root.children.find(p => p.name === "Sayfa");
await figma.setCurrentPageAsync(page);
```
Sync `figma.currentPage = page` HATA verir. Her `figma_execute`'ta `currentPage` sıfırlanır.

## 3. Auto-Layout Kalıpları

```js
const frame = figma.createFrame();
frame.layoutMode = "VERTICAL";
frame.primaryAxisSizingMode = "AUTO";
frame.counterAxisSizingMode = "AUTO";
frame.itemSpacing = 16;
frame.paddingTop = frame.paddingBottom = 24;
frame.paddingLeft = frame.paddingRight = 24;
```

FILL boyutlandırma: ÖNCE appendChild, SONRA `layoutSizingHorizontal = "FILL"` (Rule 11).

## 4. Bileşen ve Instance Kalıpları

```js
// Local component
const comp = figma.root.findOne(n => n.type === "COMPONENT" && n.name === "Button");
const instance = comp.createInstance();

// Variant seçimi
const set = figma.root.findOne(n => n.type === "COMPONENT_SET" && n.name === "Button");
const variant = set.children.find(c => c.name === "Size=Large, Type=Primary");
const inst = variant.createInstance();
```

## 5. Variable Bağlama

```js
const variable = await figma.variables.importVariableByKeyAsync("KEY");
// Fill bind
const fills = [...node.fills];
node.fills = [figma.variables.setBoundVariableForPaint(fills[0], "color", variable)];
// Spacing bind
node.setBoundVariable("paddingLeft", variable);
```

## 6. Ek API Gotcha'lar

17. **`import` keyword yasağı.** Plugin sandbox'ta reserved word. `async function getVar(k)` kullan.

18. **`setEffectStyleIdAsync` zorunlu.** Sync `node.effectStyleId = id` hata verir.

19. **`setTextStyleIdAsync` kullan, fontSize binding YASAK:**
    ```js
    const style = await figma.importStyleByKeyAsync("KEY");
    await textNode.setTextStyleIdAsync(style.id);
    ```

20. **`setExplicitVariableModeForCollection` — string ID çalışmaz.** Library API chain ile collection OBJECT al:
    ```js
    var colls = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
    var sem = colls.find(c => c.name.indexOf("Semantic Colors") !== -1);
    var vars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(sem.key);
    var first = await figma.variables.importVariableByKeyAsync(vars[0].key);
    var coll = await figma.variables.getVariableCollectionByIdAsync(first.variableCollectionId);
    var darkMode = coll.modes.find(m => m.name === "Dark");
    frame.setExplicitVariableModeForCollection(coll, darkMode.modeId);
    ```

21. **Escaped quote dikkat.** `figma_execute` code'da `\"` yerine düz `"` kullan.

23. **Style Import Sessiz Fail.** `importStyleByKeyAsync` null/throws olabilir. Her zaman try-catch:
    ```js
    let style = null;
    try { style = await figma.importStyleByKeyAsync("KEY"); } catch(e) {}
    if (style) {
      await textNode.setTextStyleIdAsync(style.id);
      await figma.loadFontAsync(textNode.fontName);
      textNode.characters = "Metin";
    } else {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      textNode.fontName = { family: "Inter", style: "Regular" };
      textNode.characters = "Metin (fallback)";
    }
    ```
    **Fast Path:** roleMap hazırsa `setTextStyleIdAsync(roleMap[role].id)` direkt kullan, import atla (bkz. fmcp-screen-recipes Adım 1.6).

24. **Component Discovery Fallback.** `figma_search_assets` boş dönerse manuel instance scan:
    ```js
    const instances = figma.currentPage.findAll(n => n.type === "INSTANCE");
    const map = new Map();
    for (const inst of instances) {
      const main = await inst.getMainComponentAsync();
      if (main && main.remote && main.key && !map.has(main.name))
        map.set(main.name, { name: main.name, key: main.key });
    }
    return Array.from(map.values());
    ```
    Sıra: (1) Cache → (2) `figma_search_assets` → (3) Manuel scan → (4) Key biliniyor → `importComponentByKeyAsync(key)` direkt.

25. **`figma_validate_screen` Timeout Fallback.** 3 seviyeli:
    - **Seviye 1:** `figma_validate_screen(nodeId, minScore=80)` — timeout olursa:
    - **Seviye 2:** Content Body wrapper'ı validate et (daha küçük tree), minScore=70
    - **Seviye 3:** Manuel QA Checklist üret:
      - [ ] Instance coverage ≥60%
      - [ ] Rastgele 5 fill'de variable icon 🎨 var mı
      - [ ] Rastgele 3 spacing variable-bound mu
      - [ ] Auto-layout tüm frame'lerde aktif mi
      - [ ] Dark mode renkleri doğru mu

26. **Component Property Discovery — Tek Execute.**
    ```js
    const comp = await figma.importComponentByKeyAsync(key);
    let set = comp.parent?.type === "COMPONENT_SET" ? comp.parent : comp;
    const propDefs = set.componentPropertyDefinitions || {};
    return {
      componentName: comp.name,
      propertyDefinitions: Object.entries(propDefs).map(([n, d]) => ({
        name: n, type: d.type, defaultValue: d.defaultValue, variantOptions: d.variantOptions || []
      }))
    };
    ```
    `figma_instantiate_component` timeout olursa: `figma_execute` içinde `importComponentByKeyAsync(key)` + `comp.createInstance()`.

    **Text Style Discovery:** (1) Instance scan: `findAll(TEXT)` → `textStyleId` → `getStyleByIdAsync` (2) Boşsa `figma_search_assets` (3) Boşsa team library API (4) Fallback Inter + hardcoded size.

## 7. Hata Kurtarma

| Hata | Çözüm |
|---|---|
| `Cannot read property of undefined` | Node ID geçersiz / sayfa yüklenmemiş |
| `Font not loaded` | `loadFontAsync` eksik |
| `Font could not be loaded` | Weight yok → `pickStyle()` fallback (Rule 8a-1) |
| `Cannot set FILL before appendChild` | Rule 11 sırası |
| `Maximum call stack` | Küçük parçalara böl |
| `Resource links not supported` | Yanlış MCP (resmi) → F-MCP kullan |

## 8. Doğrulama

Her yazma sonrası: `figma_capture_screenshot` + gerekirse `figma_get_file_data`.

## Skill Koordinasyonu

- **fmcp-screen-orchestrator** — DS GATE, Fast Path routing
- **fmcp-screen-recipes** — Fast Path (Rule 25 validate, Rule 26 discovery referans alınır)
- **generate-figma-screen** — Tam workflow
- **generate-figma-library** / **apply-figma-design-system** / **fix-figma-design-system-finding** / **figjam-diagram-builder**
