---
description: FCM Figma MCP orkestrasyon kuralları — 3 orchestrator skill ile screen üretimi, DS audit ve token sync
alwaysApply: false
---

# FCM Orkestrasyon

FCM projesinde Figma ile ilgili 3 ana iş var. Her biri için ilgili orchestrator skill'i Read et ve workflow'unu uygula:

## 1. Ekran Üretimi (screen building)

**Trigger keyword'leri:** "ekran tasarla", "figma'da ekran oluştur", "alternatif üret", "screen yap", "bu görselden ilham al", "benchmark'tan varyasyon"

**Aksiyon:**
```
Read("skills/fmcp-screen-orchestrator/SKILL.md")
```
Skill Essentials'ındaki "Karar Akışı" bölümünü uygula. Sub-skill'leri (`generate-figma-screen`, `figma-canvas-ops`, `inspiration-intake`) **sadece karar anında** lazy Read et. Sezgisel "belki gerekir" Read yasak.

**Kritik kurallar:**
- v1.8.2 build-from-scratch: "alternatif/varyasyon/farklı/yeni/tasarla/redesign" → `figma_clone_screen_to_device` ASLA. Authoritative: `skills/fmcp-intent-router/SKILL.md:68-80`
- DS fallback chain: Component → Primitive variant → Token-bound frame → ham shape ASLA
- Inspiration only: benchmark/görselden değer alma YASAK, sadece niyet
- Self-audit: `figma_validate_screen(nodeId, minScore=80)` zorunlu, `minScore` her çağrıda explicit

## 2. DS Audit (design system denetimi)

**Trigger keyword'leri:** "DS audit", "compliance kontrol", "a11y kontrolü", "WCAG", "kontrast", "drift kontrol", "visual QA", "impact analizi"

**Aksiyon:**
```
Read("skills/fmcp-ds-audit-orchestrator/SKILL.md")
```
Essentials'ındaki "Audit Type Routing" tablosuna bak. Net olan mod'a göre ilgili sub-skill'i Read et:
- `audit-figma-design-system` (compliance)
- `figma-a11y-audit` (a11y)
- `design-drift-detector` (drift)
- `visual-qa-compare` (visual_qa)
- `ds-impact-analysis` (impact)

**Kritik kurallar:**
- Read-only: hiçbir mutation yok, sadece rapor + öneri
- Her SEVERE bulgu için somut nodeId zorunlu
- Cache-first: `.claude/audits/<YYYY-MM-DD>-<nodeId>.md` önce kontrol, 24h freshness
- 30 günden eski audit dosyalarını temizle (housekeeping)

## 3. Token Sync (design token senkronizasyonu)

**Trigger keyword'leri:** "token sync", "export tokens", "Tailwind'e aktar", "CSS variables", "Swift token", "Compose token", "design token pipeline"

**Aksiyon:**
```
Read("skills/fmcp-token-sync-orchestrator/SKILL.md")
```
Essentials'ındaki "Platform Routing" tablosuna bak. Hedef platformu (CSS / Tailwind / Swift / Compose / Sass) tespit et, ilgili sub-skill'i Read et:
```
Read("skills/design-token-pipeline/SKILL.md")
```

**Kritik kurallar:**
- Diff preview olmadan write YOK — zorunlu akış: dry-run → diff → kullanıcı onayı → write
- Platform belirsizse kullanıcıya sor (Cursor'da düz metin soru, `AskUserQuestion` tool'u yok)
- Write sonrası binding coverage raporu

## Ortak Orkestratör Protokolü

Her üç iş için de:

1. **Skill Registry** — tahmin yasak, her orchestrator'ın içinde açık liste
2. **Cheap-first** — `figma_get_*` çağrılarında `depth=1`, `verbosity="summary"`; ≤5 `figma_execute` hedefi
3. **Cache-first** — `.claude/design-systems/<lib>/` cache'i API'den önce oku
4. **User onay kapıları** — approach, destructive action, skill evolution, 3. self-audit fail
5. **Self-audit gate** — screen için `figma_validate_screen(minScore=80)`, audit için SEVERE kategori coverage, token sync için binding coverage
6. **Türkçe rapor** — metrik bloğu zorunlu (kullanılan skill'ler, API call, cache hit/miss, score)

## Cursor-Özgü Sınırlamalar

- `AskUserQuestion` tool YOK → orchestrator düz metinle sorar, kullanıcı düz metinle cevaplar
- `Task(subagent_type: ...)` YOK → sub-agent isolation yok, orchestrator main context'te çalışır
- Uzun oturumlarda yeni chat aç (context temizliği için)

Full protokol detayı: `agents/_orchestrator-protocol.md` (Cursor'da Read edilebilir ama common case'de gerekli değil — orchestrator skill'leri kondense versiyonu embed etmiş)
