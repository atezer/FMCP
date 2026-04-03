<p align="center">
  <img src="assets/logo.png" alt="F-MCP Bridge Logo" width="280" />
</p>

# F-MCP (Figma MCP Bridge)

Figma'daki tasarımlarınızı AI araçlarına (Claude, Cursor) bağlayan bir köprü. Figma'da bir plugin açarsınız, AI aracınız bu plugin üzerinden tasarımlarınızı okur, değiştirir ve export eder.

**Ne işe yarar?** AI'a "Bu dosyadaki Button bileşenini göster", "Yeni bir frame oluştur", "SVG olarak export et" gibi komutlar verirsiniz — AI Figma'daki tasarımınızla doğrudan çalışır.

## Nasıl çalışır?

```
Siz (Claude/Cursor) → F-MCP Bridge → Figma Plugin → Figma dosyanız
```

Her şey **bilgisayarınızda** kalır. Tasarım verileriniz internete gönderilmez.

## Öne çıkan özellikler

- **46 araç** — okuma, yazma, export, variable yönetimi, bileşen arama ve daha fazlası
- **Figma API token tüketmez\*** — Varsayılan olarak plugin üzerinden çalışır, Figma API kotanızı kullanmaz
- **Veri güvenliği** — Tasarım verisi sadece kendi bilgisayarınızda kalır (Zero Trust)
- **Çoklu dosya** — Aynı anda birden fazla Figma/FigJam dosyası ile çalışabilirsiniz
- **Çoklu AI aracı** — Claude ve Cursor aynı anda kullanılabilir (farklı portlarda)
- **SVG/PNG export** — Vektörel veya bitmap, toplu export (1-50 node)
- **REST API desteği** — İsteğe bağlı token ile yorum okuma, versiyon geçmişi, görsel export
- **Figma Desktop + Tarayıcı** — Her ikisinde de çalışır

> \* **REST API isteğe bağlıdır.** Temel araçlar (okuma, yazma, export, variable) token olmadan plugin üzerinden çalışır. Yorum okuma, versiyon geçmişi gibi ek özellikler için Figma API token'ı ekleyebilirsiniz — plugin'deki Advanced panelinden girin, kalan API limitinizi plugin üzerinde takip edin.

## Hızlı başlangıç (3 adım)

### 1. Node.js kurun

[nodejs.org](https://nodejs.org) adresinden LTS sürümünü indirip kurun.

### 2. AI aracınıza config ekleyin

**Cursor** — Proje kökünde `.cursor/mcp.json` dosyası oluşturun:

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

**Claude Desktop** — Config dosyasını açın (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

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

### 3. Figma'da plugin'i açın

1. Cursor veya Claude Desktop'ı yeniden başlatın
2. Figma'yı açın → **Plugins** → **F-MCP ATezer Bridge**
3. Plugin'de **"ready (:5454)"** yazısını görene kadar bekleyin
4. Artık AI aracınız Figma'ya bağlı!

> **Plugin'i ilk kez mi yüklüyorsunuz?** Figma → Plugins → Development → Import plugin from manifest → Bu repodaki `f-mcp-plugin/manifest.json` dosyasını seçin.

## 46 araçla neler yapabilirsiniz?

### Tasarımcılar için

| Ne yapabilirsiniz | Araçlar |
|-------------------|---------|
| Dosya yapısını görme | `figma_get_file_data`, `figma_get_design_context` |
| Bileşen bulma ve inceleme | `figma_search_components`, `figma_get_component` |
| Screenshot alma | `figma_capture_screenshot` |
| SVG/PNG export | `figma_export_nodes` (toplu, vektörel) |
| Yeni tasarım elemanı oluşturma | `figma_create_frame`, `figma_create_text`, `figma_create_rectangle`, `figma_create_group` |
| Variable ve token yönetimi | `figma_get_variables`, `figma_create_variable`, `figma_update_variable` |
| Design system özeti | `figma_get_design_system_summary`, `figma_get_token_browser` |
| Takım kütüphanesi arama | `figma_search_assets` |

### Geliştiriciler için

| Ne yapabilirsiniz | Araçlar |
|-------------------|---------|
| Bileşen detayı + görsel | `figma_get_component_for_development`, `figma_get_component_image` |
| Token ve stil çıkarma | `figma_get_variables`, `figma_get_styles` |
| Instance oluşturma | `figma_instantiate_component`, `figma_set_instance_properties` |
| Kod çalıştırma | `figma_execute` (Figma Plugin API ile doğrudan JS) |
| Konsol izleme | `figma_get_console_logs`, `figma_watch_console` |

### DesignOps için

| Ne yapabilirsiniz | Araçlar |
|-------------------|---------|
| Design-code uyumu kontrolü | `figma_check_design_parity` |
| Toplu token oluşturma | `figma_setup_design_tokens`, `figma_batch_create_variables` |
| Variable CRUD (oluştur/güncelle/sil) | Tam variable yönetim seti (12 araç) |
| Bileşen variant yönetimi | `figma_arrange_component_set`, `figma_set_description` |

### REST API (isteğe bağlı, token gerektirir)

| Ne yapabilirsiniz | Araçlar |
|-------------------|---------|
| Token girişi | `figma_set_rest_token` (plugin UI'dan veya AI aracından) |
| API çağrısı | `figma_rest_api` (yorumlar, versiyonlar, görsel export) |
| Limit takibi | `figma_get_rest_token_status` |
| Bağlantı durumu | `figma_plugin_diagnostics` |

Tam araç listesi: [TOOLS_FULL_LIST.md](docs/TOOLS_FULL_LIST.md) | Detaylı referans: [TOOLS.md](docs/TOOLS.md)

## Claude + Cursor aynı anda kullanma

Her iki araç da varsayılan 5454 portunu kullanır. İlk açılan portu alır, ikincisi için:

1. AI aracına "port 5456 kullan" deyin → `figma_set_port(5456)` çalışır
2. Figma plugin'de portu **5456** yapın
3. Her iki araç aynı anda bağımsız çalışır

Ya da config'te önceden farklı port belirleyin:

```json
"env": { "FIGMA_PLUGIN_BRIDGE_PORT": "5455" }
```

## Çoklu dosya desteği

Aynı anda birden fazla Figma/FigJam dosyasında plugin'i açabilirsiniz:

- **Figma Desktop** — tasarım dosyası
- **Figma Browser** — tarayıcıda figma.com
- **FigJam** — whiteboard/diyagram

Hangi linki verirseniz, AI o dosyaya yönlendirilir. `figma_list_connected_files` ile bağlı dosyaları görebilirsiniz.

## Plugin durum göstergeleri

| Plugin'de ne görüyorsunuz | Anlamı |
|---------------------------|--------|
| `ready (:5454)` | Bağlantı kuruldu, kullanmaya hazır |
| `connecting...` | Bağlanmaya çalışıyor |
| `no server` | AI aracı çalışmıyor veya port uyuşmuyor |
| `wrong server` | Farklı bir sunucuya bağlandı |

## Sorun mu yaşıyorsunuz?

| Sorun | Çözüm |
|-------|-------|
| Plugin "no server" diyor | AI aracınızı (Claude/Cursor) yeniden başlatın |
| Port çakışması | `figma_set_port` ile farklı porta geçin veya `lsof -i :5454` ile portu kontrol edin |
| "Server disconnected" | Config'deki node yolunu kontrol edin: `which node` ile tam yolu bulun |
| Plugin'de 0 bağlantı | Plugin'deki port ile AI aracının portu aynı olmalı |

Detaylı sorun giderme: [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## Sürüm bilgisi

| Bilgi | Kaynak |
|-------|--------|
| Güncel sürüm | **1.6.4** ([package.json](package.json)) |
| Değişiklik geçmişi | [CHANGELOG.md](CHANGELOG.md) |
| GitHub sürümleri | [Releases](https://github.com/atezer/FMCP/releases) |
| npm paketi | [@atezer/figma-mcp-bridge](https://www.npmjs.com/package/@atezer/figma-mcp-bridge) |

**Güncelleme:** NPX ile `@latest` kullanıyorsanız otomatik güncellenir. Repo ile kurduysanız: `git pull` → `npm run build:local` → AI aracını yeniden başlatın.

## Dokümanlar

| Doküman | Açıklama |
|---------|----------|
| [ONBOARDING.md](docs/ONBOARDING.md) | Adım adım kurulum rehberi |
| [WINDOWS-INSTALLATION.md](docs/WINDOWS-INSTALLATION.md) | Windows kurulumu |
| [SETUP.md](docs/SETUP.md) | Detaylı kurulum (Local / Remote) |
| [TOOLS_FULL_LIST.md](docs/TOOLS_FULL_LIST.md) | **46 araç tam listesi** |
| [TOOLS.md](docs/TOOLS.md) | Araçların detaylı açıklamaları |
| [REST_API_GUIDE.md](docs/REST_API_GUIDE.md) | REST API kullanım rehberi |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Projeye katkıda bulunma rehberi |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Sorun giderme |
| [MULTI_INSTANCE.md](docs/MULTI_INSTANCE.md) | Çoklu kullanıcı ve port yönetimi |
| [ENTERPRISE.md](docs/ENTERPRISE.md) | Kurumsal özellikler (audit log, air-gap) |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Teknik mimari |
| [USE_CASES.md](docs/USE_CASES.md) | Örnek kullanım senaryoları |
| [SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) | Güvenlik denetimi |

## Güvenlik ve gizlilik

- Tasarım verileri **sadece bilgisayarınızda** kalır
- Figma bulutuna veya üçüncü taraflara veri **gönderilmez**
- REST API token'ı bellekte tutulur, diske **yazılmaz**
- **KVKK / GDPR uyumlu** mimari
- Detay: [PRIVACY.md](PRIVACY.md)

## Kurumsal kullanım (Tüm şirkette tek seferde)

Plugin'i herkesin tek tek yüklemesi gerekmez. Figma Organization hesabınız varsa plugin'i **private plugin** olarak yayınlayabilirsiniz:

**Publish plugin** → **Publish to** → **Organizasyon adınız (Private)** seçin.

Yayınladıktan sonra:
- Tüm ekip üyeleri **Plugins** menüsünden tek tıkla erişir
- Kimsenin "manifest import" yapmasına gerek kalmaz
- Plugin güncellemelerini merkezden yönetirsiniz
- Review süreci yok (private plugin) — yayınladıktan hemen sonra kullanılabilir

**Gereksinimler:**
- Figma **Organization** veya **Enterprise** planı
- Yayınlama: Figma → Plugins → Publish → **Publish to** kısmında organizasyonunuzu seçin

> Her kullanıcının kendi bilgisayarında sadece AI aracı config'ini (Claude/Cursor) ayarlaması yeterli. Plugin zaten şirketin Figma'sında hazır olur.

Kurumsal özellikler (audit log, air-gap, org plugin detayı): [ENTERPRISE.md](docs/ENTERPRISE.md)

## Lisans

MIT tabanlı — kişisel kullanım için. Detay: [LICENSE](LICENSE)

**Sorun mu var?** [GitHub Issues](https://github.com/atezer/FMCP/issues)
