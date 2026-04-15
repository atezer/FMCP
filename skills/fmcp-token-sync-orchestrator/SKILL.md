---
name: fmcp-token-sync-orchestrator
description: Figma design token'larını kod dosyalarıyla (CSS/Tailwind/Swift/Compose) platform-agnostic senkronize eder. Diff preview + onay + write akışı zorunlu. Her platformda çalışır. Condensed-first: Essentials bölümü %80 case'i kapsar, Advanced sadece edge case'lerde.
metadata:
  mcp-server: user-figma-mcp-bridge
  version: 1.9.0
  priority: 95
  phase: orchestrator
  personas:
    - designops
    - uidev
  token_budget: condensed-first
required_inputs:
  - name: target_platform
    type: "enum: css | tailwind | swift | compose | sass | auto"
    description: "Hedef platform. 'auto' → hedef dosya uzantısından tespit, belirsizse sor"
  - name: target_file
    type: "string | null"
    description: "Hedef dosya yolu. null → platform defaultuna göre öner"
  - name: direction
    type: "enum: figma-to-code | code-to-figma"
    description: "Senkronizasyon yönü. Default: figma-to-code (export)"
---

# FMCP Token Sync Orchestrator

## Essentials (Üst Bölüm — %80 Case İçin Yeterli)

### Ortak Protokol (Condensed — full: `agents/_orchestrator-protocol.md`)

1. **Skill Registry** açık — tahmin yasak
2. **Intent Routing** — platform belirsiz → kullanıcıya sor (AskUserQuestion / düz metin)
3. **Cheap-First** — `figma_get_variables(verbosity="summary")` yeterli, full sadece eksik binding keşfinde
4. **Cache-First** — tokens için cache yok (hızlı değişir), opsiyonel `.claude/token-sync-log.md`
5. **User Onay** — **diff preview olmadan WRITE YOK** (mutlak kural)
6. **Self-Audit** — write sonrası binding coverage raporu (hardcoded kalan node sayısı)
7. **Skill Evolution** — yeni platform için iki aşamalı onay
8. **Türkçe rapor** — metrik bloğu sonunda

### Skill Registry (Ref Only)

| Skill | Dosya yolu | Trigger | Common case lazım mı? |
|---|---|---|---|
| `design-token-pipeline` | `skills/design-token-pipeline/SKILL.md` | Token export/import | **HER ZAMAN** (ana motor) |
| `code-design-mapper` | `skills/code-design-mapper/SKILL.md` | Component ↔ Figma mapping | Sadece component mapping istenirse |
| `design-system-rules` | `skills/design-system-rules/SKILL.md` | Platform-specific rule generation | Sadece rule generation istenirse |

### Platform Routing

| Sinyal | Platform | Standard hedef path |
|---|---|---|
| `.css`, `:root`, `var(--...)`, `tokens.css` | CSS | `src/styles/tokens.css` |
| `tailwind.config.*`, `theme.extend` | Tailwind | `tailwind.config.js` → `theme.extend` |
| `.swift`, `UIKit`, `SwiftUI`, `Color(...)` | Swift | `Sources/DesignTokens/Tokens.swift` |
| `.kt`, `Compose`, `@Composable`, `MaterialTheme` | Compose | `app/src/main/java/.../DesignTokens.kt` |
| `.scss`, `$token-...` | Sass | `src/styles/_tokens.scss` |
| Hiçbiri net değil | — | AskUserQuestion (4 platform seçeneği) |

### Diff Preview Before Write (Zorunlu Akış)

1. **Dry-run:** `Read("skills/design-token-pipeline/SKILL.md")` + workflow'u çalıştır ama dosyaya yazma → çıktıyı buffer'a al
2. **Mevcut dosya varsa:** mevcut içerikle yeni içerik arası **unified diff** üret
3. **Diff'i sohbete yaz:**
   ```diff
   --- current tokens.css
   +++ new tokens.css
   @@ -12,3 +12,5 @@
      --color-primary: #0066cc;
   -  --color-secondary: #666;
   +  --color-secondary: #4a4a4a;
   +  --color-success: #10b981;
   ```
4. **Onay al:** AskUserQuestion / düz metin: "Bu değişiklikleri uygulayayım mı? (Evet / Hayır / Sadece bazıları)"
5. **Onay sonrası** `Write` veya `Edit` ile dosyaya yaz
6. **Mevcut dosya yoksa:** sadece yeni içeriği göster, onay al, sonra `Write`

### Self-Audit (Write Sonrası)

Binding coverage raporu:
- **Toplam token:** `figma_get_variables` ile sayım
- **Binding oranı:** senkronlanan / toplam (yüzde)
- **Upgraded:** hardcoded değerden variable binding'e dönüşen sayı
- **Leftover:** hâlâ hardcoded kalan node sayısı (ds-auditor'a yönlendir)

### Rapor Formatı

```markdown
## 🔄 Token Sync — <platform>

**Yön:** Figma → Kod | Kod → Figma
**Hedef dosya:** <path>
**Mod:** export | import

### Diff Özeti
- Eklenen: <n>
- Güncellenen: <m>
- Kaldırılan: <k>

### Binding Coverage
- Toplam token: <n>
- Binding oranı: <%>
- Hardcoded kalanlar: <k> node (ds-auditor ile detaylandır)

---
📊 Metrikler
- Kullanılan skill'ler: <liste>
- API çağrı sayısı: <n>
- Dry-run + write: tamamlandı
```

---

## Advanced — Only Load If Needed

**Bu bölümü Claude aşağıdaki koşullarda tarar:**
- ⚠️ Multi-platform sync (aynı token'ları hem CSS hem Swift'e)
- ⚠️ Custom component mapping (code-design-mapper gerektiren)
- ⚠️ Platform default path kullanıcı için uygun değil (custom path gerekir)
- ⚠️ Kod → Figma yönünde sync (import mode, daha nadir)
- ⚠️ Yeni platform desteği (Flutter, Jetpack Multiplatform vb.)

### Detay 1 — Multi-Platform Sync

Kullanıcı "hem CSS hem Tailwind hem Swift'e aynı token'ları export et" derse:
1. Her platform için ayrı dry-run
2. 3 ayrı diff preview sohbette (tek mesajda üç diff bloğu)
3. Kullanıcı "hepsini onayla" veya "sadece X ve Y" diyebilmeli (AskUserQuestion çoklu seçim)
4. Onaylananları yaz
5. Binding coverage raporu 3 platforma göre ayrı

### Detay 2 — Custom Component Mapping

Sadece token değil, component → component eşleştirme isteniyorsa:
1. `Read("skills/code-design-mapper/SKILL.md")`
2. Figma component isim/key → kod dosyası path eşleştirmesi
3. Çıktı: `.codeconnect.ts` veya benzeri mapping dosyası
4. Token'lardan bağımsız ama tamamlayıcı iş

### Detay 3 — Kod → Figma Import Mode

Kod tarafında değişen bir token (örn. Git PR'da renk güncellemesi) Figma'ya geri yansıtılacaksa:
1. Kod dosyasını parse et
2. `figma_get_variables` ile mevcut Figma değerlerini al
3. Diff: kod tarafı vs Figma tarafı
4. Kullanıcıya göster: "Kod tarafında şu token'lar değişmiş, Figma'ya yansıtayım mı?"
5. Onay → `figma_update_variable` / `figma_setup_design_tokens` ile yaz
6. **Destructive mutation** → ortak protokol madde 5 gate (kullanıcı onayı)

### Detay 4 — Platform Default Path Override

Plan'daki defaultlar:
```
CSS      → src/styles/tokens.css
Tailwind → tailwind.config.js
Swift    → Sources/DesignTokens/Tokens.swift
Compose  → app/src/main/java/.../DesignTokens.kt
Sass     → src/styles/_tokens.scss
```

Kullanıcı'nın proje yapısı farklı olabilir. İlk sync'te:
1. Default path'i sor: "Bu platform için token dosyası `<default>` yoluna yazılsın mı?"
2. Kullanıcı alternatif verirse onu kullan
3. İlk başarılı sync sonrası path `.claude/token-sync-log.md`'ye kaydedilir (opsiyonel cache)

### Detay 5 — Error Recovery

| Hata | Aksiyon |
|---|---|
| Dosya yazma permission | Kullanıcıya bildir, farklı path öner |
| Mevcut kod formatı tanınmıyor | Örnek satır göster, formatı doğrulat |
| `figma_get_variables` timeout | `verbosity="summary"` zaten default, retry |
| Diff çok büyük (100+ değişiklik) | Özetle: "X color, Y spacing, Z typography token değişti, detay görmek ister misin?" |

### Detay 6 — Platform-Specific Notes

**Claude Code:**
- `Write` / `Edit` tool'ları mevcut, doğrudan kod dosyasına yazılır
- Cache: `.claude/token-sync-log.md` opsiyonel

**Cursor:**
- Aynı tool'lar mevcut, main context'te çalışır
- `.cursor/rules/fmcp-orchestration.md` bu orchestrator'ı referans eder

**Claude Desktop:**
- **KRİTİK:** Filesystem MCP eklenmediyse `Write` tool'u yok → sadece diff gösterebilir, kullanıcı manuel kopyalar
- İlk prompt'ta manuel skill referansı zorunlu

**Claude Web:**
- Filesystem yok → tamamen plan-only mod
- "Bu diff'i kopyala, tokens.css'e yapıştır" talimatı ver

### Detay 7 — Yeni Platform Desteği (Skill Evolution)

Kullanıcı "Flutter için export" isterse (mevcut 5 platformda yok):
1. **Aşama 1:** Gap'i açıkla, "Flutter desteği eklemek istiyor musun?" sor
2. **Aşama 2:** `design-token-pipeline` skill'ine Flutter eklentisi yap (edit) veya yeni bir skill (`fmcp-token-flutter-pipeline`) oluştur (create)
3. Create → DRAFT banner + ikinci onay
4. Edit → diff preview + onay
