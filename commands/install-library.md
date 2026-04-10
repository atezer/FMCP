# Tasarım Sistemi Kütüphanesi Kur / Güncelle

Kullanıcı "kütüphane kur", "library kur", "library install", "kütüphane yükle", "kütüphane güncelle" dediğinde veya bir `.md` dosya yolu verip "bunu kur" dediğinde bu komutu uygula.

## Kullanım

```
/install-library /Users/isim/Downloads/sui.md
```

## Akış

### Adım 1 — Dosyayı bul

Kullanıcı bir dosya yolu verdiyse onu kullan. Vermediyse sor:
> "Kütüphane dosyasının yolunu verin (örn: ~/Downloads/sui.md)"

Dosyanın varlığını kontrol et. Yoksa: "Bu dosya bulunamadı. Yolu kontrol edin."

### Adım 2 — Dosyayı doğrula

Dosyayı oku ve şunları kontrol et:
1. İlk satırda `# ` ile başlayan bir başlık var mı
2. `File Key` içeren bir tablo satırı var mı
3. `## Genel Bilgi` bölümü var mı

Üçünden biri yoksa:
> "Bu dosya geçerli bir kütüphane dosyası gibi görünmüyor. `/add-library` ile yeni bir kütüphane oluşturabilirsiniz."

### Adım 3 — Kütüphane adını çıkar

Dosyanın ilk satırındaki başlıktan kütüphane adını al:
- `# SUI — Sahibinden Design System` → dosya adı: `sui.md`
- `# Primer — GitHub Design System` → dosya adı: `primer.md`

Adı küçük harfe çevir, Türkçe karakterleri koru, boşlukları tire yap.

### Adım 4 — Kopyala veya güncelle

Hedef: `.claude/libraries/{kütüphane-adı}.md`

**Yeni kurulum:** Dosyayı hedefe kopyala.

**Güncelleme (dosya zaten varsa):**
1. Mevcut dosyadaki `Son tarama` tarihini oku
2. Yeni dosyadaki `Son tarama` tarihini oku
3. Kullanıcıya bildir:
   > "SUI kütüphanesi zaten kurulu (son tarama: 2026-04-10). Yeni versiyon: 2026-04-15. Güncellemek istediğinize emin misiniz?"
4. Onay alırsan üzerine yaz

### Adım 5 — Sistem dosyalarını kontrol et

1. **`.gitignore`** — `.claude/libraries/` satırı yoksa ekle
2. Dosya başarıyla kopyalandığını doğrula

### Adım 6 — Kullanıcıya bildir

Kısa özet:

**Yeni kurulum için:**
> ✅ {Kütüphane Adı} kuruldu.
>
> Skill'ler artık bu kütüphaneyi otomatik olarak tanıyacak. Figma'da plugin bağlıyken kütüphanedeki bileşen ve token'lara erişebilirsiniz.

**Güncelleme için:**
> ✅ {Kütüphane Adı} güncellendi ({eski tarih} → {yeni tarih}).

## Kurallar

- Kullanıcıya teknik adım anlatma. Dosya yolunu al, gerisini sen yap.
- `project-context.md`'yi DEĞİŞTİRME — kütüphane sistemi zaten `.claude/libraries/` dizinini taramayı biliyor.
- Dosya kopyalaması için `cp` komutu kullan, dosya içeriğini okuyup yazma (büyük dosyalarda sorun olur).
- Güncelleme sırasında eski dosyayı yedekleme — kullanıcı zaten orijinal dosyaya sahip.
