---
name: ux-copy-guidance
description: UX yazarlık rehberi — CTA, hata mesajı, boş durum, onay diyaloğu, başarı mesajı ve yükleme durumu için copy kalıpları üretir. Marka ses/ton profili ile kişiselleştirir. Figma text node'larına doğrudan uygulayabilir. "UX copy yaz", "buton metni ne olsun", "hata mesajı", "empty state copy", "boş durum metni", "copy kılavuzu", "marka sesi", "ton rehberi", "microcopy" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir (Figma entegrasyonu için).
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designer
    - uidev
    - po
---

# UX Copy Guidance — Yazarlık ve Marka Sesi Rehberi

## Overview

Bu skill, arayüz metinlerini (microcopy) tasarım prensipleri ve marka sesiyle uyumlu şekilde üretir veya değerlendirir. Figma text node'larına doğrudan uygulayabilir.

**Okuma + Yazma** — Onay ile Figma text node'larını güncelleyebilir.

## Prerequisites

- F-MCP Bridge plugin bağlı olmalı (Figma entegrasyonu için)
- İsteğe bağlı: Proje kökünde `.fmcp-brand-profile.json` (marka kişiselleştirmesi)

## F-MCP skill koordinasyonu

- **Referans veren skill'ler:**
  - `ai-handoff-export` → İçerik Spesifikasyonları bölümü bu skill'e yönlendirir
  - `figma-screen-analyzer` → Copy kalitesi değerlendirmesinde bu skill'in prensiplerini uygular
  - `component-documentation` → Bileşen label/placeholder copy'si bu skill'in kalıplarını kullanır
  - `generate-figma-screen` → Text node oluştururken bu skill'in kalıplarını kullanır
- **Profil oluşturma:** Bu skill profil yoksa otomatik oluşturma akışı başlatır

---

## 5 Temel Prensip

Her arayüz metni bu 5 prensibe uygun olmalıdır:

| # | Prensip | Açıklama | Örnek |
|---|---------|----------|-------|
| 1 | **Anlaşılır** | Jargon yok, belirsizlik yok, açık söyle | "Dosyayı kaldır" ✓ — "Öğeyi kuyruğunuzdan çıkarın" ✗ |
| 2 | **Kısa** | Tam anlamı en az kelimeyle ifade et | "Kaydet" ✓ — "Değişikliklerinizi kaydetmek için tıklayın" ✗ |
| 3 | **Tutarlı** | Aynı kavram her yerde aynı terim | "Sil" her yerde "sil" — bazen "kaldır" bazen "çıkar" değil |
| 4 | **Faydalı** | Her kelime kullanıcının hedefine hizmet etsin | Hata mesajında çözüm yolu ✓ — sadece "Hata oluştu" ✗ |
| 5 | **İnsanca** | Yardımsever bir insan gibi yaz, robot gibi değil | "Bir sorun oluştu" ✓ — "Exception 403: Forbidden" ✗ |

---

## Kopya Kalıpları

### CTA (Call to Action)

**Formül:** Fiille başla + spesifik ol + sonuca eşle

| Doğru | Yanlış | Neden |
|-------|--------|-------|
| Hesap oluştur | Gönder | Sonuç belirsiz |
| Ücretsiz dene | Başla | Ne başlıyor? |
| Raporu indir | Tamam | Eylem belirsiz |
| Değişiklikleri kaydet | İleri | Ne olacak? |

**Kurallar:**
- Max uzunluk: `.fmcp-brand-profile.json` → `copyRules.maxCTALength` (varsayılan: 24 karakter)
- Kaçınılacak kelimeler: `.fmcp-brand-profile.json` → `copyRules.avoidWords`
- Tercih edilecek kelimeler: `.fmcp-brand-profile.json` → `copyRules.preferWords`

### Hata Mesajları

**Formül:** Ne oldu + Neden + Nasıl düzeltilir

```
"Ödeme reddedildi. Bankanız kartı onaylamadı. Farklı bir kart deneyin veya bankanızla iletişime geçin."
 ─────────────    ──────────────────────    ─────────────────────────────────────────────────────
  Ne oldu           Neden                    Nasıl düzeltilir
```

| Durum | Örnek |
|-------|-------|
| Doğrulama hatası | "E-posta adresi geçersiz. Lütfen @ işareti içeren bir adres girin." |
| Sunucu hatası | "Bir sorun oluştu. Birkaç dakika sonra tekrar deneyin." |
| Bağlantı hatası | "İnternet bağlantınız kesildi. Bağlantınızı kontrol edip tekrar deneyin." |
| Yetki hatası | "Bu sayfaya erişim izniniz yok. Yöneticinizden izin isteyin." |

**Ton:** `.fmcp-brand-profile.json` → `copyRules.errorTone`
- `empathetic-actionable` (varsayılan): Empatik + çözüm odaklı
- `technical`: Doğrudan teknik bilgi
- `minimal`: Sadece gerekli bilgi

### Boş Durumlar (Empty State)

**Formül:** Bu ne + Neden boş + Nasıl başlanır

```
"Henüz proje yok. İlk projenizi oluşturarak ekibinizle çalışmaya başlayın."
 ──────────────    ──────────────────────────────────────────────────────
  Bu ne + neden boş     Nasıl başlanır
```

| Durum | Örnek |
|-------|-------|
| İlk kullanım | "Henüz mesaj yok. İlk mesajınızı gönderin!" |
| Arama sonuçsuz | "Sonuç bulunamadı. Farklı anahtar kelimelerle deneyin." |
| Filtre sonuçsuz | "Bu filtreyle eşleşen öğe yok. Filtreleri temizleyin." |
| Silme sonrası | "Tüm bildirimler okundu. Yeni bildirimler burada görünecek." |

### Onay Diyalogları

**Formül:** Eylemi netleştir + sonuçları belirt + butonlara eylem fiili

```
Başlık: "3 dosya silinsin mi?"
Açıklama: "Bu işlem geri alınamaz. Silinen dosyalar çöp kutusuna taşınmaz."
Butonlar: [ Dosyaları sil ] [ Vazgeç ]
                ✓ Eylem fiili     ✓ Net
           YANLIŞ: [ Tamam ] [ İptal ]
```

| Durum | Başlık | Açıklama | Butonlar |
|-------|--------|----------|----------|
| Silme | "3 dosya silinsin mi?" | "Bu geri alınamaz" | Sil / Vazgeç |
| Çıkış | "Kaydedilmemiş değişiklikler var" | "Çıkarsanız değişiklikler kaybolur" | Kaydetmeden çık / Kaydet |
| Yayın | "Makale yayınlansın mı?" | "Yayın sonrası herkes görebilir" | Yayınla / Geri dön |

### Başarı Mesajları

**Formül:** Kısa kutla + sonraki adım (isteğe bağlı)

| Durum | Örnek |
|-------|-------|
| Kaydetme | "Değişiklikler kaydedildi." |
| Oluşturma | "Proje oluşturuldu. Ekip üyelerini davet edebilirsiniz." |
| Gönderme | "Mesaj gönderildi." |
| Silme | "Dosya silindi." (nötr ton — kutlama yok) |

### Yükleme Durumları

**Formül:** Ne yapılıyor + beklenti süresi (uzunsa)

| Süre | Örnek |
|------|-------|
| 1-3 sn | "Yükleniyor..." (spinner yeterli) |
| 3-10 sn | "Raporunuz hazırlanıyor..." |
| >10 sn | "Bu birkaç dakika sürebilir. Sayfayı kapatmayın." |
| Belirsiz | "İşleminiz sıraya alındı. Tamamlandığında bildirim alacaksınız." |

---

## Ses ve Ton Rehberi

### Varsayılan Ton Matrisi

| Bağlam | Ton | Örnek |
|--------|-----|-------|
| **Başarı** | Kutlayıcı ama abartısız | "Harika! Profiliniz güncellendi." |
| **Hata** | Empatik + aksiyon odaklı | "Bir sorun oluştu. Tekrar deneyebilirsiniz." |
| **Uyarı** | Net + acil | "Dikkat: Bu işlem geri alınamaz." |
| **Nötr** | Bilgilendirici + kısa | "Son güncelleme: 5 dakika önce." |
| **Onboarding** | Teşvik edici + yönlendirici | "İlk adım: Profilinizi tamamlayın." |
| **Tebrik** | Sıcak ama profesyonel | "Tebrikler! İlk projenizi oluşturdunuz." |

### Marka Profili ile Kişiselleştirme

Proje kökünde `.fmcp-brand-profile.json` varsa:

1. **`voiceTone.personality`** → Ton kalibrasyonu:
   - `["samimi", "cesur"]` → kısa, direkt, enerjik
   - `["profesyonel", "güvenilir"]` → formel, ölçülü, sakin
   - `["playful", "genç"]` → emoji uygun, günlük dil, cesur kısaltmalar

2. **`voiceTone.formality`** → Kelime seçimi:
   - `formal`: "İşleminiz başarıyla tamamlanmıştır."
   - `semi-formal`: "İşlem tamamlandı."
   - `casual`: "Tamam, bitti!"

3. **`voiceTone.humor`** → Humor seviyesi:
   - `none`: Asla espri veya şaka tonu
   - `subtle`: Hafif sıcaklık, ince humor ("Harika iş!")
   - `playful`: Emoji, şakacı ton ("Boom! Proje hazır 🚀")

4. **`voiceTone.examples`** → Gerçek örnekleri ton referansı olarak kullan

### Profil Yoksa: Otomatik Oluşturma Akışı

`.fmcp-brand-profile.json` dosyası bulunamadığında, kullanıcıya 3 soru sor:

**Soru 1:** "Markanız bir insan olsa nasıl konuşurdu? 3 sıfatla tanımlayın."
- Örnek: samimi, cesur, profesyonel

**Soru 2:** "Formallik seviyesi?"
- Formal (kurumsal, mesafeli)
- Yarı-formal (profesyonel ama sıcak)
- Casual (arkadaşça, günlük)

**Soru 3:** "Bir başarı mesajı örneği verin (uygulamanızda kullanılmış veya hayal ettiğiniz)."
- Örnek: "Harika! Profilin güncellendi."

Cevaplardan minimal `.fmcp-brand-profile.json` oluştur ve proje köküne kaydet.

---

## Çok Dilli / i18n Kuralları

Çoklu dil desteği olan projelerde copy üretirken:

### Metin Uzunluğu Farkları

| Dil | Türkçeye göre uzunluk farkı |
|-----|----------------------------|
| Almanca | %20-40 daha uzun |
| Fince | %20-30 daha uzun |
| İngilizce | %10-20 daha kısa |
| Japonca/Çince | %30-50 daha kısa (karakter bazlı) |
| Arapça | Benzer uzunluk ama RTL layout |

**Kural:** En uzun dili (`.fmcp-brand-profile.json` → `i18n.longestLocale`) baz alarak tasarımda truncation planla.

### RTL (Sağdan Sola) Desteği

- Arapça, İbranice, Farsça: layout tamamen ayna
- İkonlar: yön belirten ikonlar (ok, geri/ileri) ters çevrilmeli
- Sayılar: RTL dillerde de soldan sağa yazılır (istisna)

### Kültür-Nötr Dil

- Metafor ve deyimlerden kaçın ("taşı gediğine koymak" → "düzeltmek")
- Kültüre bağlı emoji dikkatli kullan (🙏 bazı kültürlerde "teşekkür", bazılarında "dua")
- Tarih formatı: yerelleştir (TR: 07.04.2026, US: 04/07/2026, ISO: 2026-04-07)
- Para birimi: sembol + format yerelleştir (₺1.234,56 vs $1,234.56)

---

## Figma Entegrasyonu

### Tekli Text Node Güncelleme

```js
// figma_execute — Tek text node'a copy uygula
const node = await figma.getNodeByIdAsync("<TEXT_NODE_ID>");
await figma.loadFontAsync(node.fontName);
node.characters = "Yeni copy metni";
return { updated: node.id, text: node.characters };
```

### Toplu Copy İnceleme ve Güncelleme

1. Ekrandaki tüm text node'ları listele:

```js
const root = await figma.getNodeByIdAsync("<SCREEN_NODE_ID>");
const textNodes = root.findAll(n => n.type === "TEXT");
const copyList = textNodes.map(n => ({
  id: n.id,
  name: n.name,
  current: n.characters,
  fontSize: n.fontSize,
  parent: n.parent?.name || "—"
}));
return { totalTextNodes: copyList.length, nodes: copyList.slice(0, 50) };
```

2. Kullanıcıya tablo olarak sun:

| # | Node | Mevcut Copy | Önerilen Copy | Durum |
|---|------|------------|---------------|-------|
| 1 | CTA Button | "Gönder" | "Hesap oluştur" | Değişecek |
| 2 | Error Text | "Hata" | "E-posta adresi geçersiz. @ işareti olmalı." | Değişecek |
| 3 | Page Title | "Hoş Geldiniz" | — | Uygun |

3. **Kullanıcı onayı al** — onaylanan node'ları toplu güncelle:

```js
const updates = [
  { id: "<ID_1>", text: "Hesap oluştur" },
  { id: "<ID_2>", text: "E-posta adresi geçersiz. @ işareti olmalı." }
];

for (const u of updates) {
  const node = await figma.getNodeByIdAsync(u.id);
  await figma.loadFontAsync(node.fontName);
  node.characters = u.text;
}

return { updatedCount: updates.length };
```

> **ONAY KURALI:** Text node güncellemeleri kullanıcı onayı olmadan yapılmaz. Önce tablo sun, onay al, sonra uygula.

---

## Required Workflow

### Step 1: Plugin Bağlantısını Doğrula

```
figma_get_status()
```

### Step 2: Marka Profili Kontrol

Proje kökünde `.fmcp-brand-profile.json` ara.
- **Varsa:** Oku, `voiceTone` ve `copyRules` alanlarını not al.
- **Yoksa:** Kullanıcıya "Marka profili bulunamadı. Oluşturmak ister misiniz?" sor.
  - Evet → 3 soru akışı → profil oluştur
  - Hayır → varsayılan ton matrisiyle devam et

### Step 3: Hedef Belirle

Kullanıcının isteğine göre:

**A) Tek copy üretimi:** CTA, hata mesajı, boş durum vb. → ilgili kalıbı uygula, 3 alternatif sun.

**B) Ekran copy incelemesi:** Figma ekranındaki tüm text node'ları tara → mevcut copy'yi değerlendir → öneriler sun.

**C) Copy spec üretimi:** Bir bileşen veya ekran için tüm copy kurallarını dokümante et (karakter limitleri, truncation, durum metinleri).

### Step 4: Copy Üret / Değerlendir

- 5 temel prensibe uygunluk kontrolü
- Marka profili varsa ton kalibrasyonu
- Her copy için 2-3 alternatif sun (kullanıcı seçsin)
- i18n gerekiyorsa en uzun dili baz al

### Step 5: Figma'ya Uygula (İsteğe Bağlı)

Kullanıcı isterse text node'ları güncelle (onay akışı ile).

### Step 6: Copy Spec Çıktısı

İstenirse yapılandırılmış copy spec raporu üret:

```markdown
## Copy Spec — [Ekran Adı]

### CTA'lar
| Buton | Copy | Max Karakter | Alternatifler |
|-------|------|-------------|---------------|
| Ana CTA | "Hesap oluştur" | 24 | "Kaydol", "Ücretsiz başla" |

### Hata Mesajları
| Alan | Mesaj | Ton |
|------|-------|-----|
| E-posta | "Geçerli bir e-posta girin" | empathetic-actionable |

### Boş Durumlar
| Ekran | Mesaj |
|-------|-------|
| Proje listesi | "Henüz proje yok. İlk projenizi oluşturun." |
```

---

## Türkçe Karakter Kuralı (ZORUNLU)

Tüm Türkçe metin içeriklerinde (Figma text node, kod string, dokümantasyon) doğru Unicode karakterler kullanılmalıdır. ASCII karşılıkları YASAKTIR:

| Doğru | Yanlış | Doğru | Yanlış |
|-------|--------|-------|--------|
| ş | s | Ş | S |
| ı | i | İ | I |
| ö | o | Ö | O |
| ü | u | Ü | U |
| ç | c | Ç | C |
| ğ | g | Ğ | G |

Son adım: Üretilen tüm Türkçe metinleri karakter kontrolünden geçir.

## Evolution Triggers

- Yeni copy kalıbı ihtiyacı (notification, tooltip, placeholder) eklenebilir
- Marka profili şeması genişletilirse alan okuma güncellenmeli
- AI ile otomatik copy kalite skoru (5 prensibe uyum puanı) eklenebilir
- Çoklu dil desteği genişletilirse dil bazlı kalıp varyantları eklenebilir
