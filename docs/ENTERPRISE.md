# Enterprise Özellikler

Kurumsal ortamlarda güvenlik, uyumluluk ve dağıtım için: **audit log**, **air-gap desteği** ve **Organization (private) plugin**.

---

## 1. Audit log

MCP aracı çağrıları ve plugin bağlantı olayları, uyumluluk ve denetim için isteğe bağlı olarak dosyaya yazılır.

### Etkinleştirme

- **Ortam değişkeni:** `FIGMA_MCP_AUDIT_LOG_PATH` — log dosyasının tam yolu (örn. `/var/log/figma-mcp/audit.log`).
- **Config dosyası:** `local.auditLogPath` alanı (örn. `.figma-mcp-bridge.json` içinde).

Örnek config:

```json
{
  "local": {
    "pluginBridgePort": 5454,
    "auditLogPath": "/var/log/figma-mcp/audit.jsonl"
  }
}
```

### Format (NDJSON)

Her satır tek bir JSON nesnesidir:

| Alan        | Açıklama                                      |
|------------|-----------------------------------------------|
| `ts`       | ISO 8601 zaman damgası                        |
| `event`    | `tool` \| `plugin_connect` \| `plugin_disconnect` \| `error` |
| `method`   | Araç adı (örn. `getVariables`, `executeCodeViaUI`); yalnızca `event: "tool"` |
| `success`  | `true` / `false`; yalnızca `event: "tool"`     |
| `error`    | Hata mesajı (varsa)                           |
| `durationMs` | İstek süresi (ms); yalnızca `event: "tool"` |

Örnek satırlar:

```json
{"ts":"2025-02-22T12:00:00.000Z","event":"plugin_connect"}
{"ts":"2025-02-22T12:00:01.000Z","event":"tool","method":"getVariables","success":true,"durationMs":120}
{"ts":"2025-02-22T12:00:02.000Z","event":"tool","method":"executeCodeViaUI","success":false,"error":"timeout","durationMs":60000}
{"ts":"2025-02-22T12:05:00.000Z","event":"plugin_disconnect"}
```

### Notlar

- Log yazımı senkron değildir; yük altında dosya gecikmeli güncellenebilir.
- Dosya yoksa oluşturulur; mevcutsa **append** edilir (üzerine yazılmaz).
- Audit log **kapalı** iken hiç dosya yazılmaz; performans etkisi yoktur.

---

## 2. Air-gap desteği

F-MCP Bridge, dış ağa çıkmadan (air-gapped) ortamda çalışacak şekilde kurgulanabilir.

### Neler dışarı çıkmaz?

- **Figma REST API** kullanılmaz (plugin-only modda); tasarım verisi yalnızca yerel Figma Desktop + plugin üzerinden gelir.
- **Çalışma anında npm/registry** çağrısı yoktur; bağımlılıklar kurulum aşamasında çözülür.
- MCP iletişimi **stdio** (Claude ↔ MCP) ve **WebSocket localhost** (MCP ↔ plugin); ağda sadece yerel trafik.

### Air-gap kurulumu

1. **Bağımlılıklar:** Projeyi veya paketi **dış ağa sahip** bir ortamda bir kez hazırlayın:
   - `npm install` (veya `npm ci`)
   - `npm run build:local`
   - İsterseniz `node_modules` + `dist` (ve gerekirse `f-mcp-plugin`) klasörünü arşivleyip air-gap ortama taşıyın.
2. **Air-gap ortam:** Arşivi açın; `node dist/local-plugin-only.js` (veya Claude config’te bu yolu kullanın). Ekstra `npm install` veya dış erişim gerekmez.
3. **Plugin:** Figma’da plugin’i **manifest’ten** (Import plugin from manifest → `f-mcp-plugin/manifest.json`) veya **Organization private plugin** olarak yükleyin; dış plugin mağazasına ihtiyaç yoktur.
4. **Figma Desktop:** Normal kurulum; MCP/plugin kullanımı için Figma bulutuna tasarım verisi gönderilmez (Zero Trust).

### Özet

| Bileşen        | Air-gap notu |
|----------------|---------------|
| MCP sunucusu   | `dist/` + `node_modules` taşınır; npm’e çalışma anında erişim yok. |
| Plugin         | Repo içi `f-mcp-plugin` veya org plugin; harici mağaza gerekmez. |
| Figma API      | Kullanılmaz (plugin-only). |
| Claude / Cursor| Kendi kurulumları; MCP sadece stdio ile konuşur. |

---

## 3. Organization (private) plugin

Ekip/organizasyon içinde tek tıkla plugin dağıtımı için Figma **Organization** veya **Enterprise** planında plugin’i **private** yayınlayabilirsiniz.

### Avantajlar

- Kullanıcılar **Import plugin from manifest** yapmaz; plugin organizasyonun plugin listesinde görünür.
- **Plugins** (veya Resources → Plugins) menüsünden ekleyip çalıştırırlar; MCP tarafında yalnızca Claude config ve gerekirse kendi port (multi-instance) ayarları kalır.
- Review süreci yok; private yayından hemen sonra kullanılabilir.

### Gereksinimler

- Figma **Organization** veya **Enterprise** planı.
- [Create private organization plugins](https://help.figma.com/hc/en-us/articles/4404228629655-Create-private-organization-plugins) ve [Publish plugins](https://help.figma.com/hc/en-us/articles/360042293394) dokümanlarına göre **Publish to** kısmında **organization** seçilir (Community değil).

### MCP tarafı

Kurulum değişmez: her kullanıcı kendi makinesinde Claude config’te `dist/local-plugin-only.js` (veya NPX) ve isteğe bağlı `FIGMA_PLUGIN_BRIDGE_PORT` / plugin’de port seçimi (multi-instance). Org plugin yalnızca plugin’in Figma’da nasıl dağıtıldığını değiştirir.

---

## İlgili dokümanlar

- [README](../README.md) — Genel bakış, Zero Trust, kurulum
- [ONBOARDING](ONBOARDING.md) — Adım adım kurulum
- [MULTI_INSTANCE](MULTI_INSTANCE.md) — Çoklu kullanıcı (port 5454–5470)
- [PORT-5454-KAPALI](PORT-5454-KAPALI.md) — Port sorun giderme
