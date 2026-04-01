# Çoklu Kullanıcı (Multi-Instance) — Aynı Anda Birden Fazla Kişi

Aynı makinede veya farklı makinelerde **birden fazla kişi** aynı anda F-MCP Bridge kullanabilir. Her kullanıcı kendi MCP sunucusunu **farklı bir portta** çalıştırır; plugin'de de aynı portu seçer.

## Tek MCP = Tüm pencereler aynı oturum

**Tek bir MCP süreci, birden fazla Figma/FigJam penceresine aynı anda hizmet verir.** Figma Desktop, FigJam (tarayıcı) ve Figma (tarayıcı) aynı port üzerinden tek bridge'e bağlanabilir. Tüm bağlı pencereler aynı AI oturumunu paylaşır; `figma_list_connected_files` ile hangi dosyaların bağlı olduğunu görebilir, `fileKey` veya `figmaUrl` parametresiyle hedef dosyayı seçebilirsiniz.

**Çoğu kullanıcı için ikinci bir MCP süreci başlatmaya gerek yoktur.** Farklı portlara ihtiyaç yalnızca birden fazla *kişi* veya birden fazla *izole AI oturumu* istendiğinde doğar.

## Nasıl çalışır?

- **Tek kullanıcı:** Varsayılan port **5454**. Claude'u açar, Figma'da plugin'i açar; plugin 5454'e bağlanır. Birden fazla Figma/FigJam penceresi aynı porta bağlanır.
- **Çoklu kullanıcı:** Her kullanıcı kendi portunu kullanır (5454, 5455, 5456, … 5470). Port aralığı **5454–5470** (en fazla 17 eşzamanlı örnek).

## Adımlar (her kullanıcı için)

### 1. MCP sunucusu portu

Kullanıcı A varsayılanı kullanır; diğerleri ortam değişkeni ile port seçer.

**Kullanıcı A (port 5454, varsayılan):**
- Claude config'te sadece `dist/local-plugin-only.js` kullanır; ek bir şey gerekmez.

**Kullanıcı B (port 5455):**
- Claude'u **port 5455** ile başlatmak için config'te args'a port iletmek gerekir. MCP sunucusu `FIGMA_PLUGIN_BRIDGE_PORT` ortam değişkenini okur; bu yüzden Claude'u bu değişkenle çalıştırmalı veya config'te `bash -c` kullanmalı.

Örnek (Kullanıcı B — port 5455):

```json
"figma-mcp-bridge": {
  "command": "bash",
  "args": ["-c", "cd <PROJE-YOLU> && FIGMA_PLUGIN_BRIDGE_PORT=5455 exec node dist/local-plugin-only.js"]
}
```

**Kullanıcı C (port 5456):** Aynı şekilde `FIGMA_PLUGIN_BRIDGE_PORT=5456` kullanır.

### 2. Plugin'de port seçimi

Plugin arayüzünde **Port** alanı vardır (varsayılan 5454).

- **Kullanıcı A:** Port **5454** (değiştirmeyebilir).
- **Kullanıcı B:** Port'u **5455** yapar; böylece kendi MCP sunucusuna bağlanır.
- **Kullanıcı C:** Port **5456** yapar.

Değer **localStorage**'da saklanır; aynı tarayıcıda bir sonraki açılışta aynı port kullanılır.

### 3. Özet tablo

| Kullanıcı | MCP port (env/config) | Plugin'de Port |
|-----------|------------------------|----------------|
| A         | 5454 (varsayılan)      | 5454           |
| B         | 5455                   | 5455           |
| C         | 5456                   | 5456           |

## Aynı makinede mi, farklı makinelerde mi?

- **Farklı makineler:** Her makinede tek kullanıcı varsa hepsi varsayılan 5454 kullanabilir; port çakışması olmaz.
- **Aynı makine (paylaşılan bilgisayar / sunucu):** Yukarıdaki gibi her kullanıcıya farklı port (5454, 5455, …) atayın.

## Port davranışı

MCP sunucusu yapılandırılan porta (varsayılan 5454 veya `FIGMA_PLUGIN_BRIDGE_PORT`) doğrudan bağlanır. Port meşgulse:

1. **Canlı F-MCP instance:** Port zaten çalışan bir F-MCP bridge tarafından kullanılıyorsa, sunucu "zaten çalışıyor" uyarısı verir ve çıkar. Tek bridge tüm pencerelere yeter.
2. **Ölü/asılı süreç:** Port meşgul ama yanıt vermiyorsa (stale process), sunucu kısa bir bekleme sonrası otomatik olarak bir kez daha dener.
3. **Farklı servis:** Port başka bir uygulama tarafından kullanılıyorsa, net hata mesajıyla çıkar.

Port sorunlarında: `lsof -i :5454` ile hangi sürecin portu tuttuğunu görebilirsiniz.

## Paralel görevler (Claude + Cursor + ikinci hat)

Aynı kişi birden fazla **izole AI oturumu** çalıştırabilir — örneğin bir Cursor sohbetinde tasarım, bir Claude App sohbetinde dokümantasyon, ikinci bir Claude sohbetinde Figma okuma. Her hat **kendi bridge sürecine** ve **sabit portuna** ihtiyaç duyar.

### Mimari

Her bağımsız görev = **bir** MCP süreci + **bir** sabit port + Figma'da plugin'de **aynı** port.

| Hat | MCP istemcisi | Port | Figma penceresi | Görev |
|-----|--------------|------|-----------------|-------|
| A   | Cursor       | 5455 | Desktop Figma → plugin 5455 | Tasarım |
| B   | Claude App   | 5456 | Figma browser → plugin 5456 | Proje çalışması |
| C   | Claude 2. sohbet | 5470 | Figma browser → plugin 5470 | Dokümantasyon |

### Plugin'de port seçimi (önemli)

Birden fazla bridge çalışıyorsa plugin'in **"Otomatik tara"** modu ilk bulduğu bridge'e bağlanır — yanlış hatta düşebilir. **Paralel görevlerde** plugin'de **Advanced > Port** alanına doğru portu **elle** girin ve "Otomatik tara" butonuna basmayın.

### Claude Desktop: çoklu MCP sunucusu

`claude_desktop_config.json` içinde her hat için **farklı sunucu adı + farklı port**:

```json
{
  "mcpServers": {
    "figma-bridge-design": {
      "command": "node",
      "args": ["/path/to/FCM/dist/local-plugin-only.js"],
      "env": { "FIGMA_PLUGIN_BRIDGE_PORT": "5455" }
    },
    "figma-bridge-docs": {
      "command": "node",
      "args": ["/path/to/FCM/dist/local-plugin-only.js"],
      "env": { "FIGMA_PLUGIN_BRIDGE_PORT": "5470" }
    }
  }
}
```

### Cursor: paylaşılan MCP uyarısı

Cursor'da **aynı workspace** için tanımlı MCP sunucuları **tüm sohbetler tarafından paylaşılır**. İki ayrı hat istiyorsanız:

1. **Bir hat Cursor, diğer hat Claude** — en basit yöntem.
2. **İki ayrı workspace** + her birinde tek port.
3. **İki ayrı MCP sunucu kaydı** (farklı `mcpServers` anahtarları, farklı port) — aynı araç adları iki kez görünür, sohbette dikkatli seçim gerekir.

### Audit log ve screenshot (çoklu instance)

Her bridge süreci varsayılan olarak aynı screenshot dizinini (`$TMPDIR/figma-mcp-bridge/screenshots`) ve aynı audit log yolunu kullanır. Paralel çalışmada:

- **Screenshot:** Dosya adları timestamp + nodeId bazlı olduğu için çakışma riski düşük.
- **Audit log:** Aynı `FIGMA_MCP_AUDIT_LOG_PATH` set edildiyse iki süreç aynı dosyaya yazabilir. NDJSON formatı sayesinde satır çakışması nadir, ama en temizi her instance için ayrı audit log yolu vermektir:
  ```
  FIGMA_MCP_AUDIT_LOG_PATH=/tmp/fmcp-audit-5455.ndjson
  ```

### Port durumu kontrol

Hangi portlarda F-MCP çalıştığını görmek için:

```bash
npm run check-ports
```

Veya elle:

```bash
lsof -i :5454-5470 -sTCP:LISTEN
```

## İlgili dokümanlar

- [ONBOARDING](ONBOARDING.md) — Kurulum
- [CLAUDE_DESKTOP_CONFIG](CLAUDE_DESKTOP_CONFIG.md) — Claude Desktop yapılandırması
- [PORT-5454-KAPALI](PORT-5454-KAPALI.md) — Port kapalı sorun giderme
