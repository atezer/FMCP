---
name: fmcp-project-rules
description: F-MCP Bridge kullanım kuralları — Design Token Kuralı, Bağlı Token Kuralı, kütüphane yönetimi, otomatik yanıt kuralları. Tüm F-MCP skill'leri için geçerli temel kurallar. Her Figma işleminde bu kurallar otomatik olarak geçerlidir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designer
    - designops
    - uidev
    - po
---

# F-MCP Temel Kurallar

Bu skill, tüm F-MCP skill'leri ve komutları için geçerli olan temel kuralları tanımlar. Her Figma işleminde bu kurallar otomatik olarak uygulanır.

## Kullanıcı İstekleri — Otomatik Yanıt

### "F-MCP'yi güncelle" / "update" / "güncelle"
Terminal komutu verme. `bash scripts/update.sh` çalıştır, sonucu bildir:
> Güncelleme tamamlandı (vX.Y.Z). Claude'u yeniden başlat ve Figma'da plugin'i kapat-aç.

### "F-MCP'yi kur" / "setup" / "kur" / "bunu kur" / GitHub linki verildi
Kullanıcı GitHub linki (github.com/atezer/FMCP) verip "kur" derse veya herhangi bir şekilde kurulum isterse:

1. Repo zaten clone edilmişse: `bash scripts/setup.sh` çalıştır
2. Repo clone edilmemişse: `git clone https://github.com/atezer/FMCP.git && cd FMCP && bash scripts/setup.sh`
3. Kullanıcıya sadece sonucu bildir.

Kullanıcıya ASLA terminal komutu söyleme, teknik adım açıklama. Her şeyi sen yap.

### Dil
Kullanıcı Türkçe konuşuyor. Tüm dosyalarda Türkçe karakterler (ş, ç, ğ, ö, ü, ı, İ) doğru kullanılmalı.

---

## Design System Kütüphaneleri

Kullanıcı lokal olarak design system kütüphaneleri kaydedebilir. Kayıtlı kütüphaneler `.claude/libraries/` dizininde bulunur.

### Kullanım kuralları

1. **Skill çalıştırmadan önce** `.claude/libraries/` dizinini kontrol et. Kayıtlı kütüphane varsa oku.
2. **Varsayılan kütüphane:** Kullanıcı "hangi kütüphane?" demişse veya context'ten anlaşılamıyorsa, kayıtlı kütüphanelerden ilkini kullan.
3. **Figma file key'leri** kütüphane dosyasındaki tablolardan al — URL'den parse etme, doğrudan `File Key` alanını kullan.
4. **Token okuma** her zaman kütüphanenin WEB/ana dosyasından yapılır.
5. **Platform seçimi:** Web ekranı → WEB dosyası, Mobil ekran → Mobil dosyası (yoksa WEB fallback).

---

## Design Token Kuralı (TÜM skill'ler için geçerli — ZORUNLU)

Hiçbir skill gömülü/hardcoded design token değeri içeremez ve kullanamaz. Font ailesi, renk kodu, font boyutu, spacing, radius, gölge — hiçbir tasarım değeri skill içine yazılmaz.

**Her tasarım değeri çalışma anında tasarım sisteminden okunur:**

1. **Önce kayıtlı kütüphaneyi oku:** `.claude/libraries/` dizinindeki kütüphane dosyasını kontrol et. Font ailesi, variable collection'lar ve style listesi orada.
2. **Canlı değerleri Figma'dan al:**
   - Font → `figma_get_styles()` text style'larından veya kütüphanenin `Font Ailesi` alanından
   - Renkler → `figma_get_variables()` veya `figma_get_styles()` paint style'larından
   - Boyutlar/spacing → `figma_get_variables()` variable collection'larından
   - Gölgeler → `figma_get_styles()` effect style'larından
3. **Bulunamazsa kullanıcıya sor.**
4. **Kullanıcı "sen seç" derse:** Font için `Inter`, renkler için Figma varsayılanları kullan.

**Skill'lerdeki kod örnekleri:** Örneklerde geçen değerler (renk hex, font adı, piksel boyutu) yalnızca FORMAT gösterimidir. Çalışma anında bu değerler her zaman tasarım sisteminden okunmalıdır.

---

## Bağlı Token Kuralı (ZORUNLU — tüm ekran/bileşen oluşturma işlemlerinde)

Figma'da oluşturulan hiçbir node'da **bağlanmamış (unbound) tasarım değeri** bulunmamalıdır. Her renk, spacing, padding, radius ve metin stili DS variable'ına veya text style'ına **bağlı (bound)** olmalıdır.

- **Renk (fill/stroke):** `figma.variables.importVariableByKeyAsync(key)` ile import et, `setBoundVariableForPaint()` ile bağla
- **Spacing/padding/radius/gap:** `setBoundVariable("paddingLeft", variable)` ile bağla
- **Metin stili:** `setTextStyleIdAsync(styleId)` ile DS text style'ını uygula
- **Metin rengi:** Text node fill'ini `setBoundVariableForPaint()` ile bağla

**Hardcoded değer kabul edilmez.** `node.fills = [{ type: "SOLID", color: {r,g,b} }]` veya `node.fontSize = 16` gibi doğrudan değer atamaları YASAKTIR. Tüm değerler DS'ten import edilip bağlanmalıdır.

Detaylı API kullanımı: `figma-canvas-ops` skill'inin **madde 10** bölümüne bak.

---

## Mevcut kütüphaneler

Kayıtlı kütüphaneleri görmek için `.claude/libraries/` dizinini kontrol et. Her `.md` dosyası bir kütüphanedir. Kütüphane eklemek için `/add-library` komutunu kullan.

## Evolution Triggers

- Yeni DS kural kategorisi eklendiğinde bu skill güncellenmelidir.
- Yeni platform desteği (Flutter, React Native vb.) eklendiğinde platform seçimi kuralları genişletilmelidir.
- Kullanıcı geri bildirimine göre otomatik yanıt kuralları güncellenmelidir.
