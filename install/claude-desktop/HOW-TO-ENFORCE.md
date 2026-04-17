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

### Kopyala-yapıştır başlangıç prompt'u

```
Merhaba. Bu oturumda FCM (Figma-MCP Bridge) kullanacağız.

Önce şunları doğrula:
1. `figma_get_status()` çağır — plugin v1.9.4 bağlı mı?
2. Project Knowledge'daki `fmcp-project-rules/SKILL.md` ve `.claude/project-context.md`'yi referans al.
3. Design system: [ÖRN: ❖ SUI] — runtime'da `figma_get_library_variables(libraryName="❖ SUI")` ile çözümle.

Kurallar (MUTLAK):
- Her `figma_execute` response'unda `_DESIGN_SYSTEM_VIOLATIONS_BLOCKING` veya `_designSystemViolations.severity: "BLOCKING"` varsa kodu DÜZELT ve tekrar çalıştır — skip etme.
- Hiçbir node'da hardcoded renk/padding/radius/fontSize YASAK.
- Ekran tamamlandığında ZORUNLU olarak `figma_scan_ds_compliance(nodeId=frameId, threshold=85)` çağır. Skor <85 veya herhangi coverage <%90 ise düzelt ve tekrar tara.
- Scan passed olursa son olarak `figma_validate_screen(frameId, minScore=80)` çağır.

Şimdi ne yapmamı istiyorsun?
```

Bu prompt'u **her yeni oturumun** ilk mesajı olarak gönder. Claude'a enforcement kurallarını hatırlatır.

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
| **1.9.4** | **`figma_scan_ds_compliance` + BLOCKING flag + granular coverage** | **Bu rehberin temel sürümü** |

v1.9.4 öncesi sürümlerde bu rehberin tüm adımları çalışmaz — özellikle BLOCKING flag ve `figma_scan_ds_compliance` tool v1.9.4'te geldi.

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
