# F-MCP ATezer Bridge Plugin – MCP'ye Bağlantı Rehberi

Bu doküman, **F-MCP ATezer Bridge** plugin'inin **Model Context Protocol (MCP)** sunucusuna nasıl bağlandığını ve Claude/Cursor gibi AI asistanlarıyla nasıl kullanılacağını açıklar.

---

## Design Mode vs Dev Mode – MCP Çalışmasına Engel Değil

**Design seat (tasarım koltuğu) olmayan, yalnızca Dev Mode erişimi olan kullanıcılar da bu MCP'yi kullanabilir.**

| Konu | Açıklama |
|------|----------|
| **Plugin nerede çalışır?** | Plugin manifest'te `"editorType": ["figma", "dev"]` tanımlı; hem **Design (Figma)** hem **Dev Mode** editöründe çalışır. |
| **MCP bağlantısı** | İki yol: **(1) WebSocket (port 5454)** – plugin, MCP sunucusuna bağlanır; Figma’yı debug portu ile açmanız gerekmez. **(2) CDP (port 9222)** – isteğe bağlı; console log vb. için. Design/Dev Mode fark etmez. |
| **Design seat gerekli mi?** | **Hayır.** Dev Mode erişiminiz varsa dosyayı Dev Mode'da açar, plugin'i çalıştırırsınız; MCP bağlantısı ve **okuma** işlemleri çalışır. |
| **Sadece Dev Mode'da neler çalışır?** | Variables/component **okuma**, console log izleme, screenshot, design system verisi alma vb. tüm **read-only** MCP araçları çalışır. |
| **Yazma işlemleri** | Variable güncelleme, node oluşturma, `figma_execute` ile dokümana yazma gibi işlemler Figma tarafında **Design (düzenleme)** izni gerektirebilir; Dev Mode'da bazı yazmalar kısıtlı olabilir. Bu, MCP'nin "bağlanmasını" engellemez; sadece ilgili araç çağrısı Figma'da reddedilebilir. |

**Özet:** Design / Dev mod farkı MCP'nin çalışmasına engel değildir. **Debug portu (9222) zorunlu değildir:** plugin, WebSocket (5454) ile MCP'ye bağlanabilir; Figma'yı normal açmanız yeterli. 9222 yalnızca console log izleme gibi ek özellikler için isteğe bağlıdır.

---

## 1. Genel Bakış

### Bileşenler

| Bileşen | Açıklama |
|--------|----------|
| **Figma Desktop** | Figma masaüstü uygulaması. Debug portu (9222) **isteğe bağlı**; plugin-only modda Figma’yı normal açar, plugin WebSocket ile MCP’ye bağlanır. |
| **F-MCP ATezer Bridge (Plugin)** | Figma içinde çalışan plugin; Variables API, component bilgisi ve tasarım işlemlerini **plugin UI** üzerinden (postMessage + isteğe bağlı WebSocket) MCP’ye açar. |
| **MCP Sunucusu (F-MCP ATezer / figma-mcp-bridge)** | Node.js uygulaması; **WebSocket (5454)** ile plugin UI’dan veri alır (önerilen). İsteğe bağlı olarak CDP (9222) ile de bağlanabilir. |
| **Claude / Cursor** | MCP client; `figma_get_variables`, `figma_execute` gibi araçları kullanarak Figma ile etkileşir. |

### Veri Akışı (Özet)

**Yol 1 – WebSocket (debug portu yok, önerilen):**  
Plugin UI → `ws://127.0.0.1:5454` → MCP sunucusu. Figma normal açılır; token gerekmez.

**Yol 2 – CDP (isteğe bağlı):**  
Figma 9222 ile açılır → MCP (Puppeteer) plugin iframe’e erişir → `window.__figmaVariablesData` / `requestComponentData` okunur.

```
Figma Plugin (code.js)     →  postMessage  →  Plugin UI (ui.html)
                                                      ↓
                                              window.__figmaVariablesData
                                              window.requestComponentData()
                                    ↓                           ↓
                         WebSocket (5454)              CDP / frame.evaluate() (9222, isteğe bağlı)
                                    ↓                           ↓
                              MCP Sunucusu  ←───────────────────┘
       ↓
MCP Tools (figma_get_variables, figma_execute, ...)
       ↓
Claude / Cursor
```

---

## 2. Mimari: Plugin MCP'ye Nasıl Bağlanır?

### 2.1 Bağlantı: WebSocket (önerilen) veya CDP (isteğe bağlı)

**WebSocket (port 5454):** Plugin çalışınca UI, MCP sunucusundaki bridge’e `ws://127.0.0.1:5454` ile bağlanır. Figma’yı **debug portu ile açmanız gerekmez**; variables, components, execute, screenshot bu yol ile çalışır. Token gerekmez.

**CDP (port 9222, isteğe bağlı):** Console log izleme vb. için Figma’yı CDP ile açabilirsiniz. MCP sunucusu **Puppeteer** ile `localhost:9222`’ye bağlanır.

- **Port:** Varsayılan `9222` (yalnızca CDP kullanıyorsanız)
- **Figma'yı CDP ile açma (macOS):**  
  `open -a "Figma" --args --remote-debugging-port=9222`
- **Kontrol:** Tarayıcıda `http://localhost:9222/json/version` açılabilir; yanıt alınıyorsa Figma CDP ile erişilebilir demektir.

### 2.2 Plugin'in İki Katmanı

Plugin iki parçadan oluşur:

1. **Plugin worker (code.js)**  
   - Figma Plugin API'ye erişir: `figma.variables`, `figma.getNodeByIdAsync`, `figma.ui.postMessage` vb.  
   - Veriyi **UI iframe**'e `figma.ui.postMessage()` ile gönderir.

2. **Plugin UI (ui.html)**  
   - Bir **iframe** içinde çalışır.  
   - Worker'dan gelen mesajlarla:
     - Variables verisini `window.__figmaVariablesData` ve `window.__figmaVariablesReady` üzerinden saklar.
     - Component istekleri için `window.requestComponentData(nodeId)` fonksiyonunu sunar.  
   - Bu iframe, Figma Desktop penceresinin bir parçası olduğu için Puppeteer ile açılan "sayfa" içinde bir **frame** olarak görünür.

### 2.3 MCP'nin Plugin UI'a Erişmesi

**WebSocket modunda:** MCP sunucusu 5454’te dinler; plugin UI bağlanınca RPC ile variables, getComponent, execute vb. istekleri alır. Figma’ya CDP ile bağlanmaya gerek yoktur.

**CDP modunda (isteğe bağlı):** MCP sunucusu:

1. Puppeteer ile `localhost:9222` üzerinden Figma Desktop'a bağlanır (tek "browser" / "page").
2. Bu sayfadaki **tüm frame'leri** (iframe'ler) listeler: `page.frames()`.
3. Her frame'de `window.__figmaVariablesData` ve `window.requestComponentData` varlığını kontrol eder.
4. Uygun frame'i bulunca `frame.evaluate(...)` ile veriyi okur veya fonksiyon çağırır.
5. Sonuçlar MCP araçları (ör. `figma_get_variables`, `figma_get_component`) ile AI asistanına iletilir.

Özet: Bağlantı **WebSocket (plugin → MCP)** veya **CDP (MCP → Figma iframe)** ile kurulur; plugin veriyi UI’da `window` ve isteğe bağlı WebSocket ile MCP’ye açar.

---

## 3. Kurulum: Plugin'i MCP'ye Bağlamak

### 3.1 Gereksinimler

- **Node.js** 18+
- **Figma Desktop** (tarayıcı değil)
- **F-MCP ATezer Bridge** plugin dosyaları: `manifest.json`, `code.js`, `ui.html`

### 3.2 Adım 1: Figma ve Plugin (debug portu isteğe bağlı)

**Plugin-only kullanacaksanız:** Figma’yı **normal** açın; Adım 2’ye geçin. Debug portu gerekmez.

**CDP (console log vb.) kullanacaksanız:** Figma’yı debug portu ile başlatın:

- **macOS:** `open -a "Figma" --args --remote-debugging-port=9222`
- **Windows:** `start figma://--remote-debugging-port=9222`  
Figma’da **Plugins → Development → Use Developer VM** açık olsun.

### 3.3 Adım 2: Plugin'i Figma'ya Yüklemek

1. Figma Desktop'ı açın.
2. **Plugins → Development → Import plugin from manifest...**
3. **F-MCP ATezer Bridge** için `manifest.json` dosyasının yolunu seçin (örn. `f-mcp-bridge/f-mcp-plugin/manifest.json`).
4. Plugin listede **Development** altında "F-MCP ATezer Bridge" olarak görünür.

### 3.4 Adım 3: Plugin'i Çalıştırmak

1. Kullanmak istediğiniz Figma dosyasını açın (Design veya Dev Mode fark etmez).
2. **Plugins → Development → F-MCP ATezer Bridge** ile plugin'i çalıştırın.
3. Plugin UI penceresinde "✓ F-MCP ATezer Bridge active" / "MCP … connecting" benzeri bir durum görünür; variables yüklendikten sonra MCP bu iframe'den veri okuyabilir.

**Dev Mode kullanıcıları (design seat yok):** Dosyayı Dev Mode'da açıp aynı menüden plugin'i çalıştırmanız yeterli; MCP bağlantısı ve okuma araçları çalışır.

Plugin açık kaldığı sürece MCP, bu iframe'i bulup `window.__figmaVariablesData` ve `window.requestComponentData` üzerinden bağlantıyı kullanır.

### 3.5 Adım 4: MCP Sunucusunu Çalıştırmak

**Plugin-only (debug yok, token yok):**  
`npm run build:local` sonra Claude config’te `args`: **`dist/local-plugin-only.js`** kullanın.

**Tam mod (CDP/console dahil):**  
`npm run build:local` ve `npm run dev:local` veya `node dist/local.js`; Claude config’te `args`: **`dist/local.js`**.

**Claude Desktop ile kullanım:**  
`claude_desktop_config.json` içinde MCP sunucusunu tanımlayın (aşağıda örnek var).

### 3.6 Adım 5: Claude Desktop'ta MCP'yi Tanımlamak

Config konumu (macOS):  
`~/Library/Application Support/Claude/claude_desktop_config.json`

Örnek ekleme:

**Plugin-only (önerilen):**
```json
"figma-mcp-bridge": {
  "command": "node",
  "args": ["/ABSOLUTE/PATH/TO/figma-mcp-bridge/dist/local-plugin-only.js"]
}
```

**Tam mod (CDP/console dahil):**
```json
"figma-mcp-bridge": {
  "command": "node",
  "args": ["/ABSOLUTE/PATH/TO/figma-mcp-bridge/dist/local.js"]
}
```
`/ABSOLUTE/PATH/TO/` kısmını kendi proje yolunuzla değiştirin. Claude Desktop'ı yeniden başlatın.

---

## 4. Plugin ↔ MCP Veri Sözleşmeleri

### 4.1 Variables (Önceden Yüklenen)

- **Plugin worker:**  
  `figma.variables.getLocalVariablesAsync()` / `getLocalVariableCollectionsAsync()` çağrılır, sonuç `figma.ui.postMessage({ type: 'VARIABLES_DATA', data: ... })` ile UI'a gönderilir.
- **Plugin UI:**  
  `VARIABLES_DATA` gelince `window.__figmaVariablesData = msg.data`, `window.__figmaVariablesReady = true` yapılır.
- **MCP:**  
  WebSocket modunda: bridge RPC ile UI’dan veri alır. CDP modunda: uygun frame'de `frame.evaluate('window.__figmaVariablesData')` çağrılır; dönen obje `figma_get_variables` cevabında kullanılır.

### 4.2 Component (İstek Üzerine)

- **Plugin UI:**  
  `window.requestComponentData(nodeId)` tanımlıdır; worker'a `GET_COMPONENT` mesajı gönderir, gelen `COMPONENT_DATA` / `COMPONENT_ERROR` ile Promise resolve/reject edilir.
- **Plugin worker:**  
  `GET_COMPONENT` gelince `figma.getNodeByIdAsync(nodeId)` ile node alınır, component metadata (description vb.) `postMessage` ile UI'a gönderilir.
- **MCP:**  
  WebSocket modunda: bridge RPC ile UI’da `requestComponentData(nodeId)` çağrılır. CDP modunda: `frame.evaluate('window.requestComponentData("' + nodeId + '")')` kullanılır; sonuç `figma_get_component` vb. araçlarda döner.

### 4.3 Diğer İşlemler (Execute, Variable CRUD, vb.)

- **Plugin UI:**  
  `executeCodeViaUI`, variable güncelleme vb. için worker'a mesaj gönderir (`EXECUTE_CODE`, `UPDATE_VARIABLE` vb.), cevabı yine `postMessage` ile alır.
- **MCP:**  
  WebSocket modunda: bridge RPC ile UI’da execute/update fonksiyonları çağrılır. CDP modunda: `FigmaDesktopConnector` iframe'de `frame.evaluate(...)` ile aynı fonksiyonları çağırır; sonuçlar MCP araçlarına (örn. `figma_execute`, `figma_update_variable`) dönüştürülür.

---

## 5. Özet: "Plugin MCP'ye Nasıl Bağlanır?"

**Önerilen (plugin-only):**  
1. **Figma Desktop** normal açılır (debug portu yok).  
2. **F-MCP ATezer Bridge** plugin'i yüklenir ve çalıştırılır → Plugin UI, MCP sunucusundaki WebSocket bridge’e (5454) bağlanır.  
3. MCP sunucusu **local-plugin-only.js** veya **local.js** ile çalışır; plugin’den gelen RPC’lerle variables, components, execute vb. işler.  
4. Claude/Cursor bu MCP araçlarını kullanır; **token gerekmez.**

**İsteğe bağlı (CDP):**  
1. Figma `--remote-debugging-port=9222` ile açılır.  
2. Plugin yüklenir ve çalıştırılır → UI iframe’de `window.__figmaVariablesData` / `requestComponentData` hazır olur.  
3. MCP (local.js) Puppeteer ile 9222’ye bağlanıp bu iframe’e erişir; console log izleme vb. kullanılabilir.

Plugin veriyi UI’da `window` ve WebSocket ile MCP’ye açar; bağlantı **WebSocket (önerilen)** veya **CDP (isteğe bağlı)** ile kurulur.

---

## 6. Sorun Giderme

| Belirti | Olası neden | Yapılacak |
|--------|--------------|-----------|
| "No plugin UI found with variables data" | Plugin çalışmıyor veya iframe henüz yüklenmedi | Plugin'i **Plugins → Development → F-MCP ATezer Bridge** ile açın; birkaç saniye bekleyin. |
| "Failed to connect to Figma Desktop" | CDP kullanıyorsanız: Figma 9222 ile başlatılmamış veya kapalı | **Plugin-only kullanın** (debug portu gerekmez) veya Figma'yı `--remote-debugging-port=9222` ile yeniden başlatın; `curl http://localhost:9222/json/version` ile kontrol edin. |
| Variables / component boş veya eski | Farklı dosyada veya plugin yeniden açılmadı | Doğru dosyada olduğunuzdan emin olun; plugin'i kapatıp tekrar açın. |
| MCP araçları "F-MCP ATezer Bridge plugin not found" diyor | Plugin iframe'i sayfada yok | Plugin'in gerçekten çalıştığını ve pencerenin açık kaldığını kontrol edin. |
| Variable/doküman yazma hatası (yalnızca Dev Mode) | Dev Mode'da doküman yazma kısıtlı | Okuma araçları çalışır; yazma için Design mod veya design seat gerekebilir. |

Bu rehber, custom-figma-mcp veya figma-mcp-bridge repolarında **"Plugin'in MCP'ye nasıl bağlanacağı"** sorusunun cevabı olarak kullanılabilir; Bitbucket reponuza aynen veya uyarlayarak ekleyebilirsiniz.
