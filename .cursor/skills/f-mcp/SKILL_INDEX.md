# F-MCP skill dizini

## Workspace kökü (önemli)

Cursor veya VS Code’da **klasör / workspace kökü olarak bu repoyu** (`FCM`, yani `package.json` ve `.cursor/` bu kökte görünecek şekilde) açın. Bu dizindeki skill yolları `.cursor/skills/f-mcp/<skill>/SKILL.md` biçimindedir; kök yanlış açılırsa göreli linkler ve arama yolları kırılır.

`~/.cursor/plans/` altındaki plan dosyalarındaki `.cursor/skills/...` linklerinin tıklanabilir olması için de workspace’in **aynı FCM kökü** olması gerekir.

## Skill listesi

| Skill | Dosya | Kısa açıklama |
|--------|--------|----------------|
| `audit-figma-design-system` | [audit-figma-design-system/SKILL.md](audit-figma-design-system/SKILL.md) | Tuval içi DS denetimi (salt okunur); bulgu JSON/markdown |
| `fix-figma-design-system-finding` | [fix-figma-design-system-finding/SKILL.md](fix-figma-design-system-finding/SKILL.md) | Tek audit bulgusunu dar kapsamda düzelt (`figma_execute`) |
| `apply-figma-design-system` | [apply-figma-design-system/SKILL.md](apply-figma-design-system/SKILL.md) | Ekran geneli / çok bölüm DS reconcile |
| `design-token-pipeline` | [design-token-pipeline/SKILL.md](design-token-pipeline/SKILL.md) | Figma variable → iOS/Android/Web token dosyaları |
| `code-design-mapper` | [code-design-mapper/SKILL.md](code-design-mapper/SKILL.md) | Figma bileşen ↔ çoklu platform kod eşlemesi |
| `design-drift-detector` | [design-drift-detector/SKILL.md](design-drift-detector/SKILL.md) | Kod ↔ Figma drift (token/component, çoklu platform) |
| `design-system-rules` | [design-system-rules/SKILL.md](design-system-rules/SKILL.md) | Repo için platforma özel DS kuralları üretimi |
| `ai-handoff-export` | [ai-handoff-export/SKILL.md](ai-handoff-export/SKILL.md) | HANDOFF şablonu + `handoff.manifest.json` |
| `implement-design` | [implement-design/SKILL.md](implement-design/SKILL.md) | Figma → iOS/Android/Web production kod |
| `figjam-diagram-builder` | [figjam-diagram-builder/SKILL.md](figjam-diagram-builder/SKILL.md) | FigJam diyagramları (kısa dönüş, güvenli `figma_execute`) |

## Önerilen uçtan uca akış (özet)

Ayrıntı: [audit-figma-design-system/SKILL.md](audit-figma-design-system/SKILL.md) içinde **“Önerilen uçtan uca akış”** ve **“Zincir performansı”**.

1. Tuval: `audit-figma-design-system` → `fix-figma-design-system-finding` *veya* `apply-figma-design-system`  
2. Kod: `design-token-pipeline` → isteğe bağlı `code-design-mapper`  
3. Teslim: `ai-handoff-export` → `implement-design`  
4. Doğrulama: `design-drift-detector` → gerekirse `design-system-rules`  

**FigJam** (`figjam-diagram-builder`) bu zincirle zorunlu sırada değildir.

## MCP

Tüm bu skill’ler `metadata.mcp-server: user-figma-mcp-bridge` öngörür; bağlantı ve kurulum için repo kökünde `KURULUM.md` ve `docs/` dosyalarına bakın.

### Araç adı doğrulaması (CI / lokal)

Skill dosyalarında geçen `figma_*` adları, kaynakta `registerTool` ile tanımlı araçlarla otomatik karşılaştırılır:

```bash
npm run validate:fmcp-skills
```

Kaynak birleşimi: `src/local.ts`, `src/local-plugin-only.ts`, `src/core/figma-tools.ts`. Script: [`scripts/validate-fmcp-skills-tools.mjs`](../../../scripts/validate-fmcp-skills-tools.mjs) (repo köküne göre). **GitHub:** `master` / `main` push ve PR’larda [`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) bu komutu çalıştırır.
