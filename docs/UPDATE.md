# F-MCP Guncelleme Rehberi

Bu rehber, F-MCP Bridge'in (MCP server + Figma plugin) nasil guncellenegini anlatir.

## Otomatik guncelleme (tek komut)

Repo clone ile kurduysaniz her seyi tek komutla guncelleyin:

```bash
bash scripts/update.sh
```

Bu script: git pull, npm install, build, NPX cache temizligi — hepsini otomatik yapar. Yerel degisiklikleriniz varsa otomatik stash yapilir.

Sonra AI aracinizi yeniden baslatin ve Figma'da plugin'i kapatip tekrar acin.

---

Manuel guncelleme yapmak istiyorsaniz asagidaki senaryolara bakin:

| Kurulum yonteminiz | Bolum |
|--------------------|-------|
| npx ile (Cursor, Claude Desktop, Claude Code, Windsurf) | [Senaryo A](#senaryo-a--npx-kullanicilar) |
| Repo clone ile (`git clone`) | [Senaryo B](#senaryo-b--local-clone-kullanicilar) |
| Claude Code (npx veya local) | [Senaryo C](#senaryo-c--claude-code-kullanicilari) |

---

## Guncellemeden once

Guncelleme yapmadan once [CHANGELOG.md](../CHANGELOG.md) veya [GitHub Releases](https://github.com/atezer/FMCP/releases) sayfasini kontrol edin. Ozellikle birden fazla surum atliyorsaniz kirici degisiklik (breaking change) olabilir.

> **env ayarlariniz varsa:** Config'inizde `FIGMA_PLUGIN_BRIDGE_PORT`, `FIGMA_MCP_CLIENT_NAME` gibi ozel ayarlar varsa, guncelleme sirasinda bunlari koruyun. Asagidaki config ornekleri minimal orneklerdir — mevcut `env` blogunuzu silmeyin.

---

## Surumunuzu kontrol edin

**AI aracindan (onerilen):**

```
figma_get_status
```
veya
```
figma_plugin_diagnostics
```
Bridge versiyonu yanit icinde gorulur.

**Terminalden — npm'deki son surumu ogrenin:**

```bash
npm view @atezer/figma-mcp-bridge version
```

**Local clone'da kendi surumunuz:**

Proje kokunde `package.json` dosyasindaki `"version"` alani.

---

## Senaryo A — NPX kullanicilar

**Bu bolum kimlere:** Config dosyasinda `"command": "npx"` gecen herkes (Cursor, Claude Desktop, Claude Code, Windsurf ve diger MCP destekli araclar).

### 1. Config'i kontrol edin

Config'inizde su satirlar olmali:

```
"args": ["-y", "@atezer/figma-mcp-bridge@latest", "figma-mcp-bridge-plugin"]
```

**Dikkat:** `figma-mcp-bridge-plugin` binary adi onemlidir. Yazmazsaniz full mode calisir (Puppeteer + CDP dahil). Plugin-only mod icin bu adi mutlaka ekleyin.

### 2. npx cache temizleyin

npx eski surumu onbellekten sunabilir. Temizlemek icin:

**macOS / Linux:**
```bash
rm -rf ~/.npm/_npx
```

**Windows (PowerShell):**
```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\npm-cache\_npx"
```

**Windows (CMD):**
```cmd
rd /s /q "%LOCALAPPDATA%\npm-cache\_npx"
```

**Alternatif (her platformda):** Tum npm onbellegini temizler:
```bash
npm cache clean --force
```

> **Ipucu:** Cache yolunuzu bilmiyorsaniz: `npm config get cache` komutu tam yolu gosterir.

### 3. AI aracinizi tamamen kapatip yeniden acin

Sadece yeniden baslatma yetmeyebilir — **tamamen kapatip tekrar acin**.

### 4. Dogrulayin

AI aracinizdan:
```
figma_get_status
```
Yeni surum numarasini gormelisiniz.

### Config ornekleri

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": ["-y", "@atezer/figma-mcp-bridge@latest", "figma-mcp-bridge-plugin"]
    }
  }
}
```

**Claude Desktop:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": ["-y", "@atezer/figma-mcp-bridge@latest", "figma-mcp-bridge-plugin"]
    }
  }
}
```

**Claude Code** (`~/.claude/settings.json` veya proje kokunde `.mcp.json`):

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": ["-y", "@atezer/figma-mcp-bridge@latest", "figma-mcp-bridge-plugin"]
    }
  }
}
```

---

## Senaryo B — Local clone kullanicilar

**Bu bolum kimlere:** `github.com/atezer/FMCP` reposunu klonlamis, `dist/` uzerinden calistiranlar.

### Tek komut guncelleme

```bash
cd /path/to/FMCP && git pull origin main && npm install && npm run build:local
```

`/path/to/FMCP` kismini kendi proje yolunuzla degistirin.

### Yerel degisiklik varsa

```bash
cd /path/to/FMCP
git stash
git pull origin main
npm install
npm run build:local
git stash pop
```

### nvm kullananlar icin

Node bulunamiyor hatasi aliyorsaniz, config'te dogrudan `node` yerine bash wrapper script kullanin:

Repoda hazir script: `scripts/cursor-mcp-plugin-bridge.sh`

Config'te:
```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "bash",
      "args": ["/path/to/FMCP/scripts/cursor-mcp-plugin-bridge.sh"],
      "env": {
        "FIGMA_MCP_CLIENT_NAME": "Cursor"
      }
    }
  }
}
```

### Sonra

AI aracinizi tamamen kapatip yeniden acin.

---

## Senaryo C — Claude Code kullanicilari

Claude Code iki sekilde konfigure edilmis olabilir:

- **npx tabanli** — [Senaryo A](#senaryo-a--npx-kullanicilar) adimlariyla ayni
- **Local path tabanli** — [Senaryo B](#senaryo-b--local-clone-kullanicilar) adimlariyla ayni

### Config dosyasi konumlari

| Kapsam | Dosya |
|--------|-------|
| Global (tum projeler) | `~/.claude/settings.json` |
| Proje seviyesi | Proje kokunde `.mcp.json` |
| Proje izinleri | `.claude/settings.local.json` |

### Ornek: npx ile global config

`~/.claude/settings.json` dosyasinda `mcpServers` anahtari altina ekleyin:

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": ["-y", "@atezer/figma-mcp-bridge@latest", "figma-mcp-bridge-plugin"]
    }
  }
}
```

### Ornek: Proje seviyesi (.mcp.json)

Proje kokunde `.mcp.json` dosyasi olusturun (Cursor ile ayni format):

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": ["-y", "@atezer/figma-mcp-bridge@latest", "figma-mcp-bridge-plugin"]
    }
  }
}
```

---

## Figma Plugin Guncellemesi

**MCP bridge ve Figma plugin iki ayri seydir.** Bridge'i guncellemek tek basina yetmez — plugin da guncellenmeli.

| Nasil kurdunuz | Plugin nasil guncellenir |
|----------------|-------------------------|
| **Figma Community / Organization** | Figma plugin'leri otomatik gunceller. Yeni surum yayinlandiginda otomatik gelir. |
| **Development mode (manifest import)** | `git pull` sonrasi Figma'da plugin'i kapatip tekrar acin. Veya: Plugins > Development > manifest'i yeniden import edin. |
| **Kurumsal (private plugin)** | Admin'in plugin'i Figma'da yeniden yayinlamasi gerekir. |

**Plugin'i ilk kez yukluyorsaniz:**

1. Figma > Plugins > Development > Import plugin from manifest
2. `f-mcp-plugin/manifest.json` dosyasini secin (clone ettiginiz FMCP klasoru icinde)

---

## Dogrulama kontrol listesi

Guncelleme sonrasi su adimlari uygulayin:

- [ ] AI aracinizdan `figma_get_status` calistirin — surum numarasini kontrol edin
- [ ] AI aracinizdan `figma_plugin_diagnostics` calistirin — bridge version, uptime, bagli dosyalar
- [ ] Figma plugin'de yesil **"Ready"** yazisi + port numarasi gorunuyor
- [ ] Yeni bir arac deneyin (orn. `figma_get_design_system_summary`)

---

## Sorun giderme

| Sorun | Cozum |
|-------|-------|
| npx hala eski surumu cekiyor | `~/.npm/_npx` klasorunu silin (Windows: `%LOCALAPPDATA%\npm-cache\_npx`), AI aracini yeniden baslatin |
| `MODULE_NOT_FOUND` | `npm install` tekrar calistirin, `npm run build:local` ile yeniden derleyin |
| `git pull` conflict | `git stash` > `git pull origin main` > `git stash pop` |
| nvm: `node: command not found` | Bash wrapper script kullanin ([Senaryo B](#nvm-kullananlar-icin)'ye bakin) |
| Plugin "no server" | AI aracini yeniden baslatin, portu kontrol edin: `lsof -i :5454` (macOS/Linux) |
| Windows'ta path hatasi | Config'te forward slash (`/`) veya cift backslash (`\\`) kullanin |
| Yeni araclar gorunmuyor | AI aracini tamamen kapatip acin (sadece yeniden baslatma yetmeyebilir) |
| Build hatasi | `rm -rf dist && npm run build:local` |

Daha fazla sorun giderme: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## Geri alma (rollback)

### NPX kullanicilar

Config'teki `@latest` yerine sabit surum yazin:

```
"args": ["-y", "@atezer/figma-mcp-bridge@1.7.0", "figma-mcp-bridge-plugin"]
```

npx cache'i temizleyin ve AI aracini yeniden baslatin.

### Local clone kullanicilar

```bash
git checkout v1.7.0 && npm install && npm run build:local
```

AI aracini yeniden baslatin.

> **Not:** Mevcut tag'leri gormek icin: `git tag -l`

---

## Surum takibi

Yeni surum cikarsa haberdar olmak icin:

| Yontem | Nasil |
|--------|-------|
| GitHub bildirimi | Repo sayfasinda **Watch** > **Custom** > **Releases** secin |
| Terminal | `npm view @atezer/figma-mcp-bridge version` |
| Degisiklik listesi | [CHANGELOG.md](../CHANGELOG.md) |
| npm sayfasi | [@atezer/figma-mcp-bridge](https://www.npmjs.com/package/@atezer/figma-mcp-bridge) |
| GitHub releases | [github.com/atezer/FMCP/releases](https://github.com/atezer/FMCP/releases) |
