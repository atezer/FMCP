# F-MCP Bridge — Python (Node.js olmadan)

Bu klasör, **Node.js kurulumu olmayan** ortamlarda (örn. Windows kurumsal bilgisayar) F-MCP Bridge kullanmak için Python ile yazılmış MCP sunucusudur. Plugin ile aynı WebSocket protokolünü (port 5454) ve Node köprüsüyle **aynı eşleştirme kodunu** kullanır; Figma plugin tarafında ayrı bir ayar gerekmez.

## Gereksinimler

- **Python 3.10+**
- `pip install -r requirements.txt`

## Kurulum

```bash
cd python-bridge
pip install -r requirements.txt
```

İsteğe bağlı sanal ortam:

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

## Çalıştırma

Claude Desktop config’te MCP sunucusu olarak bu modülü çalıştırın:

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "python",
      "args": ["-m", "fmcp_bridge"],
      "cwd": "C:\\path\\to\\FMCP\\python-bridge"
    }
  }
}
```

Windows’ta Python launcher kullanıyorsanız: `"command": "py"`, `"args": ["-3", "-m", "fmcp_bridge"]`.

Port varsayılan **5454**; ortam değişkeni ile değiştirilebilir: `FIGMA_PLUGIN_BRIDGE_PORT=5455`.

## Desteklenen araçlar (kritik set)

| MCP aracı | Açıklama |
|-----------|----------|
| `figma_get_status` | Plugin bağlantı durumu |
| `figma_get_variables` | Variable koleksiyonları ve değişkenler |
| `figma_get_file_data` | Dosya ağaç yapısı (depth, verbosity) |
| `figma_get_styles` | Local paint, text, effect stilleri |
| `figma_get_design_system_summary` | Özet: değişkenler + bileşen sayıları (currentPageOnly varsayılan) |
| `figma_search_components` | İsme göre bileşen arama |
| `figma_get_design_context` | Node için design context (layout, renk, tipografi) |
| `figma_execute` | Plugin API’de JavaScript çalıştırma |
| `figma_get_metadata` | Node metadata (id, type, name, pozisyon, boyut) |
| `figma_capture_screenshot` | Node screenshot (base64/URL) |

Tam 33 araç için Node sürümünü kullanın (`dist/local-plugin-only.js`).

## Bağlantı sırası

1. Claude Desktop’u başlatın (MCP sunucusu 5454’ü açar).
2. Figma’yı açın, Plugins → **F-MCP ATezer Bridge** çalıştırın.
3. İlk seferde plugin **“eşleştirme gerekli”** der: kodu `python -m fmcp_bridge --print-pairing` ile (ya da `%USERPROFILE%\.config\fmcp\pairing` / `~/.config/fmcp/pairing` dosyasından) kopyalayıp plugin’de **Advanced → Eşleştirme** alanına yapıştırın. Kod bir kez girilir; Node ve Python bridge’leri aynı dosyayı okur.
4. Plugin’de Port **5454** kalsın; “ready” görününce Claude’da Figma araçlarını kullanabilirsiniz.

Eşleştirmeyi bilmeyen eski bir plugin’i güncelleyemediğiniz geçiş döneminde `FMCP_PAIRING=off` ile kapatabilirsiniz; bridge her başlangıçta uyarır.

## Windows

Ayrıntılı Windows kurulumu (Node ve Python seçenekleri): [WINDOWS-INSTALLATION.md](../docs/WINDOWS-INSTALLATION.md).
