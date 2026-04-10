# Design System Ekle (Akıllı Tespit)

Kullanıcı bir Figma linki ile yeni tasarım sistemi eklemek istediğinde bu komutu kullan. Bu komut yeni ekleme ve güncelleme arasındaki farkı otomatik tespit eder.

## Argüman
$ARGUMENTS

Argüman olabilir:
- Tek Figma linki
- Birden fazla Figma linki (boşlukla ayrılmış)
- Boş (kullanıcıdan iste)

---

## Adım 1: Argüman Kontrolü

- `$ARGUMENTS` boşsa → kullanıcıya şöyle de: "Hangi Figma linkini eklemek istersin? Lütfen yapıştır."
- Link(ler) varsa → regex ile file key(ler)'i çıkar: `figma\.com/design/([a-zA-Z0-9]+)`
- Geçersiz link varsa → "Bu Figma linki gibi durmuyor. Format: https://figma.com/design/..."

---

## Adım 2: Her File Key İçin Figma Analizi

Her file key için **paralel** çağrı yap:

1. `mcp__figma-mcp-bridge__figma_list_connected_files` → bağlı mı kontrol et
   - Bağlı DEĞİLSE → DUR ve kullanıcıya talimat:
     ```
     ❌ Bu Figma dosyası plugin'e bağlı değil.
     Lütfen:
     1. Figma'da dosyayı aç
     2. F-MCP Bridge plugin'i çalıştır (Plugins → F-MCP ATezer Bridge)
     3. Sonra tekrar dene
     ```

2. `mcp__figma-mcp-bridge__figma_get_file_data` (verbosity: "summary") → dosya adını al

3. `mcp__figma-mcp-bridge__figma_get_variables` (verbosity: "summary") → token sayısı
4. `mcp__figma-mcp-bridge__figma_get_styles` (verbosity: "summary") → stil sayısı
5. `mcp__figma-mcp-bridge__figma_search_components` (query: "", currentPageOnly: false, limit: 500) → bileşen sayısı

**Hata yönetimi:** Her çağrı için try-catch. Başarısız olanı "0" say ama diğerlerine devam.

---

## Adım 3: Mevcut Kütüphane Tespiti

`.claude/design-systems/` altındaki tüm `_meta.md` dosyalarını oku ve bu yeni file key(ler) ile karşılaştır.

### Kontrol 1: File Key Eşleşmesi (Kesin)
Bu file key zaten bir kütüphanede kayıtlı mı?

**Varsa:**
```
📋 Bu Figma dosyası zaten "<library-name>" kütüphanesinde kayıtlı.
Son güncelleme: <tarih>

Güncellemek ister misin? (evet / iptal)
```
- evet → `/ds-sync <library-name>` mantığı uygulanır, DUR.
- iptal → İşlem sonlandırılır.

### Kontrol 2: İsim Eşleşmesi (Tam)
`.claude/design-systems/<normalized-name>/` dizini var mı?

**Varsa:**
```
⚠️ "<name>" adında bir kütüphane zaten var, ama farklı bir Figma dosyası.

Seçenekler:
1. Mevcut <name>'i bu yeni dosyayla değiştir
2. Farklı isimle ekle (örn: <name>-v2)
3. İptal

Hangisi?
```

### Kontrol 3: Fuzzy İsim Eşleşmesi
Benzer isim var mı? (ör: "sui" vs "sui-mobile") Karşılaştırma: normalized isimde substring kontrolü.

**Varsa:**
```
🔍 "<new-name>" dosyasını buldum.
Mevcut "<existing-name>" kütüphanen var. Bu onunla ilgili mi?

Seçenekler:
1. Mevcut <existing-name>'e ek kaynak (source) olarak ekle → mobile.md / icons.md gibi section'a yazılır
2. Ayrı <new-name> kütüphanesi olarak ekle
3. İptal

Hangisi?
```

### Kontrol 4: Hiç Eşleşme Yok
Yeni kütüphane olarak ekleme akışına geç (Adım 4).

---

## Adım 4: Yeni Kütüphane Ekleme Akışı

### 4a. İçerik Analizi ve Section Tespiti

Figma analiz sonuçlarına göre hangi section'ların oluşturulacağına karar ver:

```python
# Pseudo-code
sections = []
if variables > 0 or styles > 0:
    sections.append("tokens")

# Bileşen isimlerini analiz et
component_names = [... figma_search_components sonucu ...]
icon_count = count names matching [r'^\.?icon', r'^flag_', r'\.ikon_', r'/icon']
mobile_count = count names matching [r'mobile', r'mobil', r'iOS', r'android', r'bottom.?sheet']
asset_count = count names matching [r'logo', r'illustration', r'grafik']

if icon_count > 20:
    sections.append("icons")
if mobile_count > 5:
    sections.append("mobile")
if asset_count > 3:
    sections.append("assets")

# Her zaman components (ikon/asset hariç)
non_special_count = len(component_names) - icon_count - asset_count
if non_special_count > 5:
    sections.append("components")
```

### 4b. ID ve İsim Önerisi

- Dosya adını kebab-case'e çevir: "Material UI" → "material-ui"
- Rezerve isimler: `_config`, `_README`, `commands`, `hooks` → kullanma
- ID regex kontrolü: `^[a-z][a-z0-9-]{1,30}$`
- Geçersizse normalize et veya kullanıcıya sor

### 4c. Kullanıcıya Özet Göster

```
📊 Analiz Sonucu:

Dosya: <file_name>
Önerilen ID: <id>
Ad: <display_name>

Bulunan içerik:
✅ Tokens: <N> variable, <M> style
✅ Components: <K> bileşen
✅ Icons: <L> ikon (ayrı section)
ℹ️ Mobile: bulunamadı

Oluşturulacak dosyalar:
• _meta.md
• tokens.md
• components.md
• icons.md

Bu şekilde kaydetmek istiyor musun? (evet / değiştir / iptal)
```

### 4d. Onay Sonrası

1. **Dizin oluştur:** `mkdir -p .claude/design-systems/<id>`

2. **`_meta.md` yaz** (kaynak-section eşleştirme ile):
```markdown
# <display_name> — Meta

## Kaynaklar (Source-to-Section Eşleştirme)
| Source ID | Figma File Key | File Name | Yazılan Section'lar |
|-----------|----------------|-----------|----------------------|
| main      | <file_key>     | <name>    | tokens.md, components.md |

## Sync Durumu
- **Son başarılı sync:** (henüz yapılmadı)
- **Durum:** 🆕 BEKLEMEDE
- **Eksik section'lar:** tokens, components, icons, mobile
- **Devam komutu:** `/ds-sync <id>`

## İstatistikler
- Token sayısı: 0
- Bileşen sayısı: 0
- İkon sayısı: 0

## Sync Geçmişi
- (boş)
```

3. **İlk sync başlat:** `/ds-sync <id>` mantığını çalıştır (ayrı komut dosyası).

4. **project-context.md güncelle:** DS kurallar bölümü zaten genel kural içeriyorsa dokunma. Sadece kütüphane özelinde bir not gerekmez; kural otomatik uygulanır.

5. **Kullanıcıya rapor:**
```
✅ <display_name> eklendi.
📂 .claude/design-systems/<id>/
📊 İlk sync başlatılıyor (tahmini süre: <N> dakika)...
```

---

## Adım 5: Çoklu Kaynak İşleme (Fuzzy Match Seçeneği 1)

Kullanıcı benzer isimde mevcut bir kütüphaneye kaynak eklemek isterse:

1. Mevcut `_meta.md`'yi oku
2. "Kaynaklar" tablosuna yeni satır ekle
3. Yeni kaynağın içerik analizini yap
4. Hangi section'a yazılacağını belirle (örn: "mobile" isimdeki dosya → mobile.md)
5. `_meta.md`'de section listesini güncelle
6. Sadece o section için sync başlat (`/ds-sync <existing> mobile`)

---

## Adım 6: Çoklu Link Tek Seferde (Senaryo E)

Kullanıcı birden fazla link verirse:

1. Her link için Adım 2'yi uygula (paralel)
2. Dosya adlarını kullanıcıya göster:
```
🔍 3 Figma dosyası tespit ettim:
1. Material UI
2. Material UI Icons
3. Material UI Themes

Bu 3'ü AYNI kütüphane olarak mı (tek 'material-ui') yoksa AYRI ayrı mı ekleyeyim?
(aynı / ayrı / iptal)
```
3. Cevaba göre:
   - "aynı" → tek kütüphane, 3 kaynak
   - "ayrı" → 3 ayrı kütüphane (her biri için Adım 4)

---

## Hata Mesajları

| Hata | Kullanıcıya |
|------|-------------|
| Link yok | "Hangi Figma linkini eklemek istersin?" |
| Geçersiz link | "Bu Figma linki gibi durmuyor. Format: https://figma.com/design/..." |
| Bağlı değil | Adım 2'deki bağlantı talimatı |
| Boş dosya | "Bu dosyada hiçbir tasarım sistemi öğesi bulamadım. Link doğru mu?" |
| Permission denied | "Bu dosyaya erişim izninizin olmadığı görünüyor. Figma hesabınızı kontrol edin." |
| API timeout | "Figma yanıt vermiyor. Bağlantıyı kontrol edip tekrar dene." |

---

## Doğal Dil Desteği

Kullanıcı slash command kullanmasa bile bu komuttaki mantığı uygula:
- "Material UI kütüphanesini ekle: <link>" → bu komutun mantığı
- "Şu linkdeki tasarım sistemini ekle: <link>" → bu komutun mantığı
- "<link> bunu ekle" → bu komutun mantığı
