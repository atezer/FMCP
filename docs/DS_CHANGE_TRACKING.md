# DS Değişiklik Takibi (Zamanlanmış)

Figma design system dosyalarınızdaki değişiklikleri (bileşen, varyant, token, ikon) düzenli olarak izleyip dev ekibi için iş taslağı çıkarmak için `ds-change-tracker` skill'i + zamanlanmış görev kurulumu.

## Gerekenler

- F-MCP Bridge kurulu ve plugin "Ready" ([KURULUM.md](../KURULUM.md))
- *(İsteğe bağlı)* Figma REST token'ı — plugin **Advanced → API Token** veya [`/setup-rest-token`](../commands/setup-rest-token.md). Yalnızca sürüm geçmişinden bileşen farkı için gerekir; token'ı sohbete yapıştırmayın.
- Zamanlanmış görev desteği olan bir istemci (ör. Claude Desktop / Cowork) ve isteğe bağlı bir iş takibi bağlayıcısı (Jira vb.)

## Kurulum

1. Köprüyü istemci config'ine ekleyin. Claude Desktop için `Settings > Developer > Edit Config`, `mcpServers` içine:

   ```json
   "figma-mcp-bridge": {
     "command": "npx",
     "args": ["-y", "@atezer/figma-mcp-bridge@latest", "figma-mcp-bridge-plugin"]
   }
   ```

   Node.js (`npx`) kurulu olmalı. Ayrıntılı ve platform bazlı kurulum: [KURULUM.md](../KURULUM.md).

2. İstemciyi tamamen kapatıp açın (macOS: Cmd+Q), yeni sohbet başlatın.
3. Figma'da plugin'i açın, port eşleşmesini bekleyin ("Ready").
4. Sohbette elle deneyin: `/track-ds-changes <figma-url> [<figma-url> ...]`. İlk koşu her dosya için **baz snapshot** oluşturur.
5. Zamanlamak için istemcinize örneğin: *"Her hafta içi 09:00'da `ds-change-tracker` skill'ini şu dosyalar için çalıştır: <url'ler>"*.

## Nasıl çalışır

| Yöntem | Token değer farkı | Bileşen/varyant farkı | Geçmişe dönük |
|---|---|---|---|
| Snapshot (token gerekmez) | ✅ | ✅ | ❌ — yalnızca ilk bazdan sonrası |
| Sürüm geçmişi (REST token) | ❌ | ✅ | ✅ |

- **Snapshot:** her koşuda variable grup özetleri, bileşen ve ikon sayıları `~/.claude/data/fcm-ds/<fileKey>/change-snapshots/` altına kaydedilir; bir sonraki koşuda karşılaştırılır. Repoya yazılmaz.
- **Sürüm geçmişi:** `GET /v1/files/:key/versions` + `GET /v1/files/:key?version=<id>` ile iki sürüm arasındaki **yapı** farkı. Figma REST API variable değerlerini sürüm bazında vermediği için geçmişe dönük token farkı bu yolla alınamaz — token takibine erken başlayıp baz snapshot almanız bu yüzden önemlidir.

Detay: [skills/ds-change-tracker/SKILL.md](../skills/ds-change-tracker/SKILL.md)

## Sınırlar

- Plugin'in bağlanması için Figma masaüstü açık ve hedef dosya açık olmalı.
- Zamanlanmış görevler istemci uygulaması açıkken çalışır.
- İş takibi alan eşlemeleri takıma özeldir; kendi iş takibi skill'inizle birleştirin.
