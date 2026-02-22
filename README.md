# F-MCP ATezer (Figma MCP Bridge)

Figma tasarım verilerini ve işlemlerini Model Context Protocol (MCP) ile AI asistanlarına (Claude, Cursor vb.) açan MCP sunucusu ve Figma plugin’i. Bu repo hem sunucu hem **F-MCP ATezer Bridge** plugin kaynağını içerir.

## Nasıl açar ve bağlarsınız?

Plugin'in "ready" olması için **önce** 5454 portunda bir sunucu çalışıyor olmalı; **sonra** Figma'da plugin'i açarsınız.

### Adım 1: MCP bridge'i başlatın

Terminalde proje klasörüne gidip şu komutu çalıştırın (penceresi açık kalsın):

```bash
cd /Users/abdussamed.tezer/FCM/f-mcp-bridge
npm run dev:local
```

Çıktıda `Plugin bridge server listening` veya `5454` geçen bir satır görünene kadar bekleyin. Bu, plugin'in bağlanacağı sunucudur.

### Adım 2: Plugin'i Figma'da yükleyin (ilk seferde)

1. Figma'yı açın.
2. **Plugins** → **Development** → **Import plugin from manifest…**
3. Şu dosyayı seçin: `f-mcp-bridge/f-mcp-plugin/manifest.json`
4. Plugin listede "F-MCP ATezer Bridge" olarak görünür.

### Adım 3: Plugin'i çalıştırın

1. **Plugins** → **Development** → **F-MCP ATezer Bridge**
2. Plugin penceresi açılır. Birkaç saniye içinde:
   - **Yeşil nokta + "ready"** → Bağlantı tamam, MCP kullanılabilir.
   - **Kırmızı nokta + "no server"** → Adım 1'deki komut çalışmıyor; terminalde `npm run dev:local` ile bridge'i başlatıp tekrar deneyin.

### Özet sıra

| Sıra | Ne yapılır |
|------|------------|
| 1 | Terminalde `cd f-mcp-bridge && npm run dev:local` (açık kalsın) |
| 2 | Figma'da Plugins → Development → F-MCP ATezer Bridge |
| 3 | Plugin'de "ready" görününce Cursor/Claude üzerinden MCP kullanılabilir |

---

## Claude ile bağlama

### 1. Build (bir kez)

```bash
cd /Users/abdussamed.tezer/FCM/f-mcp-bridge
npm run build:local
```

### 2. Claude Desktop config

Config dosyası (macOS): **`~/Library/Application Support/Claude/claude_desktop_config.json`**

**Plugin-only (önerilen – debug portu yok):**
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

**Script "Permission denied" alıyorsanız** — proje dizininden çalıştırmak için `bash -c` kullanın:
```json
"figma-mcp-bridge": {
  "command": "bash",
  "args": ["-c", "cd /Users/abdussamed.tezer/FCM/f-mcp-bridge && exec node dist/local-plugin-only.js"]
}
```
(Yolu kendi proje yolunuzla değiştirin.)

**Tam mod (console log / screenshot için – Figma 9222 ile açılmalı):**
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

Yolu kendi proje klasörünüze göre değiştirin.

### 3. Sıra

| Plugin-only | Tam mod |
|-------------|---------|
| 1. Claude’u başlatın (MCP sunucusu 5454’ü açar) | 1. Terminalde `npm run dev:local` (açık kalsın) |
| 2. Figma’yı normal açın | 2. Figma’yı `--remote-debugging-port=9222` ile açın |
| 3. Figma’da Plugins → Development → **F-MCP ATezer Bridge** | 3. Figma’da plugini çalıştırın |
| 4. Plugin’de “ready” görününce Claude’da Figma araçlarını kullanın | 4. Claude’u başlatın; araçları kullanın |

**"Server disconnected"** olursa: (1) Port 5454 kapalı olmalı — `lsof -i :5454` ile bakın, `kill <PID>` ile kapatın. (2) **"Permission denied"** script için: config'te script yerine `bash -c` kullanın (aşağıdaki örnek). (3) Build: `npm run build:local`.

---

## Design / Dev Mode

**Design seat olmayan, sadece Dev Mode erişimi olan kullanıcılar da bu MCP'yi kullanabilir.** Plugin hem Design hem Dev Mode'da çalışır (`editorType: ["figma", "dev"]`). MCP bağlantısı için mod farkı engel değildir.

## Plugin'in MCP'ye Bağlanması (Özet)

**İki yol var; debug portu zorunlu değil.**

### Yol A: Plugin-only (önerilen – debug portu yok, token yok)

1. **Plugin'i yükleyin:** Plugins → Development → **Import plugin from manifest** → `f-mcp-plugin/manifest.json`
2. **MCP sunucusunu başlatın:** `npm run build:local` sonra Claude config'te **`dist/local-plugin-only.js`** kullanın (aşağıdaki örnek).
3. **Figma'yı normal açın** (özel port gerekmez). Plugins → Development → **F-MCP ATezer Bridge** ile plugin'i çalıştırın; "ready" / "Bridge active" görünene kadar bekleyin.
4. Claude üzerinden `figma_get_variables`, `figma_execute` vb. kullanın. Veri plugin → WebSocket (5454) → MCP ile gelir.

### Yol B: Tam mod (isteğe bağlı – console log için CDP)

1. **Figma'yı debug portu ile açın:** `open -a "Figma" --args --remote-debugging-port=9222` (isteğe bağlı; sadece console izleme vb. için).
2. Plugin'i yükleyin ve çalıştırın (yukarıdaki gibi).
3. MCP config'te **`dist/local.js`** kullanın; sunucu CDP (9222) veya önce WebSocket bridge'i dener.
4. Claude'u yeniden başlatın.

### Claude Desktop config

**Plugin-only (token yok):**
```json
"mcpServers": {
  "figma-mcp-bridge": {
    "command": "node",
    "args": ["/ABSOLUTE/PATH/TO/figma-mcp-bridge/dist/local-plugin-only.js"]
  }
}
```

**Tam mod (CDP/console dahil):**
```json
"mcpServers": {
  "figma-mcp-bridge": {
    "command": "node",
    "args": ["/ABSOLUTE/PATH/TO/figma-mcp-bridge/dist/local.js"]
  }
}
```
`/ABSOLUTE/PATH/TO/figma-mcp-bridge` kısmını proje yolunuzla değiştirin.

## Detaylı Rehber

Plugin'in MCP ile nasıl konuştuğu, veri akışı, Design/Dev mode ve sorun giderme için:

- **[Plugin–MCP Bağlantı Rehberi](docs/PLUGIN-MCP-BAGLANTI.md)** (mimari, kurulum, sözleşmeler)
- **[Plugin Nasıl Çalışır?](docs/PLUGIN-NASIL-CALISIR.md)** (Worker/UI akışı, WebSocket vs CDP)

## Repo İçeriği

- `f-mcp-plugin/` – F-MCP ATezer Bridge plugin kaynağı (manifest, code.js, ui.html)
- `docs/` – Kurulum, mod karşılaştırma, [Plugin nasıl çalışır](docs/PLUGIN-NASIL-CALISIR.md), sorun giderme
- `src/` – MCP sunucusu (local, plugin-only, Cloudflare Worker)

### Tüm dokümanlar (docs/)

| Dosya | Açıklama |
|-------|----------|
| [SETUP.md](docs/SETUP.md) | Kurulum (Remote / Local) |
| [PLUGIN-MCP-BAGLANTI.md](docs/PLUGIN-MCP-BAGLANTI.md) | Plugin–MCP mimari ve kurulum |
| [PLUGIN-NASIL-CALISIR.md](docs/PLUGIN-NASIL-CALISIR.md) | Plugin Worker/UI akışı |
| [MODE_COMPARISON.md](docs/MODE_COMPARISON.md) | Mod karşılaştırma |
| [TOOLS.md](docs/TOOLS.md) | MCP araçları referansı |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Sorun giderme |
| [NPX-INSTALLATION.md](docs/NPX-INSTALLATION.md) | NPX ile kurulum |
| [OAUTH_SETUP.md](docs/OAUTH_SETUP.md) | OAuth (remote sunucu) |
| [SELF_HOSTING.md](docs/SELF_HOSTING.md) | Kendi sunucunda host |
| [DEPLOYMENT_COMPARISON.md](docs/DEPLOYMENT_COMPARISON.md) | Dağıtım karşılaştırma |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Teknik mimari |
| [USE_CASES.md](docs/USE_CASES.md) | Örnek kullanım senaryoları |
| [RECONSTRUCTION_FORMAT.md](docs/RECONSTRUCTION_FORMAT.md) | Reconstruction format |
| [ROADMAP.md](docs/ROADMAP.md) | Geliştirme yol haritası |
| [BITBUCKET-README-Onerisi.md](docs/BITBUCKET-README-Onerisi.md) | Bitbucket README şablonu |

## Yaygınlaştırma: Organization (private) plugin

Çalışma biçimini ekip/organizasyon içinde kolaylaştırmak için **Figma Organization private plugin** olarak yayınlamak mantıklı bir ilk adım.

**Avantajlar:**
- Herkesin "Import plugin from manifest" yapması gerekmez; plugin organizasyonun plugin listesinde görünür.
- Sadece **Plugins** menüsünden (veya Resources → Plugins) ekleyip çalıştırırlar; MCP bridge’i (Claude config veya `npm run dev:local`) kendi makinede kurmaları yeterli.
- Review süreci yok (private plugin); yayınladıktan kısa süre sonra kullanılabilir.

**Gereksinimler:**
- Figma **Organization** veya **Enterprise** planı ([Figma: Create private organization plugins](https://help.figma.com/hc/en-us/articles/4404228629655-Create-private-organization-plugins)).
- Yayınlama: [Publish plugins](https://help.figma.com/hc/en-us/articles/360042293394) adımlarını izleyin; **Publish to** kısmında **organization**’ı seçin (Community değil).

**Özet:** Önce organization private plugin yapmak, "plugin’i herkese tek tıkla ulaştırma" adımını çözer; MCP tarafında (Claude config, build, port) kurulum aynı kalır. Sonrasında isteğe bağlı olarak Community’e açmak veya self-host MCP ile tam entegrasyon düşünülebilir.

## Lisans ve Destek

- **Lisans:** MIT (bkz. [LICENSE](LICENSE))
- **Sorun bildirimi:** [GitHub Issues](https://github.com/atezer/figma-mcp-bridge/issues)
# FMCP
