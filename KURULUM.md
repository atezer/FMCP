# F-MCP ATezer (Figma MCP Bridge) – Claude Desktop Kurulum Rehberi

## ✅ Kurulum Tamamlandı!

### 📁 Proje Konumu
Kaynak kod ve `dist/` çıktıları **depo kökündedir** (ayrı bir alt klasörde ikinci kopya yoktur). Proje klasörü (clone ettiğiniz yer, örn.):
```
/Users/abdussamed.tezer/FCM
```
veya repoyu `figma-mcp-bridge` adıyla klonladıysanız:
```
/Users/abdussamed.tezer/figma-mcp-bridge
```

### 🔄 Eski `f-mcp-bridge/` alt yolundan geçiş (başka makine veya eski kurulum)

Daha önce araçlar `…/FCM/f-mcp-bridge/dist/...` veya `…/f-mcp-bridge/scripts/...` gibi yollara işaret ediyorsa, **clone kökü** artık doğrudan `dist/`, `scripts/`, `f-mcp-plugin/` içeriyor; `f-mcp-bridge` segmenti kaldırıldı.

1. **Claude / Cursor MCP** — `~/Library/Application Support/Claude/claude_desktop_config.json` veya proje `.cursor/mcp.json` içinde `args` dizisinde `.../f-mcp-bridge/dist/` geçiyorsa, `.../<clone-kökünüz>/dist/` olacak şekilde düzenleyin (örnek: `/Users/siz/FCM/dist/local-plugin-only.js`).

2. **Launch Agent (macOS, plugin otomatik çalıştırma)** — Repoyu güncelledikten sonra, clone kökünde:
   ```bash
   cd <clone-kökü>/scripts
   ./install-autorun.sh
   ```
   Bu komut `~/Library/LaunchAgents/com.figma.desktop-bridge.plist` dosyasını repodaki `scripts/com.figma.desktop-bridge.plist` ile **yeniden yükler**; plist içinde hâlâ eski `f-mcp-bridge` yolu kalmaz (şablon güncelse).

3. **Plist’te kendi kullanıcı yolunuz** — Repodaki `scripts/com.figma.desktop-bridge.plist` örnek bir kullanıcı yolu içerebilir. Sizin makinede farklıysa, `ProgramArguments` içindeki `autorun-bridge.sh` yolunu kendi `<clone-kökü>/scripts/autorun-bridge.sh` mutlak yolunuzla değiştirip ardından yine `./install-autorun.sh` çalıştırın.

4. **Figma Bridge Launcher.app** — `scripts/Figma Bridge Launcher.app` ile Accessibility’e ekleme yaptıysanız, güncel sürümü repodan tekrar kopyalayıp eskisinin üzerine yazın; gerekirse Sistem Ayarları → Gizlilik ve Güvenlik → Erişilebilirlik’te uygulamayı yeniden onaylayın.

### 🔧 Claude Desktop Konfigürasyonu
Config dosyası: `~/Library/Application Support/Claude/claude_desktop_config.json`

> **Önemli — sık görülen hatalar**
>
> | Sorun | Kontrol |
> |--------|---------|
> | Claude’da **Server disconnected** / logda `MODULE_NOT_FOUND` | `args` yolu **clone kökündeki** `dist/local-plugin-only.js` olmalı. `…/f-mcp-bridge/dist/…` **yanlış** (eski yapı); bu klasör çoğu kurulumda yoktur. |
> | `dist` yok | Depo kökünde `npm run build:local` çalıştırın. |
> | Plugin’de **MCP no server** | Bridge **hangi portta** dinliyorsa (varsayılan 5454 veya `FIGMA_PLUGIN_BRIDGE_PORT`) Figma plugin **Advanced → Port** ile **aynı** olmalı. İsterseniz `env` içindeki portu kaldırıp her iki tarafta 5454 kullanın. |
>
> Tam örnekler ve `env` açıklaması: [README.md](README.md#hızlı-başlangıç) Hızlı başlangıç bölümü

**Plugin-only mod (önerilen: debug portu yok, REST token yok, Puppeteer yok):**
```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "node",
      "args": ["/Users/abdussamed.tezer/FCM/dist/local-plugin-only.js"]
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
      "args": ["/Users/abdussamed.tezer/FCM/dist/local.js"]
    }
  }
}
```
`/Users/abdussamed.tezer/FCM` kısmını kendi proje yolunuzla değiştirin.

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
cd /Users/abdussamed.tezer/FCM/scripts
./install-autorun.sh
```
- Test: `./test-autorun.sh`
- Kaldırma: `./uninstall-autorun.sh`  
Detay: `scripts/README.md`

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
cd /Users/abdussamed.tezer/FCM
npm run build:local
```

### Sürüm takibi ve güncelleme notları

| Bilgi | Kaynak |
|-------|--------|
| Hangi sürümde olduğunuz | Depo kökünde `package.json` → `version` (ör. **1.6.2**) |
| Ne değişti | Kök [CHANGELOG.md](CHANGELOG.md) |
| Yayın bildirimi | GitHub [Releases](https://github.com/atezer/FMCP/releases) — depoyu izleyin (*Watch* → *Custom* → *Releases*) |
| npm paket sürümü | [@atezer/figma-mcp-bridge](https://www.npmjs.com/package/@atezer/figma-mcp-bridge) veya `npm view @atezer/figma-mcp-bridge version` |

**Repo ile kurduysanız (sil-yeniden-kur gerekmez):** `git pull` → gerekirse `npm install` → `npm run build:local` → Claude/Cursor’u yeniden başlatın. `f-mcp-plugin/` güncellendiyse Figma’da Development → ilgili plugin için manifest’i yeniden import edin veya plugin’i kapatıp açın.

**NPX ile kurduysanız:** Config’te `@atezer/figma-mcp-bridge@latest` kullanıyorsanız yeni npm sürümü yayınlandıktan sonra genelde bir sonraki `npx` çalıştırmasında indirilir; önbellek sorununda `npx clear-npx-cache` veya sürümü sabitleyin (`@1.2.0` gibi). Değişiklik listesi için [CHANGELOG.md](CHANGELOG.md) ve [Releases](https://github.com/atezer/FMCP/releases).

### Plugin “ready” olmuyor
- Plugin-only kullanıyorsanız: Claude (MCP sunucusu) açık olsun. Plugin artık 5454–5470 aralığında dinleyen portu otomatik dener; gerekirse **Advanced** bölümünden host/port elle girin.
- Port alanını bir kez değiştirip bağlanamıyorsanız plugin **tek porta kilitlenmiş** olabilir: **Otomatik tara** düğmesine basın veya **Advanced** panelini kapatıp tekrar **auto port** moduna dönün; Claude’daki bridge portu ile eşleştiğinden emin olun.
- Tam mod: Figma’yı 9222 ile açtığınızdan ve **Use Developer VM**’in açık olduğundan emin olun.

### Port standardı (önerilen)
- Bridge portunu `FIGMA_MCP_BRIDGE_PORT` ile verin (geriye dönük olarak `FIGMA_PLUGIN_BRIDGE_PORT` da desteklenir).
- Cursor/Claude aynı makinedeyse her biri farklı port kullanmalı (ör. 5454 ve 5455); plugin doğru bridge’i otomatik bulur ve son başarılı portu hatırlar.

---

## 📚 Daha fazla bilgi

- **Proje (kaynak):** [GitHub – atezer/FMCP](https://github.com/atezer/FMCP) — npm paketi `@atezer/figma-mcp-bridge` bu depodan üretilir.
- **Sürüm notları:** [CHANGELOG.md](CHANGELOG.md) · [GitHub Releases](https://github.com/atezer/FMCP/releases)
- **Dokümantasyon:** [docs/](https://github.com/atezer/FMCP/tree/main/docs) (SETUP, TOOLS, TROUBLESHOOTING)
- **Sorun giderme:** [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
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
**Sürüm:** 1.6.2 (`package.json` ile uyumlu)
