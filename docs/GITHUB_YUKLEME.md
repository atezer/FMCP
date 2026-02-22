# GitHub'a Eksiksiz Yükleme

Tüm projeyi GitHub'a eksiksiz göndermek için adımlar.

## Tek komut (önerilen)

Proje kökünde:

```bash
cd /Users/abdussamed.tezer/FCM/f-mcp-bridge
./github-yukle.sh
```

Script: `git init`, `git add .`, `git commit` yapar. GitHub’da repo oluşturduktan sonra:

```bash
./github-yukle.sh https://github.com/KULLANICI_ADINIZ/REPO_ADI.git
```

ile `remote` ekleyip `push` yapar.

## 1. Gönderilmeyecekler (.gitignore)

Şunlar **yüklenmez** (doğru):

- `node_modules/` — bağımlılıklar (`npm install` ile oluşur)
- `dist/` — derleme çıktısı (`npm run build:local` ile oluşur)
- `.env`, `.dev.vars` — gizli bilgiler
- `.wrangler/` — Wrangler önbelleği
- `.DS_Store`, `*.log` — sistem / log dosyaları

Clone eden biri `npm install` ve `npm run build:local` çalıştırarak projeyi çalıştırır.

## 2. Repo f-mcp-bridge klasöründeyse

```bash
cd /Users/abdussamed.tezer/FCM/f-mcp-bridge

# Henüz git yoksa
git init
git branch -M main

# Tüm dosyaları ekle (.gitignore’dakiler hariç)
git add .
git status   # kontrol

git commit -m "F-MCP ATezer Bridge: MCP sunucusu ve Figma plugin (eksiksiz)"

# GitHub’da yeni repo oluştur: https://github.com/new
# Repo adı örn: figma-mcp-bridge veya f-mcp-bridge
# "Create repository" (README ekleme, .gitignore ekleme — zaten var)

git remote add origin https://github.com/KULLANICI_ADINIZ/REPO_ADI.git
git push -u origin main
```

`KULLANICI_ADINIZ` ve `REPO_ADI` yerine kendi GitHub kullanıcı adınızı ve repo adınızı yazın.

## 3. Repo FCM (üst klasör) ise

Tüm FCM’i (içinde f-mcp-bridge, KURULUM.md vb.) tek repo yapmak istiyorsanız:

```bash
cd /Users/abdussamed.tezer/FCM

git init
git branch -M main
git add .
git status
git commit -m "FCM: F-MCP Bridge ve kurulum dokümanları"
git remote add origin https://github.com/KULLANICI_ADINIZ/FCM.git
git push -u origin main
```

Üst klasörde bir `.gitignore` olmalı; yoksa oluşturun ve en azından şunları ekleyin:

```
node_modules/
dist/
.env
.dev.vars
.wrangler/
.DS_Store
```

## 4. dist/ dahil etmek isterseniz

“Clone eden build çalıştırmasın” diyorsanız `dist`’i de yükleyebilirsiniz:

1. `f-mcp-bridge/.gitignore` içinde `dist` satırını silin veya yorum yapın.
2. `npm run build:local` çalıştırın.
3. `git add .` ve `git commit -m "Add dist"` ile ekleyin.

Not: `dist` commit’lenirse her kod değişikliğinde yeniden build alıp tekrar commit etmek gerekir; çoğu projede `dist` .gitignore’da kalır.

## 5. Özet

| Adım | Komut / işlem |
|------|----------------|
| 1 | `cd f-mcp-bridge` (veya FCM) |
| 2 | `git init` (henüz repo yoksa) |
| 3 | `git add .` |
| 4 | `git commit -m "İlk commit"` |
| 5 | GitHub’da yeni repo oluştur |
| 6 | `git remote add origin <URL>` |
| 7 | `git push -u origin main` |

İlk push’tan sonra tüm kaynak kod, plugin, dokümanlar ve config örnekleri GitHub’da olur; `.gitignore`’daki dosyalar hariçtir.
