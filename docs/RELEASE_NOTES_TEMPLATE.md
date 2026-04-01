# Release notes şablonu (GitHub Releases)

## Sonraki sürümde (sıra ile)

1. **`CHANGELOG.md`** — `[Unreleased]` altına maddeleri yazın; yayın günü `## [X.Y.Z] - YYYY-AA-GG` başlığına taşıyın.
2. **`docs/releases/vX.Y.Z-body.md`** — Bu dosyayı kopyalayıp sürüm numarasını değiştirin; İngilizce/Türkçe özetleri doldurun.
3. **GitHub Release** — Aşağıdaki komutlardan biri:
   ```bash
   # Yeni release
   gh release create "vX.Y.Z" --title "vX.Y.Z" --notes-file docs/releases/vX.Y.Z-body.md --repo atezer/FMCP

   # Mevcut release notunu güncelle
   gh release edit "vX.Y.Z" --notes-file docs/releases/vX.Y.Z-body.md --repo atezer/FMCP
   ```
4. **Etiket:** `vX.Y.Z` — [`package.json`](../package.json) içindeki `version` ile uyumlu (örn. `1.3.0` → tag `v1.3.0`). Tag yoksa: `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`

---

## Eski numaralı liste (referans)

1. **`CHANGELOG.md`** içinde `[Unreleased]` altına maddeleri yazın, yayın günü sürüm başlığına taşıyın (`## [X.Y.Z] - YYYY-AA-GG`).
2. **`docs/releases/vX.Y.Z-body.md`** oluşturun (aşağıdaki şablon). GitHub Release açıklamasına bu dosyanın içeriğini yapıştırın veya yukarıdaki `gh` komutunu kullanın.
3. Etiket: `vX.Y.Z` — `package.json` `version` ile uyumlu.

---

## Şablon: `docs/releases/vX.Y.Z-body.md`

```markdown
## vX.Y.Z — YYYY-AA-GG

### Added / Changed / Fixed / Documentation

- …

### Note (optional)

- …

---

### Türkçe özet

- …
```

**İpuçları**

- Release gövdesinde kalıcı link için: `https://github.com/atezer/FMCP/blob/vX.Y.Z/…` (tag’e sabitlenmiş dosya).
- Kullanıcılar için kısa **İngilizce** özet + isteğe bağlı **Türkçe** blok yeterli.
- npm yayını: `npm publish` (2FA **auth-and-writes** / **auth-only** ise `npm publish --otp=<authenticator>`). Sonra `npm view @atezer/figma-mcp-bridge version` ile sürümü doğrulayın. Ayrıntı: [NPX-INSTALLATION.md](NPX-INSTALLATION.md) yayın bölümü.
