# FMCP FigJam Drawing Skill
**Amaç:** figma-mcp-bridge (FMCP) ile FigJam'a programatik şema çizerken context patlaması ve 1MB tool result hatasını önlemek.

---

## 1. BAĞLANTI KURMA

```
figma_list_connected_files()          → fileKey al
figma_get_status()                    → port kontrolü
```

Port uyuşmazlığı: Plugin penceresinden port'u bridge portuyla (figma_get_status'dan gelen bridgePort) eşleştir.
Dosya açık değilse: Kullanıcıdan o FigJam dosyasını Figma Desktop'ta açıp plugin'i o dosya içinde çalıştırmasını iste.

---

## 2. KURAL 1 — figma_execute RETURN DEĞERİ HER ZAMAN KISA STRING

**figma_execute'dan dönen her şey MCP tool result'a girer. 1MB'ı aşarsa tüm konuşma kırılır.**

### YASAK dönüşler:
```js
// YASAK — node objesi döndürmek
return figma.currentPage.children;

// YASAK — büyük JSON
return JSON.stringify(bigObject);

// YASAK — array of nodes
return allNodes.map(n => ({id:n.id, name:n.name, x:n.x}));

// YASAK — getPluginData ile büyük veri okumak ve return etmek
const d = figma.currentPage.getPluginData("nodes");
return d; // d 1MB olabilir
```

### ZORUNLU dönüşler:
```js
// Sadece kısa özet string
return "OK: 7 node, 9 connector eklendi";

// Hata varsa kısa mesaj
return "HATA: font yüklenemedi — " + e.message.slice(0, 80);

// Koordinat gibi küçük veri
return JSON.stringify({x: 3500, y: 100, count: 10});
```

---

## 3. KURAL 2 — ADIMLAR ARASI VERİ AKTARIMI

### YASAK — setPluginData / getPluginData ile büyük JSON:
```js
// STEP 2'de yaz
figma.currentPage.setPluginData("nodes", JSON.stringify({n1, n2, n3...}));
// STEP 3'te oku → 1MB+ olur → CRASH
const raw = figma.currentPage.getPluginData("nodes");
```

### ZORUNLU — Koordinatları matematikten yeniden hesapla:
Her adımda aynı sabit layout değişkenlerini tanımla. Pozisyonlar deterministik olduğundan hesaplama her zaman aynı sonucu verir:

```js
// Her step'in başında aynı layout sabitleri:
const OX=3500, OY=100, LW=160, CW=300, LH=200, HH=64, NW=240, NH=76;

// Pozisyon her adımda hesaplanır, saklanmaz:
const npos = (phase, lane) => ({
  x: OX + LW + CW * phase + (CW - NW) / 2,
  y: OY + HH + LH * lane + (LH - NH) / 2,
});

// Connector için:
const mid = (phase, lane, side) => {
  const p = npos(phase, lane);
  if (side === 'right')  return { x: p.x + NW,      y: p.y + NH / 2 };
  if (side === 'left')   return { x: p.x,            y: p.y + NH / 2 };
  if (side === 'bottom') return { x: p.x + NW / 2,   y: p.y + NH };
  if (side === 'top')    return { x: p.x + NW / 2,   y: p.y };
};
```

---

## 4. KURAL 3 — figma.currentPage.children'A DOKUNMA

```js
// YASAK — tüm children'ı al
const all = figma.currentPage.children; // binlerce node olabilir

// YASAK — slice ile bile olsa return etme
return figma.currentPage.children.slice(-20);

// ZORUNLU — viewport için sadece yeni eklenen node ID'lerini tut
// Step içinde oluşturulan node'ları local array'de tut:
const created = [];
const r = figma.createRectangle();
figma.currentPage.appendChild(r);
created.push(r);
// Sonra sadece bunları zoom'a gönder:
figma.viewport.scrollAndZoomIntoView(created);
return "OK";
```

---

## 5. KURAL 4 — BÜYÜK FILE DATA OKUMA

```js
// figma_get_file_data — depth düşük tut, verbosity kısalt
figma_get_file_data({ depth: 1, verbosity: "summary", fileKey: "..." })

// figma_get_design_context — excludeScreenshot zorunlu
figma_get_design_context({
  excludeScreenshot: true,
  verbosity: "summary",
  depth: 1,
  fileKey: "..."
})
```

---

## 6. FİGJAM SWIM LANE ŞEMASİ PATTERN

### Standart layout sabitleri:
```
OX   = 3500   (başlangıç X — mevcut içerikten uzak)
OY   = 100    (başlangıç Y)
LW   = 160    (lane label genişliği)
CW   = 300    (her faz kolonu genişliği)
LH   = 200    (lane yüksekliği)
HH   = 64     (header yüksekliği)
NW   = 240    (node genişliği)
NH   = 76     (node yüksekliği)
```

### Renk paleti (FigJam uyumlu RGB 0-1 aralığı):
```js
const C = {
  kure:    { f:{r:.902,g:.945,b:.984}, s:{r:.22,g:.494,b:.773}, t:{r:.047,g:.274,b:.486} },
  do_:     { f:{r:.918,g:.953,b:.871}, s:{r:.231,g:.427,b:.067}, t:{r:.153,g:.314,b:.039} },
  ortak:   { f:{r:.980,g:.933,b:.855}, s:{r:.729,g:.459,b:.043}, t:{r:.388,g:.22,b:.024}  },
  yonetim: { f:{r:.988,g:.922,b:.922}, s:{r:.639,g:.176,b:.176}, t:{r:.471,g:.122,b:.122} },
};
```

### 3 adım stratejisi:

**STEP 1 — Zemin (background, lane şeritleri, başlıklar)**
- rect() ile arka plan
- Lane fill rect'leri (opacity 0.4)
- Separator çizgileri
- Header text'ler
- Return: "Step 1 OK"

**STEP 2 — Node'lar (kartlar, badge'ler, text)**
- npos(phase, lane) ile pozisyon hesapla
- Her node için: rect + text + badge
- created[] array'ine pushla
- Return: "Step 2 OK — N node"

**STEP 3 — Connector'lar (oklar)**
- mid(phase, lane, side) ile koordinat hesapla
- figma.createConnector() ile bağlantı
- created[] içindeki son connector'larla viewport zoom
- Return: "Step 3 OK — bitti"

### createConnector örneği:
```js
const conn = (x1, y1, x2, y2, dashed) => {
  const c = figma.createConnector();
  figma.currentPage.appendChild(c);
  c.connectorStart = { position: { x: x1, y: y1 } };
  c.connectorEnd   = { position: { x: x2, y: y2 } };
  c.strokes = [{ type: 'SOLID', color: { r: .38, g: .38, b: .36 } }];
  c.strokeWeight = 1.8;
  c.connectorEndStrokeCap = "ARROW_EQUILATERAL";
  if (dashed) c.dashPattern = [6, 4];
  return c;
};
```

### Diamond karar noktası:
```js
// figma.createPolygon() rotation 45 ile diamond efekti
const d = figma.createPolygon();
d.pointCount = 4;
d.x = cx - 20; d.y = cy - 20;
d.resize(40, 40);
d.rotation = 45;
figma.currentPage.appendChild(d);
```

---

## 7. BAĞLANTI KOPMASI DURUMUNDA

```
figma_get_status()  → pluginConnected: false ise
→ Kullanıcıya: "Plugin bağlantısı koptu. FigJam dosyasında plugin'i yeniden çalıştırın."
→ Port kontrolü yap (bridgePort değeriyle plugin port'u eşleştir)
→ figma_list_connected_files() ile yeniden teyit et
```

---

## 8. CONTEXT TAŞMASI ÖNLEMİ

- figma_execute her çağrıda **max ~50 satır kod** — daha uzunsa step'e böl
- figma_get_file_data sonucunu **asla return etme veya loglama** — sadece gerekli alanları oku
- Hata ayıklamak için: `return "DEBUG: " + someVar.toString().slice(0, 200)` — max 200 karakter
- Büyük koordinat listeleri için: array'i döndürme, sadece "count" say

---

## 9. CHECKLIST — Her figma_execute öncesi

- [ ] Return değeri kısa string mi? (< 500 karakter)
- [ ] children'a erişiyor muyum? → Kaldır
- [ ] setPluginData/getPluginData büyük JSON mu? → Matematik kullan
- [ ] Koordinatlar aynı layout sabitleriyle hesaplanıyor mu?
- [ ] created[] local array'i viewport zoom için kullanıldı mı?
