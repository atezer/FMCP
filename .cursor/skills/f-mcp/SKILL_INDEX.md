# F-MCP Skill Dizini

## Workspace kökü (önemli)

Cursor veya VS Code'da **klasör / workspace kökü olarak bu repoyu** (`FCM`, yani `package.json` ve `.cursor/` bu kökte görünecek şekilde) açın. Bu dizindeki skill yolları `.cursor/skills/f-mcp/<skill>/SKILL.md` biçimindedir; kök yanlış açılırsa göreli linkler ve arama yolları kırılır.

## Personalar

| Kısaltma | Persona | Açıklama |
|---|---|---|
| `designer` | **Tasarımcı** | Bileşen tasarımı, DS kullanarak ekran çizimi, custom UI |
| `designops` | **DesignOps** | DS yönetimi, etki analizi, token yönetimi, kalite kontrolü |
| `uidev` | **UI Geliştirici** | iOS/Android/Web arayüz geliştirme, Figma'dan kod üretme |
| `po` | **PO/PM/SEM** | UI analiz, tasarım durumu raporlama, karar alma |

## Skill Listesi (18 skill)

### Dokumantasyon

| Skill | Dosya | Personalar | Kısa açıklama |
|---|---|---|---|
| `component-documentation` | [component-documentation/SKILL.md](component-documentation/SKILL.md) | designer, designops, uidev | Bileşen kullanım kılavuzu oluşturma (Standard/Compact format seçimi, endüstri standartları referansı) |

### Tuval Yazma ve Oluşturma

| Skill | Dosya | Personalar | Kısa açıklama |
|---|---|---|---|
| `figma-canvas-ops` | [figma-canvas-ops/SKILL.md](figma-canvas-ops/SKILL.md) | designer, designops | `figma_execute` güvenli kullanım kılavuzu (zorunlu önkoşul) |
| `generate-figma-screen` | [generate-figma-screen/SKILL.md](generate-figma-screen/SKILL.md) | designer, uidev | Kod/açıklamadan Figma'da ekran oluşturma |
| `generate-figma-library` | [generate-figma-library/SKILL.md](generate-figma-library/SKILL.md) | designops, designer | Koddan DS kütüphanesi inşa (5 fazlı) |
| `figjam-diagram-builder` | [figjam-diagram-builder/SKILL.md](figjam-diagram-builder/SKILL.md) | designer, designops, po | FigJam diyagram/süreç şeması |

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
   VEYA generate-figma-screen (ekran oluşturma)
3. component-documentation (bileşen kullanım kılavuzu)
4. audit-figma-design-system (kalite kontrol)
5. fix / apply (düzeltme gerekiyorsa)
6. figma-a11y-audit (erişilebilirlik kontrol)
```

### DesignOps

```
1. audit-figma-design-system (DS sağlık kontrolü)
2. ds-impact-analysis (değişiklik öncesi etki analizi)
3. apply-figma-design-system (DS hizalama)
4. design-token-pipeline (token senkronu — çift yönlü)
5. design-system-rules (kural üretimi)
6. figma-a11y-audit (erişilebilirlik denetimi)
7. generate-figma-library (DS kütüphanesi inşa/güncelleme)
```

### UI Geliştirici (uidev)

```
1. ai-handoff-export (handoff paketi al)
2. implement-design (Figma → kod)
3. design-token-pipeline (token dosyaları üret)
4. code-design-mapper (bileşen eşleme)
5. visual-qa-compare (görsel doğrulama)
6. design-drift-detector (token parity)
7. figma-a11y-audit (a11y attribute'ları)
```

### PO/PM/SEM (po)

```
1. figma-screen-analyzer (ekran analizi — teknik olmayan)
2. audit-figma-design-system --executive (DS uyum raporu)
3. ds-impact-analysis (değişiklik etki ve risk skoru)
4. design-drift-detector (kod-tasarım parity durumu)
5. ai-handoff-export (implementasyon durumu)
6. figjam-diagram-builder (süreç haritası)
```

## Uçtan Uca Akış (Özet)

Ayrıntı: [audit-figma-design-system/SKILL.md](audit-figma-design-system/SKILL.md) içinde **"Önerilen uçtan uca akış"** ve **"Zincir performansı"**.

1. **Tuval hazırlık:** `figma-canvas-ops` (zorunlu önkoşul)
2. **Oluşturma:** `generate-figma-library` → `generate-figma-screen`
3. **Dokümantasyon:** `component-documentation` (bileşen kılavuzu — Standard veya Compact)
4. **Denetim:** `audit-figma-design-system` → `fix-figma-design-system-finding` *veya* `apply-figma-design-system`
4. **Token:** `design-token-pipeline` → isteğe bağlı `code-design-mapper`
5. **Teslim:** `ai-handoff-export` → `implement-design`
6. **Doğrulama:** `visual-qa-compare` + `design-drift-detector` → gerekirse `design-system-rules`
7. **Kalite:** `figma-a11y-audit` + `figma-screen-analyzer`
8. **Etki:** `ds-impact-analysis` (değişiklik öncesi)

**FigJam** (`figjam-diagram-builder`) bu zincirle zorunlu sırada değildir.

## Referans Dosyalar

| Dosya | Açıklama |
|---|---|
| [TOOL_MAPPING.md](TOOL_MAPPING.md) | Resmi Figma MCP ↔ F-MCP Bridge araç eşleme tablosu |
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
