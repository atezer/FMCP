# F-MCP (Figma MCP Bridge)

Figma tasarım verilerini ve işlemlerini Model Context Protocol (MCP) ile AI asistanlarına (Claude, Cursor vb.) açan MCP sunucusu ve Figma plugin’i. Bu repo MCP sunucusu ve **F-MCP Bridge** Figma plugin kaynağını içerir.

### Figma API token tüketmiyor

figma-mcp-bridge, Figma'nın **REST API'sini kullanmıyor**. Akış:

**Claude (MCP) → figma-mcp-bridge → Plugin → Figma Desktop (yerel)**

Sorgular doğrudan Figma masaüstü uygulaması içinde çalışan plugin üzerinden gider. Bu sayede:

- Figma API token tüketimi **yok** (REST API hiç çağrılmıyor)
- Rate limit yok
- Figma tarafında ücretlendirme yok
- İnternet bağlantısı gerekmez (yerel plugin)

**Ne tüketiliyor?** Sadece AI tarafı: bu konuşmadaki context token'ları. Her tool call'ın request/response'u context penceresine girer. Büyük dosyalarda çok derin sorgular (örn. `depth: 3`, `verbosity: full`) Claude context'ini hızlı doldurabilir; Figma tarafında ek maliyet oluşmaz.

### Zero Trust

Veri **yalnızca sizin ortamınızda** kalır. Tasarım içeriği Figma bulutuna MCP üzerinden **gönderilmez**; akış Claude → MCP (yerel) → Plugin (yerel) → Figma Desktop (yerel). REST API çağrısı ve Figma'ya tasarım verisi aktarımı yoktur. Bu sayede kurumsal güvenlik ve gizlilik politikalarına uyum kolaylaşır (Zero Trust: sunucuya güvenme, yerelde doğrula).

### Kurumlar için özet (C-level / sunum)

- **Debug modu kapalı.** Figma’yı normal açarsınız; ekstra debug portu veya geliştirici ayarı gerekmez.
- **Kendi plugin story’nizde yayınlama.** Plugin’i Figma Organization (veya Enterprise) altında kendi plugin story’nize yayınladığınızda tüm kullanıcılar **Plugins** menüsünden tek tıkla erişir; “manifest import” zorunluluğu kalkar, merkezi ve erişilebilir bir mimari olur.
- **KVKK / GDPR uyumu.** Tasarım verisi yalnızca kullanıcının makinesinde (MCP + Plugin + Figma Desktop) kalır; Figma bulutuna veya üçüncü tarafa MCP üzerinden gönderilmez. Veri minimizasyonu ve yerelde işleme, hassas kurumsal ekipler ve denetim gereksinimleri için uygun bir model sunar.

## F-MCP yetenekleri

**33 araç** (config’te `dist/local-plugin-only.js` kullanıldığında tamamı aktif). Tam liste: [TOOLS_FULL_LIST.md](docs/TOOLS_FULL_LIST.md). Aşağıda rollerine göre özet.

### Ürün yöneticileri (analiz, kabul kriterleri, kurumsal süreçler)


| Kullanım                          | Araçlar                                                           | Açıklama                                                                                   |
| --------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Tasarım envanteri ve analiz       | `figma_get_design_system_summary`, `figma_get_file_data`          | Sayfa/yapı özeti, bileşen sayıları, token koleksiyonları                                   |
| Kabul kriterleri ve dokümantasyon | `figma_get_component_for_development`, `figma_capture_screenshot` | Bileşen spec + görsel; test ve kabul için referans                                         |
| Design–code uyumu (gap analizi)   | `figma_check_design_parity`                                       | Figma token'ları ile kod token'larını karşılaştırır; kurumsal raporlama ve test kriterleri |
| Keşif ve durum                    | `figma_search_components`, `figma_get_status`                     | Bileşen arama, bağlantı kontrolü                                                           |


### Geliştiriciler


| Kullanım                  | Araçlar                                                                                                                                                   | Açıklama                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Bileşen ve implementasyon | `figma_get_component`, `figma_get_component_for_development`, `figma_get_component_image`, `figma_instantiate_component`, `figma_set_instance_properties` | Metadata, screenshot, instance oluşturma ve property güncelleme  |
| Token ve stil kodu        | `figma_get_variables`, `figma_get_styles`                                                                                                                 | Değişkenler ve stiller (CSS/Tailwind/TS export)                  |
| Dosya yapısı / design context | `figma_get_file_data`, `figma_get_design_context`                                                                             | Layer hiyerarşisi; belirli node için yapı+metin (get_design_context tarzı, token tasarruflu) |
| Çalıştırma ve doğrulama   | `figma_execute`, `figma_capture_screenshot`, `figma_get_console_logs`, `figma_watch_console`, `figma_clear_console`                                       | Plugin API'de JS, screenshot, console log okuma/izleme/temizleme |


### DesignOps ve tasarımcılar


| Kullanım                  | Araçlar                                                                                                                                                                                                                                                                        | Açıklama                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| DesignOps (kritik)        | `figma_check_design_parity`, `figma_setup_design_tokens`, `figma_batch_create_variables`, `figma_batch_update_variables`                                                                                                                                                       | Design–code gap, koleksiyon+modlar+variable (rollback), toplu token yönetimi |
| Değişken ve stil yönetimi | `figma_get_variables`, `figma_get_styles`, `figma_create_variable_collection`, `figma_create_variable`, `figma_update_variable`, `figma_delete_variable`, `figma_rename_variable`, `figma_add_mode`, `figma_rename_mode`, `figma_refresh_variables`, `figma_get_token_browser` | Tüm variable/stil CRUD ve Token Browser                                      |
| Bileşen kütüphanesi       | `figma_get_design_system_summary`, `figma_search_components`, `figma_arrange_component_set`, `figma_set_description`                                                                                                                                                           | Özet, arama, variant set düzeni, dokümantasyon                               |


Kurulum: **[Kurulum rehberi (Onboarding)](docs/ONBOARDING.md)**.

## Hızlı başlangıç

Plugin'in "ready" olması için **önce** MCP bridge sunucusu (varsayılan port 5454) çalışıyor olmalı; **sonra** Figma'da plugin'i açarsınız. Çoklu kullanıcı için port 5454–5470 arası seçilebilir; bkz. [MULTI_INSTANCE.md](docs/MULTI_INSTANCE.md).

### 1. MCP bridge’i başlatın

Proje klasöründe:

```bash
cd <proje-yolu>   # clone ettiğiniz proje klasörü (örn. f-mcp-bridge)
npm install
npm run dev:local
```

Çıktıda `Plugin bridge server listening` veya `5454` geçen bir satır görünene kadar bekleyin. Bu, plugin'in bağlanacağı sunucudur.

### 2. Plugin’i Figma’da yükleyin (ilk seferde)

1. Figma'yı açın.
2. **Plugins** → **Development** → **Import plugin from manifest…**
3. Bu repodaki `f-mcp-plugin/manifest.json` dosyasını seçin
4. Plugin listede "F-MCP ATezer Bridge" olarak görünür.

### 3. Plugin’i çalıştırın

1. **Plugins** → **Development** → **F-MCP ATezer Bridge**
2. Birkaç saniye içinde:
  - **Yeşil nokta + "ready"** → Bağlantı tamam.
  - **Kırmızı + "no server"** → Bridge çalışmıyor; 1. adımda `npm run dev:local` ile başlatıp tekrar deneyin.


| Sıra | Yapılacak                                                |
| ---- | -------------------------------------------------------- |
| 1    | `npm run dev:local` (terminal açık kalsın)               |
| 2    | Figma’da Plugins → Development → F-MCP ATezer Bridge     |
| 3    | "ready" görününce Cursor/Claude üzerinden MCP kullanılır |


---

## Claude ile bağlama

### 1. Build (bir kez)

```bash
npm run build:local
```

### 2. Claude Desktop config

Config (macOS): `**~/Library/Application Support/Claude/claude_desktop_config.json**`

**Plugin-only (önerilen):**

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "node",
      "args": ["<BU-REPONUN-TAM-YOLU>/dist/local-plugin-only.js"]
    }
  }
}
```

**Permission denied alırsanız** — `bash -c` ile proje dizininden çalıştırın:

```json
"figma-mcp-bridge": {
  "command": "bash",
  "args": ["-c", "cd <BU-REPONUN-TAM-YOLU> && exec node dist/local-plugin-only.js"]
}
```

**Tam mod (console/screenshot):**

```json
"figma-mcp-bridge": {
  "command": "node",
  "args": ["<BU-REPONUN-TAM-YOLU>/dist/local.js"]
}
```

`<BU-REPONUN-TAM-YOLU>` yerine proje klasörünün tam yolunu yazın (örn. `/Users/.../f-mcp-bridge`).

**NPX:** Paket npm'de **@atezer/figma-mcp-bridge** adıyla yayınlı. `npx @atezer/figma-mcp-bridge@latest` ile clone yapmadan kullanılabilir. Bkz. [NPX-INSTALLATION.md](docs/NPX-INSTALLATION.md). Alternatif: Git clone + `npm run build:local`.

### 3. Sıra


| Plugin-only                                                        | Tam mod                                             |
| ------------------------------------------------------------------ | --------------------------------------------------- |
| 1. Claude’u başlatın (MCP sunucusu 5454’ü açar)                    | 1. Terminalde `npm run dev:local` (açık kalsın)     |
| 2. Figma’yı normal açın                                            | 2. Figma’yı `--remote-debugging-port=9222` ile açın |
| 3. Figma’da Plugins → Development → **F-MCP ATezer Bridge**        | 3. Figma’da plugini çalıştırın                      |
| 4. Plugin’de “ready” görününce Claude’da Figma araçlarını kullanın | 4. Claude’u başlatın; araçları kullanın             |


**"Server disconnected"** olursa: (1) Port 5454 kapalı olmalı — `lsof -i :5454` ile bakın, `kill <PID>` ile kapatın. (2) **"Permission denied"** script için: config'te script yerine `bash -c` kullanın (aşağıdaki örnek). (3) Build: `npm run build:local`.

**Çoklu kullanıcı (multi-instance):** Aynı anda birden fazla kişi kullanacaksa her kullanıcı farklı port (5454, 5455, … 5470) kullanır; MCP için `FIGMA_PLUGIN_BRIDGE_PORT=5455` vb., plugin’de ise Port alanından aynı port seçilir. Detay: [MULTI_INSTANCE.md](docs/MULTI_INSTANCE.md).

**Enterprise:** Audit log (`FIGMA_MCP_AUDIT_LOG_PATH`), air-gap kurulum ve Organization plugin: [ENTERPRISE.md](docs/ENTERPRISE.md).

---

## Design / Dev Mode

**Design seat olmayan, sadece Dev Mode erişimi olan kullanıcılar da bu MCP'yi kullanabilir.** Plugin hem Design hem Dev Mode'da çalışır (`editorType: ["figma", "dev"]`). MCP bağlantısı için mod farkı engel değildir. **Dev Mode kullanıcıları (SEM, PO, Dev):** Dosyayı Dev Mode'da açın → sağ panelde **Plugins** sekmesi → **F-MCP ATezer Bridge** ile çalıştırın. Detay: [ONBOARDING.md](docs/ONBOARDING.md) (Dev Mode bölümü).

**Plugin–MCP bağlantı özeti:** İki mod var; debug portu zorunlu değil. **Plugin-only (önerilen):** Config'te `dist/local-plugin-only.js`, Figma normal açılır, token yok. **Tam mod:** Config'te `dist/local.js`, Figma `--remote-debugging-port=9222` ile açılır (console/screenshot için). Ayrıntı: [PLUGIN-MCP-BAGLANTI.md](docs/PLUGIN-MCP-BAGLANTI.md).

## Detaylı Rehber

Plugin'in MCP ile nasıl konuştuğu, veri akışı, Design/Dev mode ve sorun giderme için:

- **[Plugin–MCP Bağlantı Rehberi](docs/PLUGIN-MCP-BAGLANTI.md)** (mimari, kurulum, sözleşmeler)
- **[Plugin Nasıl Çalışır?](docs/PLUGIN-NASIL-CALISIR.md)** (Worker/UI akışı, WebSocket vs CDP)

## Repo İçeriği

- `f-mcp-plugin/` – F-MCP ATezer Bridge plugin kaynağı (manifest, code.js, ui.html)
- `docs/` – Kurulum, mod karşılaştırma, [Plugin nasıl çalışır](docs/PLUGIN-NASIL-CALISIR.md), sorun giderme
- `src/` – MCP sunucusu (local, plugin-only, Cloudflare Worker)

### Tüm dokümanlar (docs/)


| Dosya                                                     | Açıklama                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [ONBOARDING.md](docs/ONBOARDING.md)                       | **Kurulum rehberi (Onboarding)** — Plugin yükle, Node.js, MCP başlat, Claude config |
| [SETUP.md](docs/SETUP.md)                                 | Kurulum (Remote / Local)                                                            |
| [PLUGIN-MCP-BAGLANTI.md](docs/PLUGIN-MCP-BAGLANTI.md)     | Plugin–MCP mimari ve kurulum                                                        |
| [PLUGIN-NASIL-CALISIR.md](docs/PLUGIN-NASIL-CALISIR.md)   | Plugin Worker/UI akışı                                                              |
| [MODE_COMPARISON.md](docs/MODE_COMPARISON.md)             | Mod karşılaştırma                                                                   |
| [TOOLS.md](docs/TOOLS.md)                                 | MCP araçları referansı                                                              |
| [TOOLS_FULL_LIST.md](docs/TOOLS_FULL_LIST.md)             | **33 araç tam liste** (referans, Claude ile doğrulanmış)                            |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)             | Sorun giderme                                                                       |
| [NPX-INSTALLATION.md](docs/NPX-INSTALLATION.md)           | NPX ile kurulum                                                                     |
| [OAUTH_SETUP.md](docs/OAUTH_SETUP.md)                     | OAuth (remote sunucu)                                                               |
| [SELF_HOSTING.md](docs/SELF_HOSTING.md)                   | Kendi sunucunda host                                                                |
| [DEPLOYMENT_COMPARISON.md](docs/DEPLOYMENT_COMPARISON.md) | Dağıtım karşılaştırma                                                               |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)                   | Teknik mimari                                                                       |
| [USE_CASES.md](docs/USE_CASES.md)                         | Örnek kullanım senaryoları                                                          |
| [RECONSTRUCTION_FORMAT.md](docs/RECONSTRUCTION_FORMAT.md) | Reconstruction format                                                               |
| [BITBUCKET-README.md](docs/BITBUCKET-README.md)           | Bitbucket README şablonu                                                            |
| [PORT-5454-KAPALI.md](docs/PORT-5454-KAPALI.md)           | Port 5454 kapalı sorun giderme                                                      |
| [MULTI_INSTANCE.md](docs/MULTI_INSTANCE.md)               | **Çoklu kullanıcı** — Aynı anda birden fazla kişi (port 5454–5470)                  |
| [ENTERPRISE.md](docs/ENTERPRISE.md)                       | **Enterprise** — Audit log, air-gap, Organization plugin                            |
| [PUBLISH-PLUGIN.md](docs/PUBLISH-PLUGIN.md)               | **Publish plugin** — Figma’da yayınlama: Data security cevapları, final details, Plugin ID |
|                                                           |                                                                                     |


## Yaygınlaştırma: Organization (private) plugin

Çalışma biçimini ekip/organizasyon içinde kolaylaştırmak için **Figma Organization private plugin** olarak yayınlamak mantıklı bir ilk adım. Enterprise odaklı özellikler (audit log, air-gap, org plugin detayı): [ENTERPRISE.md](docs/ENTERPRISE.md).

**Avantajlar:**

- Herkesin "Import plugin from manifest" yapması gerekmez; plugin organizasyonun plugin listesinde görünür.
- Sadece **Plugins** menüsünden (veya Resources → Plugins) ekleyip çalıştırırlar; MCP bridge’i (Claude config veya `npm run dev:local`) kendi makinede kurmaları yeterli.
- Review süreci yok (private plugin); yayınladıktan kısa süre sonra kullanılabilir.

**Gereksinimler:**

- Figma **Organization** veya **Enterprise** planı ([Figma: Create private organization plugins](https://help.figma.com/hc/en-us/articles/4404228629655-Create-private-organization-plugins)).
- Yayınlama: [Publish plugins](https://help.figma.com/hc/en-us/articles/360042293394) adımlarını izleyin; **Publish to** kısmında **organization**’ı seçin (Community değil).

**Özet:** Önce organization private plugin yapmak, "plugin’i herkese tek tıkla ulaştırma" adımını çözer; MCP tarafında (Claude config, build, port) kurulum aynı kalır. Sonrasında isteğe bağlı olarak Community’e açmak veya self-host MCP ile tam entegrasyon düşünülebilir.

## Lisans ve Destek

- **Lisans:** MIT — **ücretsiz (free)** ve açık kaynak. Ticari ve kişisel kullanım serbesttir (bkz. [LICENSE](LICENSE))
- **Sorun bildirimi:** [GitHub Issues](https://github.com/atezer/FMCP/issues)

