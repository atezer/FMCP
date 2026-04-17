<p align="center">
  <img src="assets/logo.png" alt="F-MCP Bridge Logo" width="280" />
</p>

# F-MCP (Figma MCP Bridge)

Figma tasarımlarınızı AI'a bağlar. AI'a *"Bu ekrandaki renkleri çıkar"* veya *"Yeni bir login sayfası oluştur"* dersiniz — AI Figma'daki tasarımınızla doğrudan çalışır.

Her şey **bilgisayarınızda** kalır. Tasarım verileriniz internete gönderilmez.

---

## Neye ihtiyacım var?

| Gerekli | Açıklama |
|---------|----------|
| **Figma** | Zaten kullanıyorsanız hazırsınız |
| **Claude Code** | Kurulumu yapacak uygulama — [claude.ai/download](https://claude.ai/download) adresinden indirin |

> **Claude Code nedir?** Bilgisayarınızda çalışan Claude versiyonu. Dosya oluşturabilir, komut çalıştırabilir, kurulum yapabilir. İndirdikten sonra kurulum için sadece bir kez kullanacaksınız.

---

## Kurulum (5 dakika)

**1.** [Claude Code'u indirin](https://claude.ai/download) (henüz yoksa)

**2.** Claude Code'u açın ve şunu yazın:

> *"https://github.com/atezer/FMCP bu repoyu kur"*

Claude gerekli her şeyi (Node.js, build, ayarlar) otomatik yapar. Sizden sadece gerekirse **bilgisayar şifreniz** istenir.

**3.** Claude "kurulum tamamlandı" deyince **Claude Code'u kapatıp tekrar açın**

**4.** Figma'da **Plugins → F-MCP ATezer Bridge** açın → yeşil **"Ready"** görün

**5.** Hazırsınız! Claude'a Figma ile ilgili sorularınızı sorun.

> **Plugin'i ilk kez mi yüklüyorsunuz?** Figma → Plugins → Development → Import plugin from manifest → `f-mcp-plugin/manifest.json`
>
> **Kurumsal kullanım:** Plugin organizasyonda yayınlandıysa import gerekmez — Plugins menüsünden doğrudan çalıştırın.

---

## Kurulumdan sonra hangi Claude'u kullanmalıyım?

Kurulum tek seferlik. Sonrasında **Claude Desktop'ı** açın — tıpkı Claude Chat gibi yazışın, Figma bağlantısı otomatik çalışır.

| Araç | F-MCP çalışır mı? | Not |
|------|-------------------|-----|
| **Claude Desktop** (masaüstü uygulaması) | ✅ | Sohbet arayüzü — günlük kullanım için önerilen |
| **Claude Code** (terminal uygulaması) | ✅ | Kod yazma ve geliştirme için |
| **Cursor** | ✅ | Kod editörü — geliştiriciler için |
| **Claude Chat** (claude.ai web) | ❌ | Web tarayıcısı Figma plugin'ine erişemez |

---

## Neler yapabilirsiniz?

AI ile Figma arasında **çift yönlü** çalışırsınız:

**Figma'dan AI'a** — tasarımı oku, analiz et:
- *"Bu dosyadaki tüm bileşenleri listele"*
- *"Button bileşeninin özelliklerini göster"*
- *"Bu ekranın screenshot'ını al"*
- *"Design token'larını çıkar"*

**AI'dan Figma'ya** — tasarım oluştur, değiştir:
- *"Yeni bir frame oluştur, 375x812, mobile layout"*
- *"Bu tasarımdan React kodu üret"*
- *"Color token'larını toplu güncelle"*
- *"Tüm ikonları SVG olarak export et"*

**Kalite kontrolü:**
- *"Kontrast kontrolü yap (erişilebilirlik)"*
- *"Koddaki token'larla Figma'daki token'ları karşılaştır"*
- *"Responsive: Mobile, Tablet, Web versiyonlarını üret"*

46 aracın tam listesi: [TOOLS_FULL_LIST.md](docs/TOOLS_FULL_LIST.md)

---

## Figma API Token (opsiyonel — ek özellikler)

F-MCP temel özellikleri token olmadan çalışır. Figma API token eklerseniz **ek özellikler** açılır:

| Token olmadan | Token ile (ek) |
|---------------|---------------|
| Tasarım okuma, bileşen arama | + Yorum okuma/yazma |
| Frame/text oluşturma | + Versiyon geçmişi |
| Variable/token yönetimi | + REST API görsel export |
| SVG/PNG/PDF export | + Dosya bilgisi detayları |

**Nasıl eklenir:**
1. [figma.com/developers](https://www.figma.com/developers) → **Personal Access Tokens** → yeni token oluşturun
2. Figma'da plugin'i açın → **Advanced** → **API Token** alanına yapıştırın
3. Süre seçin (30/60/90 gün) → token otomatik kaydedilir

> Token bilgisayarınızda kalır, internete gönderilmez.

---

## Güncelleme

Claude Code'a şunu söyleyin:

> *"F-MCP'yi güncelle"*

Claude gerisini halleder. Sonra Claude'u yeniden başlatın.

Detay: [UPDATE.md](docs/UPDATE.md)

---

## Sorun mu yaşıyorsunuz?

| Sorun | Çözüm |
|-------|-------|
| Plugin "no server" diyor | AI aracınızı yeniden başlatın |
| Plugin "connecting..." diyor | Bekleyin, otomatik bağlanır |
| Yeni araçlar görünmüyor | AI aracını tamamen kapatıp tekrar açın |

Daha fazla: [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## Teknik detaylar

- **Ne yapar** — Claude veya Cursor'dan Figma'ya ekran tasarlar, tasarım sistemini denetler, renk/yazı/boşluk token'larını yönetir, tasarımı koda hazırlar
- **Nerelerde çalışır** — Claude Code, Cursor, Claude Desktop, Claude Web ([kurulum rehberleri](install/))
- **Figma** — Masaüstü uygulaması ve tarayıcı, her ikisinde de çalışır
- **Birden fazla AI aynı anda** — Claude, Cursor ve Claude Code aynı Figma dosyasına birlikte bağlanabilir
- **Gizlilik** — Veriler bilgisayarınızdan çıkmaz, internet bağlantısı olmadan da kullanılabilir
- **Detay** — [46 araç](docs/TOOLS_FULL_LIST.md) · [24 skill](skills/SKILL_INDEX.md) · [Mimari](docs/ARCHITECTURE.md) · [Kurumsal kullanım](docs/ENTERPRISE.md) · [Katkı rehberi](CONTRIBUTING.md)

---

| | |
|---|---|
| Güncel sürüm | **1.9.0** ([CHANGELOG](CHANGELOG.md) · [Releases](https://github.com/atezer/FMCP/releases)) |
| npm | [@atezer/figma-mcp-bridge](https://www.npmjs.com/package/@atezer/figma-mcp-bridge) |
| Lisans | MIT — kişisel ve ticari kullanıma açık |

**Sorun mu var?** [GitHub Issues](https://github.com/atezer/FMCP/issues)
