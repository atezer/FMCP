---
name: figma-canvas-ops
description: F-MCP Bridge ile Figma tuvalinde güvenli yazma/düzenleme için zorunlu önkoşul kılavuzu. figma_execute çağrısı öncesi bu skill yüklenmelidir. Renk aralığı, font yükleme, array klonlama, atomik hata yönetimi, node ID return kuralları ve sayfa konteksti sıfırlanmasını kapsar. "figma'da düzenle", "tuvale yaz", "node oluştur", "figma execute kılavuz", "canvas ops", "tuval işlemi" ifadeleriyle tetiklenir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designer
    - designops
---

# Figma Canvas Ops — figma_execute Güvenli Kullanım Kılavuzu

## Overview

Bu skill, `figma_execute` aracıyla Figma tuvalinde yazma/düzenleme yapılmadan önce **zorunlu** olarak yüklenmesi gereken önkoşul kılavuzudur. Topluluk `figma-use` skill'inden uyarlanmış, F-MCP Bridge araçlarına göre yeniden yazılmıştır.

**Tuval yazan her skill** (apply-figma-design-system, fix-figma-design-system-finding, generate-figma-screen, generate-figma-library, figjam-diagram-builder) bu kılavuzdaki kuralları uygulamalıdır.

## Araç eşleme (topluluk → F-MCP)

| Topluluk (resmi MCP) | F-MCP Bridge | Not |
|---|---|---|
| `use_figma` | `figma_execute` | JS çalıştırma; `code` parametresi |
| `get_metadata` | `figma_get_file_data` | Yapı/metadata; `depth` parametresi |
| `get_screenshot` | `figma_capture_screenshot` | Node bazlı görsel doğrulama |
| `search_design_system` | `figma_search_components` + `figma_get_design_system_summary` | İki araç birlikte |

Detaylı eşleme: [TOOL_MAPPING.md](../TOOL_MAPPING.md)

## Prerequisites

- F-MCP Bridge plugin Figma'da çalışıyor ve bağlı olmalı
- `figma_get_status()` ile bağlantı doğrulanmalı
- **Aktif DS context'i belirlenmiş olmalı** (`.claude/design-systems/active-ds.md` → `Status: ✅`)

## 0. Design System Context (ZORUNLU — v1.8.0+)

**Her ekran/bileşen yazma akışı ÖNCE bu kontrolü yapar.** DS context yoksa Claude
herhangi bir node oluşturmaz, önce kullanıcıya sorar.

### Adım 0a — Active DS check

```
1. Read .claude/design-systems/active-ds.md
2. Status alanı kontrol et:
   ✅ Aktif        → Library Name'i not al, Adım 0b'ye geç
   ❌ Henüz seçilmedi → Adım 0c'ye geç (kullanıcıya sor)
   "DS bypass mode"  → DS'siz devam et (token binding kuralı esnetilir)
```

### Adım 0b — DS asset cache hazırlığı

Aktif DS varsa, kullanmadan önce key cache'inin hazır olduğundan emin ol:

```
1. .claude/design-systems/<library-id>/_meta.md mevcut mu? Sync güncel mi?
2. Component key cache (.claude/design-systems/<library-id>/components.md) var mı?
3. Token key cache (.claude/design-systems/<library-id>/tokens.md) var mı?
4. Yoksa: figma_get_library_variables({libraryName: "❖ SUI"}) ve
          figma_search_assets({assetTypes: ['components'], currentPageOnly: false})
          ile keşfet, sonuçları MD dosyalarına yaz, sonra devam et.
```

### Adım 0c — Kullanıcıya DS seçimi sor

active-ds.md `Status: ❌` ise, ekran oluşturmadan ÖNCE kullanıcıya şu soruyu sor:

> "Hangi tasarım sistemi ile ilerleyelim?
>  - ❖ SUI (varsa)
>  - Material Design
>  - Apple Human Interface Guidelines
>  - Kendi DS'iniz (Figma library URL verin)
>  - Hiçbiri (ham Figma, DS'siz)"

Kullanıcı yanıtladıktan sonra:

```
1. .claude/design-systems/active-ds.md'yi update et:
   - Status: ✅ Aktif
   - Library Name: <kullanıcı seçimi>
   - File Key: <varsa>
   - Selected At: <bugünün tarihi>
2. Adım 0b'ye geç (cache hazırlığı)
3. Sonraki turlarda bu soruyu TEKRAR SORMA — active-ds.md zaten dolu
```

**ÖNEMLİ — tutarlılık:**
- Kullanıcı bir kez DS seçtiğinde, sonraki tüm ekranlar/bileşenler aynı DS ile yapılır
- Her seferinde sormak kullanıcıyı yorar
- Kullanıcı açıkça "DS değiştir" demediği sürece active-ds.md'deki tercihi kullan

## 1. Kritik Kurallar

1. **`return` ile veri dön.** Return değeri otomatik JSON serialize edilir (object, array, string, number). `figma.closePlugin()` çağırma — bu bridge tarafından yönetilir.

2. **Düz JavaScript yaz, top-level `await` kullan.** Kod otomatik async bağlama sarılır. `(async () => { ... })()` ile sarma.

3. **`figma.notify()` çalışmaz** — kullanma.

4. **`console.log()` dönmez** — çıktı için `return` kullan.

5. **Küçük adımlarla çalış.** Büyük işlemleri birden fazla `figma_execute` çağrısına böl. Her adımdan sonra doğrula. Bug'lardan kaçınmanın en önemli pratiği budur.

   **Timeout yapılandırması:** `figma_execute` varsayılan timeout 5000ms'dir. Çok node oluşturma veya karmaşık işlemlerde `timeout` parametresini artır (maksimum 30000ms):
   ```
   figma_execute({ code: "...", timeout: 15000 })
   ```
   Kılavuz: 1-5 node → 5000ms | 6-12 node → 10000ms | 13+ node → işlemi böl veya 15000-30000ms

6. **Renkler 0–1 aralığında** (0–255 değil): `{r: 1, g: 0, b: 0}` = kırmızı. Renk değerlerini hardcoded yazma — tasarım sisteminden (`figma_get_variables` / `figma_get_styles`) oku.

7. **Fills/strokes read-only array** — klonla, değiştir, geri ata:
```js
// Renk değerini DS'den oku, aşağıdaki sadece API FORMAT örneğidir
const fills = [...node.fills];
fills[0] = { ...fills[0], color: DS_COLOR }; // DS'den okunan değer
node.fills = fills;
```

8. **Font yükleme zorunlu** — metin işleminden önce font yükle. Hangi fontu kullanacağını belirlemek için şu sırayı takip et:

   **a)** Kayıtlı kütüphane varsa (`.claude/libraries/`) text style'lardan veya variable'lardan font ailesini oku. Örnek: kütüphanedeki text style `global/surface/body` → font family ve style bilgisini al.

   **b)** Kütüphane yoksa veya font bilgisi bulunamazsa kullanıcıya sor: "Hangi fontu kullanmamı istersiniz?"

   **c)** Kullanıcı "sen seç" derse `Inter` kullan.

   **8a-1) Font weight availability check (ZORUNLU - v1.8.0+):**

   `loadFontAsync` çağırmadan ÖNCE, o font ailesinin **gerçekten hangi stilleri sunduğunu** `figma.listAvailableFontsAsync()` ile kontrol et. DS fontlarının çoğunda **"Medium" yoktur** — varsayma!

   ```js
   // 1. Available styles listesi
   const allFonts = await figma.listAvailableFontsAsync();
   const familyStyles = allFonts
     .filter(f => f.fontName.family === "SHBGrotesk")
     .map(f => f.fontName.style);
   // → ["Bold", "Bold Italic", "Italic", "Light", "Light Italic", "Regular", "Semi Bold", "Semi Bold Italic"]
   //   (Note: "Medium" is NOT in this list — common gotcha for SUI/SHBGrotesk)

   // 2. Weight fallback helper — istenen weight yoksa en yakınını seç
   function pickStyle(desired, available) {
     if (available.indexOf(desired) >= 0) return desired;
     var fallbacks = {
       "Medium":     ["Semi Bold", "Regular"],
       "ExtraBold":  ["Bold", "Semi Bold"],
       "Black":      ["Bold", "Semi Bold"],
       "Thin":       ["Light", "Regular"],
       "ExtraLight": ["Light", "Regular"],
       "Heavy":      ["Bold", "Semi Bold"]
     };
     var alts = fallbacks[desired] || [];
     for (var i = 0; i < alts.length; i++) {
       if (available.indexOf(alts[i]) >= 0) return alts[i];
     }
     // Last resort: first non-italic style
     return available.find(s => s.indexOf("Italic") < 0) || available[0];
   }
   var style = pickStyle("Medium", familyStyles);  // → "Semi Bold"

   // 3. Şimdi güvenle yükle
   await figma.loadFontAsync({ family: "SHBGrotesk", style: style });
   ```

   **DS-specific weight cache (önerilen):** Kütüphane keşfi sırasında her DS fontunun available weight'lerini `.claude/libraries/<ds>.md` "Font Weights" bölümüne yaz. Bu, sonraki oturumlarda `listAvailableFontsAsync` çağrısını gereksiz kılar.

```js
// Fontu belirledikten sonra yükle:
await figma.loadFontAsync({ family: "FONT_ADI", style: "Regular" });
// Gerekli diğer ağırlıklar (her zaman pickStyle ile geçtiğine emin ol):
await figma.loadFontAsync({ family: "FONT_ADI", style: "Bold" });
```

   **Yaygın yanlış varsayımlar (HATA):**
   - ❌ `loadFontAsync({family: "SHBGrotesk", style: "Medium"})` — SHBGrotesk'te Medium YOK, hata verir
   - ❌ `loadFontAsync({family: "Inter", style: "Black"})` — Inter'de Black yoksa hata
   - ❌ Hardcoded `style: "Medium"` her DS fontu için
   - ✅ `pickStyle("Medium", availableStyles)` ile dinamik fallback

   **Asla** hardcoded font varsayma — her zaman bu sırayı takip et. Bu kural font, renk, boyut, spacing dahil TÜM design token'lar için geçerlidir. Detay: `project-context.md` → "Design Token Kuralı".

   **FigJam özel durumu:** `createShapeWithText()` varsayılan fontu **"Inter Medium"**'dir ("Inter Regular" DEĞİL). FigJam shape text'i düzenlemek için:
   ```js
   await figma.loadFontAsync({ family: "Inter", style: "Medium" });
   const shape = figma.createShapeWithText();
   shape.text.characters = "Metin"; // Medium yüklenmeden hata verir
   ```
   Genel kural: metin düzenlemeden önce **mevcut fontu kontrol et** ve o fontu yükle:
   ```js
   await figma.loadFontAsync(shape.text.fontName); // dinamik font algılama
   ```

9. **Sayfa konteksti her çağrıda sıfırlanır** — `figma.currentPage` her `figma_execute` çağrısında ilk sayfaya döner. Farklı sayfada çalışacaksan:
```js
const page = figma.root.children.find(p => p.name === "Hedef Sayfa");
await figma.setCurrentPageAsync(page);
```

10. **Tüm tasarım değerleri DS variable'larına BAĞLANMALI (MUTLAK ZORUNLU - v1.8.0+).**

    **Kural:** Renk, spacing, padding, radius, font, size, line-height, opacity gibi
    HİÇBİR değer hardcoded yazılmaz. Her değer DS variable veya style ile bağlanır.

    **İhlal durumunda davranış:**
    - Eğer ihtiyacın olan değer için DS'te token YOKSA → DURDUR, kullanıcıya sor:
      "Bu değer için DS'te token bulamadım: `<değer>`. Ne yapmamı istersiniz?
       (a) Yeni token ekleyeyim (önerilen), (b) Yakın bir mevcut token kullanayım, (c) Hardcoded olarak ekleyeyim (önerilmez)"
    - Sessizce hardcoded fallback YAPMA — kullanıcı görmeden token disiplinini bozar
    - Token binding'i opsiyonel sayma — bu kural her ekran/bileşen oluşturma akışında uygulanır

    **Pre-flight checklist (ekran yapmaya başlamadan önce):**
    ```
    [ ] active-ds.md aktif mi?
    [ ] DS'in component key cache (components.md) mevcut mu?
    [ ] DS'in token key cache (tokens.md) mevcut mu?
    [ ] Kullanılacak font ailesinin available weights'i biliniyor mu?
    [ ] Kullanılacak renk/spacing token key'leri elde mi?
    ```
    Yukarıdakilerin tümü ✅ değilse — keşif/cache adımına dön, ekran üretimine başlama.

    **Akış:**

   **a) Kütüphaneden variable key'lerini oku:** `.claude/libraries/` dosyasını kontrol et. Key yoksa **HEDEF dosyada** `figma_get_library_variables` veya `figma_execute` ile `figma.teamLibrary` API'sini kullan. **DS dosyasına F-MCP plugin bağlamak GEREKMEZ.**
   ```js
   // HEDEF dosyada çalıştır — DS dosyası değil!
   var cols = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
   var semCol = cols.find(function(c) { return c.libraryName === "❖ SUI" && c.name.indexOf("Semantic Colors") !== -1; });
   var vars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(semCol.key);
   return vars.map(function(v) { return { name: v.name, key: v.key, resolvedType: v.resolvedType }; });
   ```
   Veya doğrudan: `figma_get_library_variables({ libraryName: "❖ SUI" })`

   **b) Hedef dosyada variable'ı import et:**
   ```js
   const variable = await figma.variables.importVariableByKeyAsync("VARIABLE_KEY");
   ```

   **c) Renk bağlama (fill/stroke):** `setBoundVariableForPaint` kullan — DİKKAT: yeni paint döner, yakala ve geri ata:
   ```js
   const fills = [...node.fills];
   const boundPaint = figma.variables.setBoundVariableForPaint(fills[0], "color", variable);
   node.fills = [boundPaint];
   ```

   **d) Spacing/padding/radius bağlama:** `setBoundVariable` kullan:
   ```js
   node.setBoundVariable("paddingLeft", variable);
   node.setBoundVariable("paddingRight", variable);
   node.setBoundVariable("itemSpacing", variable);
   node.setBoundVariable("topLeftRadius", variable);
   ```

   **e) Text style bağlama:** Doğrudan text style ID'si ile uygula:
   ```js
   const textStyles = await figma.getLocalTextStylesAsync();
   const bodyStyle = textStyles.find(s => s.name === "global/surface/body");
   await textNode.setTextStyleIdAsync(bodyStyle.id);
   ```

   **f) Text rengi bağlama (text node fill):**
   ```js
   const textFills = [...textNode.fills];
   const boundTextPaint = figma.variables.setBoundVariableForPaint(textFills[0], "color", textColorVar);
   textNode.fills = [boundTextPaint];
   ```

   **Asla** `node.fills = [{ type: "SOLID", color: { r: X, g: Y, b: Z } }]` gibi hardcoded renk yazma. Her zaman variable import et ve bağla.

11. **appendChild sıralaması kritik (v1.8.0+ genişletilmiş kural).** Şu property'ler child node'a ÖNCE `appendChild` çağrıldıktan SONRA set edilmelidir, aksi takdirde Plugin API hata verir:

    - `layoutSizingHorizontal = 'FILL'` / `'HUG'` / `'FIXED'`
    - `layoutSizingVertical   = 'FILL'` / `'HUG'` / `'FIXED'`
    - `layoutPositioning = 'ABSOLUTE'` *(parent'ın `layoutMode !== 'NONE'` olmalı)*
    - `layoutGrow = 1`
    - `layoutAlign = 'STRETCH'`

    ```js
    // ✅ DOĞRU — önce ekle, sonra layout properties
    const parent = figma.createFrame();
    parent.layoutMode = "VERTICAL";
    const child = figma.createFrame();
    parent.appendChild(child);              // ÖNCE append
    child.layoutSizingHorizontal = "FILL";  // SONRA FILL
    child.layoutPositioning = "ABSOLUTE";   // SONRA ABSOLUTE
    child.x = 20; child.y = 40;             // (parent.layoutMode var olduğu için OK)

    // ❌ YANLIŞ — child append edilmeden layoutPositioning
    const bad = figma.createFrame();
    bad.layoutPositioning = "ABSOLUTE";  // HATA: "Can only set layoutPositioning = ABSOLUTE
                                         //         if the parent node has layoutMode !== NONE"
    parent.appendChild(bad);
    ```

    **Helper pattern — overlay/floating child eklemek için:**
    ```js
    function appendAbsolute(child, parent, x, y) {
      // 1. Append first so parent context is available
      parent.appendChild(child);
      // 2. Now safe to set ABSOLUTE positioning (parent has layoutMode set)
      child.layoutPositioning = "ABSOLUTE";
      child.x = x;
      child.y = y;
      return child;
    }

    // Usage:
    const card = figma.createFrame();
    card.layoutMode = "VERTICAL";
    const badge = figma.createFrame();
    appendAbsolute(badge, card, 12, -8);  // overlay top-right corner
    ```

    **Hata tanıma:** "Can only set layoutPositioning = ABSOLUTE if the parent node has layoutMode !== NONE" mesajını gördüysen → child henüz append edilmemiş demektir. `appendChild` çağrısını property atamasından önceye al.

12. **Yeni üst-düzey node'ları (0,0)'dan uzağa konumlandır.** `figma.currentPage.children` tarayarak boş alan bul.

13. **Hata durumunda DUR.** Hemen tekrar deneme. Hata mesajını oku, scripti düzelt, sonra tekrar çalıştır. Başarısız scriptler atomiktir — hata olursa hiçbir değişiklik uygulanmaz.

14. **Tüm oluşturulan/değiştirilen node ID'lerini RETURN ET:**
```js
return { createdNodeIds: [...], mutatedNodeIds: [...] };
```

15. **Variable scope'larını açıkça ayarla.** Varsayılan `ALL_SCOPES` her property picker'ı kirletir. Spesifik scope kullan:
   - Arka plan: `["FRAME_FILL", "SHAPE_FILL"]`
   - Metin rengi: `["TEXT_FILL"]`
   - Boşluk: `["GAP"]`

16. **Her Promise'i `await` et.** `await` olmadan async çağrılar sessizce başarısız olur.

## 2. Sayfa Kuralları

### Sayfalar arası geçiş

```js
const targetPage = figma.root.children.find(p => p.name === "Sayfa Adı");
await figma.setCurrentPageAsync(targetPage);
// targetPage.children artık yüklü
```

**Sync setter `figma.currentPage = page` hata verir** — her zaman `await figma.setCurrentPageAsync(page)` kullan.

### Çağrılar arası

Her `figma_execute` çağrısında `figma.currentPage` ilk sayfaya sıfırlanır. Çoklu çağrı gerektiren iş akışlarında her çağrının başında `setCurrentPageAsync` çağır.

## 3. Auto-Layout Kalıpları

### Frame oluşturma

```js
const frame = figma.createFrame();
frame.layoutMode = "VERTICAL";
frame.primaryAxisSizingMode = "AUTO";
frame.counterAxisSizingMode = "AUTO";
frame.itemSpacing = 16;
frame.paddingTop = frame.paddingBottom = 24;
frame.paddingLeft = frame.paddingRight = 24;
```

### FILL boyutlandırma (sıralama kritik)

```js
const parent = figma.createFrame();
parent.layoutMode = "VERTICAL";
const child = figma.createFrame();
parent.appendChild(child); // ÖNCE ekle
child.layoutSizingHorizontal = "FILL"; // SONRA FILL ayarla
```

## 4. Bileşen ve Instance Kalıpları

### Mevcut bileşen ile instance oluşturma

Tercihen `figma_instantiate_component` aracını kullan. `figma_execute` içinde:

```js
const component = figma.root.findOne(
  n => n.type === "COMPONENT" && n.name === "Button"
);
if (!component) return { error: "Bileşen bulunamadı" };
const instance = component.createInstance();
return { instanceId: instance.id, componentName: component.name };
```

### Variant seçimi

```js
const componentSet = figma.root.findOne(
  n => n.type === "COMPONENT_SET" && n.name === "Button"
);
const variant = componentSet.children.find(
  c => c.name === "Size=Large, Type=Primary"
);
const instance = variant.createInstance();
```

## 5. Variable Bağlama Kalıpları

```js
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const colorCollection = collections.find(c => c.name === "Colors");
const variables = await Promise.all(
  colorCollection.variableIds.map(id =>
    figma.variables.getVariableByIdAsync(id)
  )
);
const primaryColor = variables.find(v => v.name === "primary/500");

// Fill'e bağla
const fills = [...node.fills];
const boundPaint = figma.variables.setBoundVariableForPaint(
  fills[0], "color", primaryColor
);
node.fills = [boundPaint]; // YENİ paint'i geri ata
```

## 6. Ek API Gotcha'lar (Canlı Testte Keşfedilen)

17. **`import` keyword yasağı.** Plugin sandbox'ta `eval()` ile kod çalıştırılır. `import` JavaScript reserved word olduğundan function/variable adında kullanılamaz:
```js
// YANLIŞ — syntax error verir
const iv = async (k) => await figma.variables.importVariableByKeyAsync(k);

// DOĞRU
async function getVar(k) { return await figma.variables.importVariableByKeyAsync(k); }
```

18. **`setEffectStyleIdAsync` zorunlu.** Sync setter `node.effectStyleId = style.id` dynamic-page mode'da hata verir:
```js
// YANLIŞ
card.effectStyleId = esCard.id;

// DOĞRU
await card.setEffectStyleIdAsync(esCard.id);
```

19. **`setTextStyleIdAsync` kullan, fontSize variable binding YASAK.** Text style atamak font, size, line-height, letter-spacing'i tek seferde bağlar:
```js
// YANLIŞ — sadece font size bağlar, style bağlamaz
textNode.setBoundVariable("fontSize", fontSizeVar);

// DOĞRU — tüm tipografi token'larını tek seferde uygular
const style = await figma.importStyleByKeyAsync("TEXT_STYLE_KEY");
await textNode.setTextStyleIdAsync(style.id);
```

20. **`setExplicitVariableModeForCollection` — string ID çalışmaz.** Library API chain ile collection OBJECT alınmalı:
```js
// YANLIŞ — hata verir
frame.setExplicitVariableModeForCollection("VariableCollectionId:3015:5729", "3019:3");

// DOĞRU — library API chain
var colls = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
var sem = colls.find(function(c){ return c.name.indexOf("Semantic Colors") !== -1; });
var vars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(sem.key);
var first = await figma.variables.importVariableByKeyAsync(vars[0].key);
var coll = await figma.variables.getVariableCollectionByIdAsync(first.variableCollectionId);
var darkMode = coll.modes.find(function(m){ return m.name === "Dark"; });
frame.setExplicitVariableModeForCollection(coll, darkMode.modeId);
```

21. **Escaped quote dikkat.** `figma_execute` code parametresinde `\"` yerine düz `"` kullan. Template literal içinde kaçış karakteri syntax error verir.

## 7. Hata Kurtarma

1. `figma_execute` hata dönerse **hemen tekrar deneme**
2. Hata mesajını oku ve analiz et
3. Yaygın hatalar:
   - `Cannot read property of undefined` → Node ID geçersiz veya sayfa yüklenmemiş
   - `Font not loaded` → `loadFontAsync` eksik
   - `The font "<family> <style>" could not be loaded` → DS'te o weight yok. Kural 8a-1'deki `pickStyle()` fallback'ini kullan, `listAvailableFontsAsync` ile mevcut weight'leri kontrol et
   - `Cannot set FILL before appendChild` → Sıralama hatası, Kural 11
   - `Can only set layoutPositioning = ABSOLUTE if the parent node has layoutMode !== NONE` → Child append edilmeden layoutPositioning set edildi. Kural 11 + `appendAbsolute` helper kullan
   - `Maximum call stack` → Sonsuz döngü; daha küçük parçalara böl
   - `Resource links are not currently supported` → Yanlış MCP server (resmi Figma MCP) kullanıldı. F-MCP plugin bağlıysa `figma_search_assets` veya `figma_get_library_variables` kullan, `search_design_system` (resmi) DEĞİL.
4. Scripti düzelt ve yeni çağrı yap

## 7. Doğrulama Adımları

Her yazma işleminden sonra:

1. `figma_capture_screenshot` ile görsel doğrulama
2. Gerekirse `figma_get_file_data` ile yapı kontrolü
3. Oluşturulan node ID'lerini sonraki çağrılarda referans olarak kullan

## F-MCP skill koordinasyonu

Bu skill şu skill'lerle birlikte kullanılır:
- **generate-figma-screen** — Ekran oluşturma iş akışı
- **generate-figma-library** — DS kütüphanesi inşa
- **apply-figma-design-system** — DS hizalama
- **fix-figma-design-system-finding** — Tek bulgu düzeltme
- **figjam-diagram-builder** — FigJam diyagram oluşturma

## Evolution Triggers

- Bridge'e yeni `figma_*` yazma aracı eklendiğinde ilgili kalıp bölümü güncellenmeli
- `figma_execute` parametrelerinde değişiklik olursa Kural 1–2 güncellenmeli
- Yeni Plugin API yetenekleri bridge'e eklendiğinde ilgili örnekler eklenmeli
