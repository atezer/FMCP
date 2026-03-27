# Güvenlik Düzeltmeleri Etki Analizi (O2, O6, K3)

Bu doküman, önerilen güvenlik düzeltmelerinin f-mcp-bridge projesindeki mevcut işlevselliği bozma riskini analiz eder.

---

## O2: WebSocket maxPayload (5MB) ve Rate Limiting (100 msg/min)

### Mevcut Durum
- `plugin-bridge-server.ts`: `WebSocketServer` oluşturulurken `maxPayload` veya rate limiting **yok**
- Mesajlar doğrudan `ws.send(JSON.stringify(req))` ile gönderilir (satır 236)
- Plugin UI (ui.html) WebSocket üzerinden MCP bridge'e bağlanır; tüm method çağrıları ve yanıtlar bu kanaldan geçer

### Büyük Payload Analizi

#### 1. **captureScreenshot – BASE64 GÖRÜNTÜ (KRİTİK RİSK)**
- **Kaynak**: `f-mcp-plugin/code.js` satır 2063-2081
- Plugin `node.exportAsync()` ile PNG/JPG/SVG export eder, `figma.base64Encode(bytes)` ile base64'e çevirir
- **Payload**: `{ success, image: { base64, format, scale, byteLength, node, bounds } }`
- Base64, ham binary'den ~%33 daha büyüktür
- **Boyut örnekleri**:
  - Küçük component (200x200 px, scale 2, PNG): ~50-150 KB
  - Orta frame (800x600 px, scale 2, PNG): ~300 KB - 1 MB
  - Büyük sayfa (1920x1080 px, scale 2, PNG): ~1.5-3 MB
  - **Scale 4 veya tam sayfa**: **5MB'ı kolayca aşabilir**

**Sonuç**: 5MB `maxPayload` sınırı, büyük node'larda veya yüksek scale'de screenshot alırken **kesinlikle işlevselliği bozabilir**.

#### 2. **getDocumentStructure / getNodeContext – BÜYÜK JSON**
- `buildNodePayload` full document tree veya node subtree döndürür
- Verbosity `full`, `includeLayout`, `includeVisual`, `includeTypography` ile çok büyük JSON üretilir
- Büyük Figma dosyalarında (100+ sayfa, binlerce node): **1-5 MB+ JSON** mümkün
- `figma-tools.ts` zaten `RESPONSE_SIZE_THRESHOLDS` (100-1000 KB) ve `adaptiveResponse` ile sıkıştırma yapıyor, ancak bu **MCP tool response** için; WebSocket üzerindeki plugin bridge response'u **ayrı** – plugin tarafında sıkıştırma yok

**Sonuç**: Çok büyük dosyalarda `getDocumentStructure` veya `getNodeContext` 5MB'ı aşabilir.

#### 3. **Diğer Büyük Veriler**
- `getLocalComponents`: Limit var (varsayılan currentPageOnly) ama limit=0 ile tüm dosyada binlerce component → yine büyük JSON
- `getVariables` + `include_exports`: Token export formatları eklenirse büyüyebilir
- `executeCodeViaUI`: Kullanıcı kodu büyük JSON döndürürse (ör. tüm node tree) büyük payload

### Rate Limiting (100 msg/min) Etkisi

#### Yüksek Mesaj Üreten İşlemler
1. **Keepalive**: Plugin UI `setInterval` ile her 2 saniyede `{ type: 'keepalive' }` gönderir (ui.html ~558)
2. **Heartbeat**: Server her 3 saniyede `{ type: "ping" }` gönderir, plugin `pong` yanıtlar
3. **Batch operations**:
   - `batchCreateVariables`: Tek request, 100 değişken (1 mesaj)
   - `batchUpdateVariables`: Tek request, 100 güncelleme (1 mesaj)
4. **AI workflow**: Kullanıcı “tüm component'leri listeleyip her biri için screenshot al” derse:
   - Örn. 50 component × (1 search + 1 screenshot) = 100+ request → **rate limit'e takılabilir**

**100 msg/min** = yaklaşık 1.67 msg/saniye. Keepalive + ping/pong ≈ 1+1 ≈ 2 msg/2 sn → dakikada ~60 msg sadece heartbeat. Kalan ~40 msg gerçek iş için. Yoğun batch veya çoklu screenshot senaryosunda **rate limiting işlevselliği bozabilir**.

### O2 Önerileri
1. **maxPayload**: 5MB yerine **16-32 MB** düşünülebilir; veya screenshot için ayrı kanal / chunking
2. **Rate limiting**: 100 msg/min çok sıkı; **300-600 msg/min** veya sadece **request** (ping/pong/keepalive hariç) sayımı yapılmalı
3. Screenshot için: Scale/default format sınırlaması veya base64'ü WebSocket dışında (örn. dosya, URL) iletme seçeneği

---

## O6: Console Monitor Token/Key/Secret Filtreleme

### Mevcut Durum
- `console-monitor.ts` (375 satır): Puppeteer `page.on('console')` ve `worker.on('console')` ile logları toplar
- `processConsoleMessage`: `msg.text()`, `msg.args()` (truncateValue ile), level filtresi
- **Şu an token/key/secret pattern filtresi YOK**
- Çıktı: `getLogs({ count, level, since })` ile döndürülüyor

### Tüketen Yerler
1. **figma-tools.ts** (~2097, ~2105): `figma_get_component_for_development` veya `parseFromConsole` – console loglarından veri parse ediyor
2. **local.ts** (~339, ~588): MCP başlangıcında `getLogs`, ayrıca `watchedLogs` ile log izleme
3. **Cloudflare index**: Benzer kullanım

### Olası Filtre Davranışı
- Önerilen: `token`, `key`, `secret`, `password` içeren stringleri maskelemek (örn. `***REDACTED***`)
- **False positive riski**:
  - `"Variable key: primary"` → “key” kelimesi maskeleyebilir
  - `"Figma REST API token required"` → “token” maskeleyebilir
  - `"component key: abc123"` → maske
  - `"description: user entered a secret"` → “secret” maskeleyebilir
- **figma-tools parseFromConsole**: Console’dan variable/component bilgisi çıkarıyorsa; “key”, “token” gibi kelimeler içeren **geçerli** log satırları maskelenirse parse hatalarına yol açabilir

### Performans
- Regex her log mesajı için çalışacak
- Yüksek log frekansında (plugin çalışırken sık `console.log`) her mesajda regex maliyeti var
- `truncateValue` zaten O(n) işlem yapıyor; ek regex makul ama yüksek frekansta ölçülmeli

### O6 Önerileri
1. **Dar pattern**: Sadece açık hassas formatlar (örn. `Bearer [a-zA-Z0-9_-]+`, `api[_-]?key\s*=\s*['"]?\w+`, `secret\s*=\s*['"]?\w+`)
2. **Whitelist**: “Variable key”, “component key”, “file key” gibi Figma terminolojisi için exception
3. **Configurable**: Filtre varsayılan kapalı veya env ile açılabilsin; production’da açık, geliştirme sırasında kapalı
4. **Parse consumer uyumu**: `parseFromConsole` kullanan tool’ların maskelenmiş log ile hâlâ çalıştığı doğrulanmalı

---

## K3: nodeId JSON.stringify – figma-desktop-connector.ts

### Sorunlu Kod
- **Dosya**: `src/core/figma-desktop-connector.ts`
- **Fonksiyon**: `getComponentByNodeId` (satır 374-368)
- **Satır 386-388**:
```typescript
const node = figma.getNodeById('${nodeId}');
if (!node) {
  throw new Error('Node not found with ID: ${nodeId}');
```
- `nodeId` template literal ile doğrudan enjekte ediliyor → **Code injection riski**

### Önerilen Düzeltme
```typescript
const node = figma.getNodeById(${JSON.stringify(nodeId)});
```

### Node ID Formatı (Figma)
- Format: `"<number>:<number>"` (örn. `"695:313"`)
- Karakterler: genelde `0-9`, `:`, bazen `-` (nadir)
- Özel karakterler: `'` `"` `\` gibi karakterler normal ID’lerde yok; ancak dış girdiyle gelirse injection mümkün

### JSON.stringify vs Tek Tırnak Karşılaştırması
| nodeId          | Mevcut `'${nodeId}'`       | Önerilen `${JSON.stringify(nodeId)}` |
|-----------------|----------------------------|--------------------------------------|
| `"695:313"`     | `figma.getNodeById('695:313')`     | `figma.getNodeById("695:313")`       |
| `"123:456"`     | `figma.getNodeById('123:456')`     | `figma.getNodeById("123:456")`       |
| `"1';alert(1);//"` | `figma.getNodeById('1');alert(1);//')` ❌ | `figma.getNodeById("1');alert(1);//")` ✅ |

Normal node ID’ler için her iki kullanım da aynı sonucu verir. Özel karakterli/injection denemelerinde sadece JSON.stringify güvenli.

### Aynı Dosyada JSON.stringify Kullanımları
- `getComponentFromPluginUI` (245): `frame.evaluate(\`window.requestComponentData(${JSON.stringify(nodeId)})\`)`
- `executeCodeViaUI` (427): `frame.evaluate(\`window.executeCode(${JSON.stringify(code)}, ${timeout})\`)`
- `updateVariable` (457), `createVariable` (483), `setNodeDescription` (750), `captureScreenshot` (1018), vs.: Hepsi `JSON.stringify` kullanıyor

**Tek istisna**: `getComponentByNodeId` içindeki worker’a gönderilen `code` string’i – burada hâlâ `'${nodeId}'` var.

### Plugin code.js Karşılaştırması
- Plugin `msg.nodeId` ile alıyor; `figma.getNodeByIdAsync(msg.nodeId)` – postMessage ile serileşiyor, injection yok
- `ARRANGE_COMPONENT_SET` (code.js 2437): `figma.getNodeById(nodeIds[n])` – `nodeIds` plugin içinden geliyor, güvenli
- **figma-desktop-connector** ise `executeInPluginContext` ile dinamik kod string’i üretiyor; burada injection riski var

### K3 Sonuç
- **Değişiklik güvenli ve işlevi bozmaz**: Normal node ID’ler için davranış aynı
- **Zorunlu**: Injection riskini kapatmak için gerekli
- **Tutarlılık**: Dosyadaki diğer tüm benzer kullanımlar zaten `JSON.stringify` kullanıyor

---

## Özet Tablo

| Düzeltme | İşlevi Bozma Riski | Notlar |
|----------|--------------------|--------|
| **O2 maxPayload 5MB** | **Yüksek** | Screenshot ve büyük JSON payload’ları 5MB’ı aşabilir |
| **O2 rate 100 msg/min** | **Orta** | Yoğun batch/screenshot senaryolarında yetersiz kalabilir |
| **O6 console filtre** | **Orta** | Yanlış pattern ile “key”/“token” içeren geçerli loglar maskelenebilir; parse hataları |
| **K3 JSON.stringify** | **Düşük** | Sadece güvenli hale getiriyor, mevcut davranışı koruyor |

---

## Önerilen Uygulama Sırası
1. **K3**: Hemen uygulanabilir, risk yok
2. **O6**: Pattern’leri dar tutup, whitelist/konfigürasyon ile kontrollü eklenmeli
3. **O2**: maxPayload artırılmalı veya alternatif (chunking, ayrı kanal); rate limit gevşetilmeli veya sadece iş mantığı mesajları sayılmalı
