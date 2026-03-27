# F-MCP — Kalan Adımlar (Future)

> Son güncelleme: 27 Mart 2026 (güvenlik denetimi maddeleri + `docs/SECURITY_AUDIT.md`)  
> Paket sürümü (`package.json`): **1.2.0**

**Tamamlananlar (işaretlendi):** npm **1.2.0** yayın/doğrulama · GitHub **Release v1.2.0** (gövde güncel) · **CHANGELOG** + **RELEASE_NOTES_TEMPLATE** süreç satırı · **Figma** org plugin · **FUTURE** kod taraması / Bridge tablosu · **§3** GitHub doküman maddeleri · **§7** README satırı.

**Kod taraması özeti:** `npm view @atezer/figma-mcp-bridge version` → **1.2.0** (npm yayını doğrulandı). `dist/local-plugin-only.js` / `dist/local.js` içinde `figma_search_assets`, `figma_get_code_connect`, `figma_use` stringleri **yok** — `docs/TOOLS.md` Agent Canvas paritesi bu build ile uyumsuz; envanter düzeltmesi açık (§7).

---

## 1. NPM Publish

- [x] `@atezer/figma-mcp-bridge@1.2.0` npm'de yayında (`npm view` ile doğrulandı)
- [x] `npx -y @atezer/figma-mcp-bridge@latest` ile çekilebilirlik (paket sürümü 1.2.0)
- [ ] `figma-mcp-bridge-plugin` bin'inin temiz ortamda smoke testi (isteğe bağlı CI)

---

## 2. Yerel repo durumu (FCM — bu workspace)

Aşağıdakiler repoda **mevcut**; upstream `atezer/FMCP` ile çalışıyorsanız `main` günceldir (fork/PR akışıyla çekenler kendi senkronunu doğrular).

### Skills

Kaynak tek klasör: **`.cursor/skills/f-mcp/`** (köke kopya `skills/` arşivde: `archive/skills-root-duplicate/`).

| Dosya | Durum |
|-------|--------|
| `.cursor/skills/f-mcp/implement-design/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/code-design-mapper/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/design-system-rules/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/design-token-pipeline/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/design-drift-detector/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/ai-handoff-export/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/figjam-diagram-builder/SKILL.md` | Mevcut |

### Dokümanlar

| Dosya | Durum |
|-------|--------|
| `PRIVACY.md` | Mevcut |
| `docs/TOOLS.md` | Mevcut (MCP araç envanteri) |
| `docs/FMCP_AGENT_CANVAS_COMPAT.md` | Mevcut |
| `docs/FIGMA_USE_STRUCTURED_INTENT.md` | Mevcut |
| `docs/FMCP_ENTERPRISE_WORKFLOWS.md` | Mevcut |
| `docs/SECURITY_AUDIT.md` | Mevcut (güvenlik bulguları checklist) |
| `docs/handoff.manifest.schema.json` | Mevcut |
| `HANDOFF_TEMPLATE.md` | Mevcut |

### Bridge

| Konu | Durum |
|------|--------|
| `dist/local-plugin-only.js` | Plugin-only araç seti: dosya/design context, variable CRUD, batch token, parity, token browser, `figma_execute`, ekran görüntüsü, `figma_get_status`, vb. (**Kod taraması:** `figma_search_assets` / `figma_get_code_connect` / `figma_use` bu dosyada kayıtlı değil.) |
| `dist/local.js` | Tam mod: CDP (`figma_navigate`, konsol, screenshot), ek node araçları (`figma_resize_node`, …), tasarım sistemi önbelleği — **aynı üç araç yok** |
| `f-mcp-plugin/manifest.json` | `teamlibrary` izni (library variable araması için) |

### Config örnekleri

| Dosya | Durum |
|-------|--------|
| `.mcp.json` | Mevcut (kök) |
| `.cursor-plugin/plugin.json` | Mevcut; sürüm **1.2.0**, açıklama `docs/TOOLS.md` referanslı |

---

## 3. GitHub ve doküman tutarlılığı

- [x] `atezer/FMCP` `main` ile yerel push senkronu (son değişiklikler gönderildi; fork/PR kullananlar kendi dallarını birleştirmeli)
- [x] `KURULUM.md` — **Sürüm** **1.2.0** (`package.json` ile uyum)
- [x] `.cursor-plugin/plugin.json` — `version` **1.2.0**; açıklama `docs/TOOLS.md` ile hizalı
- [x] Sürüm notları — kök `CHANGELOG.md`; `README.md` ve `KURULUM.md` içinde GitHub Releases / npm takibi ve güncelleme özeti
- [x] GitHub Releases — [v1.2.0](https://github.com/atezer/FMCP/releases/tag/v1.2.0) tag + release; gövde: [`docs/releases/v1.2.0-body.md`](docs/releases/v1.2.0-body.md) (`gh release edit` ile senkron); sonraki sürüm: **CHANGELOG → `docs/releases/vX.Y.Z-body.md` → [`RELEASE_NOTES_TEMPLATE.md`](docs/RELEASE_NOTES_TEMPLATE.md) içindeki `gh release create` / `edit`**

---

## 4. Cursor Plugin Dağıtımı

**Kontrol:** `.cursor-plugin/plugin.json` geçerli JSON; `skills` → `.cursor/skills/f-mcp/`, `mcpServers` NPX tanımı mevcut — Cursor sürümüne göre resmi şema doğrulaması elle/marketplace rehberi ile yapılmalı.

- [ ] Cursor Plugin API / şema ile biçim doğrulaması (resmi dokümantasyon)
- [ ] Skills yollarının IDE’de yüklendiği manuel test
- [ ] Cursor Marketplace'e publish değerlendir

---

## 5. Figma Plugin Yayını

**Kontrol notu (2026-03-27):** Depo tarafında `f-mcp-plugin/manifest.json` (Plugin ID, `teamlibrary`, `enablePrivatePluginApi`, `networkAccess` localhost **5454–5470**, FigJam/Dev editor) ve [docs/PUBLISH-PLUGIN.md](docs/PUBLISH-PLUGIN.md) (Data security cevapları, org seçimi) yayın gereksinimleriyle uyumlu. **Canlı durum:** Organization üzerinden plugin yayını tamamlandı; diğer organizasyonel dağıtımlar (ek org / aynı yapılandırma ile çoğaltma) için hazırlık kullanıcı tarafından onaylandı.

- [x] **Organization private plugin** — Figma Org üzerinden yayınlandı; çoklu org / org yapılarına uygun dağıtım için hazır
- [ ] **Community (genel)** — İsteğe bağlı; Figma Community incelemesi ayrı süreç (şimdilik org odaklı yayın yeterli sayıldı)
- [x] **Plugin listing** — Görsel, açıklama ve etiketler org yayını için hazırlandı / kullanıldı

---

## 6. .mcpb Dosya Dağıtımı

**Kontrol:** Depoda `*.mcpb` dosyası yok; dağıtım maddeleri hâlâ geçerli.

- [ ] `figma-mcp-bridge.mcpb` (büyük paket) — GitHub tek dosya limiti dışında kalıyorsa
- [ ] Alternatif: GitHub Releases asset veya ayrı hosting
- [ ] Gerekirse Git LFS

---

## 7. Doküman & README İyileştirmeleri

- [ ] GitHub repo **description** ve **topics** (Figma, MCP, design-system, AI, cursor, claude) — repo ayarları (UI)
- [x] Kök `README.md` mevcut ve güncel; `docs/` bağlantı tablosu var
- [ ] `docs/TOOLS.md` — **Agent Canvas** bölümündeki `figma_search_assets` / `figma_get_code_connect` / `figma_use` / `local-plugin-only` paritesi; mevcut `dist/` ile hizala veya “planlanan / kaldırıldı” notu düş
- [ ] İngilizce README alternatifi veya çift dil desteği değerlendir
- [ ] Badge'ler (npm version, license, stars)

---

## 8. Test & CI

**Kontrol:** `.github/workflows/` yok — CI otomasyonu eklenmedi.

- [ ] GitHub Actions: `npm run build:local`, `npm test` / lint
- [ ] NPM publish workflow (tag → `npm publish`)
- [ ] Plugin bağlantısı smoke testi (isteğe bağlı)
- [ ] Güvenlik düzeltmeleri sonrası regresyon: `figma_execute` limit, WS payload (bkz. [§10](#10-güvenlik-denetimi-security-audit))

---

## 9. İleri Seviye (Uzun Vadeli)

- [ ] Cloudflare Worker — `wrangler.jsonc` + `src/index.ts` (Durable Objects, OAuth KV) mevcut; **production deploy / operasyon** ve dokümantasyon netleştirilmeli
- [ ] OAuth — Worker tarafında token/refresh kodu var; **çoklu kullanıcı / oturum modeli** ve güvenlik gözden geçirmesi açık ([§10](#10-güvenlik-denetimi-security-audit) Y1/O3 ile ilişkili)
- [ ] Python bridge — `python-bridge/` mevcut; Node **1.2.0** ile protokol/feature parity testi
- [x] Multi-instance — `docs/MULTI_INSTANCE.md` 5454–5470 ve otomatik port tarama davranışını anlatıyor; ek iyileştirme isteğe bağlı
- [x] Port env — `src/core/config.ts`: `FIGMA_MCP_BRIDGE_PORT` **veya** `FIGMA_PLUGIN_BRIDGE_PORT` (ikisi de okunuyor). Kalan iş: dokümantasyonda tek isim standardına geçiş ve eski ad için **deprecate** notu
- [x] Enterprise audit log — `FIGMA_MCP_AUDIT_LOG_PATH`, `dist/core/audit-log.js`, [docs/ENTERPRISE.md](docs/ENTERPRISE.md); örnek log senaryoları / test isteğe bağlı

---

## 10. Güvenlik denetimi (Security audit)

**Evet, FUTURE’a eklenmeli:** Yayınlanmış bir köprü + `eval` + WebSocket yüzeyi için izlenebilir maddeler yol haritasında olmalı. Özet checklist repoda: **[docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)** (K1–K4, Y1–Y3, O1–O7, D1–D4; Y4 iptal notu).

**Kaynak:** Cursor planı `~/.cursor/plans/security_audit_fixes_f803037b.plan.md` — ekip için asıl takip **`docs/SECURITY_AUDIT.md`** üzerinden yapılmalı; plan yalnızca geliştirici makinesinde kalabilir.

- [ ] **Kritik:** K1 `code.js` eval limit · K2 Zod (plugin-only + `local.ts`) + Python `len` · K3 `nodeId` · K4 OPT-IN WS secret
- [ ] **Yüksek:** Y1 token log · Y2 `0.0.0.0` uyarısı · Y3 path traversal — Y4 dokümana “postMessage `*` zorunlu” notu
- [ ] **Orta:** O2 maxPayload + rate · O3/O5/O7 hata sanitize (Worker OAuth dahil) · O6 console-monitor · O1/O4 dokümantasyon + debug log
- [ ] **Düşük:** D1–D4 (CORS, wrangler id, TMPDIR, debug host SSRF)

OAuth / token logları **§9** ile birlikte ele alınmalı; düzeltmelerde tek PR veya sıralı sürüm önerilir.
