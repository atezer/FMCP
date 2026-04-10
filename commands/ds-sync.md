# Design System Güncelle (Resume Destekli)

Mevcut bir tasarım sistemi kütüphanesini Figma'dan senkronize eder. Tam sync, kısmi sync ve resume (yarım kalanı devam ettirme) destekler.

## Argüman
$ARGUMENTS

Argüman olabilir:
- Boş → aktif veya tek kütüphaneyi sync et (belirsizse kullanıcıya sor)
- `<library-id>` → o kütüphanenin tüm section'larını sync et
- `<library-id> <section>` → sadece o section (tokens, components, icons, mobile, assets)
- `<library-id> --restart` → checkpoint'ten bağımsız sıfırdan başla

---

## Adım 1: Hedef Belirleme

1. `$ARGUMENTS` boşsa:
   - `.claude/design-systems/` altındaki kütüphaneleri listele
   - Tek kütüphane → onu kullan
   - Birden fazla → kullanıcıya sor: "Hangi kütüphaneyi güncelleyeyim?"

2. Kütüphane ID → `.claude/design-systems/<id>/` dizini yoksa:
   ```
   ❌ "<id>" adında bir kütüphane bulunamadı.
   💡 Mevcut kütüphaneleri görmek için: ls .claude/design-systems/
   ```

3. Section belirtilmemişse → tüm section'lar (meta'ya göre)

---

## Adım 2: `_meta.md` Oku

`.claude/design-systems/<id>/_meta.md` dosyasını oku ve şu bilgileri çıkar:

- Kaynak-section eşleştirme tablosu
- Sync durumu (TAMAMLANDI / YARIM KALDI / HATA)
- Son sync tarihi
- İstatistikler

**Eğer durum "YARIM KALDI" ise:**
```
📋 Son sync yarım kalmış: components 87/163
Kaldığı yerden devam edeyim mi? (evet / sıfırdan başla / iptal)
```

---

## Adım 3: Bağlantı Kontrolü

`mcp__figma-mcp-bridge__figma_list_connected_files` çağır.

Kaynak-section tablosundaki her file key için:
- Bağlı → ✅ işaretle
- Bağlı değil → ❌ işaretle

Hiçbir kaynak bağlı değilse → DUR:
```
❌ Hiçbir Figma kaynağı bağlı değil.
Lütfen:
1. İlgili Figma dosyalarını aç
2. F-MCP Bridge plugin'i çalıştır
3. Tekrar dene
```

Bazı kaynaklar bağlı, bazıları değil → kullanıcıya bildir:
```
⚠️ Bazı kaynaklar bağlı değil:
✅ main (❖ SUI)
❌ assets (💼 Assets)

Sadece bağlı olanları güncelleyeyim mi? (evet / iptal)
```

---

## Adım 4: Yedekleme

Her section'ın mevcut MD dosyasını `.bak` olarak kopyala:

```bash
# Her section için
cp .claude/design-systems/<id>/tokens.md .claude/design-systems/<id>/tokens.md.bak
cp .claude/design-systems/<id>/components.md .claude/design-systems/<id>/components.md.bak
# ...
```

**Not:** Dosya yoksa `.bak` oluşturulmaz (yeni section için sorun değil).

---

## Adım 5: Resume Kontrolü (Her Section İçin)

Her hedef section için:

1. Mevcut MD dosyasını oku (varsa)
2. `### <BileşenAdı>` başlıklarını regex ile çıkar → **"done" listesi**
3. Figma'dan güncel listeyi al (`figma_search_components`)
4. `kalan = güncel - done`
5. Eğer `kalan` boşsa → section zaten tam, atla
6. Değilse → sadece eksik olanları işle

**Örnek:**
```
📖 components.md'de 87 bileşen başlığı var
📋 Figma'da 163 bileşen var
🎯 İşlenecek: 76 bileşen (kaldığı yerden)
```

---

## Adım 6: Section Bazlı Sync

### 6a. Tokens Section

Kaynaklardan `tokens.md` yazan olanlar için:

```
📥 Tokens çekiliyor...
```

1. `mcp__figma-mcp-bridge__figma_get_variables` (fileKey, verbosity: "full")
2. `mcp__figma-mcp-bridge__figma_get_styles` (fileKey, verbosity: "full")
3. Gelen data'dan tokens.md'yi yeniden üret:
   - Header + son sync tarihi
   - Primitive Colors (aile tablosu)
   - Semantic Colors (Light/Dark)
   - Typography
   - Spacing & Scale
   - Breakpoints
   - Border Radius
   - Depth (Shadow)
4. Dosyayı tek seferde yaz (tokens.md append-based değil)
5. Progress: "✅ tokens: <N> token"

### 6b. Components / Icons / Mobile Section

Bileşen bazlı section'lar için **batch'li resume destekli akış**:

```
📥 Components çekiliyor (76/163 eksik)...
```

1. Figma'dan full isim listesi çek (zaten Adım 5'te yaptın)
2. "Kalan" listesini 5'er batch'e böl
3. Her batch için:
   a. **Paralel** 5 `figma_get_component` çağrısı
   b. Her başarılı bileşen için:
      - Markdown bloğu oluştur (variant, size, state, platform notları)
      - `### <BileşenAdı>` başlığı ile MD'nin sonuna append et
      - Progress: "📊 X/<toplam> (son: <ad> ✓)"
   c. Başarısız olanlar için:
      - 3 retry (1s, 2s, 4s exponential backoff)
      - Hâlâ başarısız → `failed_items` listesine ekle + devam
4. Batch arası pause yok, hemen sonraki batch'e geç

**Not:** Her bileşen tek seferde append edilir. Yarım yazma yok.

### 6c. Assets Section

Assets genellikle logo/grafik. `figma_search_components` + liste olarak yaz. Detay fetch gerekmez.

---

## Adım 7: Hata Yönetimi

| Hata Tipi | Davranış |
|-----------|----------|
| **API timeout (tek bileşen)** | 3x retry (1s, 2s, 4s) → sonra `failed_items`'a ekle, devam et |
| **Figma bridge disconnect (orta)** | DUR + `_meta.md`'yi "YARIM KALDI" olarak işaretle + kullanıcıya bildir |
| **Permission denied** | O section'ı atla + uyar, diğer section'larla devam |
| **Invalid response** | Skip + `failed_items`'a ekle, devam |
| **Disk full** | DUR + kullanıcıya bildir |
| **Kullanıcı iptal (Ctrl+C)** | Mevcut durum korunur, yarım append yok |

---

## Adım 8: `_meta.md` Güncelle

Sync tamamlandıktan (veya yarım kaldıktan) sonra `_meta.md`'yi güncelle:

### Tam Başarı:
```markdown
## Sync Durumu
- **Son başarılı sync:** 2026-04-09T12:30:00Z
- **Durum:** ✅ TAMAMLANDI
- **Eksik section'lar:** (yok)
```

### Kısmi Başarı:
```markdown
## Sync Durumu
- **Son başarılı sync:** 2026-04-09T12:30:00Z
- **Durum:** ⚠️ KISMI BAŞARI
- **Başarısız öğeler:** Custom Button (timeout), Slot (invalid type)
- **Devam komutu:** `/ds-sync sui components`
```

### Yarım Kaldı:
```markdown
## Sync Durumu
- **Son başarılı sync:** (önceki) 2026-04-05T10:00:00Z
- **Durum:** ⚠️ YARIM KALDI (components: 87/163)
- **Eksik section'lar:** components
- **Devam komutu:** `/ds-sync sui components`
```

İstatistikleri de güncelle:
```markdown
## İstatistikler
- Token sayısı: 841
- Bileşen sayısı: 160 (3 başarısız)
- İkon sayısı: 697
```

Sync geçmişine yeni satır ekle:
```markdown
## Sync Geçmişi
- 2026-04-09: initial sync
- 2026-04-09: components yeniden senkronize edildi (160/163)
```

---

## Adım 9: Cleanup

### Tam Başarı:
- `.bak` dosyalarını sil (gerekmez artık)
- Kullanıcıya rapor:
```
✅ SUI sync tamamlandı.
⏱️ Süre: 18 dakika 32 saniye
📊 İstatistikler:
   • tokens: 841 öğe
   • components: 163 öğe ✓
   • icons: 697 öğe ✓
   • mobile: 30 öğe ✓
```

### Kısmi Başarı:
- `.bak` dosyalarını TUT (rollback mümkün)
- Kullanıcıya rapor:
```
⚠️ Kısmi başarı:
✅ 160/163 bileşen tamamlandı
❌ 3 hata:
   • Custom Button (timeout)
   • Slot (invalid type)
   • .Stepper_2 (permission)
💡 Tekrar denemek için: /ds-sync sui components
```

### Tam Başarısızlık (hiçbir şey alınamadı):
- `.bak`'tan geri yükle:
  ```bash
  cp tokens.md.bak tokens.md
  cp components.md.bak components.md
  ```
- Hata raporu göster

---

## Progress Formatı

Sync sırasında kullanıcıya düzenli olarak bildirim ver:

```
📥 SUI sync başlıyor (tahmini 18 dk)...
📊 tokens: 841/841 ✓ (45s)
📊 components: 5/163 (son: Button ✓)
📊 components: 10/163 (son: Input ✓)
📊 components: 15/163 (son: Select ✓)
...
📊 components: 163/163 ✓ (8m 20s)
📊 icons: 200/697 (son: .check/v1 ✓)
📊 icons: 697/697 ✓ (5m 12s)
📊 mobile: 30/30 ✓ (1m 45s)
✅ Tamamlandı.
```

---

## Resume Senaryosu Detay

**Senaryo:** Kullanıcı dün `/ds-sync sui` çalıştırdı, 87/163 bileşende crash oldu. Bugün tekrar çalıştırıyor.

```
Kullanıcı: /ds-sync sui
Claude: [_meta.md oku]
Claude: "📋 Son sync yarım kalmış: components 87/163
         Kaldığı yerden devam edeyim mi? (evet/sıfırdan/iptal)"
Kullanıcı: "evet"
Claude: [components.md oku, 87 başlık say]
Claude: [figma_search_components → 163 isim]
Claude: [kalan = 163 - 87 = 76]
Claude: "📖 76 bileşen eksik. Devam ediyorum..."
Claude: [88, 89, 90, ... 163]
Claude: [mobile section'a geç]
Claude: [icons section'a geç]
Claude: "✅ SUI sync tamamlandı."
```

**Kod yok. Sadece talimatlar.** Claude Read + figma MCP + Write araçlarıyla yapar.

---

## Doğal Dil Desteği

Slash command olmadan da aynı mantığı uygula:
- "SUI'yi güncelle" → `/ds-sync sui`
- "Sadece SUI bileşenlerini güncelle" → `/ds-sync sui components`
- "Yarım kalan SUI sync'i devam ettir" → `/ds-sync sui` (resume otomatik)
- "devam et" (önceki sync'ten sonra) → resume
