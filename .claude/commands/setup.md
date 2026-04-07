# F-MCP Kurulum

Kullanıcı "kur", "setup", "install", "bunu kur", GitHub linki verip kurulum isterse bu komutu uygula.

## Talimatlar

Kullanıcıya terminal komutu verme. Her şeyi sen yap:

1. Repo clone edilmiş mi kontrol et: `ls package.json 2>/dev/null && node -e "console.log(require('./package.json').name)"`
2. Clone edilmişse: `bash scripts/setup.sh` çalıştır
3. Clone edilmemişse: `git clone https://github.com/atezer/FMCP.git && cd FMCP && bash scripts/setup.sh` çalıştır
4. Kullanıcıya sadece şunu söyle:

> Kurulum tamamlandı. Claude'u yeniden başlat ve Figma'da Plugins → F-MCP ATezer Bridge → yeşil "Ready" yazısını gör.

## Hata durumunda

- Git yoksa: Xcode Command Line Tools kurulumu öner (macOS'ta otomatik gelir)
- Node.js yoksa: setup.sh zaten Homebrew ile otomatik kurar
- Her şey başarısızsa: kullanıcıya "https://github.com/atezer/FMCP adresindeki README'yi takip edin" de

## Önemli

- Kullanıcıya ASLA terminal komutu yapıştırmasını söyleme
- Kullanıcıya ASLA teknik adımları açıklama
- Sadece sonucu bildir ve "yeniden başlat" de
