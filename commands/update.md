# F-MCP Güncelleme

Kullanıcı "güncelle", "update", "F-MCP'yi güncelle" gibi bir şey söylediğinde bu komutu uygula.

## Talimatlar

Kullanıcıya terminal komutu verme. Her şeyi sen yap:

1. Repo kökünde `bash scripts/update.sh` çalıştır
2. Sonucu kontrol et — yeni sürüm numarasını kullanıcıya bildir
3. Kullanıcıya sadece şunu söyle:

> Güncelleme tamamlandı (vX.Y.Z). Claude'u yeniden başlat ve Figma'da plugin'i kapat-aç.

## Hata durumunda

- `scripts/update.sh` yoksa: `git pull origin main && npm install && npm run build:local` çalıştır
- Node.js yoksa: `bash scripts/setup.sh` öner (bu da otomatik kurar)
- Git conflict varsa: kullanıcıya bildir, `git stash` ile çöz

## Önemli

- Kullanıcıya ASLA terminal komutu yapıştırmasını söyleme
- Kullanıcıya ASLA teknik adımları açıklama
- Sadece sonucu bildir ve "yeniden başlat" de
