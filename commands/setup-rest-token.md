# FIGMA_REST_TOKEN Setup

Kullanıcı "REST token kur", "REST token setup", "FIGMA_REST_TOKEN nasıl ayarlanır", "component discovery hızlandır" dediğinde bu komutu uygula.

Rule 24.1 REST API fallback'ini kullanabilmek ve library component'lerini **1-2 tool call'da** enumerate edebilmek için Figma Personal Access Token gereklidir.

## Ne zaman gerekli?

- Hedef dosyada Ana-DS (veya başka DS) library'leri **subscribed** ama Claude component'leri bulamıyor
- `figma_search_components` instance scan yavaş veya boş dönüyor
- Token-bound primitives fallback'e düşmek yerine **gerçek Ana-DS component instance** kullanmak istiyorsun

## Adım 1 — Figma Personal Access Token oluştur

1. [figma.com](https://figma.com) → sağ üst profil avatarı → **Settings**
2. Sol menü → **Security**
3. **Personal access tokens** bölümü → **Create new token**
4. Ayarlar:
   - **Name:** `FMCP Bridge` (veya dilediğin isim)
   - **Expiration:** 90 gün (güvenlik için; sonra yenile)
   - **Scopes:** `File content (read)` — SADECE read yetkisi yeterli
5. **Generate token** → token'ı **hemen kopyala** (sayfa yenilendiğinde bir daha görünmez!)

Token formatı: `figd_XXXXXXXXXXXXXXXXXXXXXXXXX`

## Adım 2 — Claude Desktop config'e ekle

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

Bu dosyayı aç (yoksa oluştur). Mevcut `figma-mcp-bridge` entry'sine `env` bloğu ekle:

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "node",
      "args": ["/Users/<user>/FCM/dist/local-plugin-only.js"],
      "env": {
        "FIGMA_REST_TOKEN": "figd_XXXXXXXXXXXXXXXXXXXXXXXXX"
      }
    }
  }
}
```

> `<user>` yerine kullanıcı adını yaz (örn. `abdussamed.tezer`).
> Token'ı tırnak içinde yapıştır. Satır başında/sonunda boşluk olmasın.

## Adım 3 — Claude Desktop restart

- `Cmd + Q` ile tamamen kapat (dock'tan değil, menüden)
- Yeniden aç
- MCP server artık `FIGMA_REST_TOKEN` env var'ını okur

## Adım 4 — Doğrulama

Yeni Claude Desktop chat başlat ve şunu yaz:

```
FMCP REST token aktif mi? figma_rest_api ile test et.
```

Claude `figma_rest_api(endpoint="/v1/me")` çağırır. Başarılıysa:
```
✅ REST token aktif, email: ..., handle: ...
```

Başarısızsa:
```
❌ 401 Unauthorized → token yanlış veya expired
❌ 403 Forbidden → token scope'u yetersiz (File content read lazım)
```

## Adım 5 — Kullanım

Artık `figma_rest_api` tool'u aktif. Örnek çağrılar:

```
Library components list:
  figma_rest_api(endpoint="/v1/files/<LIBRARY_FILE_KEY>/components")

Library variables:
  figma_rest_api(endpoint="/v1/files/<LIBRARY_FILE_KEY>/variables/local")

File metadata:
  figma_rest_api(endpoint="/v1/files/<FILE_KEY>")
```

Claude otomatik olarak Rule 24.1'i tetikler — `figma_search_assets` library components boş dönerse REST API'ye düşer.

## Güvenlik

- Token **user-local config**'te, repo'ya ASLA YAZILMAZ (`.env` veya `claude_desktop_config.json` user home'da)
- Token expire olduğunda Adım 1'den tekrar oluştur
- Token leak olursa Figma → Settings → Security → ilgili token'ı **Revoke** et
- `File content (read)` scope yeterli — yazma yetkisi verme (gereksiz risk)

## Ne zaman token GEREKMİYOR?

Token **isteğe bağlı** — G19 Step 3.1 Cache Populate (plugin API ile) alternatif yol sağlar:
- Plugin instance scan (`figma_search_components`) → `~/.claude/data/fcm-ds/<file-key>/components.md` otomatik populate
- Bir kez populate olduktan sonra cache-hit ile hızlı

REST token sadece **daha hızlı** (1-2 call vs 3-5 call) ve **boş dosya senaryosunda güvenli** (instance scan boş → REST fallback).

## Sorun giderme

- **"No token found"**: `claude_desktop_config.json` yanlış konumda veya JSON syntax error. JSON validator ile kontrol et.
- **401 Unauthorized**: Token yanlış yapıştırıldı veya expired. Adım 1'den tekrar.
- **Claude Desktop env var okumuyor**: Tam restart gerekli (Cmd+Q). Dock'tan "Quit" yetmez.
