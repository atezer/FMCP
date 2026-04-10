# Tasarım Sistemi Kütüphanesi Ekle

Kullanıcı "kütüphane ekle", "library ekle", "tasarım sistemi ekle", "design system ekle" dediğinde bu komutu uygula.

## Akış

### Adım 1 — Bilgi topla

Kullanıcıdan şu bilgileri iste. Eksik olan her şeyi sor, tahmin etme:

**Zorunlu:**

1. **Kütüphane adı** — Kısa isim (örn: SUI, Primer, Carbon)
2. **Ana Figma dosyası URL'si** — Bileşenler + variables + styles içeren dosya. En az 1 tane olmalı.

**İsteğe bağlı (varsa sor):**

3. **Mobil dosyası URL'si** — Mobil platforma özel bileşenler varsa
4. **İkon dosyası URL'si** — Ayrı bir ikon kütüphanesi varsa
5. **Asset dosyası URL'si** — Logo, illüstrasyon gibi varlıklar varsa
6. **Diğer dosyalar** — Başka Figma dosyası varsa (tema, dokümantasyon, vb.)

Her dosya için kullanıcıya sor: **"Bu dosyada ne var? Kısa açıklama verin."**

### Adım 2 — Figma dosyalarını tara

Her dosya için sırayla:

1. `figma_get_status()` — Plugin bağlı mı kontrol et. Bağlı değilse kullanıcıdan Figma'da plugini açmasını iste.
2. `figma_get_design_system_summary(fileKey)` — Component set/component sayıları, variable collection adları
3. `figma_get_variables(fileKey, verbosity: "inventory")` — Variable grupları (inventory büyükse Python ile parse et, sadece grup adı + sayı çıkar)
4. `figma_get_styles(fileKey, verbosity: "summary")` — Paint, text, effect style listesi
5. `figma_search_components(fileKey, currentPageOnly: false, limit: 200)` — Tüm bileşen adları ve key'leri
6. `figma_get_file_data(fileKey, depth: 1, verbosity: "summary")` — Sayfa yapısı
7. **Font ailesi çıkarma (ZORUNLU):** Ana/WEB dosyasındaki text style'lardan font ailesini belirle. `figma_get_styles` sonucundaki text style ID'lerinden birini seç, `figma_execute` ile font bilgisini oku:
   ```js
   const style = await figma.getStyleByIdAsync("TEXT_STYLE_ID");
   const font = style.fontName; // { family: "...", style: "..." }
   return { fontFamily: font.family, fontStyle: font.style };
   ```
   Sonucu kütüphane dosyasının "Genel Bilgi" bölümüne `Font Ailesi` olarak yaz. Bu bilgi tüm skill'ler tarafından font seçiminde kullanılır.

### Adım 3 — Kütüphane dosyası oluştur

`.claude/libraries/{kütüphane-adı-küçük-harf}.md` dosyasını oluştur.

Dosya formatı şablonu:

```markdown
# {Kütüphane Adı} — {Açıklama}

## Genel Bilgi

- **Adı:** {Kütüphane Adı}
- **Font Ailesi:** {text style'lardan çıkarılan font ailesi, ör: "Source Sans Pro"}
- **Gizlilik:** Lokal — repo'ya dahil edilmez, paylaşılmaz.
- **Son tarama:** {tarih}

---

## {N}. {Dosya Açıklaması}

| Alan | Değer |
|------|-------|
| **Dosya Adı** | {Figma dosya adı} |
| **File Key** | `{fileKey}` |
| **Node ID** | `{nodeId}` |
| **URL** | {tam URL} |

### Sayısal Özet

(figma_get_design_system_summary sonuçları — tablo olarak)

### Variable Collection'lar

(varsa — collection adı, sayı, açıklama tablosu)

### Variable Grupları

(varsa — top-level grup adı ve sayı tablosu)

### Text/Effect/Paint Style'lar

(varsa — hiyerarşik liste)

### Bileşen Sayfaları

(sayfa adı → bileşen adları tablosu, deprecated ve WIP işaretleri ayrı)

---

## Skill Talimatları

(hangi dosyadan ne okunacak, platform seçimi kuralları, import yöntemi)
```

### Adım 4 — Sistem dosyalarını güncelle

1. **`.gitignore`** — `.claude/libraries/` satırı yoksa ekle
2. **`project-context.md`** — "Design System Kütüphaneleri" bölümündeki tabloya yeni satır ekle. Bölüm yoksa oluştur.

### Adım 5 — Kullanıcıya bildir

Kısa özet ver:

> ✅ {Kütüphane Adı} eklendi.
>
> **Taranan dosyalar:** {N} dosya
> **Bileşen:** {toplam component set} set, {toplam component} component
> **Variable:** {toplam} token ({collection sayısı} collection)
> **Style:** {paint} paint, {text} text, {effect} effect
>
> Skill'ler artık {Kütüphane Adı}'yı varsayılan kütüphane olarak tanıyor.

## Kurallar

- Kullanıcıya teknik terim açıklama. "File key", "node ID" gibi kavramları sen çöz, URL'den parse et.
- Figma plugini bağlı değilse nazikçe "Figma'da {dosya adı} dosyasını açıp F-MCP pluginini çalıştırın" de.
- Tarama sırasında hata alırsan kullanıcıya hangi dosyada sorun olduğunu bildir, diğerlerine devam et.
- Variable verisi çok büyükse (>50K karakter) Python ile parse et, tüm veriyi context'e yükleme.
- Deprecated (⛔️) ve WIP (⌛️) bileşenleri ayrı listele.
- Her dosyayı taradıktan sonra ilerlemeyi bildir: "✅ {dosya adı} tarandı. Sıradaki: {sonraki dosya}"
