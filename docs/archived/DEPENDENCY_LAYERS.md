# Bağımlılık katmanları (taslak)

Bu paket tek `package.json` içinde birden fazla giriş noktası barındırır:

| Katman | Giriş | Ağır bağımlılıklar |
|--------|--------|---------------------|
| **Plugin-only** | `figma-mcp-bridge-plugin` → `dist/local-plugin-only.js` | MCP SDK, `zod`, `ws`, `pino` (+ geliştirme için `pino-pretty`) |
| **Yerel tam** | `figma-mcp-bridge` → `dist/local.js` | Üsttekiler + `puppeteer-core` (CDP) |
| **Cloudflare Workers** | `src/index.ts` → `build:cloudflare` | Üsttekiler + `@cloudflare/puppeteer`, `agents` (`McpAgent`) |

## Gelecekte olası ayrım

- **`@atezer/figma-mcp-bridge` (lite):** Yalnızca plugin-only ikili ve minimal `dependencies`; kurulum süresi ve yüzey alanı küçülür.
- **`@atezer/figma-mcp-bridge-full` veya `optionalDependencies`:** Puppeteer ve CDP yığını tam modu kullananlar için.

Şu an tek paket yayınlanır; `npx … figma-mcp-bridge-plugin` ile plugin-only çalıştırmak tam mod ikilisini çalıştırmaz ancak `node_modules` hâlâ tüm bağımlılıkları içerir (npm tek ağaç çözer).

## Kaldırılan / tutulan notlar

- `chrome-remote-interface`, `uuid`: kodda kullanım yoktu; kaldırıldı. İhtiyaç halinde yeniden eklenebilir.
- `agents`: Cloudflare `McpAgent` entegrasyonu için **gerekli**; kaldırılmamalı.
