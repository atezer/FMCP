# F-MCP ATezer (Figma MCP Bridge) – Claude Desktop Kurulum Rehberi

## ✅ Kurulum Tamamlandı!

### 📁 Proje Konumu
Proje klasörü (clone ettiğiniz yer, örn.):
```
/Users/abdussamed.tezer/FCM/f-mcp-bridge
```
veya repoyu `figma-mcp-bridge` adıyla klonladıysanız:
```
/Users/abdussamed.tezer/FCM/figma-mcp-bridge
```

### 🔧 Claude Desktop Konfigürasyonu
Config dosyası: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Plugin-only mod (önerilen: debug portu yok, REST token yok, Puppeteer yok):**
```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "node",
      "args": ["/Users/abdussamed.tezer/FCM/f-mcp-bridge/dist/local-plugin-only.js"]
    }
  }
}
```

**NPX (repo indirmeden, plugin-only binary):**
```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": ["-y", "@atezer/figma-mcp-bridge@latest", "figma-mcp-bridge-plugin"]
    }
  }
}
```

**Tam mod (CDP + plugin, `--remote-debugging-port=9222`, REST token, Puppeteer):**
```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "node",
      "args": ["/Users/abdussamed.tezer/FCM/f-mcp-bridge/dist/local.js"]
    }
  }
}
```
`/Users/abdussamed.tezer/FCM/f-mcp-bridge` kısmını kendi proje yolunuzla değiştirin.

---

## 🚀 Kullanım Adımları

### Seçenek A: Plugin-only mod (debug portu gerekmez)
1. **Build alın** (bir kez): `cd <proje> && npm run build:local`
2. Claude config’te `local-plugin-only.js` kullanın (yukarıdaki “Plugin-only mod” örneği).
3. Figma’yı **normal** açın (özel port gerekmez).
4. Figma’da: **Plugins → Development → F-MCP ATezer Bridge** ile plugin’i çalıştırın; “ready” / “Bridge active” görünene kadar bekleyin.
5. Claude’u yeniden başlatın; araçları kullanabilirsiniz.

### Seçenek B: Tam mod (CDP + plugin, console/screenshot vb.)
1. **Figma Desktop’u remote debugging ile başlatın:**
   ```bash
   open -a "Figma" --args --remote-debugging-port=9222
   ```
2. **Figma ayarları:** Plugins → Development → **Use Developer VM** ✅
3. **Plugin’i çalıştırın:** Plugins → Development → **F-MCP ATezer Bridge** → “Bridge active” görünsün.
4. **Claude Desktop’u yeniden başlatın**; sağ altta 🔌 MCP ikonunu kontrol edin.
5. **Test:** Claude’da örn. “Figma’daki variable’ları listele” veya “Figma durumunu kontrol et”.

---

## 🎯 Özellikler

### Kullanılabilir araçlar (özet)

| Araç | Açıklama |
|------|----------|
| `figma_get_status` | Bağlantı / Figma durumunu kontrol et |
| `figma_get_console_logs` | Console loglarını getir |
| `figma_take_screenshot` | Ekran görüntüsü al |
| `figma_get_variables` | Design variable’ları çıkar |
| `figma_get_component` | Komponent verisi (açıklama dahil) |
| `figma_search_components` | Komponent ara |
| `figma_execute` | Figma Plugin API kodu çalıştır |
| `figma_get_file_data` | Dosya yapısı / design system özeti |

Tüm araçlar: proje içi `docs/TOOLS.md`.

### F-MCP ATezer Bridge plugin (önerilen)
1. **Plugins → Development → Import plugin from manifest**
2. Dosya: `<proje>/f-mcp-plugin/manifest.json`
3. Figma’da: **Plugins → Development → F-MCP ATezer Bridge** ile çalıştırın.

#### Otomatik başlatma (isteğe bağlı)
Plugin’i Figma açıldığında otomatik çalıştırmak için:
```bash
cd /Users/abdussamed.tezer/FCM/f-mcp-bridge/scripts
./install-autorun.sh
```
- Test: `./test-autorun.sh`
- Kaldırma: `./uninstall-autorun.sh`  
Detay: `f-mcp-bridge/scripts/README.md`

---

## 🔍 Sorun Giderme

### MCP listelenmiyor
```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

### Figma’ya bağlanamıyor (tam mod)
```bash
curl http://localhost:9222/json/version
```
Yanıt yoksa Figma’yı `--remote-debugging-port=9222` ile yeniden başlatın.

### Build güncellemesi
```bash
cd /Users/abdussamed.tezer/FCM/f-mcp-bridge
npm run build:local
```

### Plugin “ready” olmuyor
- Plugin-only kullanıyorsanız: Claude (MCP sunucusu) açık olsun. Plugin artık 5454–5470 aralığında dinleyen portu otomatik dener; gerekirse **Advanced** bölümünden host/port elle girin.
- Tam mod: Figma’yı 9222 ile açtığınızdan ve **Use Developer VM**’in açık olduğundan emin olun.

### Port standardı (önerilen)
- Bridge portunu `FIGMA_MCP_BRIDGE_PORT` ile verin (geriye dönük olarak `FIGMA_PLUGIN_BRIDGE_PORT` da desteklenir).
- Cursor/Claude aynı makinedeyse her biri farklı port kullanmalı (ör. 5454 ve 5455); plugin doğru bridge’i otomatik bulur ve son başarılı portu hatırlar.

---

## 📚 Daha fazla bilgi

- **Proje:** [GitHub – atezer/figma-mcp-bridge](https://github.com/atezer/figma-mcp-bridge)
- **Dokümantasyon:** [docs/](https://github.com/atezer/figma-mcp-bridge/tree/main/docs) (SETUP, PLUGIN-MCP-BAGLANTI, TROUBLESHOOTING)
- **Plugin nasıl çalışır:** [PLUGIN-NASIL-CALISIR.md](f-mcp-bridge/docs/PLUGIN-NASIL-CALISIR.md) (Worker/UI, WebSocket vs CDP)
- **MCP protokolü:** [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

## 🎨 Örnek kullanım

- *“Figma’daki variable’ları listele”*
- *“Bu dosyadaki color variable’ları özetle”*
- *“Button componentini bul ve özelliklerini göster”*
- *“Mevcut Figma canvas’ından screenshot al”*
- *“Figma plugin’imdeki console.log mesajlarını göster”* (tam mod)

---
**Proje adı:** F-MCP ATezer (figma-mcp-bridge)  
**Sürüm:** 1.2.0 (`f-mcp-bridge/package.json` ile uyumlu)
