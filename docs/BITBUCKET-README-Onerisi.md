# Bitbucket / Özel Repo README Önerisi

Bu dosya, **figma-mcp-bridge**’i fork’layıp kendi reponuzda (örn. Bitbucket `custom-figma-mcp`) kullanıyorsanız ana README için önerilen metindir. Aşağıdaki blokları kopyalayıp repo yolunuza göre düzenleyebilirsiniz.

---

```markdown
# F-MCP ATezer (Figma MCP Bridge) – Özel Kurulum

Figma tasarım verilerini ve işlemlerini Model Context Protocol (MCP) ile AI asistanlarına (Claude, Cursor vb.) açan plugin ve MCP sunucusu.

## Plugin'in MCP'ye Bağlanması (Özet)

**Önerilen (plugin-only – debug portu yok, token yok):**

1. **Plugin'i yükleyin:** Plugins → Development → **Import plugin from manifest** → `f-mcp-plugin/manifest.json`
2. **MCP:** Config'te `args`: **`/ABSOLUTE/PATH/TO/REPO/dist/local-plugin-only.js`** kullanın; token eklemeyin.
3. **Figma'yı normal açın**; Plugins → Development → **F-MCP ATezer Bridge** ile plugin'i çalıştırın; "ready" / "Bridge active" görünene kadar bekleyin.
4. Claude'u yeniden başlatın; `figma_get_variables`, `figma_execute` vb. kullanın.

**İsteğe bağlı (console log için CDP):** Figma'yı `open -a "Figma" --args --remote-debugging-port=9222` ile açın ve config'te `dist/local.js` kullanın.

## Detaylı Rehber

Plugin'in MCP ile nasıl konuştuğu, veri akışı ve sorun giderme için:

- **[Plugin–MCP Bağlantı Rehberi](docs/PLUGIN-MCP-BAGLANTI.md)** (mimari, kurulum, sözleşmeler)
```

---

Yukarıdaki blok Bitbucket README için önerilen içeriktir. `docs/PLUGIN-MCP-BAGLANTI.md` dosyasını da repoya ekleyip README’deki linki repo yoluna göre güncelleyebilirsiniz.
