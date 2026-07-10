# Component Key Manifest'leri

CLI'ın "bu instance hangi kütüphaneden geliyor?" sorusunu **isimden bağımsız,
kesin** cevaplayabilmesi için her kütüphanenin component key listesi burada tutulur.
v1 Figma skill'i de aynı manifest'leri kullanır — iki tarafın ortak sözlüğüdür.

## Dosya formatı

Her kütüphane için bir JSON — kendi kütüphane adlarınızla (örn. `ana-ds.json`, `mobil-ds.json`, `icons.json`, `assets.json`):

```json
{
  "name": "icons",
  "fileKey": "<ICONS_FILE_KEY>",
  "generatedAt": "2026-01-01",
  "components": [
    { "key": "a1b2c3...", "name": "icon/arrow-right" }
  ]
}
```

Dosya adı önemlidir: ikon kütüphanesi dosya adında `icon`, asset kütüphanesi
`asset` geçmelidir (CLI ikon/asset sınıflandırmasını buna göre yapar). Gerçek
manifest'ler bu klasörde gitignore'ludur — repoya yalnız örnek şablon girer.

## Üretim

İlgili kütüphane dosyasını Figma'da aç ve `figma-export-manifest.js` içeriğini
Figma agent'ına ("bu script'i çalıştır ve çıktıyı ver" diyerek) çalıştırt.
Çıktıyı ilgili `<kütüphane>.json` dosyasına kaydet.

## Bayatlama

Kütüphaneye yeni bileşen/ikon/asset eklendiğinde manifest güncellenmelidir.
Öneri: DS release ritüelinin parçası yap — kütüphane publish edildiğinde
manifest'i yeniden üret ve bu repoya commit'le. `generatedAt` alanı raporda
gösterilir; 30 günden eskiyse CLI uyarı basar (roadmap).
