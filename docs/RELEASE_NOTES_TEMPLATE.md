# Release notes şablonu (GitHub Releases)

Yeni sürüm yayınlarken:

1. **`CHANGELOG.md`** içinde `[Unreleased]` altına maddeleri yazın, yayın günü sürüm başlığına taşıyın (`## [X.Y.Z] - YYYY-AA-GG`).
2. **`docs/releases/vX.Y.Z-body.md`** oluşturun (aşağıdaki şablon). GitHub Release açıklamasına bu dosyanın içeriğini yapıştırın veya:
   ```bash
   gh release create "vX.Y.Z" --title "vX.Y.Z" --notes-file docs/releases/vX.Y.Z-body.md
   ```
3. Etiket: `vX.Y.Z` — `package.json` `version` ile uyumlu (örn. `1.3.0` → tag `v1.3.0`).

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
- npm yayını yapıyorsanız `npm publish` sonrası sürümü npm sayfasıyla eşleştirmeyi unutmayın.
