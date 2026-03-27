# F-MCP — Kalan Adımlar (Future)

> Son güncelleme: 26 Mart 2026 (kod/doküman taraması)  
> Paket sürümü (`package.json`): **1.2.0**

---

## 1. NPM Publish

- [ ] `@atezer/figma-mcp-bridge@1.2.0` npm'e yayınla (`npm publish --access public`)
- [ ] Yayın sonrası `npx -y @atezer/figma-mcp-bridge@latest` ile doğrula
- [ ] `figma-mcp-bridge-plugin` bin girdisinin çalıştığını test et

---

## 2. Yerel repo durumu (FCM — bu workspace)

Aşağıdakiler repoda **mevcut**; uzak GitHub (`atezer/FMCP`) ile bire bir senkron mu ayrıca kontrol edilmeli.

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
| `docs/handoff.manifest.schema.json` | Mevcut |
| `HANDOFF_TEMPLATE.md` | Mevcut |

### Bridge

| Konu | Durum |
|------|--------|
| `dist/local-plugin-only.js` | `figma_search_assets`, `figma_get_code_connect`, `figma_use` kayıtlı |
| `dist/local.js` | Aynı üç araç + `getPluginBridgeConnector` (plugin-only ile parite) |
| `f-mcp-plugin/manifest.json` | `teamlibrary` izni (library variable araması için) |

### Config örnekleri

| Dosya | Durum |
|-------|--------|
| `.mcp.json` | Mevcut (kök) |
| `.cursor-plugin/plugin.json` | Mevcut; sürüm **1.2.0**, açıklama `docs/TOOLS.md` referanslı |

---

## 3. GitHub ve doküman tutarlılığı

- [ ] Yukarıdaki yerel dosyaların `atezer/FMCP` üzerinde güncel olduğunu doğrula (push / PR)
- [x] `KURULUM.md` — **Sürüm** **1.2.0** (`package.json` ile uyum)
- [x] `.cursor-plugin/plugin.json` — `version` **1.2.0**; açıklama `docs/TOOLS.md` ile hizalı
- [x] Sürüm notları — kök `CHANGELOG.md`; `README.md` ve `KURULUM.md` içinde GitHub Releases / npm takibi ve güncelleme özeti
- [ ] GitHub Releases — v1.2.0 (ve sonraki) tag + release sayfasında CHANGELOG özeti yayımla (changelog dosyası repoda; Release açıklamasına kopyalanabilir)

---

## 4. Cursor Plugin Dağıtımı

- [ ] `.cursor-plugin/plugin.json` formatını son Cursor Plugin API'ye uygun kontrol et
- [ ] Skills dosyalarının Cursor tarafından doğru okunduğunu test et
- [ ] Cursor Marketplace'e publish değerlendir

---

## 5. Figma Plugin Yayını

- [ ] **Organization private plugin** olarak yayınla (Figma Org/Enterprise plan gerektirir)
- [ ] Community'ye açık yayınlama değerlendir (review süreci var)
- [ ] Plugin listing için görsel/açıklama/etiketler hazırla

---

## 6. .mcpb Dosya Dağıtımı

- [ ] `figma-mcp-bridge.mcpb` (130 MB) — GitHub'a sığmıyor (100 MB limit)
- [ ] Alternatif dağıtım: GitHub Releases'a asset olarak ekle, veya ayrı hosting
- [ ] Gerekirse Git LFS kullanımını değerlendir

---

## 7. Doküman & README İyileştirmeleri

- [ ] GitHub repo description ve topics ekle (Figma, MCP, design-system, AI, cursor, claude)
- [ ] Kök `README.md` (varsa) ve `docs/` bağlantılarını güncelle
- [ ] İngilizce README alternatifi veya çift dil desteği değerlendir
- [ ] Badge'ler ekle (npm version, license, GitHub stars)

---

## 8. Test & CI

- [ ] GitHub Actions ile basit CI (build check, lint)
- [ ] NPM publish otomasyonu (tag-based release)
- [ ] Plugin bağlantı testi (smoke test)

---

## 9. İleri Seviye (Uzun Vadeli)

- [ ] Cloudflare Worker deployment — remote MCP sunucusu
- [ ] OAuth akışı — çoklu kullanıcı kimlik doğrulama
- [ ] Python bridge güncellemesi — v1.2.0 ile uyum
- [ ] Multi-instance (port 5454–5470) dokümantasyonunu auto-port discovery davranışı ile güncelle
- [ ] Tek port env adı standardını tamamla (`FIGMA_MCP_BRIDGE_PORT`) ve eski adı (`FIGMA_PLUGIN_BRIDGE_PORT`) deprecate planını yaz
- [ ] Enterprise audit log örnekleri ve test
