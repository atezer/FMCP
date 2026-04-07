<p align="center">
  <img src="assets/logo.png" alt="F-MCP Bridge Logo" width="280" />
</p>

# F-MCP (Figma MCP Bridge)

Figma'daki tasarımlarınızı AI araçlarına (Claude, Cursor) bağlayan bir köprü.

AI'a *"Button bileşenini göster"*, *"Yeni frame oluştur"*, *"SVG olarak export et"* gibi komutlar verirsiniz — AI Figma'daki tasarımınızla doğrudan çalışır.

```
Siz (Claude/Cursor) → F-MCP Bridge → Figma Plugin → Figma dosyanız
```

Her şey **bilgisayarınızda** kalır. Tasarım verileriniz internete gönderilmez.

---

## Kurulum

### En hızlı yol

AI aracınıza (Claude, Cursor) şunu söyleyin:

> *"@atezer/figma-mcp-bridge paketini kur ve Figma'ya bağlan"*

AI gerisini halleder.

### Otomatik kurulum

Terminale şu komutu yapıştırın:

```bash
git clone https://github.com/atezer/FMCP.git && cd FMCP && bash scripts/setup.sh
```

Bu komut Node.js kontrolü, build ve MCP config ayarını otomatik yapar. Sadece gerekirse bilgisayar şifresi sorulur.

> NPX ile (indirmeden): `bash <(curl -fsSL https://raw.githubusercontent.com/atezer/FMCP/main/scripts/setup-npx.sh)`

### Son adım: Figma'da plugin'i açın

1. AI aracınızı yeniden başlatın (config'i okuması için)
2. Figma'yı açın → herhangi bir dosyayı açın
3. **Plugins** menüsünden **F-MCP ATezer Bridge** seçin
4. Yeşil **"Ready"** yazısını görün — hazırsınız!

> **Plugin'i ilk kez mi yüklüyorsunuz?** Figma → Plugins → Development → Import plugin from manifest → `f-mcp-plugin/manifest.json`

---

## Neler yapabilirsiniz?

AI ile Figma arasında **çift yönlü** çalışırsınız:

```
Figma → AI : "Bu ekrandaki renkleri ve fontları çıkar"
AI → Figma : "Yeni bir login ekranı oluştur, dark mode dahil"
```

**Figma'dan AI'a (okuma):**
- *"Bu dosyadaki tüm bileşenleri listele"*
- *"Button bileşeninin özelliklerini göster"*
- *"Design token'larını çıkar ve koda çevir"*
- *"Bu ekranın screenshot'ını al"*

**AI'dan Figma'ya (oluşturma):**
- *"Yeni bir frame oluştur, 375x812, mobile layout"*
- *"Bu tasarımdan React kodu üret"*
- *"Color token'larını toplu güncelle"*
- *"Tüm ikonları SVG olarak export et"*

**Kalite kontrolü (her iki yönde):**
- *"WCAG AA kontrast kontrolü yap"*
- *"Koddaki token'larla Figma'daki token'ları karşılaştır"*
- *"Responsive: Mobile, Tablet, Web versiyonlarını üret"*

46 aracın tam listesi: [TOOLS_FULL_LIST.md](docs/TOOLS_FULL_LIST.md)

---

## Güncelleme

```bash
bash scripts/update.sh
```

NPX ile kurduysanız (`@latest` kullanıyorsanız) otomatik güncellenir — sadece AI aracınızı yeniden başlatın.

Detay: [UPDATE.md](docs/UPDATE.md)

---

## Sorun mu yaşıyorsunuz?

| Sorun | Çözüm |
|-------|-------|
| Plugin "no server" diyor | AI aracınızı yeniden başlatın |
| Plugin "connecting..." diyor | Bekleyin, otomatik bağlanır (5454-5470 portlarını tarar) |
| Yeni araçlar görünmüyor | AI aracını tamamen kapatıp tekrar açın |

Daha fazla: [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## Özellikler

- **46 araç** — tasarım okuma, bileşen oluşturma, variable yönetimi, export ([tam liste](docs/TOOLS_FULL_LIST.md))
- **17 skill** — token pipeline, ekran üretimi, erişilebilirlik denetimi, kod üretimi ([test raporu](docs/TEST_REPORT.md))
- **Token gerekmez** — Temel araçlar Figma API token'ı olmadan çalışır
- **Çoklu dosya + çoklu AI aracı** — Claude, Cursor ve Claude Code aynı anda çalışır
- **Figma Desktop + Tarayıcı** — Her ikisinde de çalışır
- **Gizlilik** — Veriler bilgisayarınızdan çıkmaz, internetsiz (air-gap) ortamlarda çalışır

---

## Dokümanlar

| Doküman | Açıklama |
|---------|----------|
| [ONBOARDING.md](docs/ONBOARDING.md) | Adım adım kurulum |
| [UPDATE.md](docs/UPDATE.md) | Güncelleme rehberi |
| [TOOLS_FULL_LIST.md](docs/TOOLS_FULL_LIST.md) | 46 araç listesi |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Sorun giderme |
| [ENTERPRISE.md](docs/ENTERPRISE.md) | Kurumsal kullanım (org plugin, audit log) |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Teknik mimari |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Katkı rehberi |

---

## Sürüm

| | |
|---|---|
| Güncel sürüm | **1.7.14** ([CHANGELOG](CHANGELOG.md)) |
| npm | [@atezer/figma-mcp-bridge](https://www.npmjs.com/package/@atezer/figma-mcp-bridge) |
| Releases | [GitHub Releases](https://github.com/atezer/FMCP/releases) |

---

## Lisans

MIT — kişisel ve ticari kullanıma açık. Detay: [LICENSE](LICENSE)

**Sorun mu var?** [GitHub Issues](https://github.com/atezer/FMCP/issues)
