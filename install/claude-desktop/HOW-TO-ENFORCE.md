# Claude Desktop'ta FCM Enforcement Rehberi

> **Amaç:** Claude Desktop chat modelinde (tek ana agent, sub-agent spawn yok) token binding ve DS disiplininin **skip edilemez** halde çalışmasını sağlamak.

---

## Neden Bu Rehber?

Claude Desktop **Claude Code'dan farklı çalışır**. Şu mekanizmalar **Desktop'ta YOK**:

| Mekanizma | Claude Desktop | Claude Code |
|---|---|---|
| Hook'lar (PreToolUse, SessionStart) | ❌ Çalışmaz | ✅ Harness enforcer |
| Sub-agent spawn (`Task(...)`) | ❌ Yok | ✅ Mevcut |
| Slash command (`/ds-sync`) | ❌ Desteklenmez | ✅ Auto-register |
| Plugin.json auto-discovery | ❌ Yüklenmez | ✅ Yüklenir |
| `.claude/CLAUDE.md` auto-inject | ❌ Yok | ✅ System prompt'a eklenir |

Dolayısıyla Claude Desktop'ta enforcement **üç yere** dağılmıştır:
1. **Plugin tarafı (MCP response):** `_designSystemViolations` BLOCKING signal — v1.9.4+
2. **Project Knowledge:** manuel upload edilmiş skill dosyaları (explicit reference gerektirir)
3. **MCP tool'lar:** `figma_validate_screen`, `figma_scan_ds_compliance` — skill'lerin çağırması beklenir

Bu rehber her üçünün nasıl doğru kurulacağını ve kullanılacağını açıklar.

---

## Adım 1 — MCP Server'ı Claude Desktop'a Bağla

Kurulum (zaten yaptıysanız atlayın):
```bash
npm install -g @atezer/figma-mcp-bridge@latest
```

`claude_desktop_config.json` içine (bkz. `install/claude-desktop/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": ["-y", "@atezer/figma-mcp-bridge@latest"]
    }
  }
}
```

Claude Desktop'ı yeniden başlat. Figma Desktop'ta plugin'i aç: **F-MCP ATezer Bridge**. Console'da `[F-MCP v1.9.4] Plugin loaded` log'u görüyorsan doğru sürüm aktif.

---

## Adım 2 — Project Knowledge Upload Sırası

Claude Desktop **Projects** özelliği (web veya desktop) içinde bir proje açın. Project Knowledge bölümüne şu dosyaları **bu sırayla** upload edin:

### Öncelikli (her zaman yüklü olmalı)

1. **`skills/fmcp-project-rules/SKILL.md`** — global ZORUNLU kurallar (Design Token Kuralı, Bağlı Token Kuralı)
2. **`.claude/project-context.md`** — Pre-Commit Validation direktifi (v1.9.4)
3. **`skills/fmcp-intent-router/SKILL.md`** — DS GATE (Adım 0, MUTLAK İLK KAPI)
4. **`skills/fmcp-screen-orchestrator/SKILL.md`** — Fast Path orkestratörü
5. **`skills/figma-canvas-ops/SKILL.md`** — Rule 10 + Rule 10a inline bind check
6. **`skills/fmcp-screen-recipes/SKILL.md`** — 9 recipe + Adım 9 final gate

### Design system bağlamı

7. **`.claude/design-systems/README.md`** — iki-katman cache mimari (public template + user-local)
8. **`.claude/design-systems/sui/SUI_CHEATSHEET.md`** — SUI workflow rehberi (varsa)
9. **Kendi DS'niz için** `.claude/design-systems/<lib>/tokens.md` + `components.md` (pattern-only dosyalar)

### Opsiyonel (ek işlevsellik için)

10. `skills/apply-figma-design-system/SKILL.md` — mevcut ekrana DS uygula
11. `skills/audit-figma-design-system/SKILL.md` — mevcut ekran audit
12. `skills/ds-impact-analysis/SKILL.md` — DS değişiklik etkisi

> **Not:** User-local cache (`~/.claude/data/fcm-ds/<file-key>/`) Project Knowledge'a yüklenmez. Bu dosyalar **size özel, Figma IP'si içerir**. Claude Desktop onlara erişemez; runtime'da `teamLibrary` API ile dinamik resolve yapılır.

---

## Adım 3 — Her Oturumun İlk Prompt'u

Project Knowledge yüklenmiş olsa bile Claude Desktop her oturumda otomatik olarak skill'leri çağırmaz. **İlk prompt'ta explicit referans** verin:

## v1.9.7 Zero-Click Workflow (YENİ)

v1.9.7'den itibaren kullanıcı **HİÇ setup yapmadan** (Project Knowledge boş, prompt kopyalama yok) Claude Desktop'ta sadece şöyle diyebilir:

> "https://figma.com/design/XYZ... ödeme ekranı tasarla"

Beklenen akış:

1. Claude `figma_get_status` çağırır → response'ta `_bootstrap.critical_rules` (8 kural) + `_bootstrap.embedded_skills` (~9K token skill özeti) okunur
2. `figma_get_design_system_summary` çağrılır → 0 component ise `_nextStep: "BLANK_FILE_DIALOG_REQUIRED"` döner
3. Claude `AskUserQuestion` ile 4 seçenek sunar:
   - (a) Team library import
   - (b) Mini DS auto-create — `figma_create_mini_ds` tool'u
   - (c) Referans template
   - (d) Linter off mode
4. Kullanıcı (b) seçerse `figma_create_mini_ds` tek call → DS kurulur
5. Ekran inşa edilir; her `figma_execute` sonunda post-scan ZORUNLU kontrol
6. BLOCKING flag varsa **server HARD_ERROR** — Claude bastıramaz (Katman 3)
7. Final `figma_scan_ds_compliance(threshold=85)` ZORUNLU

**Başarı oranı:** Claude Desktop'ta %90-95, Claude Code'da %98-99.

### v1.9.5 Kopyala-yapıştır başlangıç prompt'u (SERTLEŞTİRİLMİŞ)

```
Merhaba. Bu oturumda FCM v1.9.5 kullanacağız. Chat context korumaları aktif.

Önce 3 paralel check (tek mesajda):
1. `figma_get_status()` — plugin v1.9.5 bağlı mı?
2. Project Knowledge'daki `fmcp-project-rules/SKILL.md` + `.claude/project-context.md` referans al.
3. Design system: [ÖRN: ❖ SUI] — user-local `~/.claude/data/fcm-ds/active.md` veya runtime resolve.

KESIF BUTCESI (SERT):
- Maks 3 figma_get_* çağrısı. 4.'de PLAN sun, kullanıcı onayı al, ÜRETIME geç.
- Response'da `_DISCOVERY_BUDGET_WARNING` veya `_DISCOVERY_BUDGET_EXCEEDED_BLOCKING` görürsen DUR — plan sun.
- file-map.md varsa (yoksa oluşturma — bu v1.9.5 opsiyonel) önce onu oku.

SCREENSHOT YONTEMI (KARAR AGACI):
- Planlama → returnMode: "summary" (screenshotsuz, metadata yeter)
- Teslimat → returnMode: "file" (dosyaya yazılır, context'e 0.3K token)
- Büyük ekran bölüm inceleme → returnMode: "regions", regionStrategy: "children"
- Base64 sadece kullanıcı explicit isterse (30K token maliyetli)
- Default: "file". Asla base64 default kullanma.

KOD KURALLARI:
- Boyut sorgusu TEK SATIR: `await figma.getNodeByIdAsync(id).then(n => ({w:n.width,h:n.height}))` — 30 satırlık defansif kod YASAK.
- Her execute MEGA-BATCH (1 execute = tüm hiyerarşi, 5 ayrı değil).
- Her `figma_execute` response'unda `_DESIGN_SYSTEM_VIOLATIONS_BLOCKING` veya `_designSystemViolations.severity: "BLOCKING"` varsa kodu DÜZELT ve tekrar çalıştır — skip etme.
- Hiçbir node'da hardcoded renk/padding/radius/fontSize YASAK.
- Ekran tamamlandığında ZORUNLU: `figma_scan_ds_compliance(nodeId=frameId, threshold=85)`. Skor <85 veya coverage <%90 ise düzelt + tekrar tara.
- Scan passed → `figma_validate_screen(frameId, minScore=80)` final.

ELICITATION:
- Maks 1 AskUserQuestion. "devam et" sonrası soru YASAK.
- User prompt anlamlıysa hiç sorma, plan sun.

Şimdi ne yapmamı istiyorsun?
```

Bu prompt'u **her yeni oturumun** ilk mesajı olarak gönder. Claude'a enforcement + context budget kurallarını hatırlatır.

### Plugin bağlantı sorunları için cleanup script

Yeni chat öncesi veya "plugin bağlanmıyor" durumunda:

```bash
bash ~/FCM/scripts/cleanup-ports.sh
```

Script 5454-5470 aralığındaki zombie FMCP process'lerini güvenle kill eder (sadece process adı FMCP ile eşleşenleri). Sonra Claude Desktop'ı yeniden aç.

---

## Adım 4 — Enforcement Mekanizmaları Tablosu

| Katman | Mekanizma | Claude Desktop Davranışı |
|---|---|---|
| **1. Statik kod analizi** | `figma_execute` `_designSystemViolations` (v1.8.1+) | Kod hardcoded hex / font size / no-instance içerirse **SEVERE** döner. v1.9.4'te `_DESIGN_SYSTEM_VIOLATIONS_BLOCKING: true` top-level flag eklendi — Claude skip edemez. |
| **2. Runtime post-scan** | `figma_scan_ds_compliance` (v1.9.4+) | Tamamlanan ekranı full-tree tarar. Coverage, hardcoded samples, primitive fallbacks, overflow döner. Threshold <85 → BLOCKING. |
| **3. Final validate** | `figma_validate_screen` (v1.8.1+) | 3-eksen weighted score (40/30/30). minScore=80 default. Fail → delete & rebuild tavsiyesi. |
| **4. Skill direktifi** | `fmcp-screen-recipes` Adım 9 (v1.9.4+) | Project Knowledge'da yüklü skill Claude'a "her ekran sonunda scan + validate çağır" der. |
| **5. Canvas ops Rule 10a** | `figma-canvas-ops` Rule 10a (v1.9.4+) | Execute içinde inline bind check — unbound tespit edilirse `throw` atılır, execute başarısız olur. |

**Desktop'ta ÇALIŞMAYANLAR** (bunları beklemeyin):
- hooks.json (PreToolUse, SessionStart)
- slash command'lar
- sub-agent spawn
- auto-discovery

---

## Adım 5 — Test Prompt'u

Kurulumun doğru çalıştığını test etmek için:

```
SUI Alt 3 sayfasına iPhone 17 boyutunda basit bir test frame ekle:
- 1 NavigationTopBar instance (başlık: "Test")
- 1 Button instance (label: "Devam")
- 1 Card (primitive frame: 200x100, corner radius 12, background level-1)

Kuralları uygula:
- Her fill/padding/radius bound olmalı
- Her text textStyleId'ye bağlı olmalı
- Tamamlandığında figma_scan_ds_compliance çağır, skoru raporla
```

### Beklenen davranış

1. Claude ilk `figma_execute` çağırır: component instance + primitive frame + text. **Eğer unbound varsa** `_designSystemViolations.severity: "BLOCKING"` döner.
2. Claude BLOCKING signal'i görür, kodu düzeltir (bindVariable çağrılarını ekler), tekrar execute eder.
3. Ekran hazırlandığında `figma_scan_ds_compliance` çağırır.
4. Response'da coverage yüzdeleri + varsa sample'lar görürsün.
5. Skor ≥85 ise `figma_validate_screen` ile final doğrulama, skor raporla.

### Başarı kriterleri

- `figma_scan_ds_compliance` return: `passed: true`, `score: >=85`
- `coverage.fills.pct: >=90`
- `coverage.paddings.pct: >=90` (Primitive card için bind edilmiş olmalı)
- `coverage.radius.pct: >=90` (cornerRadius bound)
- `coverage.textStyle.pct: >=90` (textStyleId bound)
- `samples.hardcodedHex: []` (boş liste)
- `samples.hardcodedFontSize: []`

---

## Adım 6 — Sorun Giderme

### "Plugin violation döndürmüyor"

- Plugin sürümünü kontrol et: `figma_get_status()` → `pluginVersion: "1.9.4"` olmalı.
- Figma Desktop'ta plugin'i kapat, aç. DevTools Console'da `[F-MCP v1.9.4] Plugin loaded` görmelisin.
- Eski sürüm aktifse npm paketini yenile: `npm install -g @atezer/figma-mcp-bridge@latest`.

### "Claude hala skip ediyor / hardcoded değer yazıyor"

- İlk prompt'ta enforcement direktifini verdin mi? (Adım 3)
- Project Knowledge'da `fmcp-project-rules/SKILL.md` yüklü mü?
- BLOCKING signal'i gördüğünde Claude "düzelttim" diyorsa response'un üstünde `_DESIGN_SYSTEM_VIOLATIONS_BLOCKING: true` flag'ini göster, "retry yap" de.
- Son çare: kullanıcı olarak manuel `figma_scan_ds_compliance` çağırt, sample'ları gör, Claude'a listeyi yapıştır.

### "figma_scan_ds_compliance tool yok / bilinmiyor"

- MCP server sürüm kontrolü: `npx @atezer/figma-mcp-bridge@latest --version` → `1.9.4+`
- Claude Desktop'ı tamamen kapat, `~/Library/Logs/Claude/mcp-server-figma-mcp-bridge.log` (macOS) son satırlarına bak — tool register edilmiş mi? Yeni versiyon yüklenmişse `figma_scan_ds_compliance` listede olmalı.

### "Skor hesaplanmıyor / sürekli 0 dönüyor"

- Test frame'i çok küçük olabilir (node sayısı <5). Biraz büyüt (5+ node).
- Plugin console'da `🌉 [F-MCP] Validate screen:` log'una bak, hata var mı?
- Node ID geçerli mi? Figma'da node'u tıklayıp URL'den node-id parametresini al.

### "Coverage %0 dönüyor ama token bind yaptım"

- Bind `setBoundVariable` ile yapıldı mı, yoksa hardcoded `node.cornerRadius = 16` mı yazdı? İlki bound, ikincisi hardcoded.
- Variable import edilmiş olmalı: `await figma.variables.importVariableByKeyAsync(KEY)` → döndürdüğü objeyi `setBoundVariable("cornerRadius", variable)` ile kullan.
- Plugin tarafında v1.9.4 cache var; eski sürüm hala aktifse re-load gerekebilir.

---

## Sürüm Matrisi

| v | Yeni özellik | Enforcement etkisi |
|---|---|---|
| 1.8.1 | `_designSystemViolations` statik kod analizi | Claude Desktop ilk BLOCKING signal |
| 1.8.2 | `figma_validate_screen` 40/30/30 score | Post-creation audit |
| 1.9.1 | Server-side sibling discovery | Enforcement bağımsız |
| 1.9.3 | User-local DS cache (`~/.claude/data/fcm-ds/`) | Key'ler repo'ya sızmaz |
| 1.9.4 | `figma_scan_ds_compliance` + BLOCKING flag + granular coverage | Üretim enforcement |
| 1.9.5 | Screenshot 4-mode (file/summary/regions/base64) + Discovery Budget + cleanup-ports | Chat context koruması, keşif budget |
| 1.9.6 | Post-execute runtime scan + Negative Intent Detection | "atla"/"bakma" intent parser + runtime unbound tespit |
| **1.9.7** | **Blank File DS Gate + figma_create_mini_ds + BLOCKING Suppression Prevention + Response Bootstrap (embedded skills) + Mini DS auto-create** | **Zero-click workflow (%90-95 Desktop, %98-99 Code)** |

v1.9.5'te kritik yenilikler:
- **Screenshot default "file" mode**: base64 context'ten çıktı, 30K token → 0.3K (100× tasarruf)
- **Discovery budget**: 8 keşif sonrası uyarı, 12 sonrası BLOCKING — Claude üretime zorlanır
- **Screenshot regions mode**: büyük ekranlarda parçalı export (children strategy)
- **Screenshot summary mode**: metadata-only, plan aşaması için screenshotsuz
- **`scripts/cleanup-ports.sh`**: zombie FMCP process temizleyici

v1.9.4 öncesi sürümlerde bu rehberin tüm adımları çalışmaz.

---

## Özet

Claude Desktop'ta enforcement **üç savunma hattıyla** sağlanır:

1. **Plugin statik analiz** (`figma_execute` response'undaki BLOCKING signal)
2. **Runtime scan** (`figma_scan_ds_compliance` ile tamamlanan ekran audit)
3. **Skill direktifleri** (Project Knowledge'a yüklenmiş `fmcp-project-rules` + `fmcp-screen-recipes`)

Hook, sub-agent, slash command Desktop'ta yok. Ama bu üç katman doğru kurulduğunda **Claude skip edemez** çünkü:
- Plugin response'u BLOCKING signal içerirken devam etmek mümkün değil
- Scan tool coverage düşükse delete & rebuild talep eder
- Skill direktifi her ekran sonunda scan çağırmayı zorunlu kılar

**Her oturumun ilk prompt'unda Adım 3'teki başlangıç prompt'unu kopyala-yapıştır.** Bu en önemli adım.

---

**Sürüm:** 1.9.4 · **Son güncelleme:** 2026-04-17
