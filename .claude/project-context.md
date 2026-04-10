# F-MCP ATezer (Figma MCP Bridge) - Project Context

## Project Overview

**Name:** F-MCP ATezer (figma-mcp-bridge)
**Type:** Model Context Protocol (MCP) Server
**Language:** TypeScript
**Runtime:** Node.js >= 18

## Purpose

Enable AI coding assistants (Claude Code, Cursor) to access Figma plugin console logs and screenshots in real-time, allowing autonomous debugging without manual copy-paste.

## Key Technologies

- **@modelcontextprotocol/sdk** - MCP protocol implementation
- **Puppeteer** - Browser automation
- **Chrome DevTools Protocol (CDP)** - Console log capture
- **TypeScript** - Type-safe development
- **Jest** - Testing framework

## Architecture Pattern

3-tier architecture:
1. **MCP Server** - Protocol handling and tool registration
2. **Tool Implementations** - Business logic for each MCP tool
3. **Managers** - Browser automation, console monitoring, screenshots

## Core Features

1. `figma_get_console_logs()` - Retrieve console logs from plugin
2. `figma_take_screenshot()` - Capture plugin UI screenshots
3. `figma_watch_console()` - Stream logs in real-time
4. `figma_reload_plugin()` - Reload plugin after code changes
5. `figma_clear_console()` - Clear console log buffer

## Development Workflow

1. Plan feature → Use `/sc:implement`
2. Write code → Follow MCP SDK patterns
3. Add tests → Maintain 70%+ coverage
4. Run tests → Use `/sc:test`
5. Review code → Use `senior-code-reviewer` agent
6. Document → Update relevant docs

## Important Patterns

### MCP Tool Registration
```typescript
server.registerTool(
  "tool-name",
  {
    description: "What the tool does",
    inputSchema: { param: z.string() }
  },
  async ({ param }) => ({
    content: [{ type: "text", text: "result" }]
  })
);
```

### Console Log Truncation
Always truncate logs to prevent overwhelming AI context:
- Max string length: 500 chars
- Max array length: 10 elements
- Max object depth: 3 levels

### Error Handling
All tools must handle errors gracefully:
```typescript
try {
  // Tool logic
} catch (error) {
  return {
    content: [{ type: "text", text: `Error: ${error.message}` }],
    isError: true
  };
}
```

## Kullanıcı İstekleri — Otomatik Yanıt

### "F-MCP'yi güncelle" / "update" / "güncelle"
Terminal komutu verme. `bash scripts/update.sh` çalıştır, sonucu bildir:
> Güncelleme tamamlandı (vX.Y.Z). Claude'u yeniden başlat ve Figma'da plugin'i kapat-aç.

### "F-MCP'yi kur" / "setup" / "kur" / "bunu kur" / GitHub linki verildi
Kullanıcı GitHub linki (github.com/atezer/FMCP) verip "kur" derse veya herhangi bir şekilde kurulum isterse:

1. Repo zaten clone edilmişse: `bash scripts/setup.sh` çalıştır
2. Repo clone edilmemişse: şu komutu çalıştır:
   ```
   git clone https://github.com/atezer/FMCP.git && cd FMCP && bash scripts/setup.sh
   ```
3. Kullanıcıya sadece sonucu bildir:
   > Kurulum tamamlandı. Claude'u yeniden başlat ve Figma'da plugin'i aç → yeşil "Ready" yazısını gör.

Kullanıcıya ASLA terminal komutu söyleme, teknik adım açıklama. Her şeyi sen yap.

### Dil
Kullanıcı Türkçe konuşuyor. Tüm dosyalarda Türkçe karakterler (ş, ç, ğ, ö, ü, ı, İ) doğru kullanılmalı.

## Design System Kütüphaneleri

Kullanıcı lokal olarak design system kütüphaneleri kaydedebilir. Kayıtlı kütüphaneler `.claude/libraries/` dizininde bulunur (gitignored — repo'ya dahil edilmez).

### Kullanım kuralları

1. **Skill çalıştırmadan önce** `.claude/libraries/` dizinini kontrol et. Kayıtlı kütüphane varsa oku.
2. **Varsayılan kütüphane:** Kullanıcı "hangi kütüphane?" demişse veya context'ten anlaşılamıyorsa, kayıtlı kütüphanelerden ilkini kullan.
3. **Figma file key'leri** kütüphane dosyasındaki tablolardan al — URL'den parse etme, doğrudan `File Key` alanını kullan.
4. **Token okuma** her zaman kütüphanenin WEB/ana dosyasından yapılır.
5. **Platform seçimi:** Web ekranı → WEB dosyası, Mobil ekran → Mobil dosyası (yoksa WEB fallback).

### Design Token Kuralı (TÜM skill'ler için geçerli — ZORUNLU)

Hiçbir skill gömülü/hardcoded design token değeri içeremez ve kullanamaz. Font ailesi, renk kodu, font boyutu, spacing, radius, gölge — hiçbir tasarım değeri skill içine yazılmaz.

**Her tasarım değeri çalışma anında tasarım sisteminden okunur:**

1. **Önce kayıtlı kütüphaneyi oku:** `.claude/libraries/` dizinindeki kütüphane dosyasını kontrol et. Font ailesi, variable collection'lar ve style listesi orada.
2. **Canlı değerleri Figma'dan al:**
   - Font → `figma_get_styles()` text style'larından veya kütüphanenin `Font Ailesi` alanından
   - Renkler → `figma_get_variables()` veya `figma_get_styles()` paint style'larından
   - Boyutlar/spacing → `figma_get_variables()` variable collection'larından
   - Gölgeler → `figma_get_styles()` effect style'larından
3. **Bulunamazsa kullanıcıya sor.**
4. **Kullanıcı "sen seç" derse:** Font için `Inter`, renkler için Figma varsayılanları kullan.

**Skill'lerdeki kod örnekleri:** Örneklerde geçen değerler (renk hex, font adı, piksel boyutu) yalnızca FORMAT gösterimi içindir. Çalışma anında bu değerler her zaman tasarım sisteminden okunmalıdır.

### Mevcut kütüphaneler

Kayıtlı kütüphaneleri görmek için `.claude/libraries/` dizinini kontrol et. Her `.md` dosyası bir kütüphanedir. Kütüphane eklemek için `/add-library` komutunu kullan.

## References

- [Architecture](../docs/ARCHITECTURE.md) - Technical design
- [README](../README.md) - User documentation
