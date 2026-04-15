# Claude Code — FCM Orkestratör Kurulumu

Bu rehber Claude Code CLI üzerinde FCM orkestratör sisteminin kurulumunu ve doğrulanmasını kapsar. Claude Code, FCM sisteminin **referans platformudur** — agent isolation, sub-agent spawn, MCP tool registry tam desteklidir.

## Gereksinimler

- Claude Code CLI >= 1.0 (Opus 4.6 desteği)
- Node.js >= 18 (figma-mcp-bridge için)
- Figma Desktop uygulaması (F-MCP plugin yüklü ve aktif)
- Repo clone edilmiş: `/Users/<user>/FCM`

## Kurulum

### 1. MCP Server Kaydı

`~/.claude/mcp.json` veya repo'daki `.claude/settings.json` içinde `figma-mcp-bridge` tanımlı olmalı:

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

Repo'da template dosyası: `claude_desktop_config_ornek.json` (yollar düzenlenmeli).

### 2. F-MCP Plugin Figma Desktop'ta

1. Figma Desktop aç
2. `Plugins → Development → Import plugin from manifest` → repo'daki `f-mcp-plugin/manifest.json` seç
3. Plugin'i aktifleştir, WebSocket bağlantısı `localhost:5454`'e kurulur
4. Doğrulama: `figma_get_status()` çağrısı plugin versiyonunu döner

### 3. Agent Doğrulama

Claude Code agent'ları `agents/` dizininden otomatik taranır. Mevcut agentlar:

```bash
ls agents/
# _orchestrator-protocol.md   (ortak protokol — agent'lar Read ile yükler)
# screen-builder.md           (thin delegator → fmcp-screen-orchestrator skill)
# ds-auditor.md               (thin delegator → fmcp-ds-audit-orchestrator skill)
# token-syncer.md             (thin delegator → fmcp-token-sync-orchestrator skill)
```

### 4. Orchestrator Skill Doğrulama

```bash
ls skills/fmcp-*-orchestrator/
# fmcp-screen-orchestrator/SKILL.md
# fmcp-ds-audit-orchestrator/SKILL.md
# fmcp-token-sync-orchestrator/SKILL.md
```

Agent'lar bu skill'leri `Read("skills/fmcp-<X>-orchestrator/SKILL.md")` ile yükler.

## Kullanım

### Task Tool ile Agent Çağrısı

```
Task(subagent_type: "screen-builder", prompt: "bir e-ticaret sepet ekranı tasarla, aktif DS SUI")
```

Sub-agent:
1. `Read("agents/screen-builder.md")` (agent file'ı kendi context'ine yüklendi — Task tool yaptı)
2. `Read("skills/fmcp-screen-orchestrator/SKILL.md")` (orchestrator skill yükleniyor)
3. Essentials'tan karar akışını uygula
4. Common case: `Read("skills/generate-figma-screen/SKILL.md")` + `Read("skills/figma-canvas-ops/SKILL.md")`
5. `figma_execute` ile Figma'ya yaz
6. `figma_validate_screen(minScore=80)` self-audit
7. Türkçe rapor main conversation'a döner

### Doğrudan Skill Read (Task olmadan)

Agent ile uğraşmadan, Claude Code main conversation'da:

```
Read("skills/fmcp-screen-orchestrator/SKILL.md")
```

Orchestrator skill main context'e yüklenir, Claude workflow'u uygular. Bu mod sub-agent isolation'ı kaybeder ama daha basittir.

## Doğrulama Senaryoları

### Senaryo A — "no_idea" Flow

```
Task(
  subagent_type: "screen-builder",
  prompt: "yeni bir fitness tracker profil ekranı yap, fikrim yok bir şey öner"
)
```

**Beklenen:**
- Orchestrator Essentials → `no_idea` moduna düşer
- `AskUserQuestion` ile 4 soru sorar
- Kullanıcı yanıtları sonrası generate-figma-screen workflow'u çalışır
- Self-audit `validate_screen ≥80`
- Türkçe rapor metrik bloğuyla

### Senaryo D — DS Audit (a11y)

```
Task(
  subagent_type: "ds-auditor",
  prompt: "bu ekranın kontrastını kontrol et: nodeId 139:3407"
)
```

**Beklenen:**
- Orchestrator Essentials → `a11y` moduna
- `Read("skills/figma-a11y-audit/SKILL.md")`
- Cache kontrol: `.claude/audits/` içinde 24h içinde bu nodeId var mı?
- Rapor: SEVERE/ADVISORY bulgular + her biri için somut nodeId

### Senaryo E — Token Sync (Tailwind)

```
Task(
  subagent_type: "token-syncer",
  prompt: "SUI design system tokenlarını tailwind.config.js'e export et"
)
```

**Beklenen:**
- Platform routing → `tailwind`
- `Read("skills/design-token-pipeline/SKILL.md")`
- Dry-run → diff preview → `AskUserQuestion` onay → write
- Binding coverage raporu

## Sorun Giderme

| Sorun | Çözüm |
|---|---|
| `Task` tool agent bulamıyor | `agents/` dizini cwd'de mi? `pwd` kontrol et. Worktree kullanıyorsan worktree'ye cd et. |
| `figma_get_status()` timeout | Figma Desktop açık mı? F-MCP plugin aktif mi? Port çakışması yoksa `FMCP_PORT` değiştir. |
| Sub-agent `Read()` hata veriyor | `.claude/settings.local.json` içinde `Read(//Users/<user>/FCM/**)` izni var mı? |
| `figma_validate_screen` hep <80 | Orchestrator Advanced bölümündeki Error Recovery Matrix'i izle. |

## Token Telemetri (Beklenen)

| Metrik | Common Case |
|---|---|
| Main context (Claude Code) | ~4K |
| Sub-agent context | ~43.5K |
| `figma_execute` sayısı | ≤5 (hedef) |
| Cache hit (ikinci çalıştırma) | %60-70 |

Baseline (Part 1) ile kıyasla: sub-agent context 61K → 43.5K (**-29%**).
