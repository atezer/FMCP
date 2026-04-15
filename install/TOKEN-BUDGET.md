# FCM Token Budget — Baseline ve Gerçek Ölçümler

Bu dosya FCM orkestratör sisteminin token maliyetini ve platform-spesifik ölçümlerini özetler. Part 2 refactor sonrası gerçek rakamlarla güncel tutulur.

## Baseline (Part 1 Öncesi)

Orkestratör refactor'den önceki "worst case" token yükü, bir ekran üretimi için:

| Kaynak | Satır | Tahmini Token |
|---|---|---|
| `_orchestrator-protocol.md` | 185 | ~4K |
| `skills/fmcp-intent-router/SKILL.md` | 551 | ~12K |
| `skills/generate-figma-screen/SKILL.md` | 1002 | ~25K |
| `skills/figma-canvas-ops/SKILL.md` | 500 | ~12K |
| `skills/inspiration-intake/SKILL.md` | 195 | ~4K |
| Agent (eski, 170 satır) | 170 | ~4K |
| **Setup overhead (toplam)** | | **~61K** |

Bu 61K, gerçek Figma API çağrılarından **önce** sadece skill/agent content'in context'e düşmesinden geliyor.

Claude Code'da sub-agent isolation sayesinde main context ~4K'da kalıyordu (sadece `Task` call). Ama Cursor/Desktop/Web'de sub-agent yok → 61K direkt main context'e düşerdi (bu platformlar desteklenmiyordu zaten).

## Part 2 Sonrası — Faz A (Gerçek)

Orchestrator skill'ler + thin agent delegator + lazy sub-skill loading ile:

| Platform | Baseline | Faz A Gerçek | Kazanç |
|---|---|---|---|
| Claude Code (main context) | ~4K | ~4K | 0 (zaten düşüktü) |
| Claude Code (sub-agent) | ~61K | ~43.5K | **-29%** |
| Cursor (main context) | N/A | ~43.5K | +29% vs Part 1 başarısız |
| Claude Desktop (main context) | N/A | ~43.5K | +29% vs Part 1 başarısız |
| Claude Web (main context, plan-only) | N/A | ~10K | +29% vs Part 1 başarısız (sub-skill lazy skip olursa) |

*"N/A" = Part 1'de desteklenmiyordu, Part 2 ile destek geldi.*

### Sub-Agent Context Dökümü (Claude Code)

```
Faz A sub-agent context (common case — text_only intake):

- agent delegator (yeni):          1.5K   [screen-builder.md 73 satır]
- fmcp-screen-orchestrator (yeni): 5K     [229 satır]
- generate-figma-screen (lazy):    25K    [1002 satır, ana motor — her zaman lazım]
- figma-canvas-ops (lazy):         12K    [500 satır, pre-flight — her figma_execute öncesi]
─────────────────────────────────────
Toplam:                            ~43.5K

Atlananlar (lazy skip / embedding):
- _orchestrator-protocol.md (4K) → embedded in orchestrator Essentials
- fmcp-intent-router (12K) → common case text_only → skip
- inspiration-intake (4K) → common case text_only → skip
Toplam atlanan: 20K
```

### Platform-Specific Notlar

**Claude Code (sub-agent):**
- Sub-agent isolation sayesinde 43.5K **main conversation'a girmez**, sadece sub-agent'ta yaşar
- Main conversation sadece `Task` call + sonuç raporu görür (~4K)
- Paralel sub-agent spawn edilebilir (örn. 3 alternatif üretimi → 3 ayrı sub-agent, her biri 43.5K, toplam 130K ama hepsi izole)

**Cursor (main context):**
- Sub-agent yok → 43.5K main chat context'e düşer
- Uzun oturumlarda dikkat: 8-10 mesajda context şişer
- Öneri: her büyük iş için yeni chat aç

**Claude Desktop (main context):**
- Cursor ile aynı
- Ek dezavantaj: her yeni oturumda Project knowledge'dan orchestrator yeniden yüklenir (cache yok)

**Claude Web (plan-only mod, main context):**
- `figma_*` tool'ları yok → generate-figma-screen ve figma-canvas-ops lazım değil
- Sadece orchestrator Essentials yeterli
- Tahmini: ~5-10K (plan-only için minimal)
- Gerçek mutation gerektiğinde kullanıcı Claude Code'a aktarır

## Part 2 Hedef vs Gerçek Sapma

**İlk plan hedefi:** Setup overhead ≤15K (~%75 azalma)

**Gerçek:** ~43.5K (~%29 azalma)

### Neden Sapma?

Plan `generate-figma-screen` (25K) + `figma-canvas-ops` (12K) sabit yükünü hafife almıştı. Bu iki skill common case'de **her zaman** lazım:
- `generate-figma-screen` ana iş motoru
- `figma-canvas-ops` her `figma_execute` öncesi pre-flight

Lazy-loading bunları "yüklenmedi" haline getiremez çünkü fiilen gerekli. Asıl tasarruf protocol embedding, intent-router skip, inspiration-intake skip ve agent shrink'ten geldi — toplamı ~18K.

### %75 Hedefine Ulaşmak İçin Ne Gerekir?

`generate-figma-screen` ve `figma-canvas-ops` skill'lerinin **kendilerinin** Essentials/Advanced formatına refactor edilmesi gerekir. Bu, Part 2 scope dışı tutuldu çünkü:

1. Bu iki skill v1.8.x serisinde olgunlaştırıldı — regression riski yüksek
2. Büyük dosya değişiklikleri sub-skill consumer'lar için breaking olabilir
3. Token'dan kazanacağımız ek miktar (%29 → %75) cross-platform kapsama ana kazanım değildir

**Alternatif roadmap:** Part 3 milestone olarak "Sub-skill compaction" — plan dışı tutuldu, ileride gerekirse.

## Gerçek Telemetri Kayıtları

Bu bölüm kullanıcının verification senaryolarını çalıştırdıktan sonra doldurulur.

### Claude Code — Senaryo A (no_idea → sepet ekranı)

Henüz manuel test yapılmadı. Beklenen:
- Sub-agent context: ~43.5K
- `figma_execute` sayısı: ≤5
- Cache hit (ikinci çalıştırma): %60+
- `figma_validate_screen` skor: ≥80
- Türkçe rapor süresi: <2 dakika

| Test tarihi | Sub-agent context | figma_execute | Cache hit | Validate skor |
|---|---|---|---|---|
| TBD | | | | |

### Claude Code — Senaryo D (ds-auditor a11y)

Henüz manuel test yapılmadı. Beklenen:
- Sub-agent context: ~25K (audit orchestrator + figma-a11y-audit sub-skill, generate-figma-screen yok)
- `figma_execute` sayısı: 0 (read-only)
- Validate skor: N/A (audit mode)

| Test tarihi | Sub-agent context | Cache hit | SEVERE bulgu | Rapor süresi |
|---|---|---|---|---|
| TBD | | | | |

### Claude Code — Senaryo E (token-syncer Tailwind)

Beklenen:
- Sub-agent context: ~20K (token-sync orchestrator + design-token-pipeline)
- `figma_execute` sayısı: 0 (sadece read + Write)
- Diff preview: gösterildi
- Onay: alındı

| Test tarihi | Sub-agent context | Diff preview | Onay | Binding coverage |
|---|---|---|---|---|
| TBD | | | | |

### Cursor — Senaryo A (manuel test)

Kullanıcı tarafından yapılacak. Telemetri Cursor'ın context viewer'ında gözlemlenir.

| Test tarihi | Main context | figma_execute | Validate skor |
|---|---|---|---|
| TBD | | | |

### Claude Desktop — Senaryo A (manuel test)

Project knowledge referans akışı. Desktop'ta detaylı telemetri yok, kaba gözlem.

| Test tarihi | Hisli main context | figma_execute | Validate skor |
|---|---|---|---|
| TBD | | | |

## Sonuç

Cross-platform kapsama Part 2'nin asıl değeridir. %29 token azalması ek bonus, ama ana motivasyon 4 platformun desteklenmesi. Verification manuel testler tamamlandıkça bu dosya güncel rakamlarla zenginleşir.

Gelecekte %75+ hedefi için sub-skill compaction (Part 3) düşünülebilir, ama **gerekli olduğu kanıtlanana kadar** scope'a alınmadı.
