# Cursor — FCM Orkestratör Kurulumu

Cursor IDE üzerinde FCM orkestratör sisteminin kurulumu. Cursor'ın **kendi agent kavramı yoktur** ancak MCP server desteği ve project rules ile aynı workflow'u elde edebiliriz.

## Gereksinimler

- Cursor >= v0.42 (MCP support)
- Node.js >= 18 (figma-mcp-bridge için)
- Figma Desktop + F-MCP plugin aktif
- FCM repo clone edilmiş

## Kurulum

### 1. MCP Server

Repo root'una `.cursor/mcp.json` kopyala (template bu dizinde):

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "node",
      "args": ["/absolute/path/to/fmcp-plugin-host.js"],
      "env": { "FMCP_PORT": "5454" }
    }
  }
}
```

**Kritik:** `args` içindeki path **mutlak** (absolute) olmalı, relative çalışmaz.

### 2. Project Rule

`.cursor/rules/fmcp-orchestration.md` dosyasını ekle (template bu dizinde). Bu dosya Cursor'a FCM orchestrator skill'lerini nasıl kullanacağını öğretir.

Cursor'ın project rules v2 formatında yazılmıştır (`alwaysApply: false` — rule default'ta pasif, kullanıcı "apply rule" ile veya chat'te referans vererek aktifler).

### 3. Cursor'ı Yeniden Başlat

MCP ayarlarının yüklenmesi için gerekli.

### 4. Doğrulama

Cursor chat'te:

```
MCP durumunu kontrol et: figma_get_status() çağır
```

Beklenen: Plugin versiyon bilgisi döner. Dönmezse:
- Figma Desktop açık mı?
- F-MCP plugin aktif mi?
- `.cursor/mcp.json` path'leri doğru mu?

## Kullanım

### Pattern 1 — Explicit Rule Reference

Cursor chat'te orchestrator skill'i explicit belirt:

```
.cursor/rules/fmcp-orchestration.md kuralını uygula ve yeni bir onboarding ekranı yap
```

Cursor rule'u yükler, rule içindeki orchestrator skill referansını takip eder, `Read("skills/fmcp-screen-orchestrator/SKILL.md")` yapar, workflow'u uygular.

### Pattern 2 — Doğrudan Orchestrator Skill Referansı

Rule'a gerek kalmadan direkt skill'i çağır:

```
Lütfen skills/fmcp-screen-orchestrator/SKILL.md dosyasını oku ve workflow'unu uygula.
Görev: bir dashboard ekranı tasarla, aktif DS SUI, 3 alternatif üret.
```

Cursor main context'e orchestrator yüklenir (~5K token), sonra common case sub-skill'leri lazy Read eder.

### Pattern 3 — Audit veya Token Sync

Aynı pattern, farklı orchestrator:

```
skills/fmcp-ds-audit-orchestrator/SKILL.md'yi uygula: node 139:3407 için a11y audit
```

```
skills/fmcp-token-sync-orchestrator/SKILL.md'yi uygula: SUI tokenlarını tailwind.config.js'e export et
```

## Cursor-Özgü Notlar

| Özellik | Durum |
|---|---|
| MCP tools (figma_*) | ✅ Tam destek (Cursor v0.42+) |
| Sub-agent isolation | ❌ Yok (Cursor Task tool'u yok) |
| `AskUserQuestion` tool | ❌ Yok — orchestrator düz metinle sorar, kullanıcı düz metinle cevaplar |
| `.cursor/rules/*.md` auto-apply | ⚠️ `alwaysApply: false` ile pasif; kullanıcı explicit referans vermeli |
| Cache (`.claude/design-systems/`) | ✅ Filesystem access var, cache okunur/yazılır |
| Filesystem `Write` / `Edit` | ✅ Tam destek |

## Sub-Agent Isolation Yokluğu

Claude Code'da `Task(subagent_type: screen-builder)` sub-agent spawn ediyor, ~43.5K skill içeriği sub-agent context'ine düşüyor. Cursor'da bu yok:

- Orchestrator skill ana chat context'ine yüklenir
- Sonraki mesajlarda context'te kalır (Cursor context persistence ile)
- Büyük projelerde main context şişer — uzun oturumlarda **yeni chat** açman önerilir (orchestrator yeniden Read edilir)

## Token Telemetri (Beklenen)

| Metrik | Common Case |
|---|---|
| Main context (Cursor) | ~43.5K |
| İlk orchestrator yüklemesi | ~5K |
| Sub-skill lazy load (generate-figma-screen + canvas-ops) | ~37K |
| `figma_execute` sayısı | ≤5 (hedef) |

Baseline ile kıyasla: sub-agent isolation olmadığı için Claude Code main context'ine göre daha yüklü, ama Part 1 öncesi 61K'ya göre **-29%**.

## Sorun Giderme

| Sorun | Çözüm |
|---|---|
| MCP server görünmüyor | `.cursor/mcp.json` dosyasının **absolute path**'leri var mı? Cursor restart et. |
| `Read("skills/...")` "file not found" | Cursor cwd doğru mu? Repo root'ta açılmış mı? |
| Rule uygulanmıyor | Chat'te explicit `@fmcp-orchestration` veya "bu kuralı uygula" de. |
| Orchestrator uzun — context dolu | Yeni chat aç, sadece gerekli orchestrator'ı Read et. Çoklu orchestrator yükleme yapma. |
