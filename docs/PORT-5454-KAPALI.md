# Port 5454 meşgul veya EADDRINUSE

**5454** doluysa köprü artık **5454–5470** aralığında boş bir sonraki porta otomatik bağlanır (stderr’de `F-MCP bridge listening on ws://127.0.0.1:<port>`). Figma plugin’i otomatik port modunda bu porta uyum sağlar.

Hâlâ sorun yaşıyorsanız veya **tüm aralık doluysa** aşağıdaki adımlar geçerlidir.

## Hızlı çözüm (5454’ü veya kullanılan portu boşaltmak)

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

## Alternatif: Sabit farklı port (elle)

Otomatik yedekleme yerine veya **5454–5470 dışı** bir port istiyorsanız:

1. **MCP’yi o portta başlatın:**  
   `FIGMA_PLUGIN_BRIDGE_PORT=5455 node dist/local-plugin-only.js`  
   (veya Cursor/Claude MCP config’inde aynı env.)

2. **Plugin:** Gelişmiş panelde **Port** alanına aynı numarayı yazın (ör. 5455). `f-mcp-plugin/manifest.json` içinde **5454–5470** zaten listelenmiştir; bu aralık dışı bir port kullanıyorsanız `allowedDomains`’e `http://localhost:<port>` ve `ws://localhost:<port>` eklemeniz gerekir.
