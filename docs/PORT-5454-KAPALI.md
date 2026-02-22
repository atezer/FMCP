# Port 5454 "address already in use" (EADDRINUSE)

MCP sunucusu veya plugin bridge başlarken **5454** portu zaten kullanımdaysa `EADDRINUSE` hatası alırsınız.

## Hızlı çözüm

**1. 5454’ü kullanan süreci bulun:**
```bash
lsof -i :5454
```

**2. Çıkan listede PID (Process ID) sütunundaki numarayı alıp kapatın:**
```bash
kill <PID>
```
Örnek: `kill 12345`

**3. Birden fazla satır çıkarsa** hepsini kapatabilirsiniz veya sadece ilk PID’i kapatın; genelde tek process dinliyor olur.

**4. MCP / Claude’u tekrar başlatın.**

## Neden olur?

- Daha önce `npm run dev:local` çalıştırdıysanız ve terminali kapatmadan Claude/Cursor MCP’yi açtıysanız, 5454 zaten o process tarafından kullanılıyordur.
- Claude/Cursor MCP’yi birden fazla kez “reconnect” ettiğinizde bazen eski process hemen kapanmamış olabilir.

## Alternatif: Farklı port kullanmak

5454’ü başka bir uygulama sürekli kullanıyorsa, bridge’i farklı bir portta çalıştırabilirsiniz:

1. **MCP’yi farklı portta başlatın:**  
   `FIGMA_PLUGIN_BRIDGE_PORT=5455 node dist/local-plugin-only.js`  
   (veya config’te bu env var’ı 5455 yapacak şekilde ayarlayın.)

2. **Plugin’in bağlanacağı portu değiştirin:**  
   `f-mcp-plugin/manifest.json` içinde `allowedDomains`’e `http://localhost:5455` ve `ws://localhost:5455` ekleyin.  
   `f-mcp-plugin/ui.html` içinde `MCP_BRIDGE_WS_PORT = 5455` yapın.

Bu şekilde hem MCP hem plugin aynı portu (5455) kullanır.
