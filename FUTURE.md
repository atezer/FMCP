# F-MCP -- Kalan Adimlar (Future)

> Son guncelleme: 2 Nisan 2026 (figma_set_port, port catismasi dayanikliligi, coklu AI araci)
> Paket surumu (`package.json`): **1.3.0**

**Tamamlananlar (isaretlendi):** npm **1.2.0** yayin/dogrulama - GitHub **Release v1.2.0** (govde guncel) - **CHANGELOG** + **RELEASE_NOTES_TEMPLATE** surec satiri - **Figma** org plugin - **FUTURE** kod taramasi / Bridge tablosu - **S3** GitHub dokuman maddeleri - **S7** README satiri - **Sabit port** stratejisi + olu port probe - **Graceful shutdown** (SIGINT/SIGTERM) - **Paralel gorevler** dokumantasyonu (MULTI_INSTANCE + CLAUDE_DESKTOP_CONFIG) - **check-ports** teshis scripti - **figma_set_port** runtime port degisimi - **Port catismasi dayanikliligi** (crash yerine MCP ayakta kalir) - **Coklu AI araci** ayni anda (Claude + Cursor).

**Kod taramasi ozeti:** `docs/TOOLS.md` / `TOOLS_FULL_LIST.md` / `FMCP_AGENT_CANVAS_COMPAT.md` — `dist/local-plugin-only.js` ile parite (2026-04). Yayin: `npm view @atezer/figma-mcp-bridge version` ile **1.3.0** dogrulanabilir (yayim sonrasi).

---

## 1. NPM Publish

- [x] `@atezer/figma-mcp-bridge@1.2.0` npm'de yayinda (`npm view` ile dogrulandi)
- [x] `npx -y @atezer/figma-mcp-bridge@latest` ile cekilebilirlik (paket surumu 1.2.0)
- [ ] `figma-mcp-bridge-plugin` bin'inin temiz ortamda smoke testi (istege bagli CI)

---

## 2. Yerel repo durumu (FCM -- bu workspace)

Asagidakiler repoda **mevcut**; upstream `atezer/FMCP` ile calisiyorsaniz `main` gunceldur (fork/PR akisiyla cekenler kendi senkronunu dogrular).

### Skills

Kaynak tek klasor: **`.cursor/skills/f-mcp/`** (koke kopya `skills/` arsivde: `archive/skills-root-duplicate/`).

| Dosya | Durum |
|-------|--------|
| `.cursor/skills/f-mcp/figma-canvas-ops/SKILL.md` | Mevcut (yeni) |
| `.cursor/skills/f-mcp/generate-figma-screen/SKILL.md` | Mevcut (yeni) |
| `.cursor/skills/f-mcp/generate-figma-library/SKILL.md` | Mevcut (yeni) |
| `.cursor/skills/f-mcp/figjam-diagram-builder/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/audit-figma-design-system/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/fix-figma-design-system-finding/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/apply-figma-design-system/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/design-token-pipeline/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/code-design-mapper/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/design-system-rules/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/ai-handoff-export/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/implement-design/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/design-drift-detector/SKILL.md` | Mevcut |
| `.cursor/skills/f-mcp/visual-qa-compare/SKILL.md` | Mevcut (yeni) |
| `.cursor/skills/f-mcp/figma-a11y-audit/SKILL.md` | Mevcut (yeni) |
| `.cursor/skills/f-mcp/figma-screen-analyzer/SKILL.md` | Mevcut (yeni) |
| `.cursor/skills/f-mcp/ds-impact-analysis/SKILL.md` | Mevcut (yeni) |

### Dokumanlar

| Dosya | Durum |
|-------|--------|
| `PRIVACY.md` | Mevcut |
| `docs/TOOLS.md` | Mevcut (MCP arac envanteri) |
| `docs/FMCP_AGENT_CANVAS_COMPAT.md` | Mevcut |
| `docs/FIGMA_USE_STRUCTURED_INTENT.md` | Mevcut |
| `docs/FMCP_ENTERPRISE_WORKFLOWS.md` | Mevcut |
| `docs/SECURITY_AUDIT.md` | Mevcut (guvenlik bulgulari checklist) |
| `docs/handoff.manifest.schema.json` | Mevcut |
| `HANDOFF_TEMPLATE.md` | Mevcut |
| `docs/MULTI_INSTANCE.md` | Mevcut (paralel gorevler bolumu eklendi) |
| `docs/CLAUDE_DESKTOP_CONFIG.md` | Mevcut (coklu mcpServers ornegi eklendi) |

### Bridge

| Konu | Durum |
|------|--------|
| `dist/local-plugin-only.js` | Plugin-only arac seti + **graceful shutdown** (SIGINT/SIGTERM) |
| `dist/local.js` | Tam mod: CDP, ek node araclari, tasarim sistemi onbellegi |
| `src/core/plugin-bridge-server.ts` | **Sabit port** stratejisi, `probePort` health-check, olu port retry |
| `f-mcp-plugin/manifest.json` | `teamlibrary` izni (library variable aramasi icin) |
| `scripts/check-ports.sh` | 5454-5470 port tarama teshis scripti |

### Config ornekleri

| Dosya | Durum |
|-------|--------|
| `.mcp.json` | Mevcut (kok) |
| `.cursor-plugin/plugin.json` | Mevcut; surum **1.2.0**, aciklama `docs/TOOLS.md` referansli |

---

## 3. GitHub ve dokuman tutarliligi

- [x] `atezer/FMCP` `main` ile yerel push senkronu (son degisiklikler gonderildi; fork/PR kullananlar kendi dallarini birlestirmeli)
- [x] `KURULUM.md` -- **Surum** **1.2.0** (`package.json` ile uyum)
- [x] `.cursor-plugin/plugin.json` -- `version` **1.2.0**; aciklama `docs/TOOLS.md` ile hizali
- [x] Surum notlari -- kok `CHANGELOG.md`; `README.md` ve `KURULUM.md` icinde GitHub Releases / npm takibi ve guncelleme ozeti
- [x] GitHub Releases -- [v1.2.0](https://github.com/atezer/FMCP/releases/tag/v1.2.0), [v1.2.1](https://github.com/atezer/FMCP/releases/tag/v1.2.1); govde: [`docs/releases/v1.2.0-body.md`](docs/releases/v1.2.0-body.md), [`docs/releases/v1.2.1-body.md`](docs/releases/v1.2.1-body.md); sonraki surum: **CHANGELOG -> `docs/releases/vX.Y.Z-body.md` -> [`RELEASE_NOTES_TEMPLATE.md`](docs/RELEASE_NOTES_TEMPLATE.md) icindeki `gh release create` / `edit`**

---

## 4. Cursor Plugin Dagitimi

**Kontrol:** `.cursor-plugin/plugin.json` gecerli JSON; `skills` -> `.cursor/skills/f-mcp/`, `mcpServers` NPX tanimi mevcut -- Cursor surumune gore resmi sema dogrulamasi elle/marketplace rehberi ile yapilmali.

- [ ] Cursor Plugin API / sema ile bicim dogrulamasi (resmi dokumantasyon)
- [ ] Skills yollarinin IDE'de yuklendigi manuel test
- [ ] Cursor Marketplace'e publish degerlendir

---

## 5. Figma Plugin Yayini

**Kontrol notu (2026-03-27):** Depo tarafinda `f-mcp-plugin/manifest.json` (Plugin ID, `teamlibrary`, `enablePrivatePluginApi`, `networkAccess` localhost **5454-5470**, FigJam/Dev editor) ve [docs/PUBLISH-PLUGIN.md](docs/PUBLISH-PLUGIN.md) (Data security cevaplari, org secimi) yayin gereksinimleriyle uyumlu. **Canli durum:** Organization uzerinden plugin yayini tamamlandi; diger organizasyonel dagitimlar (ek org / ayni yapilandirma ile cogaltma) icin hazirlik kullanici tarafindan onaylandi.

- [x] **Organization private plugin** -- Figma Org uzerinden yayinlandi; coklu org / org yapilarina uygun dagitim icin hazir
- [ ] **Community (genel)** -- Istege bagli; Figma Community incelemesi ayri surec (simdilik org odakli yayin yeterli sayildi)
- [x] **Plugin listing** -- Gorsel, aciklama ve etiketler org yayini icin hazirlandi / kullanildi

---

## 6. .mcpb Dosya Dagitimi

**Kontrol:** Depoda `*.mcpb` dosyasi yok; dagitim maddeleri hala gecerli.

- [ ] `figma-mcp-bridge.mcpb` (buyuk paket) -- GitHub tek dosya limiti disinda kaliyorsa
- [ ] Alternatif: GitHub Releases asset veya ayri hosting
- [ ] Gerekirse Git LFS

---

## 7. Dokuman & README Iyilestirmeleri

- [ ] GitHub repo **description** ve **topics** (Figma, MCP, design-system, AI, cursor, claude) -- repo ayarlari (UI)
- [x] Kok `README.md` mevcut ve guncel; `docs/` baglanti tablosu var
- [x] `docs/TOOLS.md` -- **Agent Canvas** / `local-plugin-only` paritesi (2026-04): `figma_search_assets` / `figma_get_code_connect` / `figma_use` kayitli degildir notu; `TOOLS_FULL_LIST.md`, `FMCP_AGENT_CANVAS_COMPAT.md`, `FIGMA_USE_STRUCTURED_INTENT.md` ile hizali
- [ ] Ingilizce README alternatifi veya cift dil destegi degerlendir
- [ ] Badge'ler (npm version, license, stars)

---

## 8. Test & CI

**Kontrol:** `.github/workflows/` mevcut (validate:fmcp-skills CI); ek test/build CI eklenmedi.

- [ ] GitHub Actions: `npm run build:local`, `npm test` / lint
- [ ] NPM publish workflow (tag -> `npm publish`)
- [ ] Plugin baglantisi smoke testi (istege bagli)
- [ ] Guvenlik duzeltmeleri sonrasi regresyon: `figma_execute` limit, WS payload (bkz. [S10](#10-guvenlik-denetimi-security-audit))
- [ ] Bagimlilk gozden gecirmesi: periyodik `npm audit` (gerekirse `fix` / manuel yukseltme); kritik CVE'lerde patch surumu
- [ ] Istege bagli: commit/CI oncesi **secret / anahtar sizintisi** taramasi (orn. [gitleaks](https://github.com/gitleaks/gitleaks), TruffleHog) -- `wrangler.jsonc` id'leri icin [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) (D2)

---

## 9. Ileri Seviye (Uzun Vadeli)

- [ ] Cloudflare Worker -- `wrangler.jsonc` + `src/index.ts` (Durable Objects, OAuth KV) mevcut; **production deploy / operasyon** ve dokumantasyon netlestirilmeli
- [ ] OAuth -- Worker tarafinda token/refresh kodu var; **coklu kullanici / oturum modeli** ve guvenlik gozden gecirmesi acik ([S10](#10-guvenlik-denetimi-security-audit) Y1/O3 ile iliskili)
- [ ] Python bridge -- `python-bridge/` mevcut; Node **1.2.0** ile protokol/feature parity testi
- [x] Multi-instance -- `docs/MULTI_INSTANCE.md` sabit port ve paralel gorevler dokumantasyonu tamamlandi; `check-ports.sh` teshis scripti eklendi
- [x] Port env -- `src/core/config.ts`: `FIGMA_MCP_BRIDGE_PORT` **veya** `FIGMA_PLUGIN_BRIDGE_PORT` (ikisi de okunuyor). Sabit port stratejisi uygulanmis; otomatik port taramasi kaldirilmis.
- [x] **figma_set_port** -- Runtime port degisimi (v1.3.0). Port mesgulse crash yerine MCP ayakta kalir; `figma_set_port(5456)` ile farkli porta gecis. Claude + Cursor ayni anda kullanim destegi.
- [x] Enterprise audit log -- `FIGMA_MCP_AUDIT_LOG_PATH`, `dist/core/audit-log.js`, [docs/ENTERPRISE.md](docs/ENTERPRISE.md); ornek log senaryolari / test istege bagli
- [x] Graceful shutdown -- `local-plugin-only.ts`'e SIGINT/SIGTERM handler eklendi; port serbest birakma sorunu cozuldu

---

## 10. Guvenlik denetimi (Security audit)

**Evet, FUTURE'a eklenmeli:** Yayinlanmis bir kopru + `eval` + WebSocket yuzeyi icin izlenebilir maddeler yol haritasinda olmali. Ozet checklist repoda: **[docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)** (K1-K4, Y1-Y3, O1-O7, D1-D4; Y4 iptal notu).

**Kaynak:** Cursor plani `~/.cursor/plans/security_audit_fixes_f803037b.plan.md` -- ekip icin asil takip **`docs/SECURITY_AUDIT.md`** uzerinden yapilmali; plan yalnizca gelistirici makinesinde kalabilir.

- [ ] **Kritik:** K1 `code.js` eval limit - K2 Zod (plugin-only + `local.ts`) + Python `len` - K3 `nodeId` - K4 OPT-IN WS secret
- [ ] **Yuksek:** Y1 token log - Y2 `0.0.0.0` uyarisi - Y3 path traversal -- Y4 dokumana "postMessage `*` zorunlu" notu
- [ ] **Orta:** O2 maxPayload + rate - O3/O5/O7 hata sanitize (Worker OAuth dahil) - O6 console-monitor - O1/O4 dokumantasyon + debug log
- [ ] **Dusuk:** D1-D4 (CORS, wrangler id, TMPDIR, debug host SSRF)

OAuth / token loglari **S9** ile birlikte ele alinmali; duzeltmelerde tek PR veya sirali surum onerilir.
