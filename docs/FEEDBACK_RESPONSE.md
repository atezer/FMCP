# Feedback Yaniti: Kurulum Deneyimi (v1.7.14)

## Kaynak
- Dosya: `fmcp-feedback.md`
- Konu: Ilk kez Claude Code kullanan, terminal bilgisi olmayan kullanicinin kurulum zorlugu

## Sorun - Cozum Eslestirmesi

| # | Sorun | Cozum | Dosya |
|---|-------|-------|-------|
| 1 | Terminal adimlari kullaniciya devredildi | `setup.sh` tum build/config adimlarini otomatik yapar | scripts/setup.sh |
| 2 | MCP config ayarlanmadi | Script config dosyasini otomatik olusturur/gunceller | scripts/setup.sh |
| 3 | Port sorunu — kullanici Advanced'a basti | Plugin UI'da "otomatik baglanti aktif" mesaji eklendi | f-mcp-plugin/ui.html |
| 4 | Plugin-first yaklasim eksik | README ve ONBOARDING plugin'i one cikarir | README.md, ONBOARDING.md |
| 5 | Node.js kurulumu karmasik | Script surum kontrolu yapar, eksikse Homebrew ile kurar | scripts/setup.sh |

## Gelecek Hedefler (FUTURE.md)
- Pre-built binary (Node.js gerektirmeyen) — `brew install --cask fmcp`
- GUI installer (.dmg) — sifir terminal
- Web installer — `curl -fsSL https://fmcp.dev/install.sh | bash`
