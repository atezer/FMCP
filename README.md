# Custom Figma MCP

Figma tasarım verilerini ve işlemlerini Model Context Protocol (MCP) ile AI asistanlarına (Claude, Cursor vb.) açan plugin ve bağlantı rehberi.

## Design / Dev Mode

**Design seat olmayan, sadece Dev Mode erişimi olan kullanıcılar da bu MCP'yi kullanabilir.** Plugin hem Design hem Dev Mode'da çalışır (`editorType: ["figma", "dev"]`). MCP bağlantısı için mod farkı engel değildir.

## Plugin'in MCP'ye Bağlanması (Özet)

1. **Figma Desktop'ı remote debugging ile açın**
   - macOS: `open -a "Figma" --args --remote-debugging-port=9222`
   - Figma → Plugins → Development → **Use Developer VM** açık olsun.

2. **Plugin'i yükleyin ve çalıştırın**
   - Plugins → Development → **Import plugin from manifest** → bu repodaki `figma-desktop-bridge/manifest.json` (veya [figma-console-mcp](https://github.com/southleft/figma-console-mcp) içindeki plugin klasörü)
   - Açtığınız dosyada: Plugins → Development → **Figma Desktop Bridge** ile plugin'i açın; "Desktop Bridge active" görünene kadar bekleyin.

3. **MCP sunucusunu başlatın**
   - [figma-console-mcp](https://github.com/southleft/figma-console-mcp) ile: `npm run build` sonra `npm run dev:local` veya `node dist/local.js`
   - MCP sunucusu, Figma Desktop'a port 9222 üzerinden (Puppeteer/CDP) bağlanır ve plugin UI iframe'inden veriyi okur.

4. **Claude Desktop'ta kullanın**
   - `~/Library/Application Support/Claude/claude_desktop_config.json` içine MCP sunucusunu ekleyin:
   ```json
   "mcpServers": {
     "figma-console-mcp": {
       "command": "node",
       "args": ["/FULL/PATH/TO/figma-console-mcp/dist/local.js"]
     }
   }
   ```
   - Claude'u yeniden başlatın; artık `figma_get_variables`, `figma_execute` vb. araçları kullanabilirsiniz.

## Detaylı Rehber

Plugin'in MCP ile nasıl konuştuğu, veri akışı, Design/Dev mode ve sorun giderme için:

- **[Plugin–MCP Bağlantı Rehberi](docs/PLUGIN-MCP-BAGLANTI.md)** (mimari, kurulum, sözleşmeler)

## Repo İçeriği

- `docs/` – Dokümantasyon (bağlantı rehberi)
- Plugin kaynağı için [figma-console-mcp](https://github.com/southleft/figma-console-mcp) repodaki `figma-desktop-bridge` klasörü kullanılabilir; veya bu repoda `figma-desktop-bridge/` varsa onu kullanın.
