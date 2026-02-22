# Bitbucket / Özel Repo README Şablonu

Bu dosya, repoyu fork’layıp kendi reponuzda (örn. Bitbucket) kullanırken **ana README** olarak kopyalayıp kullanabileceğiniz kısa şablondur. Projeyi birebir yansıtır. Repo köküne README.md olarak kopyalarsanız doküman linklerine `docs/` öneki ekleyin (örn. `docs/ONBOARDING.md`).

---

# F-MCP (Figma MCP Bridge)

Figma tasarım verilerini MCP ile AI asistanlarına (Claude, Cursor) açan MCP sunucusu ve Figma plugin’i. **Figma REST API kullanılmaz** — akış yerel: Claude → MCP → Plugin → Figma Desktop. Zero Trust; veri buluta gönderilmez.

**32 araç** (config’te `dist/local-plugin-only.js`). Tam liste: [TOOLS_FULL_LIST.md](TOOLS_FULL_LIST.md).

## Hızlı başlangıç

1. **Build:** `npm install` → `npm run build:local`
2. **Plugin:** Figma’da Plugins → Development → Import plugin from manifest → `f-mcp-plugin/manifest.json`; sonra Plugins → **F-MCP ATezer Bridge** çalıştırın.
3. **Claude config:** `args`: `"<REPO-TAM-YOLU>/dist/local-plugin-only.js"` (token yok).

Plugin “ready” görününce tüm `figma_*` araçları kullanılır.

**Detaylı kurulum:** [ONBOARDING.md](ONBOARDING.md)  
**Mimari / bağlantı:** [PLUGIN-MCP-BAGLANTI.md](PLUGIN-MCP-BAGLANTI.md)  
**Sorun giderme:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

**Çoklu kullanıcı:** Port 5454–5470, plugin’de Port alanı — [MULTI_INSTANCE.md](MULTI_INSTANCE.md).  
**Enterprise:** Audit log, air-gap, org plugin — [ENTERPRISE.md](ENTERPRISE.md).
