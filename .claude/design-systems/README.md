# Design System Framework

Bu klasör, Claude'un tasarım sistemi (DS) referanslarını tuttuğu merkezi yerdir. Her tasarım sistemi bir alt klasördür ve içinde o DS'nin bileşen, token ve ikon bilgileri MD dosyaları halinde bulunur.

**Amaç:** Figma'ya her seferinde API çağrısı yapmak yerine, DS bilgilerini yerel MD dosyalarından okuyarak hız ve maliyet kazanmak.

---

## Kaynak - Hedef İlişkisi

**Kaynak (Source of Truth):** Figma her zaman tek gerçek kaynaktır.
**Hedef (Cache/Reference):** `.claude/design-systems/<library>/*.md` dosyaları, Figma'dan türetilmiş referanslardır.

- MD dosyaları kullanıcı tarafından **manuel düzenlenmemelidir**.
- Her zaman `/ds-sync` veya "güncelle" komutları ile güncellenir.
- Figma'da bir değişiklik olduğunda, MD'ler senkronize edilmelidir.

---

## Dizin Yapısı (Split: Public Template + User-Local Cache)

FCM v2+ itibarıyla DS referansları **iki katmanda** tutulur:

### Katman 1 — Public Template (Repo)
```
.claude/design-systems/
├── README.md                      ← Bu dosya (framework dokümanı)
├── active-ds.md                   ← Aktif DS seçimi (template — gerçek file key YOK)
└── <library-id>/                  ← Her DS için pattern rehberi
    ├── tokens.md                  ← Token isim/pattern/rol (variableKey YOK)
    ├── components.md              ← Component isim/pattern/rol (componentKey YOK)
    └── <library-id>_CHEATSHEET.md ← Generic workflow cheatsheet
```

### Katman 2 — User-Local Cache (Git-ignored, kullanıcıya özel)
```
~/.claude/data/fcm-ds/
├── active.md                      ← Aktif DS bilgisi (file key dahil)
└── <file-key>/                    ← Her Figma dosyası için ayrı klasör
    ├── _meta.md                   ← sync durumu + istatistikler
    ├── tokens.md                  ← GERÇEK variableKey'ler (spacing, color, radius)
    ├── components.md              ← GERÇEK componentKey'ler
    ├── icons.md                   ← varsa
    ├── mobile.md                  ← varsa
    └── file-map.md                ← v1.9.5: dosyanın site map'i (sayfalar, key frame'ler)
```

### v1.9.5 — file-map.md (Discovery Cache)

**Amaç:** Chat'ler arası bilgi biriktirme. Her oturumda sıfırdan dosya yapısı keşfi engellenir.

**İçerik:**
- Dosyanın sayfaları (ad, ID, frame sayısı, açıklama)
- Key frame'ler tablosu (ad, ID, size, page, rol)
- Common pattern'ler (örn. "Anasayfa için bottom nav 5 tab")

**Update tetikleyici:** Claude `figma_get_file_data(depth>=2)` çağırdığında veya kullanıcı "dosya haritasını güncelle" dediğinde otomatik yazılır.

**TTL:** 7 gün. Daha eski ise yeniden keşif önerilir (Figma'da dosya değişmiş olabilir).

**Okuma sırası:** Skill, yeni oturumda istek geldiğinde önce `file-map.md`'yi okur. Kullanıcının istediği ekran zaten varsa referans verir, keşif 1-2 call'la sınırlı kalır.

**Neden iki katman?**
1. **Gizlilik:** Figma library key'leri kurumsal IP'dir; repo'ya girmemeli.
2. **Paylaşım:** FCM'i fork eden başka kullanıcı kendi DS'sinin key'lerini tutar.
3. **Eskime:** Key rename olsa bile runtime resolve (isim-bazlı) sayesinde framework çalışmaya devam eder.

**Kritik:** Key'ler **her zaman** user-local'de, **asla** repo'da.

---

## Kullanım

### 1. Yeni Kütüphane Ekleme

**Yöntem A — Slash command:**
```
/ds-add https://figma.com/design/abc123/MyDesignSystem
```

**Yöntem B — Doğal dil:**
```
"Şu kütüphaneyi ekle: https://figma.com/design/abc123/MyDesignSystem"
```

Claude her iki durumda da:
1. Figma dosyasını analiz eder (token, bileşen, ikon sayar)
2. Mevcut kütüphanelerle karşılaştırır (aynı file key / aynı isim / benzer isim)
3. Yeni mi yoksa güncelleme mi olduğuna karar verir
4. Onay sonrası dosyaları oluşturur

### 2. Günlük Kullanım

```
"SUI button ile kart yap"
→ Claude sui/_meta.md okur (durum kontrolü)
→ Claude sui/components.md okur
→ Figma'ya gitmeden kart üretir
```

### 3. Güncelleme

```
"SUI'yi güncelle"
veya
/ds-sync sui
veya
/ds-sync sui components   (sadece bileşenler)
```

### 4. Kaldırma

```
"SUI'yi sil"
→ Claude onay sorar
→ sui/ klasörü silinir
→ project-context.md'den kural kaldırılır
```

---

## Skill Okuma Sırası

Tüm DS-farkında skill'ler (`fmcp-screen-recipes`, `fmcp-screen-orchestrator`, `apply-figma-design-system`, ...) cache'i şu sırayla arar:

1. **User-local:** `~/.claude/data/fcm-ds/<file-key>/<section>.md` (gerçek key'ler)
2. **Repo template:** `.claude/design-systems/<library>/<section>.md` (isim pattern'leri)
3. **Runtime resolve:** `figma.teamLibrary` API + `name.endsWith(suffix)` eşleme

### Aktif DS Tespiti

Skill önce `~/.claude/data/fcm-ds/active.md`'ye bakar. Yoksa repo `.claude/design-systems/active-ds.md`'ye düşer. Yoksa kullanıcıya DS sorusu sorulur.

---

## Resume Mantığı (Sync Yarım Kalırsa)

Figma sync işlemi uzun sürer (SUI gibi büyük bir DS için 15-20 dk). Sync sırasında bağlantı kesilirse:

1. **Sync başlangıcında:** `.bak` dosyaları oluşturulur.
2. **Sync sırasında:** Her bileşen MD'ye tek tek append edilir (atomik).
3. **Crash olursa:** MD dosyasında kaydedilmiş bileşenler korunur.
4. **Sonraki çalıştırmada:** Claude mevcut MD'deki `### <BileşenAdı>` başlıklarını okur → "done" listesi çıkarır → eksik olanları çeker.

**Örnek:**
```
Gün 1: sync 87/163 bileşende kesildi
Gün 2: kullanıcı "SUI'yi güncelle" der
Claude: components.md'de 87 bileşen var, 76 eksik. Devam ediyorum.
Claude: [87'den 163'e kadar devam eder]
```

**Kullanıcı hiçbir ekstra komut girmez.** "Devam et" veya "güncelle" yeterli.

---

## Mevcut Kütüphane Tespiti (/ds-add Akıllı Davranışı)

Claude yeni bir Figma linki aldığında şu 4 kontrolü sırayla yapar:

| Öncelik | Kontrol | Davranış |
|---------|---------|----------|
| 1 | **File key eşleşmesi** (kesin) | Aynı dosya zaten kayıtlı → "Güncelleyeyim mi?" |
| 2 | **İsim eşleşmesi** (tam) | Aynı isimde kütüphane var → "Değiştir / yeniden isimlendir" |
| 3 | **Fuzzy isim eşleşmesi** | Benzer isim var (ör: "sui" vs "sui-mobile") → "Kaynak eklensin mi?" |
| 4 | **Yeni** | Hiçbir eşleşme yok → yeni kütüphane olarak ekle |

---

## `_meta.md` Formatı

Her kütüphanenin `_meta.md` dosyası bu yapıyı takip eder:

```markdown
# <Library Name> — Meta

## Kaynaklar (Source-to-Section Eşleştirme)
| Source ID | Figma File Key | File Name | Yazılan Section'lar |
|-----------|----------------|-----------|----------------------|
| main      | 7T4iLZ...      | ❖ SUI     | tokens.md, components.md |
| mobile    | Edxo31...      | ❖ SUI Mobil | mobile.md |
| icons     | sFJFlf...      | 🙂 S-Icons | icons.md |

## Sync Durumu
- **Son başarılı sync:** 2026-04-09T10:00:00Z
- **Durum:** ✅ TAMAMLANDI
  <!-- Alternatifler: "⚠️ YARIM KALDI (components: 87/163)" veya "❌ HATA: ..." -->
- **Eksik section'lar:** (yoksa boş)
- **Devam komutu:** (yarım kalmışsa)

## İstatistikler
- Token sayısı: 841
- Bileşen sayısı: 163
- İkon sayısı: 697
- Mobil bileşen: 30

## Sync Geçmişi
- 2026-04-09: initial sync
```

---

## Kurallar (Claude için)

Bu kurallar `project-context.md`'de de tanımlanır, Claude her oturumda otomatik okur.

1. **Önce `_meta.md` oku** → sync durumunu kontrol et.
2. **"YARIM KALDI" ise** → kullanıcıya bildir, devam etmeyi öner.
3. **>30 gün eski ise** → güncelleme öner.
4. **Kütüphane seçiminde** → belirsizse kullanıcıya sor.
5. **Sync'te** → bileşen-bileşen atomik append.
6. **Resume'da** → mevcut MD'den "done list" çıkar.
7. **Hata durumunda** → `.bak`'tan restore veya kısmi koruma.
8. **MD'yi manuel düzenleme** → her zaman `/ds-sync` kullan.

---

## Desteklenen Kaynak Tipleri

Şu an: **Figma** (Figma MCP bridge üzerinden)

Gelecekte eklenebilecek:
- Storybook
- Public URL (HTML/MD)
- GitHub repo
- Design Tokens JSON

Framework kaynak-agnostik tasarlanmıştır; yeni kaynak tipleri eklemek için sadece `/ds-add` komutuna yeni dal eklemek yeterlidir.

---

## Plug-and-Play

Yeni bir kütüphane eklemek = bir Figma linki vermek.
Bir kütüphaneyi kaldırmak = "sil" demek.
Güncellemek = "güncelle" demek.
Birden fazla kütüphane = aynı anda farklı DS'lerle çalışmak.

**Hiçbir kod değişikliği gerektirmez.** Sadece dosyalar ve basit kurallar.
