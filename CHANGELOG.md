# Changelog

Bu dosya [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) biçimine uygundur. Sürüm numaraları [`package.json`](package.json) ile uyumludur.

**Sürüm takibi (kullanıcılar için):**

| Kanal | Açıklama |
|-------|----------|
| [GitHub Releases](https://github.com/atezer/FMCP/releases) | Sürüm etiketleri ve (yayımlandığında) derlenmiş notlar |
| [npm — @atezer/figma-mcp-bridge](https://www.npmjs.com/package/@atezer/figma-mcp-bridge) | Yayınlanan paket sürümü; `npm view @atezer/figma-mcp-bridge version` ile kontrol |
| Bu dosya | Repoda her sürüm için özet değişiklik listesi |

Bu changelog’a ekleme öncesi sürümlerin tam ayrıntıları için `git log` kullanılabilir.

## [Unreleased]

### Süreç (bakımcılar)

- Sonraki sürüm: `CHANGELOG.md` güncelle → `docs/releases/vX.Y.Z-body.md` oluştur → [RELEASE_NOTES_TEMPLATE.md](docs/RELEASE_NOTES_TEMPLATE.md) içindeki `gh release create` / `gh release edit` ile GitHub Release aç veya güncelle.

## [1.2.0] - 2026-03-27

### Dokümantasyon

- Sürüm takibi ve güncelleme adımları: [README.md](README.md#sürüm-ve-güncellemeler), [KURULUM.md](KURULUM.md#sürüm-takibi-ve-güncelleme-notları).
- Bu changelog dosyası eklendi; GitHub Releases ve npm ile birlikte tek referans olarak kullanılmalıdır.
- GitHub [Release v1.2.0](https://github.com/atezer/FMCP/releases/tag/v1.2.0); gövde: [docs/releases/v1.2.0-body.md](docs/releases/v1.2.0-body.md). Bakımcı akışı: [docs/RELEASE_NOTES_TEMPLATE.md](docs/RELEASE_NOTES_TEMPLATE.md).

### Bakım ve doğrulama (2026-03)

- [FUTURE.md](FUTURE.md) kod taraması: npm `@atezer/figma-mcp-bridge@1.2.0` doğrulandı; `dist/` ile `docs/TOOLS.md` Agent Canvas üçlüsü uyumsuzluğu not edildi (doküman düzeltmesi §7’de açık).
- Figma Organization private plugin yayını tamamlandı (FUTURE §5).

### Not

Bu sürüm, npm paketi `@atezer/figma-mcp-bridge@1.2.0` ve depo kökündeki `package.json` ile hizalıdır. Önceki sürümlerin ayrıntılı kaydı bu dosyada başlamaktadır.
