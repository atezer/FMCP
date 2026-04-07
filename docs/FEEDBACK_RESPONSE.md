# Feedback Yanıtı: Kurulum Deneyimi (v1.7.14)

## Kaynak
- Dosya: `fmcp-feedback.md`
- Konu: İlk kez Claude Code kullanan, terminal bilgisi olmayan kullanıcının kurulum zorluğu

## Sorun → Çözüm Eşleştirmesi

| # | Sorun | Çözüm | Dosya |
|---|-------|-------|-------|
| 1 | Terminal adımları kullanıcıya devredildi | `setup.sh` tüm build/config adımlarını otomatik yapar | scripts/setup.sh |
| 2 | MCP config ayarlanmadı | Script config dosyasını otomatik oluşturur/günceller | scripts/setup.sh |
| 3 | Port sorunu — kullanıcı Advanced'a bastı | Plugin UI'da "otomatik bağlantı aktif" mesajı eklendi | f-mcp-plugin/ui.html |
| 4 | Plugin-first yaklaşım eksik | README ve ONBOARDING plugin'i öne çıkarır | README.md, ONBOARDING.md |
| 5 | Node.js kurulumu karmaşık | Script sürüm kontrolü yapar, eksikse Homebrew ile kurar | scripts/setup.sh |

## Gelecek Hedefler (FUTURE.md)
- Pre-built binary (Node.js gerektirmeyen) — `brew install --cask fmcp`
- GUI installer (.dmg) — sıfır terminal
- Web installer — `curl -fsSL https://fmcp.dev/install.sh | bash`
