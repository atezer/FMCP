# F-MCP ATezer Bridge Plugin Nasıl Çalışır?

Plugin iki parçadan oluşur: **Worker** (`code.js`) ve **UI** (`ui.html`). Veri, Worker → UI → MCP arasında akar.

---

## 1. İki katman: Worker + UI

| Katman | Dosya | Görevi |
|--------|--------|--------|
| **Worker** | `code.js` | Figma API'ye erişir: variables, `figma.getNodeByIdAsync`, `figma.ui.postMessage` |
| **UI** | `ui.html` | Worker'dan gelen veriyi `window` üzerinde tutar; MCP tarafı buradan okur veya WebSocket ile istek atar |

Worker, Figma'nın plugin sandbox'ında çalışır; doğrudan dışarıya açılamaz. Bu yüzden her şeyi **postMessage** ile UI'a gönderir; UI hem `window` hem (isteğe bağlı) WebSocket ile MCP'ye köprü olur.

---

## 2. Variables (açılışta bir kez)

1. Plugin açılınca **Worker** (`code.js`):
   - `figma.variables.getLocalVariablesAsync()` ve `getLocalVariableCollectionsAsync()` çağırır.
   - Sonucu `figma.ui.postMessage({ type: 'VARIABLES_DATA', data: ... })` ile **UI**'a yollar.
2. **UI** (`ui.html`):
   - Bu mesajı alınca `window.__figmaVariablesData = data`, `window.__figmaVariablesReady = true` yapar.
3. **MCP tarafı** bu veriyi iki yoldan biriyle alır:
   - **CDP modu:** Puppeteer ile Figma sayfasındaki plugin iframe'ine girip `frame.evaluate('window.__figmaVariablesData')` çalıştırır.
   - **WebSocket modu:** Plugin UI, `ws://127.0.0.1:5454`'e bağlanır; MCP "variables getir" RPC'si gelince `window.__figmaVariablesData`'yı cevap olarak gönderir.

Yani variables akışı: **Figma API → Worker → postMessage → UI (window) → MCP (CDP veya WebSocket).**

---

## 3. Components (isteğe bağlı, her istekte)

1. MCP "şu nodeId'nin component bilgisini getir" der.
2. **CDP modunda:** MCP, plugin iframe'inde `frame.evaluate('window.requestComponentData("123:456")')` çağırır.
3. **WebSocket modunda:** MCP, 5454'teki bridge'e "getComponent" RPC'si yollar; UI bu isteği alır ve `window.requestComponentData(nodeId)` çağırır.
4. **UI** (`ui.html`):
   - `requestComponentData(nodeId)` → Worker'a `postMessage({ type: 'GET_COMPONENT', nodeId, requestId })` gönderir.
5. **Worker** (`code.js`):
   - `figma.getNodeByIdAsync(nodeId)` ile node'u alır, description vb. çıkarır.
   - `figma.ui.postMessage({ type: 'COMPONENT_DATA', requestId, data })` ile UI'a geri yollar.
6. UI, Promise'i resolve eder; cevap MCP'ye (CDP sonucu veya WebSocket cevabı olarak) döner.

Yani component akışı: **MCP isteği → UI (requestComponentData) → postMessage → Worker (getNodeByIdAsync) → postMessage → UI → MCP.**

---

## 4. İki bağlantı modu

### WebSocket bridge (port 5454)

- Figma'yı **debug portu olmadan** normal açarsın.
- MCP sunucusu (Claude açılınca) `localhost:5454`'te bir WebSocket sunucusu açar.
- Plugin UI, açılınca `ws://127.0.0.1:5454`'e bağlanır; "ready" yazınca köprü kurulmuş olur.
- Tüm istekler (variables, components, execute, screenshot vb.) bu WebSocket üzerinden gider.
- **Plugin-only** modda (`local-plugin-only.js`) sadece bu kullanılır; Figma token'a gerek yok.

### CDP (Chrome DevTools, port 9222)

- Figma'yı `--remote-debugging-port=9222` ile açarsın.
- MCP sunucusu Puppeteer ile bu porta bağlanır, plugin'in UI iframe'ini bulur.
- Variables için `window.__figmaVariablesData`, component için `window.requestComponentData(nodeId)` iframe içinde `evaluate` ile çağrılır.
- Console log, screenshot gibi özellikler de bu yolla kullanılır.

---

## 5. Özet akış şeması

```
[Claude / MCP client]
         │
         ▼
[MCP server: local.js veya local-plugin-only.js]
         │
    ┌────┴────┐
    │         │
    ▼         ▼
[CDP 9222]  [WebSocket 5454]
    │         │
    │         └──────────────► [Plugin UI (ui.html)] ◄──────┐
    │                        window.__figmaVariablesData    │
    │                        window.requestComponentData()   │ postMessage
    │                        ws → RPC getVariables,          │
    │                             getComponent, execute...   │
    └────────────────────────► [Plugin UI iframe]            │
         (Puppeteer evaluate)         │                      │
                                      └──────────────────────┘
                                               │
                                               ▼
                                    [Plugin Worker (code.js)]
                                    figma.variables, getNodeByIdAsync,
                                    figma.ui.postMessage
```

---

## Kısa özet

Plugin, Figma API'ye sadece Worker'dan erişir; veriyi postMessage ile UI'a taşır. UI hem `window` hem WebSocket (5454) ile MCP'ye açar. Variables açılışta yüklenir, components her istekte Worker'da `getNodeByIdAsync` ile alınır. Debug portu (9222) olmadan da WebSocket ile çalışır; token'sız "plugin-only" mod tamamen bu WebSocket köprüsüne dayanır.
