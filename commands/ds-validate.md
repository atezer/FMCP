# Tasarım Sistemi Kütüphane Doğrulaması

Kullanıcı "kütüphane doğrula", "DS'i validate et", "cache'i kontrol et", "DS uyumunu denetle" dediğinde bu komutu uygula. Eklenmiş DS'lerin repo template + user-local cache + state dosyalarının birbiriyle **tutarlı** olduğunu denetler.

## Argüman
$ARGUMENTS

Argüman olabilir:
- `<library-id>` → sadece o kütüphaneyi doğrula
- Boş → tüm kayıtlı kütüphaneleri sırayla doğrula

---

## Adım 1: Hedef Belirleme

1. `$ARGUMENTS` boşsa:
   - `.claude/design-systems/` altındaki tüm alt-dizinleri listele (`README.md`, `active-ds.md`, `last-intent.md`, `intent-history.md` haricinde)
   - Tüm DS'leri sırayla doğrula

2. Kütüphane ID verilmişse → sadece `.claude/design-systems/<id>/` için çalış

---

## Adım 2: Her DS İçin Kontrol Listesi (9 kontrol)

Her DS için aşağıdaki 9 kontrolü sırayla yap ve rapor topla:

### C1: Repo template dizini bütünlüğü

- `.claude/design-systems/<id>/` var mı?
- İçinde beklenen dosyalar var mı?
  - `tokens.md` (ZORUNLU — en azından başlık)
  - `components.md` (ZORUNLU — en azından başlık)
  - Opsiyonel: `icons.md`, `mobile.md`, `assets.md`, `<ID>_CHEATSHEET.md`
- Dosyalar boş değil mi? (her biri ≥5 satır)

### C2: Repo template'de hassas key sızıntısı yok mu?

- `tokens.md` + `components.md` içinde:
  - ❌ Hex değer (regex: `/#[0-9a-f]{6,8}\b/i`)
  - ❌ Gerçek `componentKey` / `variableKey` (regex: `/key:\s*["']?[a-f0-9]{40}/i` — 40 char alphanumeric)
  - ❌ Full file-key prefix (regex: `/[A-Z][a-z]*[0-9]{2,}[A-Za-z0-9]{15,}/` — Figma file-key pattern)
- Bulgular varsa WARNING olarak rapor et — bunlar user-local cache'e taşınmalıydı.

### C3: User-local cache varlığı

- `~/.claude/data/fcm-ds/active.md` dosyası var mı?
- İçinde bu DS'in primary + secondary file-key'leri kayıtlı mı?
- Her file-key için `~/.claude/data/fcm-ds/<file-key>/` dizini var mı?

### C4: User-local cache bütünlüğü

Her user-local cache dizini için:
- `tokens.md` var mı ve ≥1 variable entry içeriyor mu?
- `components.md` var mı ve ≥1 component entry içeriyor mu?
- `_meta.md` var mı ve parse edilebiliyor mu? (Sync Durumu, İstatistikler, Son sync tarihi)

### C5: Sync tazeliği

- `_meta.md`'deki "Son başarılı sync" tarihi + `_meta.md` mtime oku
- Fark > 7 gün ise: ⚠️ STALE warning (sync öner)
- Fark > 30 gün ise: ❌ CRITICAL (cache güvenilmez, `/ds-sync <id>` zorunlu)

### C6: Primary ↔ Secondary uyumu

- Repo `active-ds.md`'de primary + secondary listelenmiş
- User-local `active.md`'de aynı liste var mı?
- Her satır için file-key ve rol eşleşiyor mu?
- Eksik veya artık library varsa bildir

### C7: active-ds.md state tutarlılığı

- `Status:` değeri `✅ Aktif` ise → `Primary Library` boş olmamalı
- `Status:` `❌ Henüz seçilmedi` ise → Primary Library `—` veya boş olmalı
- `Selected At:` format YYYY-MM-DD (tarih) veya `—`

### C8: Skill frontmatter `design_system: type: from_state` okunabilir mi?

Şu skill'ler `active-ds.md#Library Name`'i okuyor:
- `generate-figma-screen/SKILL.md`
- `apply-figma-design-system/SKILL.md`
- `audit-figma-design-system/SKILL.md`

Her biri için frontmatter'ı parse et; `source` field'ı `active-ds.md#Library Name` olmalı. Sapma varsa WARNING.

### C9: Cache Token-Only kuralı

`tokens.md` ve `components.md` içinde **kullanıcıya sunulabilecek ham değer** (hex, px, pt) olmamalı:
- Token isimleri OK (`Global/primary/default`)
- Key hash'leri user-local'de olduğu için burada olmamalı
- Ham renk/boyut varsa WARNING (bu değerler `<DS>` cache'inde runtime'da resolve edilmeli)

---

## Adım 3: Rapor Formatı

```
🔍 DS Validation Report — <tarih>

## <library-id-1>
┌──────┬─────────────────────────────────────┬─────────┐
│ Check│ Açıklama                            │ Sonuç   │
├──────┼─────────────────────────────────────┼─────────┤
│ C1   │ Repo template bütünlüğü             │ ✅ OK   │
│ C2   │ Key sızıntısı yok                   │ ✅ OK   │
│ C3   │ User-local cache var                │ ✅ OK   │
│ C4   │ Cache bütünlüğü                     │ ✅ OK   │
│ C5   │ Sync tazeliği                       │ ⚠️ STALE (12 gün) │
│ C6   │ Primary ↔ Secondary uyumu           │ ✅ OK   │
│ C7   │ active-ds.md state tutarlılığı      │ ✅ OK   │
│ C8   │ Skill frontmatter tutarlılığı       │ ✅ OK   │
│ C9   │ Token-Only kuralı                   │ ✅ OK   │
└──────┴─────────────────────────────────────┴─────────┘

Özet: 8 OK, 1 WARNING, 0 CRITICAL

⚠️ Uyarılar:
- C5: Son sync 12 gün önce. `/ds-sync <library-id>` öneriliyor.

## <library-id-2>
[aynı format...]

---

Toplam: <N> kütüphane tarandı, <X> OK, <Y> warning, <Z> critical.

Sonraki adım:
- Warning varsa: `/ds-sync <id>` ile cache'i güncelle
- Critical varsa: `/ds-remove <id>` + `/ds-add <URL>` ile yeniden kur
- Hepsi OK: `/ds-sync` olmadan devam edebilirsin
```

---

## Adım 4: Otomatik Düzeltme (Opsiyonel)

Rapor sonunda kullanıcıya sor:

```
💡 Otomatik düzeltme yapılabilecekler:
- C5 stale → `/ds-sync <id>` çalıştırayım mı? (evet / hayır)
- C2 LEAK bulunduysa → user-local'e taşıyayım mı? (evet / hayır)

Hangilerini otomatik düzelteyim? (tümü / 1,2 / hiçbiri)
```

User seçimine göre ilgili komutları çalıştır veya DUR.

---

## Önemli

- **Read-only default:** Adım 4 opsiyoneldir. User istemezse hiçbir değişiklik yapma.
- **Destructive değil:** Sadece kontrol eder ve raporlar. `/ds-remove` veya `/ds-sync` gibi destructive komutlar ayrı.
- **Regex limitleri:** Hex/key detection regex'leri false-positive üretebilir (örn. test dosyasındaki fake key'ler). WARNING seviyesinde tut, kullanıcı bağlama bakıp karar versin.
- **Dil:** Türkçe karakterleri koru (ş, ç, ğ, ö, ü, ı, İ).
