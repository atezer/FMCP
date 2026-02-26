# FMCP — Windows Kurulum Rehberi

Bu rehber, **Windows 10/11** üzerinde F-MCP Bridge ile Claude’u Figma’ya bağlamak için adım adım kurulumu anlatır. Node.js kurulumu olan ortamlar için **Node yolu**, kurulumu olmayan ortamlar için **Python bridge** seçeneği sunulur.

---

## Gereksinimler

- **Windows 10** veya **Windows 11**
- **Node.js LTS** (örn. v18 veya v20) — [nodejs.org](https://nodejs.org) — *veya* Node kurulamıyorsa **Python 3.10+** (bkz. [Node.js kurulumu yoksa (Python ile)](#nodejs-kurulumu-yoksa-python-ile))

---

## Claude App bağlantı sırası (önemli)

Plugin’in “ready” olması için aşağıdaki **sırayı** izleyin:

| Sıra | Yapılacak |
|------|------------|
| 1 | **Claude Desktop’u başlatın** — MCP sunucusu (ve WebSocket, port 5454) aynı process’te açılır. |
| 2 | **Figma’yı açın**, tasarım dosyasını açın. |
| 3 | **Plugins** → **F-MCP ATezer Bridge** çalıştırın; plugin penceresinde **Port** alanı **5454** (tek kullanıcı) veya size atanmış port kalsın. |
| 4 | **Yeşil nokta ve “ready”** görününce Claude’da Figma araçlarını kullanabilirsiniz. |

---

## 1. Node.js kur (Node yolu için)

1. [nodejs.org](https://nodejs.org) — **LTS** sürümünü indirin.
2. Kurulumu tamamlayın (varsayılan seçenekler yeterli).
3. **PowerShell** veya **CMD** açıp kontrol edin:

```powershell
node -v
npm -v
```

`v18.x` veya `v20.x` benzeri bir çıktı görmelisiniz.

---

## 2. FMCP kurulumu (Node ile)

### Seçenek A: Git clone + build (önerilen — Windows’ta yol net)

1. Repoyu clone edin (Git yüklüyse):

```powershell
git clone https://github.com/atezer/FMCP.git
cd FMCP
```

2. Bağımlılıkları yükleyip bir kez build alın:

```powershell
npm install
npm run build:local
```

3. Proje klasörünün **tam yolunu** not edin (örn. `C:\Users\KullaniciAdi\FMCP`). Claude config’te bu yolu kullanacaksınız.

### Seçenek B: NPX (clone yapmadan)

Paket npm’de **@atezer/figma-mcp-bridge** adıyla yayınlı. İlk çalıştırmada indirilir:

```powershell
npx -y @atezer/figma-mcp-bridge@latest
```

Claude config’te NPX cache yolundaki `dist/local-plugin-only.js` kullanılabilir; yol platforma göre değişir. Windows’ta yol net olsun diye Bölüm 3'teki **En basit config (NPX)** ile proje yolu gerekmez.

---

## 3. Claude Desktop config (Windows)

Claude Desktop’un MCP sunucusu olarak figma-mcp-bridge’i çalıştırması gerekir.

### Config dosyası konumu

- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
  Örnek tam yol: `C:\Users\<kullanici>\AppData\Roaming\Claude\claude_desktop_config.json`

Dosyayı Not Defteri veya VS Code ile açabilirsiniz.

### En basit config (NPX — proje yolu gerekmez)

Repo klonlamadan kullanım. Config'e ekleyin:

```json
"figma-mcp-bridge": {
  "command": "npx",
  "args": ["-y", "@atezer/figma-mcp-bridge@latest"]
}
```

### Örnek config (clone ile — tam yol)

`<PROJE-YOLU>` yerine FMCP klasörünüzün **tam yolunu** yazın. Windows’ta backslash’leri **çift** yazın veya tek slash kullanın:

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "node",
      "args": ["C:\\Users\\KullaniciAdi\\FMCP\\dist\\local-plugin-only.js"]
    }
  }
}
```

Alternatif (tek slash):

```json
"args": ["C:/Users/KullaniciAdi/FMCP/dist/local-plugin-only.js"]
```

### Permission denied / çalışmıyorsa

`cmd.exe` ile proje dizininden çalıştırmayı deneyin:

```json
"figma-mcp-bridge": {
  "command": "cmd.exe",
  "args": ["/c", "cd /d C:\\Users\\KullaniciAdi\\FMCP && node dist/local-plugin-only.js"]
}
```

Config’i kaydettikten sonra **Claude Desktop’u yeniden başlatın**.

---

## 4. Figma’da plugin ve bağlantı

1. **Plugin’i yükleyin** (ilk seferde):
   - **Organization** listesinde F-MCP Bridge varsa: **Plugins** → listeden seçin.
   - Yoksa: **Plugins** → **Development** → **Import plugin from manifest…** → `f-mcp-plugin/manifest.json` dosyasını seçin (FMCP klasörü içinde).

2. **Bağlantı:** Yukarıdaki [Claude App bağlantı sırası](#claude-app-bağlantı-sırası-önemli)na uyun: Önce Claude’u açın, sonra Figma’da **Plugins** → **F-MCP ATezer Bridge** çalıştırın. Port **5454** (veya atanmış port) kalsın; birkaç saniye içinde **yeşil nokta + “ready”** görünür.

---

## Çoklu kullanıcı (multi-instance)

Aynı anda birden fazla kişi kullanacaksa her kullanıcı **farklı port** (5454, 5455, … 5470) kullanmalı:

- Claude’u başlatan process’e port verilir (örn. ortam değişkeni `FIGMA_PLUGIN_BRIDGE_PORT=5455` — Node sürümünde config/ortam ile).
- Plugin arayüzünde **Port** alanından **aynı port** (örn. 5455) seçilir.

Detay: [MULTI_INSTANCE.md](MULTI_INSTANCE.md).

---

## Sorun giderme (Windows)

| Sorun | Çözüm |
|-------|--------|
| Plugin “no server” / kırmızı | MCP sunucusu çalışmıyor. Claude’u açın (plugin-only’de Claude sunucuyu başlatır) veya PowerShell’de `npm run dev:local` çalıştırıp port 5454’ün açıldığını kontrol edin. |
| Port 5454 kullanımda | Portu kullanan işlemi bulun: `netstat -ano | findstr :5454` — Son sütundaki PID’i not alıp **Görev Yöneticisi** → **Ayrıntılar** → ilgili PID’i sonlandırın. Veya [PORT-5454-KAPALI.md](PORT-5454-KAPALI.md). |
| Claude “Server disconnected” | Config’teki yolun doğru olduğundan emin olun (`dist/local-plugin-only.js` var mı?); `npm run build:local` yapıldı mı? |
| Permission denied | Config’te `cmd.exe /c` ile `cd /d <PROJE-YOLU> && node dist/local-plugin-only.js` kullanın. |

Daha fazla: [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## Node.js kurulumu yoksa (Python ile)

Kurumsal ortamda **Node.js yüklü değilse** veya kurulum yetkiniz yoksa, **Python 3.10+** ile çalışan bir MCP bridge kullanabilirsiniz. Plugin aynı WebSocket protokolü (port 5454) ile bağlanır; ek plugin değişikliği gerekmez.

### Gereksinimler

- **Python 3.10** veya üzeri ([python.org](https://www.python.org/downloads/) veya Windows Store).
- FMCP repoyu clone etmiş olmanız yeterli (Node kurmadan).

### Kurulum

1. FMCP klasörüne gidin; içindeki **`python-bridge`** klasörüne geçin:

```powershell
cd C:\Users\KullaniciAdi\FMCP\python-bridge
```

2. Sanal ortam (isteğe bağlı) ve bağımlılıkları yükleyin:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

3. Claude config’te **Python** ile bridge’i çalıştırın. Config dosyası: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "C:\\Users\\KullaniciAdi\\FMCP\\python-bridge\\.venv\\Scripts\\python.exe",
      "args": ["-m", "fmcp_bridge"],
      "cwd": "C:\\Users\\KullaniciAdi\\FMCP\\python-bridge"
    }
  }
}
```

Sanal ortam kullanmıyorsanız:

```json
"command": "py",
"args": ["-3", "-m", "fmcp_bridge"],
"cwd": "C:\\Users\\KullaniciAdi\\FMCP\\python-bridge"
```

4. **Sıra aynı:** Claude’u açın → Figma’yı açın → Plugins → F-MCP ATezer Bridge → Port 5454 → “ready”.

### Python bridge’de desteklenen araçlar

Python bridge, Node sürümüyle aynı protokolü kullanır; kritik araçlar desteklenir: `figma_get_status`, `figma_get_file_data`, `figma_get_variables`, `figma_get_styles`, `figma_get_design_system_summary`, `figma_search_components`, `figma_get_design_context`, `figma_execute` ve diğerleri. Tam liste için [TOOLS_FULL_LIST.md](TOOLS_FULL_LIST.md) ve `python-bridge/README.md` içindeki tabloya bakın.

---

## Özet

| Adım | Node yolu | Python yolu |
|------|-----------|--------------|
| 1 | Node.js LTS kur, `node -v` | Python 3.10+ kur |
| 2 | FMCP clone, `npm install`, `npm run build:local` | FMCP clone, `python-bridge` içinde `pip install -r requirements.txt` |
| 3 | Claude config: `node` + `dist/local-plugin-only.js` tam yolu | Claude config: `python` + `-m fmcp_bridge`, `cwd`: `python-bridge` |
| 4 | Claude’u aç → Figma → Plugin (Port 5454) → “ready” | Aynı |

Windows kullanıcıları için ek ayrıntı: Bu rehber. Genel kurulum: [ONBOARDING.md](ONBOARDING.md).
