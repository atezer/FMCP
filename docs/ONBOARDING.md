# F-MCP Bridge — Kurulum Rehberi (Onboarding)

Bu rehber, **figma-mcp-bridge** ile Claude/Cursor’u Figma’ya bağlamak için iki yol sunar: **en basit (NPX, repo indirmeden)** ve **detaylı (clone + build)**.

---

## En basit kurulum (NPX — repo indirmeden)

Repo klonlamadan, sadece Node.js ve tek bir config ile kurulum. Güncellemeler `@latest` ile otomatik alınır.

| Adım | Yapılacak |
|------|------------|
| 1 | **Node.js kur** — [nodejs.org](https://nodejs.org) LTS. Terminalde `node -v` ile kontrol edin. |
| 2 | **MCP config ekle** — Cursor için `.cursor/mcp.json` veya Claude için `claude_desktop_config.json` dosyasına aşağıdaki bloğu ekleyin. |
| 3 | **Cursor veya Claude’u yeniden başlatın** — MCP sunucusu port 5454’te otomatik başlar. |
| 4 | **Figma’da plugini açın** — Plugins → F-MCP ATezer Bridge → **"ready (:5454)"** görünene kadar bekleyin. |

**Config örneği (Cursor veya Claude):**

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "npx",
      "args": ["-y", "@atezer/figma-mcp-bridge@latest"]
    }
  }
}
```

- **Cursor config:** Proje kökünde veya kullanıcı dizininde `.cursor/mcp.json`
- **Claude config:** macOS: `~/Library/Application Support/Claude/claude_desktop_config.json` | Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Plugin’i Figma’da ilk kez kullanıyorsanız aşağıdaki [1. Plugin’i Figma’da yükle](#1-plugini-figmada-yükle) adımına geçin. Detaylı kurulum (clone, build, tam yol) için aşağıdaki bölümlere bakın.

---

## Detaylı kurulum (clone + build)

Repo’yu indirip kendi makinenizde build etmek isterseniz (ör. ağ kısıtlı ortam) aşağıdaki 4 adımı uygulayın.

### Özet: 4 adım

| # | Adım | Ne yapılır |
|---|------|------------|
| 1 | **Plugin’i yükle** | Figma’da F-MCP Bridge plugin’ini ekle (organization listesinden veya manifest ile) |
| 2 | **Node.js kur** | Bilgisayarda Node.js (LTS) yüklü olsun |
| 3 | **MCP server’ı başlat** | Projeyi clone edip `npm run build:local` + config’te tam yol ile sunucuyu çalıştır |
| 4 | **Config’i ayarla** | Cursor/Claude config’e `figma-mcp-bridge` ekle (node + tam yol veya npx) |

---

## 1. Plugin’i Figma’da yükle

### Seçenek A: Organization’da private plugin yayınlandıysa

1. Figma’yı açın.
2. **Plugins** menüsüne gidin (veya **Resources** → **Plugins**).
3. Organizasyonunuzun plugin listesinden **F-MCP Bridge** (veya yayınladığınız isim) seçin.
4. **Run** ile plugin’i çalıştırın. (Henüz “ready” olmayabilir; 3. ve 4. adımlardan sonra MCP sunucusu çalışınca “ready” görünür.)

### Seçenek B: Manifest ile (geliştirme / organization yok)

1. Figma’yı açın.
2. **Plugins** → **Development** → **Import plugin from manifest…**
3. Bu repodaki **`f-mcp-plugin/manifest.json`** dosyasını seçin (clone ettiğiniz FMCP klasörü içinde).
4. Plugin listede **F-MCP ATezer Bridge** olarak görünür; **Plugins** → **Development** → **F-MCP ATezer Bridge** ile çalıştırın.

### Dev Seat kullanıcıları (SEM, PO, Dev) — Plugin’i Dev Mode’da açma

Design seat’i olmayan, sadece **Dev Mode** erişimi olan kullanıcılar (SEM, PO, Dev) şu adımları izler:

1. Figma dosyasını açtıklarında **sağ üstte Dev Mode** ile açarlar (veya dosya zaten Dev Mode’da açılır).
2. **Sağ panelde** **Plugins** sekmesine tıklarlar.
3. Plugin listesinden **F-MCP ATezer Bridge**’i bulup çalıştırırlar.

Plugin “ready” görününce MCP (Claude/Cursor) üzerinden Figma araçları kullanılabilir. Manifest’te `editorType: ["figma", "dev"]` olduğu için plugin Dev Mode’da da listelenir.

---

## 2. Node.js kur

- **İndir:** [nodejs.org](https://nodejs.org/) — **LTS** sürümünü seçin.
- Kurulum sonrası terminalde kontrol edin:

```bash
node -v   # v18.x veya v20.x gibi görünmeli
npm -v
```

---

## 3. MCP server’ı başlat

figma-mcp-bridge, Claude’un bağlanacağı MCP sunucusudur. İki kullanım şekli var:

### Yol 1: Plugin-only (önerilen — tek process)

Claude’u açtığınızda MCP sunucusu otomatik başlar (Claude config’te `node dist/local-plugin-only.js` kullanırsanız). Ayrıca terminalde `npm run dev:local` çalıştırmanız **gerekmez**.

1. Repoyu clone edin (veya indirdiğiniz klasörü kullanın):
   ```bash
   git clone https://github.com/atezer/FMCP.git
   cd FMCP
   ```
2. Bağımlılıkları yükleyip bir kez build edin:
   ```bash
   npm install
   npm run build:local
   ```
3. **4. adımda** Claude config’te bu klasörün **tam yolu** ile `dist/local-plugin-only.js` çalıştırılacak; böylece Claude her açılışta MCP server’ı kendisi başlatır.

### Yol 2: Ayrı terminalde bridge (isteğe bağlı)

Önce bridge’i sonra Claude’u açmak isterseniz:

1. Aynı proje klasöründe:
   ```bash
   npm run dev:local
   ```
2. Çıktıda `Plugin bridge server listening` veya `5454` geçene kadar bekleyin.
3. Figma’da plugin’i çalıştırın; “ready” görünmeli.
4. Claude’u başlatın. (Config’te yine `local-plugin-only.js` kullanıyorsanız Claude kendi MCP sunucusunu açar ve 5454’ü kullanır; `dev:local` ile aynı portu paylaşır.)

**Çoklu kullanıcı:** Aynı anda birden fazla kişi kullanacaksa her kullanıcı farklı port (5454, 5455, … 5470) kullanmalı; plugin arayüzünde **Port** alanından aynı port seçilir. Detay: [MULTI_INSTANCE.md](MULTI_INSTANCE.md).

---

## 4. Cursor / Claude config’i ayarla

Claude Desktop’un MCP sunucusu olarak figma-mcp-bridge’i tanıması gerekir. **En basit:** [En basit kurulum](#en-basit-kurulum-npx--repo-indirmeden) bölümündeki npx config'i kullanın (repo gerekmez).

### Config dosyası konumu

- **Cursor:** `.cursor/mcp.json` (proje kökü veya kullanıcı dizini)
- **Claude — macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude — Windows:** `%APPDATA%\Claude\claude_desktop_config.json` — ayrı rehber: [WINDOWS-INSTALLATION.md](WINDOWS-INSTALLATION.md).

### Örnek config (clone ile — tam yol)

Repo'yu clone ettiyseniz `<PROJE-YOLU>` yerine FMCP klasörünün **tam yolunu** yazın (örn. `/Users/adiniz/f-mcp-bridge` veya `C:\Users\adiniz\f-mcp-bridge`).

```json
{
  "mcpServers": {
    "figma-mcp-bridge": {
      "command": "node",
      "args": ["<PROJE-YOLU>/dist/local-plugin-only.js"]
    }
  }
}
```

**“Permission denied”** alırsanız:

```json
"figma-mcp-bridge": {
  "command": "bash",
  "args": ["-c", "cd <PROJE-YOLU> && exec node dist/local-plugin-only.js"]
}
```

Config’i kaydettikten sonra **Cursor veya Claude’u yeniden başlatın**.

---

## Kontrol listesi

- [ ] Figma’da F-MCP Bridge plugin’i yüklü ve **Plugins** menüsünden çalıştırıldı.
- [ ] Node.js yüklü (`node -v` çalışıyor).
- [ ] FMCP projesi clone edildi, `npm install` ve `npm run build:local` çalıştırıldı.
- [ ] Claude config’e `figma-mcp-bridge` eklendi; `<PROJE-YOLU>` kendi bilgisayarınızdaki FMCP yolu ile değiştirildi.
- [ ] Cursor veya Claude yeniden başlatıldı.
- [ ] Figma’da plugin penceresinde **yeşil nokta + “ready”** görünüyor.
- [ ] Claude’da Figma ile ilgili bir soru sorup (örn. “Figma’daki değişkenleri listele”) MCP’nin yanıt verdiğini doğruladınız.

---

## Sık karşılaşılan sorunlar

| Sorun | Çözüm |
|-------|--------|
| Plugin “no server” / kırmızı | MCP sunucusu çalışmıyor. Claude’u açın (plugin-only kullanıyorsanız Claude sunucuyu açar) veya terminalde `npm run dev:local` çalıştırın. |
| Port 5454 kullanımda | `lsof -i :5454` ile işlemi bulun, `kill <PID>` ile kapatın veya [docs/PORT-5454-KAPALI.md](PORT-5454-KAPALI.md) rehberine bakın. |
| Claude “Server disconnected” | Config’teki yolun doğru olduğundan ve `npm run build:local` yapıldığından emin olun; gerekirse `bash -c` ile çalıştırma kullanın. |
| Permission denied | Config’te `bash -c` ile `cd <PROJE-YOLU> && exec node dist/local-plugin-only.js` kullanın. |

Daha fazla sorun giderme: [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
