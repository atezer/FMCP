# Çoklu Kullanıcı (Multi-Instance) — Aynı Anda Birden Fazla Kişi

Aynı makinede veya farklı makinelerde **birden fazla kişi** aynı anda F-MCP Bridge kullanabilir. Her kullanıcı kendi MCP sunucusunu **farklı bir portta** çalıştırır; plugin’de de aynı portu seçer.

## Nasıl çalışır?

- **Tek kullanıcı:** Varsayılan port **5454**. Claude’u açar, Figma’da plugin’i açar; plugin 5454’e bağlanır.
- **Çoklu kullanıcı:** Her kullanıcı kendi portunu kullanır (5454, 5455, 5456, … 5470). Port aralığı **5454–5470** (en fazla 17 eşzamanlı örnek).

## Adımlar (her kullanıcı için)

### 1. MCP sunucusu portu

Kullanıcı A varsayılanı kullanır; diğerleri ortam değişkeni ile port seçer.

**Kullanıcı A (port 5454, varsayılan):**
- Claude config’te sadece `dist/local-plugin-only.js` kullanır; ek bir şey gerekmez.

**Kullanıcı B (port 5455):**
- Claude’u **port 5455** ile başlatmak için config’te args’a port iletmek gerekir. MCP sunucusu `FIGMA_PLUGIN_BRIDGE_PORT` ortam değişkenini okur; bu yüzden Claude’u bu değişkenle çalıştırmalı veya config’te `bash -c` kullanmalı.

Örnek (Kullanıcı B — port 5455):

```json
"figma-mcp-bridge": {
  "command": "bash",
  "args": ["-c", "cd <PROJE-YOLU> && FIGMA_PLUGIN_BRIDGE_PORT=5455 exec node dist/local-plugin-only.js"]
}
```

**Kullanıcı C (port 5456):** Aynı şekilde `FIGMA_PLUGIN_BRIDGE_PORT=5456` kullanır.

### 2. Plugin’de port seçimi

Plugin arayüzünde **Port** alanı vardır (varsayılan 5454).

- **Kullanıcı A:** Port **5454** (değiştirmeyebilir).
- **Kullanıcı B:** Port’u **5455** yapar; böylece kendi MCP sunucusuna bağlanır.
- **Kullanıcı C:** Port **5456** yapar.

Değer **localStorage**’da saklanır; aynı tarayıcıda bir sonraki açılışta aynı port kullanılır.

### 3. Özet tablo

| Kullanıcı | MCP port (env/config) | Plugin’de Port |
|-----------|------------------------|----------------|
| A         | 5454 (varsayılan)      | 5454           |
| B         | 5455                   | 5455           |
| C         | 5456                   | 5456           |

## Aynı makinede mi, farklı makinelerde mi?

- **Farklı makineler:** Her makinede tek kullanıcı varsa hepsi varsayılan 5454 kullanabilir; port çakışması olmaz.
- **Aynı makine (paylaşılan bilgisayar / sunucu):** Yukarıdaki gibi her kullanıcıya farklı port (5454, 5455, …) atayın.

## Port çakışması (otomatik yedekleme)

MCP sunucusu başlarken **tercih edilen** port (varsayılan 5454 veya `FIGMA_PLUGIN_BRIDGE_PORT`) meşgulse, köprü **5454–5470** aralığında önce aynı numaradan ileri tarar, gerekirse aralığın başına sararak boş ilk portu seçer. Stderr’de `F-MCP bridge listening on ws://127.0.0.1:<port>` satırını görürsünüz; tercih edilen port kullanılamadıysa uyarı da yazılır.

Figma plugin’i **otomatik port** modunda (Gelişmiş kapalı) aynı aralıkta bağlanmayı dener ve sunucunun `welcome` mesajındaki porta kilitlenir.

**Paylaşımlı makine:** Herkes otomatik yedeklemeye güvenirse nadir yarış koşulları oluşabilir. Üretim/ekip senaryosunda her kullanıcıya **sabit port** (`FIGMA_PLUGIN_BRIDGE_PORT` + plugin’de aynı port) atamak en öngörülebilir yoldur.

## İlgili dokümanlar

- [ONBOARDING](ONBOARDING.md) — Kurulum
- [PORT-5454-KAPALI](PORT-5454-KAPALI.md) — Port kapalı sorun giderme
