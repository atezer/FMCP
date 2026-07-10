# Figma → Kod Üretim Kuralları (AI-Ready)

> Bu bölümü geliştirici reposunun `CLAUDE.md` dosyasına veya Cursor için
> `.cursorrules` dosyasına ekleyin. Figma MCP ile tasarım okurken ve tasarımdan
> kod üretirken AI asistanının uyması gereken kuralları tanımlar.

## Tasarım okuma protokolü

1. Figma linki verildiğinde önce `get_metadata` ile yapıyı gör, sonra
   `get_design_context` ile hedef node'u oku. Tüm dosyayı tek seferde okumaya çalışma.
2. Kod üretmeden önce repo kökünde `ai-ready-report.json` var mı bak.
   - Varsa ve `score < 80` ise: kod üretimine başlamadan kullanıcıyı uyar,
     critical bulguları listele. Kullanıcı "devam" derse üret, ama hardcoded
     değer içeren node'ları kodda `// FIXME(ai-ready): hardcoded değer` ile işaretle.
   - Yoksa: tasarımın denetlenmediğini varsay, aşağıdaki hijyen sinyallerini
     okuma sırasında kendin kontrol et.

## Token kuralları (Ana DS = tek kaynak)

3. Renk, spacing, radius ve tipografi değerlerini ASLA piksel/hex olarak kopyalama.
   Design context'te variable bağı varsa o token'ın koddaki karşılığını kullan
   (token haritası: varsa `tokens.json` / tema dosyası; yoksa kullanıcıya sor).
4. Variable bağı OLMAYAN bir renk/spacing gördüğünde bu bir tasarım hatasıdır:
   en yakın semantic token'ı öner, keyfî hex gömme.
5. Semantic token'ı primitive karşılığına çevirme (örn. `--color-text-primary`
   yerine `#1A1A1A` yazma). Light/Dark mode desteği semantic katmanda yaşar.

## Component kuralları

6. Figma'da bir INSTANCE gördüğünde önce onun koddaki karşılığını ara
   (Code Connect haritası, component map dosyası veya mevcut component klasörleri).
   Karşılığı varsa YENİDEN YAZMA — mevcut component'i import edip kullan.
7. Instance'ın kaynağı manifest'lerde tanımlı DS kütüphanelerinden
   biri değilse (manifest dışı component) bunu kullanıcıya bildir; o parçanın
   kod karşılığı muhtemelen yoktur ve tasarım tarafında düzeltilmelidir.
8. Detach edilmiş görünen yapıları (component adı kalıbında ama instance olmayan
   frame'ler) tekil markup olarak kopyalama; ilgili component'in variant'ı olarak üret.

## İkon ve asset kuralları

9. İkonları SVG path olarak kopyalama. İkon kütüphanesi kaynaklı ikonlar için projedeki
   ikon sistemini kullan (ikon adını component adından türet).
10. Görselleri base64/inline gömme; asset pipeline'ındaki referansı kullan,
    yoksa placeholder + TODO bırak.

## Yapı kuralları

11. Auto-layout → flex/stack çevirisi yap; mutlak koordinat (`position: absolute`
    + sabit px) yalnızca Figma'da `layoutPositioning: ABSOLUTE` olan elemanlarda kullan.
12. "Frame 12", "Rectangle 4" gibi isimlendirilmemiş katman adlarını sınıf/değişken
    ismine çevirme; işlevine göre isimlendir.
13. Gizli (`visible: false`) katmanları koda dahil etme; ama varlıklarını kullanıcıya
    bildir (alternatif state olabilir).
14. Placeholder metinleri ("Lorem ipsum", "Başlık" vb.) gerçek içerik sanma;
    prop/slot olarak dışarı aç.
