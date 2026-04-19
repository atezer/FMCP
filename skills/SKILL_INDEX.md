# F-MCP Skill Dizini

## Workspace kökü (önemli)

Cursor, Claude Code veya VS Code'da **klasör / workspace kökü olarak bu repoyu** (`FCM`, yani `package.json` bu kökte görünecek şekilde) açın. Skill'ler `skills/<skill>/SKILL.md` dizinindedir. Eski `.cursor/skills/f-mcp/` yolu da symlink ile desteklenir.

## Personalar

| Kısaltma | Persona | Açıklama |
|---|---|---|
| `designer` | **Tasarımcı** | Bileşen tasarımı, DS kullanarak ekran çizimi, custom UI |
| `designops` | **DesignOps** | DS yönetimi, etki analizi, token yönetimi, kalite kontrolü |
| `uidev` | **UI Geliştirici** | iOS/Android/Web arayüz geliştirme, Figma'dan kod üretme |
| `po` | **PO/PM/SEM** | UI analiz, tasarım durumu raporlama, karar alma |

## Kişiselleştirme — Marka Profili

Tüm skill'ler `.fmcp-brand-profile.json` dosyasını okuyarak marka ses/ton, tipografi, estetik yön ve copy kurallarını otomatik uygular. Detay: [BRAND_PROFILE_SCHEMA.md](BRAND_PROFILE_SCHEMA.md)

**Oluşturma:** `ux-copy-guidance` skill'i profil yoksa otomatik 3-soru akışı başlatır. Manuel olarak da proje köküne `.fmcp-brand-profile.json` dosyası eklenebilir.

## Skill Listesi (26 skill)

### Temel Kurallar

| Skill | Dosya | Personalar | Kısa açıklama |
|---|---|---|---|
| `fmcp-project-rules` | [fmcp-project-rules/SKILL.md](fmcp-project-rules/SKILL.md) | designer, designops, uidev, po | Design Token Kuralı, Bağlı Token Kuralı, kütüphane yönetimi, otomatik yanıt kuralları — tüm skill'ler için geçerli |

### Dokümantasyon ve İçerik

| Skill | Dosya | Personalar | Kısa açıklama |
|---|---|---|---|
| `component-documentation` | [component-documentation/SKILL.md](component-documentation/SKILL.md) | designer, designops, uidev | Bileşen kullanım kılavuzu oluşturma (Standard/Compact format, durumlar, copy spec, endüstri standartları referansı) |
| `ux-copy-guidance` | [ux-copy-guidance/SKILL.md](ux-copy-guidance/SKILL.md) | designer, uidev, po | UX yazarlık rehberi — CTA, hata mesajı, boş durum, onay diyaloğu kalıpları + marka ses/ton kişiselleştirmesi |

### Tuval Yazma ve Oluşturma

| Skill | Dosya | Personalar | Kısa açıklama |
|---|---|---|---|
| `figma-canvas-ops` | [figma-canvas-ops/SKILL.md](figma-canvas-ops/SKILL.md) | designer, designops | `figma_execute` güvenli kullanım kılavuzu (zorunlu önkoşul) |
| `generate-figma-screen` | [generate-figma-screen/SKILL.md](generate-figma-screen/SKILL.md) | designer, uidev | Kod/açıklamadan Figma'da ekran oluşturma |
| `generate-figma-library` | [generate-figma-library/SKILL.md](generate-figma-library/SKILL.md) | designops, designer | Koddan DS kütüphanesi inşa (5 fazlı) |
| `figjam-diagram-builder` | [figjam-diagram-builder/SKILL.md](figjam-diagram-builder/SKILL.md) | designer, designops, po | FigJam diyagram/süreç şeması |
| `inspiration-intake` | [inspiration-intake/SKILL.md](inspiration-intake/SKILL.md) | designer, uidev | Image / Figma benchmark / URL'den structural_intent çıkarma ("inspiration only" disiplinle, değer çıkarmaz — ön-işleme katmanı) |
| `figma-prototype-flow` | [figma-prototype-flow/SKILL.md](figma-prototype-flow/SKILL.md) | designer, uidev | Üretilen ekranlar arası prototip bağlantıları + animasyonlar + flow starting point + scroll behavior (Figma Prototype panel'inin tüm yeteneklerini uç uca otomasyon, otonom mod default) |

### Cross-Platform Orkestratörler

Agent orkestrasyon mantığını tek kaynaktan 4 platforma taşıyan skill'ler (Claude Code / Cursor / Claude Desktop / Claude Web). Condensed-first: her orchestrator Essentials bölümü %80 case'i kapsar, Advanced sadece edge case'lerde okunur. Kurulum rehberleri: [install/](../install/)

| Skill | Dosya | Personalar | Kısa açıklama |
|---|---|---|---|
| `fmcp-screen-orchestrator` | [fmcp-screen-orchestrator/SKILL.md](fmcp-screen-orchestrator/SKILL.md) | designer, uidev | DS-compliant Figma ekran üretimi orkestratörü — 4 intake modu (text/benchmark/image/no_idea), DS fallback chain, step-by-step mode, self-audit gate |
| `fmcp-ds-audit-orchestrator` | [fmcp-ds-audit-orchestrator/SKILL.md](fmcp-ds-audit-orchestrator/SKILL.md) | designops, uidev | 5 audit tipi orkestrasyonu (compliance / a11y / drift / visual_qa / impact), read-only discipline, cache-first audit |
| `fmcp-token-sync-orchestrator` | [fmcp-token-sync-orchestrator/SKILL.md](fmcp-token-sync-orchestrator/SKILL.md) | designops, uidev | Token sync orkestratörü (CSS / Tailwind / Swift / Compose / Sass), diff preview zorunluluğu, binding coverage raporu |
| `fmcp-screen-recipes` | [fmcp-screen-recipes/SKILL.md](fmcp-screen-recipes/SKILL.md) | designer, uidev | Fast Path cookbook — 9 standart ekran tipi (login/payment/profile/list/detail/form/onboarding/dashboard/settings) için linear 9-adımlı recipe. Figma native device presets, SUI native variable modes, chunking built-in (Rule 5a), her adımda Türkçe micro-report. Common case'de %40-50 daha hızlı, generate-figma-screen'i atlar. |

### DS Denetim ve Düzeltme

| Skill | Dosya | Personalar | Kısa açıklama |
|---|---|---|---|
| `audit-figma-design-system` | [audit-figma-design-system/SKILL.md](audit-figma-design-system/SKILL.md) | designer, designops, po | Tuval içi DS denetimi (salt okunur) |
| `fix-figma-design-system-finding` | [fix-figma-design-system-finding/SKILL.md](fix-figma-design-system-finding/SKILL.md) | designer, designops | Tek audit bulgusunu dar kapsamda düzelt |
| `apply-figma-design-system` | [apply-figma-design-system/SKILL.md](apply-figma-design-system/SKILL.md) | designer, designops | Ekran geneli DS reconcile |

### Token ve Kod Senkronu

| Skill | Dosya | Personalar | Kısa açıklama |
|---|---|---|---|
| `design-token-pipeline` | [design-token-pipeline/SKILL.md](design-token-pipeline/SKILL.md) | uidev, designops | Figma ↔ kod token dönüşümü (çift yönlü) |
| `code-design-mapper` | [code-design-mapper/SKILL.md](code-design-mapper/SKILL.md) | uidev, designops | Figma bileşen ↔ çoklu platform kod eşlemesi |
| `design-system-rules` | [design-system-rules/SKILL.md](design-system-rules/SKILL.md) | designops, uidev | Platforma özel DS kuralları üretimi |

### Implementasyon ve Teslim

| Skill | Dosya | Personalar | Kısa açıklama |
|---|---|---|---|
| `ai-handoff-export` | [ai-handoff-export/SKILL.md](ai-handoff-export/SKILL.md) | uidev, po | HANDOFF şablonu + manifest + executive summary |
| `implement-design` | [implement-design/SKILL.md](implement-design/SKILL.md) | uidev | Figma → iOS/Android/Web production kod |

### Doğrulama ve Analiz

| Skill | Dosya | Personalar | Kısa açıklama |
|---|---|---|---|
| `design-drift-detector` | [design-drift-detector/SKILL.md](design-drift-detector/SKILL.md) | uidev, designops, po | Kod ↔ Figma token/değer drift tespiti |
| `visual-qa-compare` | [visual-qa-compare/SKILL.md](visual-qa-compare/SKILL.md) | uidev, designops | Figma vs kod görsel/pixel karşılaştırma |
| `figma-a11y-audit` | [figma-a11y-audit/SKILL.md](figma-a11y-audit/SKILL.md) | designops, uidev, designer | Erişilebilirlik denetimi (WCAG, VoiceOver, TalkBack, ARIA) |
| `figma-screen-analyzer` | [figma-screen-analyzer/SKILL.md](figma-screen-analyzer/SKILL.md) | po, designer | PO/PM/SEM için UI analiz raporu |
| `ds-impact-analysis` | [ds-impact-analysis/SKILL.md](ds-impact-analysis/SKILL.md) | designops, po | DS değişiklik etki analizi ve risk skoru |

## Persona Bazlı Önerilen Akışlar

### Tasarımcı (designer)

```
1. figma-canvas-ops (önkoşul)
2. generate-figma-library (DS kütüphanesi yoksa)
   VEYA generate-figma-screen (ekran oluşturma — tasarım yönü belirleme adımı dahil)
3. ux-copy-guidance (ekran text node'ları için copy kalitesi)
4. component-documentation (bileşen kullanım kılavuzu — durumlar ve copy spec dahil)
5. audit-figma-design-system (kalite kontrol — DS eksiksizlik çerçevesi dahil)
6. fix / apply (düzeltme gerekiyorsa)
7. figma-a11y-audit (erişilebilirlik kontrol — WCAG çerçevesi dahil)
```

### DesignOps

```
1. audit-figma-design-system (DS sağlık kontrolü — DS eksiksizlik çerçevesi: token kategorileri, bileşen durumları, pattern kapsamı)
2. ds-impact-analysis (değişiklik öncesi etki analizi)
3. apply-figma-design-system (DS hizalama)
4. design-token-pipeline (token senkronu — motion token'lar dahil)
5. design-system-rules (kural üretimi — DS prensipleri ve pattern katmanı dahil)
6. figma-a11y-audit (erişilebilirlik denetimi — WCAG 2.1/2.2 AA hızlı referans dahil)
7. generate-figma-library (DS kütüphanesi inşa/güncelleme — motion/shadow token, durum kapsamı dahil)
8. ux-copy-guidance *(isteğe bağlı)* (marka sesiyle uyumlu copy kuralları — token isimlendirme, bileşen açıklamaları)
```

### UI Geliştirici (uidev)

```
1. ai-handoff-export (handoff paketi — etkileşim spec, içerik spec, uç durumlar, a11y spec dahil)
2. implement-design (Figma → kod — durum/etkileşim kapsamı kontrolü dahil)
3. design-token-pipeline (token dosyaları üret)
4. code-design-mapper (bileşen eşleme)
5. visual-qa-compare (görsel doğrulama)
6. design-drift-detector (token parity — motion token drift dahil)
7. figma-a11y-audit (a11y attribute'ları)
8. ux-copy-guidance (hata mesajı, boş durum, CTA copy kalıpları)
```

### PO/PM/SEM (po)

```
1. figma-screen-analyzer (ekran analizi — ilk izlenim testi + kritik çerçevesi dahil)
2. audit-figma-design-system --executive (DS uyum raporu)
3. ds-impact-analysis (değişiklik etki ve risk skoru)
4. design-drift-detector (kod-tasarım parity durumu)
5. ux-copy-guidance (marka sesi ve copy tutarlılık kontrolü)
6. ai-handoff-export (implementasyon durumu)
7. figjam-diagram-builder (süreç haritası)
```

## Uçtan Uca Akış (Özet)

Ayrıntı: [audit-figma-design-system/SKILL.md](audit-figma-design-system/SKILL.md) içinde **"Önerilen uçtan uca akış"** ve **"Zincir performansı"**.

1. **Kişiselleştirme:** `.fmcp-brand-profile.json` oluştur veya kontrol et ([BRAND_PROFILE_SCHEMA.md](BRAND_PROFILE_SCHEMA.md))
2. **Tuval hazırlık:** `figma-canvas-ops` (zorunlu önkoşul)
3. **Oluşturma:** `generate-figma-library` (motion/shadow token dahil) → `generate-figma-screen` (tasarım yönü belirleme dahil)
4. **İçerik:** `ux-copy-guidance` (marka sesiyle uyumlu copy)
5. **Dokümantasyon:** `component-documentation` (bileşen kılavuzu — durumlar, copy spec dahil)
6. **Denetim:** `audit-figma-design-system` (DS eksiksizlik çerçevesi dahil) → `fix-figma-design-system-finding` *veya* `apply-figma-design-system`
7. **Token:** `design-token-pipeline` → isteğe bağlı `code-design-mapper`
8. **Teslim:** `ai-handoff-export` (etkileşim/içerik/uç durum/a11y spec dahil) → `implement-design` (durum kapsamı kontrolü dahil)
9. **Doğrulama:** `visual-qa-compare` + `design-drift-detector` (motion token drift dahil) → gerekirse `design-system-rules` (DS prensipleri dahil)
10. **Kalite:** `figma-a11y-audit` (WCAG çerçevesi dahil) + `figma-screen-analyzer` (ilk izlenim + kritik çerçevesi dahil)
11. **Etki:** `ds-impact-analysis` (değişiklik öncesi)

**FigJam** (`figjam-diagram-builder`) bu zincirle zorunlu sırada değildir.

## Referans Dosyalar

| Dosya | Açıklama |
|---|---|
| [TOOL_MAPPING.md](TOOL_MAPPING.md) | Resmi Figma MCP ↔ F-MCP Bridge araç eşleme tablosu |
| [BRAND_PROFILE_SCHEMA.md](BRAND_PROFILE_SCHEMA.md) | Marka profili (`.fmcp-brand-profile.json`) şema tanımı ve skill entegrasyon tablosu |
| `reference_industry_design_standards.md` | Endüstri standartları hafıza dosyası (M3, HIG, WCAG, shadcn/ui, Tailwind) — Claude memory'de |

## MCP

Tüm bu skill'ler `metadata.mcp-server: user-figma-mcp-bridge` öngörür; bağlantı ve kurulum için repo kökünde `KURULUM.md` ve `docs/` dosyalarına bakın.

### Araç adı doğrulaması (CI / lokal)

Skill dosyalarında geçen `figma_*` adları, kaynakta `registerTool` ile tanımlı araçlarla otomatik karşılaştırılır:

```bash
npm run validate:fmcp-skills
```

Kaynak birleşimi: `src/local.ts`, `src/local-plugin-only.ts`, `src/core/figma-tools.ts`. Script: [`scripts/validate-fmcp-skills-tools.mjs`](../../../scripts/validate-fmcp-skills-tools.mjs) (repo köküne göre). **GitHub:** `master` / `main` push ve PR'larda [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) bu komutu çalıştırır.

## Persona metadata

Her skill'in YAML frontmatter'ında `personas` alanı bulunur:

```yaml
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designer
    - designops
    - uidev
    - po
```

Bu alan, AI agent'ın kullanıcı persona'sına göre doğru skill'i önermesini sağlar.

## Evolution Triggers (genel)

Her skill dosyasında `## Evolution Triggers` bölümü bulunur. Bu bölüm:

- Bridge'e yeni araç eklendiğinde hangi adımların güncellenmesi gerektiğini belirtir
- Persona geri bildirimine göre hangi çıktı formatlarının eklenmesi gerektiğini işaret eder
- `validate:fmcp-skills` betiğinin yeni araç adlarını doğrulayacağını hatırlatır
