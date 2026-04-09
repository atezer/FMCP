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

## Design System Referansları

Proje tasarım sistemleri: `.claude/design-systems/` dizininde MD dosyaları olarak cache'lenir. Her kütüphane kendi alt klasörüne sahiptir.

**Framework dokümanı:** `.claude/design-systems/README.md` (detaylı kurallar ve örnekler burada)
**Slash komutları:** `/ds-add` (yeni kütüphane ekle), `/ds-sync` (güncelle)

### Kritik Kural — `_meta.md` Öncelikle Okunur
Kullanıcı tasarım sistemi konusunda (bileşen, token, ikon, renk, spacing vb.) çalışırken Claude şu sırayı izler:

1. **Önce:** `.claude/design-systems/<library>/_meta.md` oku (sync durumu kontrolü)
2. **Sonra:** `.claude/design-systems/<library>/<section>.md` oku (içerik)
3. **MD'de yoksa:** Figma MCP araçlarını kullan
4. **Figma'ya sadece** görsel doğrulama için git

### `_meta.md` Durum Kontrolü
Her okuma sırasında "Sync Durumu" bölümüne bak:
- **✅ TAMAMLANDI** → normal devam et; tarih 30 gün eskiyse "güncellemek ister misin?" öner; 60 gün eskiyse güçlü uyar
- **⚠️ YARIM KALDI** → kullanıcıya bildir: "Son sync yarım kaldı (X/Y). Tamamlamak ister misin?"
- **❌ HATA** → kullanıcıya detayı ilet ve yeniden deneme öner

### Kütüphane Seçimi
- Tek kütüphane varsa → otomatik kullan
- Birden fazla varsa → kullanıcıya hangisi sor
- Kullanıcı konuşmada söylerse (ör: "SUI button") → o kütüphane aktif say
- Farklı kütüphaneden istenirse sessizce geç + bilgilendir

### Yeni Kütüphane Ekleme (Akıllı Tespit)
Kullanıcı bir Figma linki verip "ekle" veya "bu kütüphaneyi ekle" derse:

1. URL'den file key çıkar
2. `.claude/design-systems/` altındaki `_meta.md` dosyalarını tara
3. Karar ver:
   - **Aynı file key var** → "Bu dosya zaten <X>'te kayıtlı. Güncelleyeyim mi?"
   - **Aynı isim var** → "<X> zaten kayıtlı. Değiştir / yeniden isimlendir / iptal?"
   - **Benzer isim var** (fuzzy) → "<Y>'ye kaynak olarak ekleyeyim mi yoksa ayrı kütüphane mi?"
   - **Hiç yok** → Yeni kütüphane olarak ekle
4. Figma MCP ile analiz et (variables, styles, components)
5. Bileşen isimlerinden section'ları otomatik tespit et (tokens/components/icons/mobile/assets)
6. Kullanıcıdan onay al, sonra oluştur
7. İlk sync'i otomatik başlat (süre uyarısı ile)

**Slash command kullanılmasa bile** bu mantığı doğal dilde uygula. `/ds-add` komut dosyasında tam akış yazılı.

### Sync (Güncelleme) Davranışı
Kullanıcı "güncelle" veya "sync" derse veya MD eski ise:

1. **Yedekleme:** Her MD dosyasını `.bak` olarak kopyala (rollback için)
2. **Resume kontrolü:** Mevcut MD'yi oku, `### <Başlık>` satırlarını regex ile çıkar → "done" listesi
3. **Sadece eksikleri çek:** Figma'dan güncel listeyi al, done ile karşılaştır, kalanları işle
4. **Batch'li işleme:** 5'er paralel `figma_get_component` çağrısı, her batch sonrası progress raporla
5. **Atomik append:** Her bileşen MD'ye tek tek append edilir (yarım yazma yok)
6. **Hata yönetimi:**
   - API timeout (tek öğe) → 3x retry (1s, 2s, 4s) → sonra skip + log
   - Bridge disconnect → DUR + `_meta.md`'yi "YARIM KALDI" işaretle + kullanıcıya bildir
   - Permission denied → section atla + uyar, diğerleriyle devam
7. **Sonuç:**
   - Tam başarı → `.bak` sil, `_meta.md`'yi ✅ TAMAMLANDI olarak güncelle
   - Kısmi başarı → `.bak` TUT, failed_items listele, ⚠️ KISMI BAŞARI
   - Tam başarısızlık → `.bak`'tan geri yükle

**`/ds-sync` komut dosyasında tam akış yazılı.**

### Resume Mantığı
Sync yarım kalırsa (crash, disconnect), bir sonraki `/ds-sync` çağrısı kaldığı yerden devam eder. Bu tamamen MD dosyasının kendisine dayanır — Claude mevcut `### <Başlık>`'ları okur, eksik olanları Figma'dan çeker. State dosyası gerekmez.

### Manuel Düzenleme Uyarısı
- `.claude/design-systems/` içindeki MD dosyaları **manuel düzenlenmemelidir**
- Her zaman `/ds-sync` veya doğal dil komutu kullan
- Manuel düzenleme yapılırsa sonraki sync'te kayıplar olabilir

## References

- [Architecture](../docs/ARCHITECTURE.md) - Technical design
- [README](../README.md) - User documentation
