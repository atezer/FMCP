# F-MCP Strateji 2026 — "MCP Öldü" Sonrası Yol Haritası

> **Kaynak:** UX Planet — *MCP is dead* (2026)
> **Branch:** `claude/research-mcp-strategy-G0fbi`
> **Hazırlayan:** Strateji araştırması, 9 Mayıs 2026
> **Hedef:** F-MCP'yi "tool spam" anti-pattern'inden kurtarıp **skill-first + code-execution-first** mimariye taşımak.

---

## 1. Tezi 60 saniyede özetle

Makale "MCP'nin protokol olarak öldüğünü" söylemiyor — söylediği şu:

| Anti-pattern | Sonuç |
|---|---|
| 50+ dar tool şeması her oturumda yüklenir | Context'in %15-30'u tool listesi olur |
| Her tool ayrı round-trip | 1 ekran üretimi = 30-50 tool çağrısı, 5-15 dakika |
| Şişkin tool sonuçları (full file dumps, base64) | Asıl iş için context kalmaz |
| Genel-amaçlı tool'lar (örn. `read_file`) | LLM rehbersiz, tutarsız sonuç |

**Önerilen yön:** *Az tool + çok skill (progressive disclosure) + code execution (LLM kod yazıp çalıştırır).*

**FMCP açısından:** Mimari yönümüz **doğru**, ama uygulama yarım. Bu doküman ne kadar yarım olduğunu sayısallaştırıyor ve göç planı sunuyor.

---

## 2. FMCP'nin mevcut sağlık raporu

### 2.1 İyi olan (devam et)

| Sinyal | Durum |
|---|---|
| `figma_execute` (kod çalıştırma) | ✅ Var (v1.0) |
| `figma_use` (intent-based orchestrator) | ✅ Var (v1.9.8) — ama sadece 3 intent |
| 26 skill (progressive disclosure adayı) | ✅ Var |
| Sub-agent / agent ayrımı (Claude Code) | ✅ Var |
| Discovery budget (12 çağrıdan sonra BLOCKING) | ✅ Var — context koruma |
| `fmcp-intent-router` skill | ✅ Doğru yön |
| Screenshot tasarrufu (file/summary/regions/base64) | ✅ Var |

### 2.2 Sorunlu olan (göç gerektirir)

| Sinyal | Durum | Sorun |
|---|---|---|
| Toplam araç sayısı | **~60 registerTool çağrısı** (`local-plugin-only.ts`) | README "54", TOOLS_FULL_LIST "48" diyor — drift var; gerçek ~60 |
| `figma_use` intent kapsamı | 3 intent (component/token/design_context) | 30+ atomik tool buraya konsolide edilebilir |
| Variable/collection CRUD | 11 ayrı tool | Tek `figma_variables` aracında intent ile yapılabilir |
| Node creation (frame/text/rect/group) | 4 ayrı tool | Tek `figma_nodes intent=create` olabilir |
| Console/diagnostics | 4 ayrı tool | Tek `figma_diagnostics intent=...` olabilir |
| REST API tool'ları | 4 ayrı tool (`figma_rest_api`, `set_rest_token`, `clear_rest_token`, `get_rest_token_status`) | Tek `figma_rest intent=...` |
| Skill içerikleri | "Hangi tool'u çağırırsın" odaklı | "Hangi kodu yazarsın `figma_execute` ile" odaklı olmalı |
| Tool şeması context maliyeti | Ölçülmemiş | Hedef metrik: oturum başı tool şema yükü < %5 |
| `figma_execute` güvenlik (K1) | Açık | Code-first stratejide P0, ertelenemez |

---

## 3. Stratejik prensipler (her kararı bunlara göre ver)

1. **Tool sayısı bir KPI'dır, küçültülmeli.** Hedef: **15 tool**, bunların 4'ü orchestrator (`figma_use`, `figma_nodes`, `figma_variables`, `figma_diagnostics`).
2. **Code execution > tool chain.** 3+ adımlık iş varsa cevap "yeni tool" değil, "skill içinde `figma_execute` kod örneği"dir.
3. **Skill'ler kod tarifi içerir, tool listesi değil.** Skill örnekleri çalıştırılabilir Plugin API kod parçacıkları olmalı.
4. **Progressive disclosure zorunlu.** Skill'ler load-on-demand; oturum başında yalnızca `fmcp-intent-router` + `fmcp-project-rules` yüklü olsun.
5. **Yeni tool eklemek için justification şart.** Şablon: "Bu işi `figma_execute` + skill ile NEDEN yapamayız?" — cevap zayıfsa, yeni tool eklenmez.
6. **Değer FMCP plugin köprüsünde, tool sayısında değil.** Pazarlama: "26 skill'lik Figma agent toolkit'i" → "54 araçlı MCP" değil.

---

## 4. Tool Konsolidasyon Haritası (~60 → ~15)

### 4.1 `figma_use` — okuma orkestratörü (genişlet)

**Mevcut intentler:** `component`, `token`, `design_context`

**Yeni intentler (eklenecek):**

| Yeni intent | Yutulan eski araçlar |
|---|---|
| `intent=overview` | `figma_get_design_system_summary`, `figma_get_file_data`, `figma_list_connected_files` |
| `intent=styles` | `figma_get_styles`, `figma_get_token_browser` |
| `intent=search` | `figma_search_components`, `figma_search_assets` |
| `intent=node` | `figma_get_component`, `figma_get_component_for_development`, `figma_get_component_image` |
| `intent=screenshot` | `figma_capture_screenshot` (parametrelerle) |
| `intent=parity` | `figma_check_design_parity` |
| `intent=code_connect` | `figma_get_code_connect` |

**Sonuç:** 13 atomik okuma aracı → 1 orchestrator + 7 yeni intent. Net azalma: **-12 tool**.

### 4.2 `figma_nodes` — yazma orkestratörü (yeni)

| intent | Eski araçlar |
|---|---|
| `intent=create_frame` | `figma_create_frame` |
| `intent=create_text` | `figma_create_text` |
| `intent=create_rectangle` | `figma_create_rectangle` |
| `intent=create_group` | `figma_create_group` |
| `intent=set_description` | `figma_set_description` |
| `intent=set_instance_props` | `figma_set_instance_properties` |
| `intent=instantiate` | `figma_instantiate_component` |
| `intent=arrange_set` | `figma_arrange_component_set` |
| `intent=export` | `figma_export_nodes` |
| `intent=execute` | `figma_execute` (raw kod kaçış valfi) |

**Sonuç:** 10 araç → 1 orchestrator. Net azalma: **-9 tool**.

> **Not:** `figma_execute` ayrı bir tool olarak da kalabilir — code-first skill'lerin doğrudan çağırması için (intent yükü olmadan).

### 4.3 `figma_variables` — token CRUD orkestratörü (yeni)

| intent | Eski araçlar |
|---|---|
| `intent=list` | `figma_get_variables` |
| `intent=create` | `figma_create_variable`, `figma_batch_create_variables` |
| `intent=update` | `figma_update_variable`, `figma_batch_update_variables` |
| `intent=delete` | `figma_delete_variable`, `figma_delete_variable_collection` |
| `intent=rename` | `figma_rename_variable`, `figma_rename_mode` |
| `intent=collection` | `figma_create_variable_collection`, `figma_add_mode` |
| `intent=setup` | `figma_setup_design_tokens` |
| `intent=refresh` | `figma_refresh_variables` |

**Sonuç:** 12 araç → 1 orchestrator. Net azalma: **-11 tool**.

### 4.4 `figma_diagnostics` — sistem orkestratörü (yeni)

| intent | Eski araçlar |
|---|---|
| `intent=status` | `figma_get_status`, `figma_plugin_diagnostics` |
| `intent=console` | `figma_get_console_logs`, `figma_clear_console`, `figma_watch_console` |
| `intent=port` | `figma_set_port` |
| `intent=connections` | `figma_list_connected_files` |

**Sonuç:** 7 araç → 1 orchestrator. Net azalma: **-6 tool**.

### 4.5 `figma_rest` — REST API orkestratörü (yeni, opsiyonel)

| intent | Eski araçlar |
|---|---|
| `intent=call` | `figma_rest_api` |
| `intent=token_set` | `figma_set_rest_token` |
| `intent=token_clear` | `figma_clear_rest_token` |
| `intent=token_status` | `figma_get_rest_token_status` |

**Sonuç:** 4 araç → 1 orchestrator. Net azalma: **-3 tool**.

### 4.6 v1.9.9+ Prototype Connection araçları

5 yeni prototip aracı (`figma_create_prototype_connection`, `figma_get_prototype_connections`, `figma_set_flow_starting_point`, `figma_create_interaction`, `figma_set_scroll_behavior`) — bunlar zaten `figma-prototype-flow` skill'i altında orkestre ediliyor.

**Karar:** Sıfırdan `figma_prototype` orchestrator'a (intent: `connect`/`flow`/`interaction`/`scroll`) konsolide edilebilir. Net azalma: **-4 tool**.

### 4.7 Toplam etki

| Kategori | Önce | Sonra | Δ |
|---|---|---|---|
| Okuma | 13 | `figma_use` (10 intent) | -12 |
| Yazma | 10 | `figma_nodes` + `figma_execute` | -9 |
| Variables | 12 | `figma_variables` | -11 |
| Diagnostics | 7 | `figma_diagnostics` | -6 |
| REST | 4 | `figma_rest` | -3 |
| Prototype | 5 | `figma_prototype` | -4 |
| **Toplam** | **~60** | **~15** | **-45** |

> **Tool şema context yükü tahmini:** ~60 tool × ortalama 800 token şema = ~48k token. 15 tool × 1500 token (intent-rich şema) = ~22k token. **Net kazanç: ~26k token/oturum** (Claude Sonnet 200k context'in %13'ü).

---

## 5. Skill stratejisi: "tool listesi" → "kod tarifi"

### 5.1 Mevcut anti-pattern (örnek)

Şu anki bir skill genelde şöyle:

```markdown
1. figma_create_frame ile frame yarat
2. figma_create_text ile başlık ekle
3. figma_create_rectangle ile divider çek
4. figma_create_text ile alt başlık ekle
5. figma_set_instance_properties ile button konfigüre et
... (8 ayrı tool çağrısı)
```

### 5.2 Hedef pattern (code-first)

```markdown
## Adım 2 — Login form yarat

Tek `figma_execute` çağrısı:

```javascript
const frame = figma.createFrame();
frame.resize(375, 812);
frame.layoutMode = 'VERTICAL';
frame.itemSpacing = 16;
frame.paddingTop = 24;

const title = figma.createText();
await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
title.fontName = { family: 'Inter', style: 'Bold' };
title.characters = 'Sign in';
title.fontSize = 28;
frame.appendChild(title);

// ... (button, divider, vb.)

return { frameId: frame.id, childCount: frame.children.length };
```
```

**Kazanç:** 8 tool çağrısı → 1 `figma_execute` çağrısı. Hız 5-8x, context 3-5x az.

### 5.3 Skill göç önceliği

| Skill | Şu anki tool çağrı sayısı (tipik) | Code-first hedefi | Öncelik |
|---|---|---|---|
| `generate-figma-screen` | 30-50 | 3-5 (`figma_execute` chunked) | **P0** |
| `generate-figma-library` | 50-100 | 5-10 (chunked batch) | **P0** |
| `figma-canvas-ops` | (zaten `figma_execute` kılavuzu) | - | Genişlet |
| `audit-figma-design-system` | 15-25 | 3-5 (`figma_use intent=overview` + `figma_execute` audit) | **P1** |
| `apply-figma-design-system` | 20-40 | 5-8 | **P1** |
| `design-token-pipeline` | 10-20 | 2-4 (`figma_variables intent=setup`) | **P2** |
| `figma-prototype-flow` | 5-15 | 2-3 (`figma_prototype` orchestrator) | **P2** |

### 5.4 Skill `metadata` zenginleştirme

Her skill frontmatter'ına eklenecek:

```yaml
metadata:
  mcp-server: user-figma-mcp-bridge
  personas: [designer, designops, uidev, po]
  load_trigger:           # NEW — progressive disclosure
    keywords: ["ekran üret", "screen generate", "login", "form"]
    intents: ["create", "design_context"]
  context_budget: 8000    # NEW — yüklendiğinde max token
  tool_dependencies:      # NEW — bu skill hangi tool'lara muhtaç
    - figma_use
    - figma_nodes
    - figma_execute
```

**Etki:** `fmcp-intent-router` skill'i kullanıcı promptuna göre yalnızca eşleşen skill'leri yükler. Oturum başı 26 skill yerine 1-3 skill yüklü.

---

## 6. Progressive Disclosure — somut implementasyon

### 6.1 Şu an

```
Oturum başı yükleme:
  - 60 tool şeması (~48k token)
  - SessionStart hook (Claude Code'da) skill önyüklemesi (~30k token)
  - CLAUDE.md auto-inject (~5k token)
Toplam: ~83k token sadece "ortam" kurulumu.
```

### 6.2 Hedef

```
Oturum başı:
  - 15 tool şeması (~22k token)
  - 2 root skill yüklü: fmcp-intent-router + fmcp-project-rules (~6k token)
  - CLAUDE.md (~5k token)
Toplam: ~33k token.

İlk kullanıcı promptuna göre:
  - Router 1-3 ek skill yükler (~10-25k token)
  - Toplam: ~43-58k token (önceki ~83k vs).
```

**Net kazanç:** Oturum başı **-25k token**, ilk prompt sonrası **-25 ile -40k token** arası.

### 6.3 Router skill mantığı

`fmcp-intent-router/SKILL.md` şöyle çalışmalı:

```
1. Kullanıcı promptunu oku.
2. Persona tespit et (designer/designops/uidev/po).
3. Intent tespit et (create/audit/sync/handoff/analyze).
4. (persona, intent) → eşleşen skill listesi (BRAND_PROFILE_SCHEMA tarzı tablo).
5. Yalnızca o skill'leri yükle (`load_trigger` metadatasına göre).
6. Yüklenmemiş skill'lerin SADECE adlarını + tek satır açıklamasını göster.
```

---

## 7. Güvenlik (P0 — code-first stratejide ertelenemez)

`docs/SECURITY_AUDIT.md` K1: `figma_execute` eval limiti.

Code-first strateji `figma_execute`'i ana yol yapacaksa:

- [ ] **Sandbox:** Sadece Figma Plugin API global'lerine erişim (no `eval`, no `Function` constructor inside)
- [ ] **AST allowlist:** Tehlikeli node tipleri (örn. `WhileStatement` infinite loop, `ImportExpression`) reddedilsin
- [ ] **Timeout:** Plugin tarafında her kod parçası max 5 saniye
- [ ] **Rate limit:** Skill başına max 20 `figma_execute` çağrısı / dakika
- [ ] **Audit log:** Her çalıştırılan kod hash'i + skill kaynağı `audit-log.ts`'e yazılsın
- [ ] **Output guard:** Return değeri `response-guard.ts` ile boyut sınırı + PII filtresi

**Sahibi:** Yeni dosya `src/core/execute-sandbox.ts` (yok — yazılacak).
**Bağımlı:** `f-mcp-plugin/code.js` tarafı da AST kontrolü yapacak (defense in depth).

---

## 8. Göç Planı (10 hafta)

### Hafta 1-2 — Konsolidasyon altyapısı (v1.10.0)
- [ ] `figma_use` intentlerini ekle (`overview`, `styles`, `search`, `node`, `screenshot`, `parity`, `code_connect`)
- [ ] Yeni `figma_nodes` orchestrator yaz (10 intent)
- [ ] Eski tool'ları `@deprecated` flag ile koru — backward compat
- [ ] `validate:fmcp-skills` script'i yeni intent isimlerini de tarasın

### Hafta 3 — Variable + Diagnostics + REST (v1.10.1)
- [ ] `figma_variables` orchestrator
- [ ] `figma_diagnostics` orchestrator
- [ ] `figma_rest` orchestrator
- [ ] `figma_prototype` orchestrator

### Hafta 4-5 — Skill code-first göçü, P0 (v1.11.0)
- [ ] `generate-figma-screen` → `figma_execute` chunked pattern
- [ ] `generate-figma-library` → 5-fazlı `figma_execute` template'leri
- [ ] `figma-canvas-ops` → kod örnekleri katalogu olarak yeniden yaz
- [ ] Test: Aynı tasarım eski/yeni skill ile, çağrı ve token sayısı karşılaştır

### Hafta 6 — Güvenlik (v1.11.1)
- [ ] `src/core/execute-sandbox.ts` — AST allowlist + timeout + rate limit
- [ ] Plugin tarafı AST kontrolü
- [ ] K1/K2/Y1 maddelerini kapat

### Hafta 7 — Progressive disclosure (v1.12.0)
- [ ] Skill `load_trigger` metadata şeması
- [ ] `fmcp-intent-router` skill'ini router olarak yeniden yaz
- [ ] SessionStart hook'u "lazy load" moduna çek

### Hafta 8 — Skill code-first göçü, P1 (v1.12.1)
- [ ] `audit-figma-design-system`
- [ ] `apply-figma-design-system`
- [ ] `fix-figma-design-system-finding`

### Hafta 9 — Ölçüm + dokümantasyon (v1.12.2)
- [ ] Telemetry: oturum başı token yükü, ortalama tool çağrı sayısı (opt-in)
- [ ] Performance harness: 9 standart ekran tipi için before/after metrikleri
- [ ] README'yi "skill-first toolkit" anlatısına çevir

### Hafta 10 — Deprecated tool'ları kaldır (v2.0.0)
- [ ] `@deprecated` flag'li ~45 tool kaldırılır
- [ ] Major version bump
- [ ] Migration guide: "Eski tool çağrılarınız nasıl çevrilir"

---

## 9. KPI'lar (her release'de ölç)

| Metrik | Şu an (tahmin) | 3 ay hedef | 6 ay hedef |
|---|---|---|---|
| Oturum başı tool şema yükü | ~48k token | ~22k | ~15k |
| Oturum başı toplam ortam yükü | ~83k token | ~33k | ~25k |
| Tipik "ekran üret" görevi tool çağrı sayısı | 30-50 | 8-12 | 3-5 |
| Tipik "ekran üret" görevi süre | 5-15 dk | 2-5 dk | 1-3 dk |
| Toplam aktif tool sayısı | ~60 | ~25 | ~15 |
| Aktif skill sayısı | 26 | 26-30 | 30-35 |
| Code-first skill oranı | %5 (figma-canvas-ops) | %50 | %85 |
| `validate:fmcp-skills` CI yeşil | ✅ | ✅ | ✅ |

---

## 10. Risk ve azaltma

| Risk | Olasılık | Etki | Azaltma |
|---|---|---|---|
| `figma_execute` sandbox bypass'i | Orta | Yüksek | AST allowlist + plugin tarafı double-check + audit log |
| Eski kullanıcılar deprecated tool çağırır | Yüksek | Düşük | 6 ay backward compat + migration guide |
| Orchestrator tool şeması büyür (intent şişer) | Orta | Orta | Her intent ayrı Zod şeması; 12 intent'i geçince yeni orchestrator'a böl |
| Skill code-first göçü yavaş gider | Yüksek | Orta | Hafta 4-5 ve 8'de paralel çalış; otomasyon mümkün değil, manuel |
| Progressive disclosure yanlış skill yükler | Orta | Orta | Router skill'in keyword tablosu test-driven, false negative ölçülmeli |
| Claude Desktop sub-agent'sız çalıştığı için disclosure çalışmaz | Yüksek | Düşük | Desktop'ta tüm skill yüklü kalsın; disclosure sadece Code/Cursor için |

---

## 11. Yapma Listesi (kısa anti-roadmap)

Stratejiyi sulandıracak şeyler — bilerek **erteliyoruz**:

- ❌ Figma Make entegrasyonu (FUTURE.md P0) — önce konsolidasyon, sonra yeni yüzey
- ❌ Standalone binary (FUTURE.md P4) — Node.js bağımlılığı şu an darboğaz değil
- ❌ Yeni "P0" özellik talepleri — tool sayısı 60 altına inmeden hiçbir yeni atomik tool eklenmez
- ❌ Çoklu IDE config (Windsurf/Zed) — kullanıcı talebi az; göç bittikten sonra
- ❌ Pre-built binary / GUI installer — tool şeması küçülmeden DX sorunu çözülmüş sayılmaz

---

## 12. Sonraki adım — bu doküman onayı sonrası

1. **Karar:** Bu strateji onaylanıyor mu? (Onay = `git merge` veya açık feedback)
2. **Issue tracker:** Hafta 1-10 maddeleri GitHub Issue'lara dökülür (her hafta = 1 milestone).
3. **`FUTURE.md` revize:** Bu strateji ile çelişen P0 maddeleri P2/P3'e çekilir veya kaldırılır.
4. **Pazarlama dili:** README + npm description "26 skill'lik Figma agent toolkit'i" olarak güncellenir.

---

## Ek A — "MCP öldü" makalesinin FMCP ile uyumu

| Makalenin önerisi | FMCP'de karşılığı |
|---|---|
| Az tool, çok skill | `figma_use` + 26 skill — yarıda |
| Code execution (LLM kod yazsın) | `figma_execute` var, skill'lerde yeterince kullanılmıyor |
| Progressive disclosure | `fmcp-intent-router` taslak halinde |
| Tool sonuçlarını küçült | Screenshot 4 mod, response-cache var ✅ |
| Tek tool ile tüm dosya sistemi | "Tek `figma_execute` ile tüm Plugin API" — paralel |
| Skill'ler yerelde dosya olarak | `skills/<name>/SKILL.md` ✅ |
| MCP yerine doğrudan SDK | N/A — Figma plugin için MCP'nin alternatifi yok |

**Sonuç:** Makaledeki "MCP öldü" tezi FMCP gibi *plugin köprüsü* projeleri için **kısmen geçerli**. MCP protokolü FMCP için tek mantıklı taşıyıcı (Claude/Cursor/Desktop hepsi MCP konuşuyor). Asıl ölçek — *tool sayısı* — düzeltilirse FMCP makaledeki kritiklere maruz kalmaz.

---

## Ek B — Referanslar

- UX Planet — *MCP is dead* (Mayıs 2026): https://uxplanet.org/mcp-is-dead-cf16b667ba6d
- FMCP `FUTURE.md` — mevcut roadmap (revize gerekecek)
- FMCP `docs/SECURITY_AUDIT.md` — K1 maddesi
- FMCP `docs/ARCHITECTURE.md` — sistem diyagramı
- FMCP `skills/SKILL_INDEX.md` — 26 skill envanteri
- FMCP `docs/TOOLS_FULL_LIST.md` — eski tool listesi (drift var, güncellenecek)

---

*Bu doküman canlı bir karar metnidir. Her release'de KPI bölümü güncellenmelidir.*
