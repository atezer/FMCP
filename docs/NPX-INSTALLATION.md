# NPX Installation Method

**NPM hazır mı?** Evet. Paket **@atezer/figma-mcp-bridge** adıyla npm'de yayınlı (`v1.1.2`). NPX ile çalıştırıldığında **plugin-only** mod (`dist/local-plugin-only.js`) varsayılan olarak başlar — Figma token veya debug portu **gerekmez**.

---

## Kullanıcı kurulumu (NPX)

NPX ile clone yapmadan, tek config ile kurulum:

| Adım | Yapılacak |
|------|-----------|
| 1 | **Node.js kur** — [nodejs.org](https://nodejs.org) LTS. `node -v` ile kontrol edin. |
| 2 | **MCP config ekle** — Aşağıdaki JSON'u Cursor veya Claude config dosyasına yapıştırın. |
| 3 | **Cursor veya Claude'u yeniden başlatın** — MCP sunucusu port 5454'te otomatik başlar. |
| 4 | **Figma'da plugini açın** — Plugins → F-MCP ATezer Bridge → **"ready (:5454)"** bekleyin. |

### Plugin-only config (varsayılan — token yok, debug port yok)

**Cursor** — `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": ["-y", "@atezer/figma-mcp-bridge@latest"]
    }
  }
}
```

**Claude Desktop** — macOS: `~/Library/Application Support/Claude/claude_desktop_config.json` | Windows: `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": ["-y", "@atezer/figma-mcp-bridge@latest"]
    }
  }
}
```

İlk çalıştırmada `npx` paketi indirir; sonraki açılışlarda cache'den çalışır.

### Tam mod config (isteğe bağlı — console/screenshot için)

Tam mod (`dist/local.js`), Figma Desktop'un `--remote-debugging-port=9222` ile açılmasını ve `FIGMA_ACCESS_TOKEN` env var'ını gerektirir. NPX ile tam mod için `figma-mcp-bridge-full` komutunu kullanın:

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": ["-p", "@atezer/figma-mcp-bridge@latest", "figma-mcp-bridge-full"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your_figma_access_token_here"
      }
    }
  }
}
```

Tam mod ön koşulları:
1. Figma Personal Access Token — [buradan oluşturun](https://www.figma.com/developers/api#access-tokens)
2. Figma Desktop'u `--remote-debugging-port=9222` ile yeniden başlatın:
   - **macOS:** `open -a "Figma" --args --remote-debugging-port=9222`
   - **Windows:** `cmd /c "%LOCALAPPDATA%\Figma\Figma.exe" --remote-debugging-port=9222`
3. `http://localhost:9222` erişilebilir olmalı.

---

## Benefits

✅ No source code clone required (npm handles distribution)
✅ Always uses the latest version with `@latest`
✅ Automatic updates when new versions are published
✅ Plugin-only mode: **no token, no debug port** — plugin connects via WebSocket (5454)

## Pinning to a Specific Version

If you prefer version stability:

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": ["-y", "@atezer/figma-mcp-bridge@1.1.2"]
    }
  }
}
```

## Comparison to Local Git Installation

| Method | Configuration | Updates | Use Case |
|--------|--------------|---------|----------|
| **NPX** | npm package | Automatic with `@latest` | Users who want local execution without source code |
| **Local Git** | Source code path | Manual `git pull && npm run build` | Development/testing unreleased features |

**Both methods:**
- ✅ Default: **plugin-only** (`local-plugin-only.js`): no token, no debug port; plugin connects via WebSocket (5454)
- ✅ Optional: full mode (`local.js`) for console logs / screenshot via CDP
- ✅ Support F-MCP ATezer Bridge plugin

---

## Paketi npm'e yayınlamak için (maintainer)

1. **npm hesabı** — [npmjs.com](https://www.npmjs.com) üzerinden `npm login`.
2. **Build:** `npm run build:local` (veya `npm run build` — Cloudflare dahil).
3. **Yayınlama:**
   ```bash
   npm version patch   # veya minor/major
   npm publish --access public
   ```
4. **Doğrulama:** `npm view @atezer/figma-mcp-bridge`

Yayına girecek dosyalar: `dist/`, `f-mcp-plugin/`, `README.md`, `LICENSE` (package.json `files` alanında).
