# Figma Desktop Bridge Plugin – MCP'ye Bağlantı Rehberi

Bu doküman, **Figma Desktop Bridge** plugin'inin **Model Context Protocol (MCP)** sunucusuna nasıl bağlandığını ve Claude/Cursor gibi AI asistanlarıyla nasıl kullanılacağını açıklar.

---

## 1. Genel Bakış

### Bileşenler

| Bileşen | Açıklama |
|--------|----------|
| **Figma Desktop** | Figma masaüstü uygulaması; remote debugging portu (9222) ile dışarıdan erişilebilir. |
| **Figma Desktop Bridge (Plugin)** | Figma içinde çalışan plugin; Variables API, component bilgisi ve tasarım işlemlerini **plugin UI iframe** üzerinden dışarı açar. |
| **MCP Sunucusu (figma-console-mcp)** | Node.js uygulaması; Chrome DevTools Protocol (CDP) ile Figma Desktop’a bağlanır, plugin UI’daki veriyi okur ve MCP araçları sunar. |
| **Claude / Cursor** | MCP client; `figma_get_variables`, `figma_execute` gibi araçları kullanarak Figma ile etkileşir. |

### Veri Akışı (Özet)

```
Figma Plugin (code.js)     →  postMessage  →  Plugin UI (ui.html)
                                                      ↓
                                              window.__figmaVariablesData
                                              window.requestComponentData()
                                                      ↓
MCP Sunucusu (Puppeteer)   ←  frame.evaluate()  ←  Figma Desktop (CDP port 9222)
       ↓
MCP Tools (figma_get_variables, figma_execute, ...)
       ↓
Claude / Cursor
```

---

## 2. Mimari: Plugin MCP’ye Nasıl Bağlanır?

### 2.1 Figma Desktop’ın CDP ile Açılması

Figma, Chromium/Electron tabanlı olduğu için **Chrome Remote Debugging Protocol (CDP)** ile dışarıdan kontrol edilebilir. MCP sunucusu buna **Puppeteer** ile bağlanır.

- **Port:** Varsayılan `9222`
- **Figma’yı açma (macOS):**  
  `open -a "Figma" --args --remote-debugging-port=9222`
- **Kontrol:** Tarayıcıda `http://localhost:9222/json/version` açılabilir; yanıt alınıyorsa Figma CDP ile erişilebilir demektir.

### 2.2 Plugin’in İki Katmanı

Plugin iki parçadan oluşur:

1. **Plugin worker (code.js)**  
   - Figma Plugin API’ye erişir: `figma.variables`, `figma.getNodeByIdAsync`, `figma.ui.postMessage` vb.  
   - Veriyi **UI iframe**’e `figma.ui.postMessage()` ile gönderir.

2. **Plugin UI (ui.html)**  
   - Bir **iframe** içinde çalışır.  
   - Worker’dan gelen mesajlarla:
     - Variables verisini `window.__figmaVariablesData` ve `window.__figmaVariablesReady` üzerinden saklar.
     - Component istekleri için `window.requestComponentData(nodeId)` fonksiyonunu sunar.  
   - Bu iframe, Figma Desktop penceresinin bir parçası olduğu için Puppeteer ile açılan “sayfa” içinde bir **frame** olarak görünür.

### 2.3 MCP’nin Plugin UI’a Erişmesi

MCP sunucusu:

1. Puppeteer ile `localhost:9222` üzerinden Figma Desktop’a bağlanır (tek “browser” / “page”).
2. Bu sayfadaki **tüm frame’leri** (iframe’ler) listeler: `page.frames()`.
3. Her frame’de şunları kontrol eder:
   - Variables için:  
     `window.__figmaVariablesData !== undefined && window.__figmaVariablesReady === true`
   - Component için:  
     `typeof window.requestComponentData === "function"`
4. Uygun frame’i bulunca:
   - Variables: `frame.evaluate('window.__figmaVariablesData')` ile veriyi alır.
   - Component: `frame.evaluate('window.requestComponentData(nodeId)')` ile isteği yapar, sonucu döndürür.
5. Bu sonuçlar MCP araçlarının cevabı olarak (ör. `figma_get_variables`, `figma_get_component`) AI asistanına iletilir.

Yani **bağlantı**, “MCP → Figma Desktop (CDP) → Plugin UI iframe → window objesi” zinciriyle kurulur; plugin’in MCP’ye bağlanması aslında **MCP’nin bu iframe’e CDP üzerinden erişmesi** ile olur.

---

## 3. Kurulum: Plugin’i MCP’ye Bağlamak

### 3.1 Gereksinimler

- **Node.js** 18+
- **Figma Desktop** (tarayıcı değil)
- **Figma Desktop Bridge** plugin dosyaları: `manifest.json`, `code.js`, `ui.html`

### 3.2 Adım 1: Figma Desktop’ı CDP Portu ile Başlatmak

**macOS:**

```bash
open -a "Figma" --args --remote-debugging-port=9222
```

**Windows:**

```cmd
start figma://--remote-debugging-port=9222
```

Figma’da: **Plugins → Development → Use Developer VM** seçeneğinin açık olduğundan emin olun.

### 3.3 Adım 2: Plugin’i Figma’ya Yüklemek

1. Figma Desktop’ı açın.
2. **Plugins → Development → Import plugin from manifest...**
3. **Figma Desktop Bridge** için `manifest.json` dosyasının yolunu seçin (örn. `figma-console-mcp/figma-desktop-bridge/manifest.json`).
4. Plugin listede **Development** altında “Figma Desktop Bridge” olarak görünür.

### 3.4 Adım 3: Plugin’i Çalıştırmak

1. Kullanmak istediğiniz Figma dosyasını açın.
2. **Plugins → Development → Figma Desktop Bridge** ile plugin’i çalıştırın.
3. Plugin UI penceresinde “✓ Desktop Bridge active” / “MCP … connecting” benzeri bir durum görünür; variables yüklendikten sonra MCP bu iframe’den veri okuyabilir.

Plugin açık kaldığı sürece MCP, bu iframe’i bulup `window.__figmaVariablesData` ve `window.requestComponentData` üzerinden bağlantıyı kullanır.

### 3.5 Adım 4: MCP Sunucusunu Çalıştırmak

**Yerel (geliştirme):**

```bash
cd figma-console-mcp
npm install
npm run build
npm run dev:local
```

**Claude Desktop ile kullanım:**  
`claude_desktop_config.json` içinde MCP sunucusunu tanımlayın (aşağıda örnek var).

### 3.6 Adım 5: Claude Desktop’ta MCP’yi Tanımlamak

Config konumu (macOS):  
`~/Library/Application Support/Claude/claude_desktop_config.json`

Örnek ekleme:

```json
{
  "mcpServers": {
    "figma-console-mcp": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/figma-console-mcp/dist/local.js"]
    }
  }
}
```

`/ABSOLUTE/PATH/TO/` kısmını kendi `figma-console-mcp` klasörünüzün mutlak yolu ile değiştirin. Claude Desktop’ı yeniden başlatın.

---

## 4. Plugin ↔ MCP Veri Sözleşmeleri

### 4.1 Variables (Önceden Yüklenen)

- **Plugin worker:**  
  `figma.variables.getLocalVariablesAsync()` / `getLocalVariableCollectionsAsync()` çağrılır, sonuç `figma.ui.postMessage({ type: 'VARIABLES_DATA', data: ... })` ile UI’a gönderilir.
- **Plugin UI:**  
  `VARIABLES_DATA` gelince `window.__figmaVariablesData = msg.data`, `window.__figmaVariablesReady = true` yapılır.
- **MCP:**  
  `getVariablesFromPluginUI()` içinde uygun frame’de `frame.evaluate('window.__figmaVariablesData')` çağrılır; dönen obje `figma_get_variables` aracının cevabında kullanılır.

### 4.2 Component (İstek Üzerine)

- **Plugin UI:**  
  `window.requestComponentData(nodeId)` tanımlıdır; worker’a `GET_COMPONENT` mesajı gönderir, gelen `COMPONENT_DATA` / `COMPONENT_ERROR` ile Promise resolve/reject edilir.
- **Plugin worker:**  
  `GET_COMPONENT` gelince `figma.getNodeByIdAsync(nodeId)` ile node alınır, component metadata (description vb.) `postMessage` ile UI’a gönderilir.
- **MCP:**  
  `getComponentFromPluginUI(nodeId)` içinde `frame.evaluate('window.requestComponentData("' + nodeId + '")')` çağrılır; dönen Promise sonucu `figma_get_component` vb. araçlarda kullanılır.

### 4.3 Diğer İşlemler (Execute, Variable CRUD, vb.)

- **Plugin UI:**  
  `executeCodeViaUI`, variable güncelleme vb. için worker’a mesaj gönderir (`EXECUTE_CODE`, `UPDATE_VARIABLE` vb.), cevabı yine `postMessage` ile alır.
- **MCP:**  
  `FigmaDesktopConnector` aynı iframe’de `frame.evaluate(...)` ile bu UI fonksiyonlarını çağırır; sonuçlar MCP araçlarına (örn. `figma_execute`, `figma_update_variable`) dönüştürülür.

---

## 5. Özet: “Plugin MCP’ye Nasıl Bağlanır?”

1. **Figma Desktop**, `--remote-debugging-port=9222` ile açılır → CDP erişilebilir olur.  
2. **Figma Desktop Bridge** plugin’i Figma’da yüklenir ve bir dosyada **çalıştırılır** → Plugin UI iframe’i oluşur ve `window.__figmaVariablesData` / `window.requestComponentData` doldurulur.  
3. **MCP sunucusu** Puppeteer ile `localhost:9222`’ye bağlanır → Aynı Figma sayfasındaki frame’ler arasında bu iframe’i bulur.  
4. **MCP araçları** bu frame’de `evaluate()` ile veriyi okur veya fonksiyon çağırır → Claude/Cursor bu araçları kullanarak plugin’e dolaylı olarak “bağlanmış” olur.

Yani plugin doğrudan MCP’ye TCP/HTTP ile bağlanmaz; **MCP, Figma Desktop’a CDP ile bağlanıp plugin’in UI iframe’ine erişerek** bağlantıyı kurar. Plugin’in yapması gereken tek şey, veriyi UI’da `window` üzerinden erişilebilir hale getirmek ve MCP tarafında da bu pencereye Puppeteer ile bağlanmış olmaktır.

---

## 6. Sorun Giderme

| Belirti | Olası neden | Yapılacak |
|--------|--------------|-----------|
| “No plugin UI found with variables data” | Plugin çalışmıyor veya iframe henüz yüklenmedi | Plugin’i **Plugins → Development → Figma Desktop Bridge** ile açın; birkaç saniye bekleyin. |
| “Failed to connect to Figma Desktop” | Figma 9222 ile başlatılmamış veya kapalı | Figma’yı `--remote-debugging-port=9222` ile yeniden başlatın; `curl http://localhost:9222/json/version` ile kontrol edin. |
| Variables / component boş veya eski | Farklı dosyada veya plugin yeniden açılmadı | Doğru dosyada olduğunuzdan emin olun; plugin’i kapatıp tekrar açın. |
| MCP araçları “Desktop Bridge plugin not found” diyor | Plugin iframe’i sayfada yok | Plugin’in gerçekten çalıştığını ve pencerenin açık kaldığını kontrol edin. |

Bu rehber, custom-figma-mcp veya figma-console-mcp repolarında **“Plugin’in MCP’ye nasıl bağlanacağı”** sorusunun cevabı olarak kullanılabilir; Bitbucket reponuza aynen veya uyarlayarak ekleyebilirsiniz.
