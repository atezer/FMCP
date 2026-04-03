# F-MCP -- Kalan Adimlar (Future)

> Son guncelleme: 2 Nisan 2026 (v1.6.2 — 46 arac, node creation, batch export, REST API, test altyapisi)
> Paket surumu (`package.json`): **1.6.5**

---

## YUKSEK ONCELIKLI HEDEFLER (Plugin-Only Kullanicilar Icin)

### P0 — Tasarim Olusturma Araclari (Node Creation)

Simdi: Yeni frame/text/rectangle olusturmak icin `figma_execute` ile ham Plugin API kodu yazmak gerekiyor.
Hedef: Ozel araclar ile kolay node olusturma.

- [x] `figma_create_frame` — x, y, width, height, name, parentId (v1.6.0)
- [x] `figma_create_text` — text, x, y, fontSize, fontFamily, parentId (v1.6.0)
- [x] `figma_create_rectangle` — geometry + fill/stroke (v1.6.0)
- [x] `figma_create_group` — children birlestirme (v1.6.0)

Etki: Tasarim otomasyonu, bilesen uretimi, layout yeniden olusturma icin temel.

### P0 — Asset Search ve Code Connect

Simdi: Sadece dosya-icindeki bilesenler aranabiliyor (`figma_search_components`). Takim kutuphane arama yok.
Hedef: Yayinlanmis kutuphane bilesen/variable arama + Code Connect eslemesi.

- [x] `figma_search_assets` — takim kutuphane arama (plugin teamLibrary API, v1.6.0)
- [ ] `figma_get_code_connect` — node icin kod eslesmesi
- [ ] `figma_use` — yuksek seviyeli bilesen/token tuketim araci

### P1 — Gorsel Export (SVG/PNG/Batch)

Simdi: Sadece screenshot (bitmap PNG). SVG export ve toplu export yok.
Hedef: Vektorel format desteyi + coklu node export.

- [x] `figma_export_nodes` — SVG/PNG/JPG/PDF batch export, 1-50 node (v1.6.1)
- [ ] REST API image export rehberi (`/v1/images/:fileKey`)

### P1 — Guvenlik Denetimi (Enterprise)

`docs/SECURITY_AUDIT.md` icindeki kritik maddeler:
- [ ] K1: `figma_execute` eval limiti (kod enjeksiyonu onleme)
- [ ] K2: Zod girdi dogrulama guclendir
- [ ] Y1: Token log azaltma (hassas veri maskeleme)

### P1 — REST API Kullanici Rehberi

- [x] `docs/REST_API_GUIDE.md` — token kurulumu, ornek cagrilar, rate limit yonetimi (v1.6.0)
- [ ] Hibrit akis (plugin + REST) dokumantasyonu

### P2 — WebSocket Yeniden Baglanti ve Teshis

- [x] `figma_plugin_diagnostics` — uptime, heartbeat, bellek, port (v1.6.0)
- [ ] Plugin crash durumunda otomatik yeniden baglanti
- [ ] Baglanti durumu UI gostergesi (iyilestirilmis)

### P2 — Gelistirici Deneyimi

- [x] `CONTRIBUTING.md` — yerel kurulum, test, skill yazma, PR sureci (v1.6.0)
- [ ] Eski belgelere "deprecated" notu ekle (OAUTH_SETUP.md vb.)
- [ ] IDE config ornekleri: VSCode, Windsurf, Zed

### P3 — npm ve GitHub Gorünürlük

- [x] package.json keywords guncellendi (design-system, design-tokens, zero-trust, cursor, agent — v1.6.0)
- [ ] GitHub repo aciklamasi + topics ekle
- [ ] README'ye CI badge, npm version badge ekle

### P4 — Node.js Bagimliligi Kaldirma (Standalone)

Node.js olmadan F-MCP kullanabilme. Detayli analiz ve plan: [STANDALONE_PLAN.md](docs/STANDALONE_PLAN.md)

- [ ] Python bridge 10→46 araca genisletme (dusuk risk, 2-3 gun)
- [ ] Standalone binary (pkg ile, yuksek risk, 3-4 hafta, opsiyonel)

### P3 — Yeni Skiller

- [ ] `design-to-code-generator` — tasarim → React/Vue/Svelte kod uretimi
- [ ] `design-system-migrations` — variable toplu yeniden adlandirma, token guncelleme
- [ ] `layout-reconstruction` — layout context'ten responsive grid olusturma

---

## TAMAMLANAN ASAMALAR

- [x] **v1.5.2** — Test altyapisi (36 test, CI entegrasyonu)
- [x] **v1.5.1** — TypeScript tip guvenligi (%90 any azaltma, types/figma.ts)
- [x] **v1.5.0** — Plugin minify (geri alindi), CI guclendirme, archive/belge/TODO temizligi
- [x] **v1.4.x** — Figma REST API (4 tool), Response Guard (context korumasi), token yonetimi
- [x] **v1.3.x** — figma_set_port, coklu AI araci, port catismasi dayanikliligi
- [x] **v1.2.x** — Sabit port, graceful shutdown, paralel gorevler

**Tamamlananlar (isaretlendi):** npm **1.2.0** yayin/dogrulama - GitHub **Release v1.2.0** (govde guncel) - **CHANGELOG** + **RELEASE_NOTES_TEMPLATE** surec satiri - **Figma** org plugin - **FUTURE** kod taramasi / Bridge tablosu - **S3** GitHub dokuman maddeleri - **S7** README satiri - **Sabit port** stratejisi + olu port probe - **Graceful shutdown** (SIGINT/SIGTERM) - **Paralel gorevler** dokumantasyonu (MULTI_INSTANCE + CLAUDE_DESKTOP_CONFIG) - **check-ports** teshis scripti - **figma_set_port** runtime port degisimi - **Port catismasi dayanikliligi** (crash yerine MCP ayakta kalir) - **Coklu AI araci** ayni anda (Claude + Cursor) - **Figma REST API** token entegrasyonu (4 yeni tool) - **Response Guard** context korumasi (237KB→10KB kirpma) - **429 retry** exponential backoff - **Plugin UI** token girisi + sure yonetimi + rate limit gostergesi - **figma.clientStorage** kalici token depolama.

**Kod taramasi ozeti:** `docs/TOOLS.md` / `TOOLS_FULL_LIST.md` / `FMCP_AGENT_CANVAS_COMPAT.md` — `dist/local-plugin-only.js` ile parite (2026-04). Yayin: `npm view @atezer/figma-mcp-bridge version` ile **1.6.5** dogrulanabilir (yayim sonrasi).

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
| `.cursor-plugin/plugin.json` | Mevcut; surum **1.6.5**, aciklama `docs/TOOLS.md` referansli |

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
- [x] **npm paket optimizasyonu** -- dist/cloudflare paketten cikarildi; 284KB→234KB (%18), 128→104 dosya (v1.4.1→v1.4.3).
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
