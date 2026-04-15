# Claude Web (claude.ai) — FCM Orkestratör Kurulumu

Claude Web (claude.ai browser) üzerinde FCM orkestratör sisteminin kurulumu. **En kısıtlı platform** — `figma-mcp-bridge` cloud hosting ertelendiği için `figma_*` tool'ları şu an çalışmaz. Skill içeriği ve "plan-only" akış çalışır.

## Önemli Kısıtlama (Güncel Durum)

| Özellik | Durum |
|---|---|
| MCP server (figma-mcp-bridge) | ❌ **Şu an yok** — bridge localhost:5454 WebSocket, browser erişemez |
| `figma_*` tool çağrıları | ❌ Çalışmaz |
| Orchestrator skill içeriği | ✅ Project knowledge olarak yüklenebilir |
| Plan-only workflow | ✅ Claude metinle adımları anlatır |
| `Write` / `Edit` filesystem | ❌ Yok |

Bridge cloud hosting milestone ileride planlanmış (detay: `DEFERRED-BRIDGE.md`). O zamana kadar Claude Web **plan-only** modda çalışır: kullanıcı talebi alınır, orchestrator workflow'u adım adım metinle anlatılır, gerçek mutation için "bunu Claude Code'da veya Cursor'da çalıştır" yönlendirmesi verilir.

## Gereksinimler

- claude.ai hesabı (Projects feature gerekir — Pro veya Team plan)
- FCM repo'dan skill dosyalarına erişim (local veya GitHub)

## Kurulum

### 1. Yeni Project Oluştur

claude.ai → Projects → **"+ New Project"** → isim: "FCM Orchestration"

### 2. Project Knowledge Upload

Project knowledge bölümüne aşağıdaki dosyaları upload et:

| # | Dosya | Zorunlu |
|---|---|---|
| 1 | `skills/fmcp-screen-orchestrator/SKILL.md` | ✅ |
| 2 | `skills/fmcp-ds-audit-orchestrator/SKILL.md` | ✅ |
| 3 | `skills/fmcp-token-sync-orchestrator/SKILL.md` | ✅ |
| 4 | `skills/fmcp-intent-router/SKILL.md` | Opsiyonel |
| 5 | `agents/_orchestrator-protocol.md` | Opsiyonel (full protokol referans) |

Upload yöntemi: claude.ai Project sayfasında "Add knowledge" veya drag-and-drop.

### 3. Project Instructions (Opsiyonel Ama Önerilir)

Project Settings → Custom Instructions → şunu ekle:

```
Bu Project FCM (Figma MCP Bridge) tasarım iş akışları için orchestrator skill'leri içerir. Kullanıcı ekran üretimi, DS audit veya token sync istediğinde:

1. İlk iş: Project knowledge'daki ilgili fmcp-*-orchestrator.md dosyasını Read et
2. Skill Essentials bölümündeki "Karar Akışı"nı uygula
3. Claude Web'de figma_* tool'ları mevcut değildir — workflow'u metinle anlat, mutation adımları için kullanıcıya "bunu Claude Code'da veya Cursor'da çalıştır" de
4. Tüm yanıtlar Türkçe, orchestrator'ın rapor formatına uygun
```

Bu talimat sayesinde her chat'te manuel referans vermek zorunda kalmazsın — Claude Project içinde otomatik hatırlar.

## Kullanım Modları

### Mod 1 — Plan-Only (şu an mümkün olan)

Kullanıcı bir tasarım işi ister, Claude orchestrator workflow'unu metinle yürütür:

```
Kullanıcı: "SUI design system ile bir e-ticaret sepet ekranı tasarla, 3 alternatif"

Claude:
1. Orchestrator Essentials okur, text_only mod → generate-figma-screen workflow
2. DS kontrolü: "Aktif DS SUI varsayıyorum, doğru mu?"
3. Build-from-scratch gerekçesi: "alternatif" keyword'ü → v1.8.2 kuralı, clone değil
4. Her alternatif için layout planı (skeleton → content → polish)
5. Adım adım talimat:
   "Şimdi Claude Code'da şunu çalıştır:
   Task(subagent_type: 'screen-builder', prompt: '3 alternatif e-ticaret sepet ekranı, aktif DS SUI')"
```

Kullanıcı bu talimatı alıp Claude Code'a taşır. Claude Web planı, Claude Code implement eder.

### Mod 2 — Eğitim / Dokümantasyon (ikincil)

Claude Web orchestrator skill içeriğini insan-okunabilir özet olarak anlatabilir:

```
Kullanıcı: "fmcp-screen-orchestrator nasıl çalışıyor anlat"

Claude: [Orchestrator'ın Essentials bölümünü açıklayıcı şekilde özetler]
```

Bu mod FCM sistemini yeni öğrenen ekip üyeleri için yararlı.

### Mod 3 — Skill Evolution Tartışması

Yeni bir orchestrator skill veya mevcut skill edit'i için Claude Web'de kullanıcıyla tartışılabilir, draft hazırlanabilir. Draft metni sonra Claude Code'da `Write` ile kalıcılaştırılır.

## Bridge Cloud Hosting (Gelecek)

Claude Web'de gerçek `figma_*` tool çağrılarını mümkün kılmak için figma-mcp-bridge'in remote/cloud versiyonu gerekir. Üç yaklaşım:

1. **Ngrok / cloudflared tunnel** — Local bridge'i tunnel üzerinden expose et, Claude Web MCP Connector olarak ekle
2. **Cloudflare Workers** — Bridge mantığını Workers'a deploy et (WebSocket relay)
3. **Dedicated VPS** — Bridge binary'sini VPS'te host et, Claude Web'den bağlan

Detay ve tradeoff'lar: `DEFERRED-BRIDGE.md`

## Sorun Giderme

| Sorun | Çözüm |
|---|---|
| "Orchestrator skill'i bulamıyor" | Project knowledge'a dosyaları upload ettin mi? İlk prompt'ta explicit referans ver |
| "figma_get_status çağıramıyorum" | Doğru — Claude Web'de MCP yok. Plan-only mod kullan |
| Plan verildi ama Claude Code'da çalıştırmak istiyorum | Talimatı kopyala → Claude Code session aç → Task tool çağır |
| Custom instructions çalışmıyor | Project restart et (yeni chat aç), instructions değişikliği yeni chat'te geçerli |

## Token Telemetri

| Metrik | Common Case |
|---|---|
| Main context (Claude Web) | ~43.5K |
| Orchestrator yüklemesi (Project knowledge'dan RAG) | ~5K |
| Sub-skill lazy load | ~37K (Claude Web'de daha az: gerçekten ihtiyaç duyulmazsa okumaz) |
| `figma_execute` sayısı | 0 (plan-only mod) |

Plan-only mod olduğu için context daha temiz kalabilir — Claude sadece orchestrator Essentials'ı kullanır, sub-skill'leri okumaz (mutation olmadığı için detaya gerek kalmaz).

## FCM Akışı — Cross-Platform Hybrid

İdeal kullanım: planı Claude Web'de yap, implementi Claude Code'da çalıştır:

```
1. Claude Web (plan-only mod):
   - Skill tartışması, workflow review, rapor analizi
   - Yeni skill draft hazırlığı
   - Screenshot analizi (Claude vision Project knowledge'dan)

2. Claude Code (implement):
   - Task(subagent_type: ...) ile gerçek Figma mutation
   - Cache güncelleme
   - Commit

3. Claude Desktop veya Cursor (alternatif implement):
   - Main context'te doğrudan orchestrator skill
```

Her platform güçlü olduğu yerde kullanılır.
