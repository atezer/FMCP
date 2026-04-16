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

   ### 🚨 5a. CHUNKING MANDATE (v2.0 REVİZE — Gerçek Test Verisi ile Güncellendi)

   Her `figma_execute` çağrısı **maksimum 15 "atomic operation"** içermeli. Aşağıdakilerin her biri 1 atomic operation sayılır:

   **v2.0 sınır revizyonu gerekçesi:** v1.9.3'te 8 op sınırı konuldu (teorik koruma). 4 gerçek test (FP-1-R serisi, 2026-04-15/16) şunu kanıtladı: 7 op = 88ms, 4 execute = 143ms toplam. Plugin internal timeout 60s, bridge timeout 4dk — **15 op güvenle sığar** (~200-300ms beklenen). Eski 8 op sınırı execute sayısını 19'a çıkardı → Claude inter-execute düşünme süresi (30-60s × 19 = ~15 dk saf overhead) → toplam 30+ dk. 15 op sınırı execute sayısını 6-8'e düşürür → süre ~10-12 dk.

   - Node oluşturma (`createFrame`, `createText`, `createRectangle`, `clone`)
   - Instance oluşturma (`createInstance`, `importComponentByKeyAsync`)
   - Variable import (`importVariableByKeyAsync`) — her key
   - Style import (`importStyleByKeyAsync`) — her key
   - Font load (`loadFontAsync`) — her font family/style
   - Bind operasyonu (`setBoundVariable`, `setBoundVariableForPaint`, `setTextStyleIdAsync`, `setEffectStyleIdAsync`)
   - `getMainComponentAsync` (her instance için)
   - `getNodeByIdAsync`

   **Sınır gerekçesi:** Plugin timeout **60 saniye** (internal), bridge timeout **4 dakika**. Bir execute çağrısında 30+ async round-trip → bridge timeout riski. **Gerçek test verileri (2026-04-15/16):** 7 op = 88ms, 15 op = ~200ms (güvenli). 30+ op → 4 dk timeout (kanıtlanmış). 15 op sınırı güvenlik ile hız arasında optimal denge.

   **Chunking patterns:**

   - 1 execute = 1 mega-goal (örneğin: "tüm pre-flight discovery + token import", "frame + structure + mode apply", "3-4 component placement toplu")
   - Büyük iş (25+ op) → 2-3 execute'a böl
   - Execute'ler arası state aktar: nodeId'leri `return` et, sonraki execute `getNodeByIdAsync(returnedId)` ile al
   - Her execute'tan sonra **1 satır Türkçe micro-report** yaz (progress streaming için)

   **Anti-pattern örneği (YASAK):**
   ```js
   // ❌ Tek execute'ta 25+ operasyon — 4 dk timeout olacak
   const v1 = await figma.variables.importVariableByKeyAsync(key1);
   const v2 = await figma.variables.importVariableByKeyAsync(key2);
   // ... 18 daha variable
   const s1 = await figma.importStyleByKeyAsync(styleKey1);
   // ... 5 daha style
   const frame = figma.createFrame();
   const child1 = figma.createFrame();
   // ... 13 daha node
   // Bind'lar ...
   ```

   **Doğru pattern (Execute #1, #2, #3...):**
   ```js
   // ✅ Execute #1: Sadece wrapper frame + bg binding (3 op)
   const frame = figma.createFrame();
   frame.resize(402, 874);
   const bgVar = await figma.variables.importVariableByKeyAsync('bgKey');
   const paint = { type: 'SOLID', color: {r:1,g:1,b:1} };
   const bound = figma.variables.setBoundVariableForPaint(paint, 'color', bgVar);
   frame.fills = [bound];
   return { frameId: frame.id };
   ```
   Sonraki execute'te `getNodeByIdAsync(frameId)` ile frame'i tekrar al, yeni 5-8 op daha yap.

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

22. **Async API Zorunluluğu — dynamic-page mode (v1.9.3+, Gerçek Test Bulgusu).** Plugin `dynamic-page` modunda aşağıdaki sync API'ler **throws**:

| ❌ YASAK (sync) | ✅ ZORUNLU (async) | Kontext |
|---|---|---|
| `instance.mainComponent` | `await instance.getMainComponentAsync()` | Instance → main component erişimi |
| `figma.getNodeById(id)` | `await figma.getNodeByIdAsync(id)` | Node ID ile node bulma |
| `figma.variables.importVariableByKey(key)` | `await figma.variables.importVariableByKeyAsync(key)` | Variable import |
| `figma.importComponentByKey(key)` | `await figma.importComponentByKeyAsync(key)` | Component import |
| `figma.importStyleByKey(key)` | `await figma.importStyleByKeyAsync(key)` | Style import |
| `node.effectStyleId = x` | `await node.setEffectStyleIdAsync(x)` | Effect style atama (Rule 18) |
| `node.textStyleId = x` | `await node.setTextStyleIdAsync(x)` | Text style atama (Rule 19) |
| `figma.listAvailableFonts()` | `await figma.listAvailableFontsAsync()` | Font listesi |
| `figma.loadFont({family, style})` | `await figma.loadFontAsync({family, style})` | Font yükle (her zaman) |
| `figma.variables.getVariableCollectionById(id)` | `await figma.variables.getVariableCollectionByIdAsync(id)` | Collection fetch |

**Hata örneği (gerçek testten):** `"Cannot call with documentAccess: dynamic-page. Use node.getMainComponentAsync instead."`

**Kural:** Figma Plugin API'de Async versiyon varsa **her zaman** onu kullan. Sync versiyonun çağrısı dynamic-page'de hata verir, readonly/minimal mode'da da yavaştır.

23. **Style Import Sessiz Fail Pattern + Font Load Sequence (v1.9.3+, Gerçek Test Bulgusu).** Team library style'ları (text, paint, effect) `importStyleByKeyAsync` ile çağrıldığında **silent fail** olabilir — null döner veya throws, key unpublished/expired ise:

**⚡ Fast Path İstisnası (fmcp-screen-recipes, v1.9.7+):** Fast Path kullanılıyorsa ve Adım 1.6 Text Style Resolution ile `roleMap` hazırsa, `importStyleByKeyAsync` yerine **direkt `setTextStyleIdAsync(roleMap[role].id)`** tercih edilir — import adımı atlanır. Bu istisnayı sadece fmcp-screen-recipes Adım 7 uygular. Tam workflow'da (generate-figma-screen) bu kural aynen geçerli: import + try-catch + fallback.

**Gerçek hata örneği:** `fb3591835c86d00580e1f0cea2343d033107dc67` (display text style) → `"Failed to import style by key"`, ardından `"Cannot write to node with unloaded font 'SHBGrotesk Semi Bold'"` (font load edilmemiş çünkü style fail olmuş).

**Zorunlu try-catch + font load sequence:**

```js
// 1. Style import try-catch ile wrap
let textStyle = null;
let styleImportError = null;
try {
  textStyle = await figma.importStyleByKeyAsync("fb3591835c86...");
} catch (e) {
  styleImportError = e.message;
}

// 2. Style varsa: set + font load (style içindeki font'u)
if (textStyle) {
  await textNode.setTextStyleIdAsync(textStyle.id);
  // Style'ın kullandığı fontu yükle (style içeriğinden öğreniyoruz)
  // NOT: textNode.fontName artık style'dan miras — direct load edemeyiz
  // Bunun yerine: textNode.characters set etmeden önce fontName'i al
  const fontName = textNode.fontName;  // Figma style'ı uyguladıktan sonra setliyor
  if (fontName && fontName.family) {
    try {
      await figma.loadFontAsync(fontName);
      textNode.characters = "Örnek metin";
    } catch (fontErr) {
      // Font da yüklenemedi → fallback
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      textNode.fontName = { family: "Inter", style: "Regular" };
      textNode.characters = "Örnek metin (font fallback)";
    }
  }
} else {
  // 3. Style fail → Fallback: default font + hardcoded boyut (son çare)
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  textNode.fontName = { family: "Inter", style: "Regular" };
  textNode.fontSize = 14;
  textNode.characters = "Örnek metin";
  // Kullanıcıya raporla: "Style X import edilemedi (reason: ...), Inter 14pt ile çalışıyor"
  console.warn(`Style import failed: ${styleImportError}`);
}
```

**Önemli noktalar:**
- Style import her zaman **try-catch** ile wrap edilmeli
- Style başarılıysa → `setTextStyleIdAsync` → sonra font yüklemesi (style'dan gelen font)
- Style fail ise → default font (Inter Regular) → fontSize hardcoded (son çare, kullanıcıya bildir)
- `characters = "..."` **her zaman** font load'dan SONRA set edilmeli

24. **Component Discovery Fallback — Instance Scan Boşsa (v1.9.3+, Gerçek Test Bulgusu).** `figma_search_assets` **mevcut instance node'larını** tarayarak library component'lerini bulur. File'da hiç instance yoksa boş sonuç. **Gerçek test:** İlk aramada "No library components found via instance scan" hatası alındı.

**Manuel discovery pattern (figma_execute içinde):**

```js
// Tüm remote component'leri keşfet (instance scan bağımsız)
const allInstances = figma.currentPage.findAll(function(n) { return n.type === "INSTANCE"; });
const componentMap = new Map();

for (const inst of allInstances) {
  const main = await inst.getMainComponentAsync();
  if (main && main.remote && main.key) {
    if (!componentMap.has(main.name)) {
      componentMap.set(main.name, {
        name: main.name,
        key: main.key,
        id: main.id,
        libraryName: main.remote ? "remote" : "local"
      });
    }
  }
}

return Array.from(componentMap.values());
```

**Sonuç:** Bu pattern gerçek testte 143 unique remote component keşfetti. `figma_search_assets`'in bulamadığı component'leri manuel tarama ile yakalar.

**Sınırlama:** File'da hiç instance yoksa (taze boş file) bu da boş sonuç verir. O durumda kullanıcıdan "kütüphane kullanan bir örnek file'ı açın veya bir component'i manuel yerleştirin" istenir.

**Araç seçim rehberi:**
- **İlk deneme:** `figma_search_assets(query="...")` — hızlı, cache-friendly
- **Boş sonuç:** Yukarıdaki manuel discovery ile fallback
- **Key biliniyor ama tool ile alınamıyor:** `await figma.importComponentByKeyAsync(key)` direkt çağır

25. **`figma_validate_screen` Timeout Fallback (v1.9.5+, Gerçek Test #14).** Büyük dosyalarda (Sahifinans Playground gibi 2000+ instance'lı file'larda) `figma_validate_screen` 90 sn default timeout'a düşebilir. Plugin core speed limitation — plugin-side fix gerekir (Part 5 Kategori B adayı). Bu skill tarafında **3 seviyeli fallback, hızlı timeout politikası**:

**Timeout politikası gerekçesi (FP-1-R-v2 revizyonu):** Önceki versiyon (v1.9.4) Seviye 1'de 180s, Seviye 2'de 120s kullanıyordu — ama gerçek test (FP-1-R-v2 2026-04-15) gösterdi ki büyük dosyada ne 90s ne de 180s yeter, ikisi de aynı şekilde timeout'a düşer. Uzun timeout sadece kullanıcıyı **sessiz 3+ dakika** bekletir. Yeni politika: her iki seviyede `60000ms` (1 dk) — fail olacaksa hızlıca fail et, Seviye 3 manuel checklist'e daha çabuk geç. Toplam bekleme ~3 dk yerine ~2 dk.

**Seviye 1 — Full frame, kısa timeout:**
```
figma_validate_screen(nodeId, minScore=80, timeout=60000)  // 1 dakika
```
Default 90s yetmiyor bilindiği için explicit `60000ms` ver. Başaracaksa zaten bu süre içinde döner; başaramayacaksa uzun beklemenin anlamı yok, hızlıca Seviye 2'ye düş.

**Seviye 2 — Scope daralt, aynı kısa timeout:**
Eğer Seviye 1 de timeout'a düşerse, wrapper frame yerine **sadece tek bir section'ı** validate et:
```
figma_validate_screen(contentBodyWrapperId, minScore=70, timeout=60000)
```
Content Body wrapper (fmcp-screen-recipes Adım 5.5'teki iç frame) daha küçük node tree → genelde hızlı validate. `minScore`'u 80'den 70'e düşür (daha az strict, timeout'a giden büyük dosyada %100 görünmeyen violation'lar olabilir). Timeout yine 1 dk — Content Body bile yetişmiyorsa dosya tarafında daha derin bir sorun var demektir, Seviye 3'e in.

**Seviye 3 — Manuel QA Checklist Fallback:**
Eğer Seviye 2 de timeout'a düşerse, `figma_validate_screen` skorunun **yerine** kullanıcıya manuel göz kontrolü için Türkçe checklist üret:

```markdown
## ⚠️ Validate Timeout — Manuel QA Checklist

`figma_validate_screen` 2 denemede de timeout'a düştü (Sahifinans Playground gibi büyük dosyalarda bilinen sorun, plugin tarafında fix bekliyor). Sistematik skor alınamadı. Lütfen **Figma Desktop'ta göz kontrolü** ile doğrula:

### Instance Coverage
- [ ] Wrapper frame'i seç → Design panel → "Instances" sayısı kontrol et
- [ ] Toplam node sayısının ≥60%'ı library instance olmalı
- [ ] Ham `createFrame` veya `createRectangle` sayısı ≤40%

### Token Binding Coverage
- [ ] Rastgele 5 fill seç → her birinde variable icon 🎨 olmalı (hex kodu değil)
- [ ] Rastgele 3 padding/spacing değer → hepsi variable-bound olmalı
- [ ] Rastgele 3 text → Text Style dolu olmalı (font size manuel değil)

### Auto-Layout Coverage
- [ ] Wrapper frame → Auto layout aktif
- [ ] İç section'lar → Auto layout aktif (hiçbir frame NONE mode'da değil)

### Dark Mode Coverage
- [ ] Dark frame'e geç → renklerin dark değere döndüğünü doğrula
- [ ] Button fill'leri hâlâ variable-bound (hardcoded kalmadı)
- [ ] Text color'lar dark theme'e uygun

Her madde ✅ ise → manuel quality gate geçti, recipe başarılı sayılır.
Herhangi biri ❌ → sorunlu node'un ID'sini raporla, hedefli fix uygulanır.
```

**Micro-report (timeout durumunda):**
`⚠️ Validate: 2 denemede timeout → manuel QA checklist üretildi (bkz. yukarıda)`

**Kullanım sırası:** Her üretim sonrası sırayla Seviye 1 → (fail ise) Seviye 2 → (fail ise) Seviye 3 dene. Seviye 3'e inilse bile recipe "başarısız" sayılmaz — manuel göz onayı yeterli.

26. **Component Property Discovery — Tek Execute Pattern (v1.9.4+, Gerçek Test #9, #10).** Component instance'ının property'lerini ve variant'larını öğrenmek için **tek execute** yeterli. Deneme-yanılma ile 3-4 execute harcama.

**Pattern:**

```js
// figma_execute — component set discovery (tek call, 3-4 op)
const comp = await figma.importComponentByKeyAsync(componentKey);

// Component set ise variant'lara eriş
let componentSet = null;
if (comp.parent && comp.parent.type === "COMPONENT_SET") {
  componentSet = comp.parent;
} else {
  // Single component (variant yok)
  componentSet = comp;
}

// Property definitions
const propDefs = componentSet.componentPropertyDefinitions || {};

// Variant children (sadece component set için)
let variants = [];
if (componentSet.type === "COMPONENT_SET") {
  variants = componentSet.children.map(v => ({
    name: v.name,
    variantProps: v.variantProperties || {}
  }));
}

return {
  componentId: comp.id,
  componentName: comp.name,
  propertyDefinitions: Object.entries(propDefs).map(([name, def]) => ({
    name,
    type: def.type,  // TEXT, BOOLEAN, INSTANCE_SWAP, VARIANT
    defaultValue: def.defaultValue,
    variantOptions: def.variantOptions || []
  })),
  variants: variants
};
```

**Çıktı (örnek NavigationTopBar için):**
```json
{
  "componentName": "NavigationTopBar",
  "propertyDefinitions": [
    {
      "name": "Type",
      "type": "VARIANT",
      "defaultValue": "Logo",
      "variantOptions": ["Logo", "Tile-Sub"]
    },
    {
      "name": "Title",
      "type": "TEXT",
      "defaultValue": "Başlık"
    }
  ],
  "variants": [
    { "name": "Type=Logo", "variantProps": { "Type": "Logo" } },
    { "name": "Type=Tile-Sub", "variantProps": { "Type": "Tile-Sub" } }
  ]
}
```

Bu **tek execute** ile:
- Tüm variant isimlerini öğrenirsin (örn. `Type=Title` YOK, `Type=Tile-Sub` VAR)
- Tüm property'leri öğrenirsin (Title text, boolean icon, vb.)
- Default değerleri bilirsin

Sonraki `setProperties` çağrısı artık garantili doğru variant/property isimlerini kullanır.

**`figma_instantiate_component` timeout alternatifi (Gerçek Test #8):** Bazı component'lerde `figma_instantiate_component(componentKey)` tool çağrısı 15 sn timeout'a düşer. O durumda `figma_execute` içinde direkt `importComponentByKeyAsync(key)` + `comp.createInstance()` pattern'ini kullan — bu tek execute'ta çalışır, tool overhead yok.

**Text Style Discovery — Öncelik Sırası:**

Text style'lar için strateji sırası:
1. **Instance scan** (en hızlı, cache-friendly): `figma.currentPage.findAll(n => n.type === "TEXT")` → `textStyleId` → `figma.getStyleByIdAsync(styleId)` → unique style'ları topla
2. Boş ise → `figma_search_assets(query="text style")` (bu da instance scan, farklı tool)
3. Boş ise → Team library API: `figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()` yaklaşımına benzer — style metadata discovery
4. Boş ise → **kabul et, fallback** — yaygın style isimleri (body, heading, display, caption) primitive text + Inter fontu + hardcoded size (minimum violation, kullanıcıya bildir)

**Kritik not — Display/Heading Style Missing (Gerçek Test #11):**

Gerçek test (Sahifinans SUI library, 2026-04-15): `display` text style'ı hiçbir yöntemle bulunamadı. Recipe büyük başlıklar için `body-semibold + hardcoded fontSize=36` kullanmak zorunda kaldı → `HARDCODED_FONT_SIZE` violation. **Bu bir SUI library eksikliği**, skill tarafında tam çözümü yok. Workaround: recipe'de "display yerine en büyük mevcut text style (body-large veya heading)'i bul ve karakter büyüklüğünü ayarla" fallback'i. Detay: `install/TOKEN-BUDGET.md` Known Limitations #7.

**Micro-report:**
`✅ Component property discovery: <componentName>, <N> property, <M> variant`
veya
`⚠️ Text style <name> bulunamadı → fallback <yaygın style>, kullanıcıya bildirildi`

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

## 8. Doğrulama Adımları

Her yazma işleminden sonra:

1. `figma_capture_screenshot` ile görsel doğrulama
2. Gerekirse `figma_get_file_data` ile yapı kontrolü
3. Oluşturulan node ID'lerini sonraki çağrılarda referans olarak kullan

## F-MCP skill koordinasyonu

Bu skill şu skill'lerle birlikte kullanılır:
- **fmcp-screen-orchestrator** — Orkestratör, DS GATE, Fast Path routing (v1.9.7+)
- **fmcp-screen-recipes** — Fast Path recipe akışı (Rule 25 validate fallback, Rule 26 component discovery bu skill'den referans alınır) (v1.9.7+)
- **generate-figma-screen** — Ekran oluşturma iş akışı (tam workflow)
- **generate-figma-library** — DS kütüphanesi inşa
- **apply-figma-design-system** — DS hizalama
- **fix-figma-design-system-finding** — Tek bulgu düzeltme
- **figjam-diagram-builder** — FigJam diyagram oluşturma

## Evolution Triggers

- Bridge'e yeni `figma_*` yazma aracı eklendiğinde ilgili kalıp bölümü güncellenmeli
- `figma_execute` parametrelerinde değişiklik olursa Kural 1–2 güncellenmeli
- Yeni Plugin API yetenekleri bridge'e eklendiğinde ilgili örnekler eklenmeli
