# Tasarım Sistemi Kütüphanesini Kaldır

Kullanıcı "kütüphane kaldır", "library sil", "DS'i kaldır", "DS'i sil", "tasarım sistemini kaldır" dediğinde bu komutu uygula. Kullanıcı eski/yanlış eklenmiş bir DS'in cache'ini ve state'ini temizlemek ister.

## Argüman
$ARGUMENTS

Argüman olabilir:
- `<library-id>` → o kütüphaneyi kaldır
- Boş → kullanıcıya hangi DS'in kaldırılacağını sor

---

## Adım 1: Hedef Belirleme

1. `$ARGUMENTS` boşsa:
   - `.claude/design-systems/` altındaki kütüphaneleri listele (`README.md`, `active-ds.md`, `last-intent.md`, `intent-history.md` haricindeki alt-dizinler)
   - Kullanıcıya sor: "Hangi kütüphaneyi kaldırayım? Mevcut DS'ler: [liste]. Yazın veya 'iptal' deyin."

2. Kütüphane ID → `.claude/design-systems/<id>/` dizini yoksa:
   ```
   ❌ "<id>" adında bir kütüphane bulunamadı.
   💡 Mevcut kütüphaneleri görmek için: ls .claude/design-systems/
   ```

---

## Adım 2: Etki Özeti (Silmeden Önce Göster)

Kaldırılacak şeyleri topla ve kullanıcıya göster:

```
⚠️ "<library-id>" kütüphanesi kaldırılacak. Etki:

📁 Silinecek repo dizinleri:
- .claude/design-systems/<id>/ (<N> dosya: tokens.md, components.md, ...)

🗑️  Silinecek user-local cache (gerçek key'ler):
- ~/.claude/data/fcm-ds/<file-key-1>/
- ~/.claude/data/fcm-ds/<file-key-2>/ (varsa secondary libraries)

📝 Güncellenecek state dosyaları:
- .claude/design-systems/active-ds.md (Primary Library <id> → ❌ Henüz seçilmedi)
- ~/.claude/data/fcm-ds/active.md (Library Map'ten <id> kaldırılacak)
- .claude/design-systems/last-intent.md (eğer <id> son intent ise → sıfırla)

⚠️ Bu işlem GERİ ALINAMAZ. Devam edeyim mi? (evet / iptal)
```

User "iptal" derse → DUR.
User "evet" derse → Adım 3'e geç.

---

## Adım 3: User-Local Cache Key'lerini Çıkar

`~/.claude/data/fcm-ds/active.md` dosyasını oku; silinecek DS'in primary + secondary file-key'lerini topla.

Eğer user-local `active.md` eski format (tek `File Key:` satırı) ise → o tek key'i kullan.
Yeni format (Library Map tablosu) ise → tüm satırlardaki key'leri topla.

Topladığın key listesini kullanıcıya bildir (gerçek key'ler kısa prefix olarak, örn. `AAAAAA...`) ve devam et.

---

## Adım 4: Silme İşlemleri (Sıralı, Atomik)

**4a) Repo dizini sil:**
```bash
rm -rf .claude/design-systems/<id>/
```

**4b) User-local cache dizinlerini sil:**
Adım 3'te toplanan her file-key için:
```bash
rm -rf ~/.claude/data/fcm-ds/<file-key>/
```

**4c) active-ds.md güncelle:**
Repo template'ini sıfırla:
```markdown
## Aktif DS

**Status:** ❌ Henüz seçilmedi

**Primary Library:** —
**Source Path:** `.claude/design-systems/<lib>/` (public pattern) + `~/.claude/data/fcm-ds/<file-key>/` (user-local cache)
**Selected At:** —
```
Secondary Libraries tablosu da temizle (tek satır dash).

**4d) User-local active.md güncelle:**
`~/.claude/data/fcm-ds/active.md` dosyasındaki Library Map tablosundan silinen DS satırını kaldır. Eğer başka DS kalmadıysa dosyayı boşalt veya sil.

**4e) last-intent.md / intent-history.md kontrol:**
- `last-intent.md` Selected Skill o DS'i referans alıyorsa → Status'u "❌ Henüz hiçbir intent tamamlanmadı"a sıfırla
- `intent-history.md` LRU listesinden silinen DS ile ilgili entry'leri çıkar

---

## Adım 5: Onay Raporu

```
✅ "<id>" kütüphanesi kaldırıldı.

Silinen:
- .claude/design-systems/<id>/ (repo)
- ~/.claude/data/fcm-ds/<file-key>/ × <N> (user-local cache)

State güncellendi:
- active-ds.md → ❌ Henüz seçilmedi
- active.md → Library Map temizlendi
- last-intent.md → sıfırlandı (gerekliyse)

💡 Yeni DS eklemek için: /add-library veya /ds-add <Figma-URL>
```

---

## Önemli

- **Güvenlik:** Silme işlemi destructive ve geri alınamaz. Adım 2 onay gate'i ATLAMAZ.
- **Çakışma:** Başka bir DS aynı file-key'i paylaşıyorsa (nadir, multi-DS same library), silme öncesi uyar.
- **Cache-only silme:** Kullanıcı "sadece cache'i sıfırla, DS'i koru" derse bu komut yerine `/ds-sync <id> --restart` öner.
- **Dil:** Türkçe karakterleri koru (ş, ç, ğ, ö, ü, ı, İ).
