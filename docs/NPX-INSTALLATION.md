# NPX Installation Method

**NPM hazır mı?** Evet. Paket **@atezer/figma-mcp-bridge** adıyla npm'de yayınlı. Kurulum: `npx @atezer/figma-mcp-bridge@latest` veya Git clone + build; detay: [ONBOARDING.md](ONBOARDING.md).

---

## Paketi npm'e yayınlamak için yapılacaklar

1. **npm hesabı**
   - [npmjs.com](https://www.npmjs.com) üzerinden hesap oluşturun (yoksa).
   - Terminalde: `npm login` — kullanıcı adı, şifre ve e-posta ile giriş yapın.

2. **İsim kontrolü**
   - Paket adı `figma-mcp-bridge` (package.json). Bu isim npm'de başkasına aitse yayınlayamazsınız; scoped kullanın: `@kullaniciadi/figma-mcp-bridge` ve package.json içinde `"name": "@kullaniciadi/figma-mcp-bridge"` yapın. Scoped paket ilk yayında: `npm publish --access public`.

3. **Build**
   - `prepublishOnly` script'i `npm run build` çalıştırır (build:local + build:cloudflare). Sadece MCP için yayınlayacaksanız Cloudflare build'i atlayabilirsiniz:
   - `npm run build:local` — sadece `dist/` (local + local-plugin-only) oluşturur.
   - Yayına girecek dosyalar: `dist/`, `f-mcp-plugin/`, `README.md`, `LICENSE` (package.json `files` alanında).

4. **Yayınlama**
   ```bash
   npm run build:local    # isteğe bağlı; prepublishOnly zaten build çalıştırır
   npm publish           # veya scoped ise: npm publish --access public
   ```

5. **Doğrulama**
   ```bash
   npm view @atezer/figma-mcp-bridge
   ```
   Sonrasında kullanıcılar `npx @atezer/figma-mcp-bridge@latest` ile kullanabilir.

**Not:** Güncelleme için `npm version patch` (veya minor/major) ardından `npm publish` yeterli.

---

> **Ne zaman gerekir?** Bu yöntem yalnızca paket **npm’e yayınlandıktan sonra** kullanılabilir. Şu an FMCP, Git clone + build ile kurulur; çoğu kullanıcı için **[ONBOARDING.md](ONBOARDING.md)** yeterlidir. npm’e publish etmeyi planlamıyorsanız bu dokümanı atlayabilirsiniz.

After publishing to npm, users can install via `npx` without cloning the repository.

**Plugin-only:** NPX ile çalıştırıldığında da plugin üzerinden WebSocket (port 5454) kullanılabilir; Figma token veya debug portu gerekmez. Paket plugin-only mod sunuyorsa config'te onu kullanın; aksi halde clone + `dist/local-plugin-only.js` ile kurulum yapın.

## Claude Desktop Configuration

Add this to your `.claude.json` (or `claude_desktop_config.json` on some systems):

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@atezer/figma-mcp-bridge@latest"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your_figma_access_token_here"
      }
    }
  }
}
```

Replace `your_figma_access_token_here` with your actual Figma access token.

## Benefits

✅ No source code clone required (npm handles distribution)
✅ Always uses the latest version with `@latest`
✅ Automatic updates when new versions are published
✅ Same functionality as Local Mode (uses `dist/local.js`)

**Note:** If you use **plugin-only** (e.g. run the plugin and connect via WebSocket), you do **not** need `FIGMA_ACCESS_TOKEN` or a Figma debug port; use `local-plugin-only.js` (or equivalent) in your MCP config. The token and 9222 restart apply when using full `local.js` with REST/console features.

For true zero-setup with OAuth authentication, use [Remote Mode](SETUP.md#remote-mode-setup-recommended) instead.

## Pinning to a Specific Version

If you prefer version stability:

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@atezer/figma-mcp-bridge@1.1.1"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your_figma_access_token_here"
      }
    }
  }
}
```

## First-Time Setup

The first time Claude Code runs `npx @atezer/figma-mcp-bridge`, it will:
1. Download the package from npm
2. Cache it locally
3. Start the MCP server

Subsequent runs will use the cached version unless you specify `@latest`.

## Comparison to Local Git Installation

| Method | Configuration | Updates | Use Case |
|--------|--------------|---------|----------|
| **NPX** | npm package path | Automatic with `@latest` | Users who want local execution without source code |
| **Local Git** | Source code path | Manual `git pull && npm run build` | Development/testing unreleased features |

**Both methods:**
- ✅ Can use **plugin-only** (`local-plugin-only.js`): no token, no debug port; plugin connects via WebSocket (5454)
- ✅ Or use full `local.js` (optional token, optional `--remote-debugging-port=9222` for console logs)
- ✅ Support F-MCP ATezer Bridge plugin

**For most users:** [Remote Mode](SETUP.md#remote-mode-setup-recommended) offers zero-setup with OAuth authentication.

## Prerequisites

**Required:**
- Node.js 18+
- Figma Desktop installed
- **Figma Personal Access Token** - [Generate one here](https://www.figma.com/developers/api#access-tokens)
- **Figma Desktop must be restarted** with `--remote-debugging-port=9222`

**Setup Steps:**
1. Get your Figma Personal Access Token (PAT)
2. Quit Figma Desktop completely
3. Relaunch with debug flag:
   - **macOS:** `open -a "Figma" --args --remote-debugging-port=9222`
   - **Windows:** `cmd /c "%LOCALAPPDATA%\Figma\Figma.exe" --remote-debugging-port=9222`
4. Verify http://localhost:9222 is accessible
5. Add `FIGMA_ACCESS_TOKEN` to your MCP config (see above)

**Authentication Note:** This method uses Personal Access Tokens, same as Local Git mode. For automatic OAuth authentication without manual token setup, use [Remote Mode](SETUP.md#remote-mode-setup-recommended).

## Publishing the Package

To enable this installation method, the maintainer needs to:

```bash
# 1. Ensure you're logged into npm
npm login

# 2. Build and publish
npm publish

# 3. Verify publication
npm view @atezer/figma-mcp-bridge
```

## Updating the Package

For maintainers:

```bash
# 1. Update version in package.json
npm version patch  # or minor/major

# 2. Build and publish
npm publish

# 3. Users with @latest will get the update automatically
```
