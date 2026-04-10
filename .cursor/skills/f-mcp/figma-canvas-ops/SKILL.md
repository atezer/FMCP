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

6. **Renkler 0–1 aralığında** (0–255 değil): `{r: 1, g: 0, b: 0}` = kırmızı.

7. **Fills/strokes read-only array** — klonla, değiştir, geri ata:
```js
const fills = [...node.fills];
fills[0] = { ...fills[0], color: { r: 1, g: 0, b: 0 } };
node.fills = fills;
```

8. **Font yükleme zorunlu** — metin işleminden önce:
```js
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
```

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

10. **`setBoundVariableForPaint` YENİ paint döner** — yakala ve geri ata.

11. **`layoutSizingHorizontal/Vertical = 'FILL'` appendChild'DAN SONRA** ayarlanmalı — öncesinde hata verir.

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

## 6. Hata Kurtarma

1. `figma_execute` hata dönerse **hemen tekrar deneme**
2. Hata mesajını oku ve analiz et
3. Yaygın hatalar:
   - `Cannot read property of undefined` → Node ID geçersiz veya sayfa yüklenmemiş
   - `Font not loaded` → `loadFontAsync` eksik
   - `Cannot set FILL before appendChild` → Sıralama hatası
   - `Maximum call stack` → Sonsuz döngü; daha küçük parçalara böl
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
