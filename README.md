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

### Claude Desktop sınırlamaları (v1.9.5 güncellemesi)

Claude Desktop **Claude Code'dan farklı** çalışır. Şu mekanizmalar **Desktop'ta yoktur**:

- Hook'lar (PreToolUse, SessionStart) — çalışmaz
- Sub-agent spawn — Task tool mevcut değil
- Slash command'lar (`/ds-sync` vb.) — desteklenmez
- `plugin.json` auto-discovery — yüklenmez
- `.claude/CLAUDE.md` auto-inject yok

Desktop'ta enforcement **dört katmandan** gelir:
1. Plugin response BLOCKING signal'i (v1.9.4+ `_DESIGN_SYSTEM_VIOLATIONS_BLOCKING`)
2. Runtime audit tool'u `figma_scan_ds_compliance`
3. **v1.9.5 Screenshot method selection** — file/summary/regions/base64 (context koruma)
4. **v1.9.5 Discovery budget** — keşif çağrıları sayılır, 12'den sonra BLOCKING
5. Project Knowledge'a yüklenmiş skill dosyaları

Detaylı rehber ve ilk-prompt örneği: **[install/claude-desktop/HOW-TO-ENFORCE.md](install/claude-desktop/HOW-TO-ENFORCE.md)**.

### Yeni chat öncesi (v1.9.5 önerisi)

Plugin bağlantı sorunları veya zombie process temizliği için:

```bash
bash scripts/cleanup-ports.sh
```

5454-5470 aralığındaki eski FMCP process'lerini güvenle öldürür (sadece FMCP adıyla eşleşenler).

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

**Prototip otomasyonu (v1.9.9+):**
- *"Figma'daki ekranların prototip bağlantılarını yap"*
- *"Login → Home → Register akışını SLIDE_IN animasyonla kur"*
- *"Button hover state'i SMART_ANIMATE ile ayarla"*
- *"Long content için vertical scroll + sticky header"*

Otomatik navigasyon haritası (TR+EN button text heuristic), 9 trigger / 8 action / 9 transition tipi × 4 yön, ON_KEY_DOWN (keyCodes + device), overlay config, scroll behavior, flow starting point — Figma Prototype panel'inin tüm yetenekleri.

54 aracın tam listesi: [TOOLS_FULL_LIST.md](docs/TOOLS_FULL_LIST.md)

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
| Plugin "no server" diyor | Önce AI aracını (Claude Desktop / Cursor / Claude Code) açın, sonra Figma'da plugin'i çalıştırın |
| Plugin "connecting..." diyor | Bekleyin, otomatik bağlanır |
| Yeni araçlar görünmüyor | AI aracını tamamen kapatıp tekrar açın |
| DevTools console'da WebSocket hataları | v1.9.1+ ile server-side probe ile giderildi. Plugin hâlâ eski kodu cache'liyorsa: Figma → Plugins → Development → Manage plugins in development → Remove → Import plugin from manifest |

Daha fazla: [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## Teknik detaylar

- **Ne yapar** — Claude veya Cursor'dan Figma'ya ekran tasarlar, tasarım sistemini denetler, renk/yazı/boşluk token'larını yönetir, tasarımı koda hazırlar
- **Nerelerde çalışır** — Claude Code, Cursor, Claude Desktop, Claude Web ([kurulum rehberleri](install/))
- **Nasıl çalışır** — Her görev için kendi **skill**'i var (kural seti + örnek). Claude Code'da **agent + sub-agent** yapısı var: ana ajan görevi alır, alt-ajanlar izole çalışır — ana sohbet bağlamı yorulmaz. Cursor ve Claude Desktop'ta aynı skill'ler doğrudan yüklenir (sub-agent yok, tek kaynak 4 platformda)
- **3 orkestratör** — DS denetimi, token senkronizasyonu, ekran üretimi için hazır uçtan uca akışlar ([skill dizini](skills/SKILL_INDEX.md))
- **Figma** — Masaüstü ve tarayıcı, birden fazla AI aynı dosyaya aynı anda bağlanabilir
- **Gizlilik** — Veriler bilgisayarınızdan çıkmaz, internet bağlantısı olmadan da kullanılabilir
- **Detay** — [54 araç](docs/TOOLS_FULL_LIST.md) · [26 skill](skills/SKILL_INDEX.md) · [Mimari](docs/ARCHITECTURE.md) · [Kurumsal kullanım](docs/ENTERPRISE.md) · [Katkı rehberi](CONTRIBUTING.md)

---

| | |
|---|---|
| Güncel sürüm | **1.9.0** ([CHANGELOG](CHANGELOG.md) · [Releases](https://github.com/atezer/FMCP/releases)) |
| npm | [@atezer/figma-mcp-bridge](https://www.npmjs.com/package/@atezer/figma-mcp-bridge) |
| Lisans | MIT — kişisel ve ticari kullanıma açık |

**Sorun mu var?** [GitHub Issues](https://github.com/atezer/FMCP/issues)
