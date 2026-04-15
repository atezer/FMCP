# Claude Desktop — FCM Orkestratör Kurulumu

Claude Desktop uygulaması üzerinde FCM orkestratör sisteminin kurulumu. Claude Desktop **chat mode**'u hedef — Claude Code (CLI) için ayrı rehber var.

## Önemli Farklılıklar

Claude Desktop chat mode:
- ❌ `Task` tool yok (sub-agent isolation yok)
- ❌ `AskUserQuestion` tool yok (düz metin soru-cevap)
- ❌ Otomatik skill discovery yok — **manuel referans zorunlu**
- ✅ MCP server desteği var (figma-mcp-bridge çalışır)
- ✅ Project knowledge upload mümkün

## Gereksinimler

- Claude Desktop >= v0.7 (MCP support)
- Node.js >= 18 (figma-mcp-bridge için)
- Figma Desktop + F-MCP plugin aktif
- FCM repo filesystem'de erişilebilir (plugin host için)

## Kurulum

### 1. MCP Config

`claude_desktop_config.json` dosyasını bul:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

Template (`install/claude-desktop/claude_desktop_config.json`) içeriğini mevcut `mcpServers` bloğuna **merge** et (üzerine yazma, diğer server'ları koru):

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "node",
      "args": ["/REPLACE/WITH/ABSOLUTE/PATH/TO/fmcp-plugin-host.js"],
      "env": { "FMCP_PORT": "5454" }
    }
  }
}
```

**Kritik:** Path **mutlak** (absolute) olmalı, Desktop relative path çalıştırmaz.

### 2. Claude Desktop'ı Yeniden Başlat

MCP config yüklemesi için zorunlu. Restart sonrası MCP server bağlantısı kurulmalı — chat'te `figma_get_status()` çağır, plugin versiyonu dönüyorsa tamam.

### 3. Project Oluştur ve Skill Upload

Claude Desktop'ta yeni bir **Project** oluştur: "FCM Orchestration"

Project knowledge'a aşağıdaki dosyaları **upload** et (sırayla):

| # | Dosya | Açıklama |
|---|---|---|
| 1 | `skills/fmcp-screen-orchestrator/SKILL.md` | Ekran üretim orchestrator'ı |
| 2 | `skills/fmcp-ds-audit-orchestrator/SKILL.md` | DS audit orchestrator'ı |
| 3 | `skills/fmcp-token-sync-orchestrator/SKILL.md` | Token sync orchestrator'ı |
| 4 | (opsiyonel) `skills/fmcp-intent-router/SKILL.md` | Universal intent router (belirsiz istek için) |
| 5 | (opsiyonel) `agents/_orchestrator-protocol.md` | Ortak protokol full versiyonu (edge case referansı) |

**Not:** Claude Desktop'ın `skills/` klasörünü otomatik taraması yoktur. Her dosyayı Project knowledge olarak explicit yüklemek şart. Detaylı rehber: `PROJECT-KNOWLEDGE.md`.

## Kullanım — Manuel Referans Kuralı (KRİTİK)

Claude Desktop chat'te Claude orchestrator skill'i **otomatik referans etmez**. İlk prompt'ta kullanıcı explicit yazmalıdır:

### Doğru Kullanım ✅

```
Lütfen Project knowledge'daki fmcp-screen-orchestrator.md dosyasını referans al
ve workflow'unu uygula.

Görev: Bir e-ticaret sepet ekranı tasarla. Aktif DS SUI. 3 alternatif üret.
```

Claude Project knowledge'dan dosyayı okur, Essentials bölümündeki karar akışını uygular, sub-skill'leri lazy load eder, `figma_*` tool'larını çağırır.

### Yanlış Kullanım ❌

```
Bir sepet ekranı yap
```

→ Claude orchestrator skill'den habersiz, kendi yorumuyla çalışır. Token optimization ve DS disiplin kaybolur.

### Sonraki Prompt'lar

Aynı oturumda ilk prompt'ta referans verdikten sonra sonraki mesajlarda tekrar referansa gerek yok — Claude context'te tutar:

```
İlk prompt:  "fmcp-screen-orchestrator.md'yi uygula, sepet ekranı yap"
2. prompt:   "şimdi bir checkout ekranı ekle"   ← referans otomatik hatırlanır
3. prompt:   "alternatif 2 oluştur"              ← aynı
```

Yeni oturum açtığında **yine manuel referans** gerekir.

### 3 Orchestrator İçin Örnek Prompt'lar

**Ekran üretimi:**
```
Project knowledge'daki fmcp-screen-orchestrator.md'yi uygula. Görev: fitness tracker için bir onboarding ekranı, 3 aşamalı, SUI design system.
```

**DS audit:**
```
Project knowledge'daki fmcp-ds-audit-orchestrator.md'yi uygula. Görev: node 139:3407 için a11y (WCAG AA) denetimi.
```

**Token sync:**
```
Project knowledge'daki fmcp-token-sync-orchestrator.md'yi uygula. Görev: SUI tokenlarını tailwind.config.js'e export et, diff preview göster.
```

## Doğrulama

### Test 1 — MCP Bağlantısı

Yeni chat aç (FCM Orchestration project'inde):

```
figma_get_status() çağır
```

**Beklenen:** Plugin versiyon bilgisi. Dönmezse MCP config veya plugin çalışmıyor.

### Test 2 — Orchestrator Referansı

```
Lütfen Project knowledge'daki fmcp-screen-orchestrator.md'yi oku ve Essentials bölümünün "Skill Registry" tablosunu bana göster.
```

**Beklenen:** Tablo formatında 6 skill listesi. Çalışmıyorsa Project knowledge upload doğru olmamış.

### Test 3 — Tam Workflow

```
Lütfen Project knowledge'daki fmcp-screen-orchestrator.md'yi uygula.
Görev: Basit bir login ekranı tasarla (email + şifre input + giriş butonu + "şifremi unuttum" link'i).
Aktif DS belirtilmediyse benden sor.
```

**Beklenen:**
1. Claude orchestrator skill'i Read eder
2. Essentials → Karar akışı → `text_only` mod
3. Aktif DS için soru sorar (AskUserQuestion yok → düz metin soru)
4. Cevabın üzerine `figma_search_assets`, `figma_instantiate_component` vb. çağrılar
5. Self-audit: `figma_validate_screen(minScore=80)`
6. Türkçe rapor + metrik bloğu

## Sınırlamalar (Claude Code ile Kıyas)

| Özellik | Claude Code | Claude Desktop |
|---|---|---|
| Agent invocation | `Task(subagent_type: ...)` | ❌ Manuel skill Read |
| Sub-agent isolation | ✅ | ❌ Main context |
| `AskUserQuestion` tool | ✅ | ❌ Düz metin soru |
| Otomatik skill discovery | ✅ `agents/` scan | ❌ Manuel Project upload |
| MCP tool registry | ✅ | ✅ |
| Filesystem `Write` / `Edit` | ✅ | ⚠️ Filesystem MCP gerekir |
| Cache `.claude/design-systems/` | ✅ | ⚠️ Filesystem MCP gerekir |

## Filesystem Erişimi (Opsiyonel ama Önerilen)

Claude Desktop native olarak filesystem erişimi sağlamaz. Eğer Desktop'tan kod dosyalarına yazmak istiyorsan (örn. `tokens.css` update), **filesystem MCP server** eklemek gerekir:

```json
{
  "mcpServers": {
    "figma-mcp-bridge": { ... },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/<user>/FCM"]
    }
  }
}
```

Filesystem MCP yoksa `token-syncer` orchestrator'ı diff preview'u gösterir ama dosyaya yazamaz — kullanıcı manuel kopyalar.

## Token Telemetri (Beklenen)

| Metrik | Common Case |
|---|---|
| Main context (Desktop chat) | ~43.5K |
| İlk orchestrator yüklemesi (Project knowledge'dan) | ~5K |
| Sub-skill lazy load | ~37K |
| `figma_execute` sayısı | ≤5 (hedef) |

Baseline (Part 1 öncesi 61K) ile kıyasla: **-29%**.

## Sorun Giderme

| Sorun | Çözüm |
|---|---|
| MCP server listede yok | `claude_desktop_config.json` path'leri absolute mi? Desktop restart ettin mi? |
| `figma_get_status()` hata | Figma Desktop açık mı? F-MCP plugin aktif mi? |
| Claude Project knowledge'ı görmezden geliyor | İlk prompt'ta explicit "Lütfen Project knowledge'daki X.md'yi referans al" yazmalısın |
| `Write` tool yok | Filesystem MCP ekle veya token-syncer'ı Claude Code'da çalıştır |
| Her chat'te baştan referans ver | Normal — Desktop her oturumu sıfırdan başlatır |
