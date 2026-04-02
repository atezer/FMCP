# WebSocket Authentication (K4) Analizi — F-MCP Bridge

Bu belge, `plugin-bridge-server.ts` dosyasına önerilen `bridgeSecret` tabanlı WebSocket doğrulamasının mevcut işlevselliği bozup bozmayacağını inceliyor.

---

## 1. WebSocket Bağlantı Akışı

### 1.1 Sunucu (plugin-bridge-server.ts)

**Yaşam döngüsü:**
1. `start()` çağrılır → `tryListen(port)` 
2. HTTP sunucu `createServer()` ile oluşturulur
3. `server.listen(port, bindHost)` — `FIGMA_BRIDGE_HOST` veya `127.0.0.1`
4. `WebSocketServer({ server })` aynı HTTP sunucuya bağlanır
5. **Şu an `verifyClient` yok** — her gelen upgrade isteği kabul edilir
6. `wss.on("connection", ws)` — bağlantı kurulduğunda:
   - Tek client kuralı: yeni bağlantı gelirse eskisi atılır
   - `ws.on("message")` — `ready`, `pong`, `keepalive` veya JSON-RPC yanıtı işlenir
   - Heartbeat: her 3 saniyede `ping` gönderilir; cevap gelmezse 3 kez ardışık hata sonrası bağlantı kesilir

### 1.2 Plugin (f-mcp-plugin/ui.html)

**Bağlantı kodu (yaklaşık 570–771 satırlar):**
```javascript
// Host/Port discovery
function getMcpBridgeHost() {
  var el = document.getElementById('mcp-host');
  return (el?.value || localStorage.getItem('f-mcp-bridge-host') || 'localhost').trim();
}
function getMcpBridgePort() {
  var el = document.getElementById('mcp-port');
  var n = parseInt(el?.value || localStorage.getItem('f-mcp-bridge-port') || '5454', 10);
  return isNaN(n) || n < 5454 || n > 5470 ? 5454 : n;
}

// Bağlantı
var url = 'ws://' + host + ':' + port;
mcpBridgeWs = new WebSocket(url);
```

**Bağlantı adımları:**
1. Host: UI input veya `localStorage['f-mcp-bridge-host']`, varsayılan `localhost`
2. Port: UI input veya `localStorage['f-mcp-bridge-port']`, varsayılan `5454`
3. `new WebSocket(url)` — **query string yok**, sadece `ws://host:port`
4. `onopen` → hemen `{ type: 'ready' }` gönderilir
5. `onmessage` → `welcome` beklenir, 5 saniye içinde gelmezse "wrong server" hatası

**Önemli:** `code.js` WebSocket kullanmaz. Tüm plugin↔bridge iletişimi `ui.html` içindeki WebSocket client üzerinden yürür. `code.js` sadece `postMessage` ile UI’a komut gönderir.

---

## 2. Plugin ↔ Bridge Protokolü

| Yön | Mesaj | Açıklama |
|-----|-------|----------|
| Plugin → Bridge | `{ type: 'ready' }` | Bağlantı kurulduktan hemen sonra (onopen) |
| Bridge → Plugin | `{ type: 'welcome', bridgeVersion, port }` | ready karşılığı |
| Bridge → Plugin | `{ type: 'ping' }` | Heartbeat (her 3 sn) |
| Plugin → Bridge | `{ type: 'pong' }` veya `{ type: 'keepalive' }` | Ping yanıtı |
| Bridge → Plugin | `{ id, method, params }` | JSON-RPC isteği |
| Plugin → Bridge | `{ id, result }` veya `{ id, error }` | JSON-RPC yanıtı |

**Mevcut handshake:**  
Connection açıldıktan sonra ilk mesaj olarak `ready` gönderilir; karşılığında `welcome` gelir. Bu bir uygulama seviyesi handshake’tir; TCP/HTTP upgrade sırasında doğrulama yok.

---

## 3. bridgeSecret ile Breaking Risk Analizi

### 3.1 verifyClient Davranışı

`ws` kütüphanesinde `verifyClient` **HTTP upgrade anında** çalışır; WebSocket bağlantısı kurulmadan ve hiç mesaj alınmadan önce:

```typescript
new WebSocketServer({
  server,
  verifyClient: (info, callback) => {
    const url = new URL(info.req.url!, `http://${info.req.headers.host}`);
    const secret = url.searchParams.get('bridgeSecret');
    const expected = process.env.FIGMA_BRIDGE_SECRET;
    if (!expected) return callback(true);  // Auth kapalı, herkese izin
    if (secret === expected) return callback(true);
    callback(false, 401, 'Unauthorized');
  }
});
```

Yani:
- Doğrulama sadece **URL query param** veya **HTTP header** ile yapılabilir.
- İlk mesaj (`ready`) henüz gelmediği için mesaj tabanlı auth verifyClient ile yapılamaz.

### 3.2 Plugin Ortamı — bridgeSecret Nasıl Alınır?

**Figma plugin iframe sandbox’ı:**
- `process.env` yok
- Sistem ortam değişkenlerine erişim yok
- Sadece `window`, `localStorage`, DOM, `fetch` vb. var
- Plugin kodu Figma tarafından yüklenen statik HTML/JS; build sırasında env inject edilemez (Figma build sistemi env desteklemez)

**Olası mekanizmalar:**

| Yöntem | Açıklama | Uygulanabilirlik |
|--------|----------|------------------|
| 1. UI input | Host/port gibi Secret alanı eklemek | ✅ En pratik yol. Kullanıcı `.env` veya config’ten kopyalar |
| 2. localStorage | Secret’ı bir kez girip saklamak | ✅ UI input ile birlikte kullanılabilir |
| 3. HTTP endpoint | Bridge’in `/auth?getSecret=...` benzeri endpoint’i | ⚠️ Localhost’ta herkes erişebilir, tek başına güvenlik sağlamaz |
| 4. Manifest / build | Secret’ı build’e gömmek | ❌ Güvenlik açığı, kaynak koda girer |

**Öneri:** Secret için UI’da (host/port’un yanında) opsiyonel bir input; varsa `localStorage` ile saklanır ve WebSocket URL’sine query param olarak eklenir.

### 3.3 verifyClient Kırılma Senaryoları

**A. `FIGMA_BRIDGE_SECRET` tanımlı, plugin eski:**
- Plugin `ws://localhost:5454` ile bağlanır, query param göndermez
- verifyClient `bridgeSecret` bulamaz → `callback(false)` → 401
- Bağlantı reddedilir → **breaking change**

**B. `FIGMA_BRIDGE_SECRET` tanımlı, plugin yeni ve secret doğru:**
- Plugin `ws://localhost:5454?bridgeSecret=xxx` ile bağlanır
- verifyClient onaylar → bağlantı kurulur
- Mevcut akış değişmez → **uyumlu**

**C. `FIGMA_BRIDGE_SECRET` tanımsız:**
- verifyClient `if (!expected) return callback(true)` ile herkesi kabul eder
- Eski plugin davranışı korunur → **geriye dönük uyumlu**

### 3.4 Diğer WebSocket Client’lar

| Bileşen | WebSocket’e bağlanıyor mu? | Nasıl çalışıyor? |
|---------|---------------------------|-------------------|
| **Figma plugin UI** | ✅ Evet | Doğrudan `ws://host:port` |
| **PluginBridgeConnector** | ❌ Hayır | Server tarafında `this.client` üzerinden gelen bağlantıya istek gönderir |
| **FigmaDesktopConnector** | ❌ Hayır | Puppeteer ile plugin UI iframe’ine erişir; iframe’deki WebSocket zaten plugin tarafından kurulur |
| **local / MCP server** | ❌ Hayır | Bridge server’ı başlatır; client tarafı sadece plugin |

Sonuç: WebSocket’e bağlanan tek client **Figma plugin** (ui.html).

---

## 4. Plugin Manifest — networkAccess

```json
"networkAccess": {
  "allowedDomains": [
    "http://localhost:5454", "ws://localhost:5454",
    ...
    "http://localhost:5470", "ws://localhost:5470"
  ]
}
```

Query string kullanımı için:
- `ws://localhost:5454?bridgeSecret=xxx` aynı domain altında sayılır
- Figma `allowedDomains` sadece origin/host kısmına bakar; query parametreleri genelde kabul edilir
- Şüphe varsa test edilmeli

---

## 5. FigmaDesktopConnector ve WebSocket

`figma-desktop-connector.ts` WebSocket’e doğrudan bağlanmaz:
- Puppeteer ile Figma sayfasındaki iframe’lere erişir
- Plugin UI iframe’inde `window.executeCode()`, `window.refreshVariables()` vb. çağırır
- Bu iframe’deki WebSocket client plugin UI’a ait; connector sadece UI fonksiyonlarını tetikler

Puppeteer senaryosunda:
- Önce Figma Desktop açılır, plugin çalışır
- Plugin UI WebSocket ile bridge’e bağlanır
- MCP/Bridge, Puppeteer üzerinden bu UI fonksiyonlarını çağırır
- bridgeSecret eklenirse, plugin UI’daki WebSocket client’ın secret’ı URL’e eklemesi gerekir

---

## 6. Güvenli Uygulama Önerisi

### 6.1 Sunucu (plugin-bridge-server.ts)

```typescript
const bridgeSecret = process.env.FIGMA_BRIDGE_SECRET;

this.wss = new WebSocketServer({
  server,
  verifyClient: (info, callback) => {
    if (!bridgeSecret) {
      return callback(true);  // Auth kapalı → geriye dönük uyumlu
    }
    const url = new URL(info.req.url || '', `http://${info.req.headers.host}`);
    const secret = url.searchParams.get('bridgeSecret');
    if (secret === bridgeSecret) {
      return callback(true);
    }
    callback(false, 401, 'Unauthorized');
  },
});
```

### 6.2 Plugin (ui.html)

1. Secret için opsiyonel input ekle (host/port’un altında)
2. `localStorage` key: `f-mcp-bridge-secret`
3. URL oluştururken:

```javascript
function getMcpBridgeSecret() {
  var el = document.getElementById('mcp-secret');
  return (el?.value || localStorage.getItem('f-mcp-bridge-secret') || '').trim();
}

var url = 'ws://' + host + ':' + port;
var secret = getMcpBridgeSecret();
if (secret) url += '?bridgeSecret=' + encodeURIComponent(secret);
mcpBridgeWs = new WebSocket(url);
```

### 6.3 Geriye Dönük Uyumluluk

| Senaryo | Sonuç |
|---------|-------|
| `FIGMA_BRIDGE_SECRET` yok | Auth devre dışı, eski plugin çalışır |
| `FIGMA_BRIDGE_SECRET` var + eski plugin | Bağlantı reddedilir; plugin güncellenmeli veya secret kaldırılmalı |
| `FIGMA_BRIDGE_SECRET` var + yeni plugin + secret boş | Bağlantı reddedilir (beklenen davranış) |
| `FIGMA_BRIDGE_SECRET` var + yeni plugin + secret doğru | Çalışır |

### 6.4 Dağıtım Stratejisi

1. Önce sadece sunucuya verifyClient eklenir; `FIGMA_BRIDGE_SECRET` tanımsızsa hiçbir şey değişmez
2. Plugin’e secret input eklenir
3. Kullanıcıya dokümantasyon: “Güvenlik istiyorsanız `FIGMA_BRIDGE_SECRET` tanımlayın ve plugin UI’da aynı değeri girin”

---

## 7. Özet Tablo

| Soru | Cevap |
|------|-------|
| verifyClient mevcut akışı bozar mı? | `FIGMA_BRIDGE_SECRET` **tanımsızken** hayır; tanımlı iken sadece secret gönderen client’lar bağlanır |
| Plugin env’e erişebilir mi? | Hayır; secret UI input veya benzeri bir mekanizmayla sağlanmalı |
| Secret nasıl iletilmeli? | Query param: `?bridgeSecret=xxx` (verifyClient sadece HTTP upgrade sırasında erişebilir) |
| Başka WebSocket client var mı? | Hayır; sadece Figma plugin UI |
| Desktop connector etkilenir mi? | Dolaylı: Plugin UI WebSocket’e bağlanamazsa connector da çalışmaz |
| Manifest güncellemesi gerekir mi? | Query string için büyük ihtimalle hayır; ihtiyaç halinde test edilmeli |

**Sonuç:** `FIGMA_BRIDGE_SECRET` opsiyonel tutulduğu ve plugin UI’a secret desteği eklendiği sürece, WebSocket auth eklemek mevcut kullanımı bozmaz ve geriye dönük uyumlu kalır.
