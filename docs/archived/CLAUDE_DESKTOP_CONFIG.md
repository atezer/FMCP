# Claude Desktop — `figma-mcp-bridge` MCP yapılandırması

Config dosyası (macOS): `~/Library/Application Support/Claude/claude_desktop_config.json`  
Kök dizinde örnek: [claude_desktop_config_ornek.json](../claude_desktop_config_ornek.json)

## Zorunlu: doğru `args` yolu

- `dist/local-plugin-only.js` **depo kökünde** üretilir (`npm run build:local`).
- **Yanlış:** `.../f-mcp-bridge/dist/local-plugin-only.js` — bu alt klasör yeni yapıda yok; Claude logunda `MODULE_NOT_FOUND` görülür.
- **Doğru:** `.../<clone-kökünüz>/dist/local-plugin-only.js` (ör. `/Users/siz/FCM/dist/local-plugin-only.js`).

## `env` ve `FIGMA_PLUGIN_BRIDGE_PORT` ne zaman?

| Durum | Öneri |
|--------|--------|
| Tek kullanıcı, tek MCP (sadece Claude) | `env` **eklemeyin**; bridge varsayılan **5454**; Figma plugin de 5454. |
| Aynı makinede Cursor + Claude gibi bridge çakışması | Her istemciye **farklı** port atayın (`FIGMA_PLUGIN_BRIDGE_PORT` + plugin'de aynı port). Ayrıntı: [MULTI_INSTANCE.md](MULTI_INSTANCE.md). |

**Kural:** `env` ile verdiğiniz port ile Figma'da **F-MCP Bridge > Advanced > Port** aynı sayı olmalı. Aksi halde Claude tarafı çalışırken plugin **MCP no server** gösterir.

## Örnek: minimal (plugin-only)

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "node",
      "args": ["/Users/siz/FCM/dist/local-plugin-only.js"]
    }
  }
}
```

`mcpServers` dışında `preferences` vb. diğer kök alanları varsa **silinmez**; yalnızca `figma-mcp-bridge` girdisini güncelleyin.

## Örnek: sabit port (ör. 5456)

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "node",
      "args": ["/Users/siz/FCM/dist/local-plugin-only.js"],
      "env": {
        "FIGMA_PLUGIN_BRIDGE_PORT": "5456"
      }
    }
  }
}
```

Bu durumda Figma plugin'inde port **5456** olmalı (veya plugin'in **Otomatik tara** ile 5454-5470 aralığında bridge'i bulması beklenir).

## Örnek: paralel görevler (çoklu MCP sunucusu)

Aynı anda birden fazla izole Figma oturumu istiyorsanız — örneğin bir sohbette tasarım, diğerinde dokümantasyon — **farklı sunucu adları ve portlar** tanımlayın:

```json
{
  "mcpServers": {
    "figma-bridge-design": {
      "command": "node",
      "args": ["/Users/siz/FCM/dist/local-plugin-only.js"],
      "env": {
        "FIGMA_PLUGIN_BRIDGE_PORT": "5455"
      }
    },
    "figma-bridge-docs": {
      "command": "node",
      "args": ["/Users/siz/FCM/dist/local-plugin-only.js"],
      "env": {
        "FIGMA_PLUGIN_BRIDGE_PORT": "5470"
      }
    }
  }
}
```

Her sunucu **ayrı Node süreci** olarak başlar. Figma plugin'inde her pencere için **Advanced > Port** alanına ilgili portu (5455 veya 5470) **elle** girin — "Otomatik tara" paralel hatları karıştırabilir.

Ayrıntılar: [MULTI_INSTANCE.md — Paralel görevler](MULTI_INSTANCE.md#paralel-görevler-claude--cursor--ikinci-hat)

## Doğrulama

1. Claude'u yeniden başlatın.
2. Geliştirici loglarında `MODULE_NOT_FOUND` veya `cd: ... f-mcp-bridge` olmamalı.
3. Terminalde (Claude açıkken): `lsof -i :5454 -sTCP:LISTEN` (veya kullandığınız port) — `node` süreci görünmeli.
4. Çoklu sunucu kurulumunda: `lsof -i :5454-5470 -sTCP:LISTEN` ile tüm aktif bridge'leri görün.
