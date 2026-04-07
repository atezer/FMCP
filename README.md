<p align="center">
  <img src="assets/logo.png" alt="F-MCP Bridge Logo" width="280" />
</p>

# F-MCP (Figma MCP Bridge)

Figma'daki tasarimlarinizi AI araclarina (Claude, Cursor) baglayan bir kopru.

AI'a *"Button bileseni goster"*, *"Yeni frame olustur"*, *"SVG olarak export et"* gibi komutlar verirsiniz — AI Figma'daki tasariminizla dogrudan calisir.

```
Siz (Claude/Cursor) --> F-MCP Bridge --> Figma Plugin --> Figma dosyaniz
```

Her sey **bilgisayarinizda** kalir. Tasarim verileriniz internete gonderilmez.

---

## Kurulum

### En hizli yol

AI araciniza (Claude, Cursor) sunu soyleyin:

> *"@atezer/figma-mcp-bridge paketini kur ve Figma'ya baglan"*

AI gerisini halleder.

### Otomatik kurulum

Terminale su komutu yapiştirin:

```bash
git clone https://github.com/atezer/FMCP.git && cd FMCP && bash scripts/setup.sh
```

Bu komut Node.js kontrolu, build ve MCP config ayarini otomatik yapar. Sadece gerekirse bilgisayar sifresi sorulur.

> NPX ile (indirmeden): `bash <(curl -fsSL https://raw.githubusercontent.com/atezer/FMCP/main/scripts/setup-npx.sh)`

### Son adim: Figma'da plugin'i acin

1. AI aracinizi yeniden baslatin (config'i okumasi icin)
2. Figma'yi acin → herhangi bir dosyayi acin
3. **Plugins** menusunden **F-MCP ATezer Bridge** secin
4. Yesil **"Ready"** yazisini gorun — hazirsiniz!

> **Plugin'i ilk kez mi yukluyorsunuz?** Figma → Plugins → Development → Import plugin from manifest → `f-mcp-plugin/manifest.json`

---

## Neler yapabilirsiniz?

| Kategori | Ornekler |
|----------|----------|
| **Tasarim okuma** | Dosya yapisi, bilesen detayi, screenshot, design system ozeti |
| **Olusturma** | Frame, text, rectangle, group, bilesen instance'i |
| **Export** | SVG, PNG, JPG, PDF — tekli veya toplu (1-50 node) |
| **Variable ve token** | Okuma, olusturma, guncelleme, silme, toplu islem |
| **Kod uretimi** | Figma'dan React, SwiftUI, Jetpack Compose kodu |
| **Tasarim kalitesi** | WCAG AA kontrast, responsive (Mobile/Tablet/Web), dark mode |
| **Design-code uyumu** | Tasarim tokenlarini kodla karsilastirma |

46 aracin tam listesi: [TOOLS_FULL_LIST.md](docs/TOOLS_FULL_LIST.md)

---

## Guncelleme

```bash
bash scripts/update.sh
```

NPX ile kurduysaniz (`@latest` kullaniyorsaniz) otomatik guncellenir — sadece AI aracinizi yeniden baslatin.

Detay: [UPDATE.md](docs/UPDATE.md)

---

## Sorun mu yasiyorsunuz?

| Sorun | Cozum |
|-------|-------|
| Plugin "no server" diyor | AI aracinizi yeniden baslatin |
| Plugin "connecting..." diyor | Bekleyin, otomatik baglanir (5454-5470 portlarini tarar) |
| Yeni araclar gorunmuyor | AI aracini tamamen kapatip tekrar acin |

Daha fazla: [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## Ozellikler

- **46 arac** — tasarim okuma, bilesen olusturma, variable yonetimi, export ([tam liste](docs/TOOLS_FULL_LIST.md))
- **17 skill** — token pipeline, ekran uretimi, erisebilirlik denetimi, kod uretimi ([test raporu](docs/TEST_REPORT.md))
- **Token gerekmez** — Temel araclar Figma API token'i olmadan calisir
- **Coklu dosya + coklu AI araci** — Claude, Cursor ve Claude Code ayni anda calisir
- **Figma Desktop + Tarayici** — Her ikisinde de calisir
- **Gizlilik** — Veriler bilgisayarinizdan cikmaz, internetsiz (air-gap) ortamlarda calisir

---

## Dokumanlar

| Doküman | Aciklama |
|---------|----------|
| [ONBOARDING.md](docs/ONBOARDING.md) | Adim adim kurulum |
| [UPDATE.md](docs/UPDATE.md) | Guncelleme rehberi |
| [TOOLS_FULL_LIST.md](docs/TOOLS_FULL_LIST.md) | 46 arac listesi |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Sorun giderme |
| [ENTERPRISE.md](docs/ENTERPRISE.md) | Kurumsal kullanim (org plugin, audit log) |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Teknik mimari |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Katki rehberi |

---

## Surum

| | |
|---|---|
| Guncel surum | **1.7.14** ([CHANGELOG](CHANGELOG.md)) |
| npm | [@atezer/figma-mcp-bridge](https://www.npmjs.com/package/@atezer/figma-mcp-bridge) |
| Releases | [GitHub Releases](https://github.com/atezer/FMCP/releases) |

---

## Lisans

MIT — kisisel ve ticari kullanima acik. Detay: [LICENSE](LICENSE)

**Sorun mu var?** [GitHub Issues](https://github.com/atezer/FMCP/issues)
