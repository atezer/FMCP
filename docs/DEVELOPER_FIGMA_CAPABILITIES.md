# Cursor + F-MCP ile Developer: Figma’dan Neler Alınır, Neler Alınmaz?

Bu dokümanda, Cursor üzerinde F-MCP (F-MCP Bridge) ile geliştirirken **Figma dosyasından neleri alabildiğiniz**, **nelere doğrudan erişemediğiniz** ve **tasarımı birebir çıkartma** için F-MCP’nin yeterliliği özetlenir.

---

## 1. Developer’ın F-MCP ile Alabildikleri

| Kategori | Veri | Nasıl alınır |
|----------|------|----------------|
| **Yapı & hiyerarşi** | Sayfalar, frame’ler, katman ağacı, node id/name/type | `figma_get_file_data`, `figma_get_design_context` |
| **Konum & boyut** | `absoluteBoundingBox`, `width`, `height` (verbosity: standard/full) | `figma_get_design_context`, `figma_get_file_data` |
| **Metin içeriği** | TEXT node’larda `characters` (verbosity: standard/full) | `figma_get_design_context`, `figma_get_file_data`, `figma_get_component` (children) |
| **Bileşen metadata** | İsim, açıklama, variant/property tanımları, annotations | `figma_get_component` |
| **Instance property’ler** | Variant seçimleri, metin override’ları (okuma + yazma) | `figma_get_component` (children), `figma_set_instance_properties` |
| **Görsel referans** | Node/frame screenshot (PNG/JPEG base64) | `figma_capture_screenshot`, `figma_get_component_image`, `figma_get_component_for_development` |
| **Design tokens** | Variable koleksiyonları, modlar, değişken değerleri (renk, sayı, string, boolean) | `figma_get_variables`, `figma_get_token_browser`, `figma_get_design_system_summary` |
| **Stiller (katalog)** | Paint, Text, Effect stilleri (isim, id; full’da renk/font/boyut/effect detayı) | `figma_get_styles` |
| **Dosya özeti** | Sayfa sayısı, bileşen sayıları, token koleksiyonları | `figma_get_design_system_summary` |
| **Bileşen arama** | İsme göre component bulma | `figma_search_components` |
| **Code-ready & SUI** | `roleHint`/`suiComponent`, `layoutSummary`, `colorHex`, `fillVariableNames`/`strokeVariableNames` (SUI token adı; değer platformda), `variantSummary`/`suggestedProps`, `incompleteReasons`, `hasImageFill`; `outputHint: react \| tailwind` | `figma_get_design_context`, `figma_get_file_data` (verbosity standard/full veya includeLayout/includeVisual) |
| **Plugin API** | İsteğe özel okuma/yazma (node’ları gez, property oku) | `figma_execute` |

Tüm bu veriler **Figma REST API token’ı kullanılmadan**, yalnızca **Plugin API** (F-MCP Bridge eklentisi) ile alınır; rate limit ve Figma tarafı token tüketimi yoktur.

---

## 2. Developer’ın Doğrudan Alamadıkları / Sınırlar

| Eksik / sınır | Açıklama |
|----------------|----------|
| **Node bazlı layout detayı** | **Artık var:** `verbosity: 'full'` veya `includeLayout: true` ile `figma_get_design_context` / `figma_get_file_data` kullanıldığında auto-layout (`layoutMode`, padding, itemSpacing, alignment, grid) ve child’larda layoutAlign, layoutGrow, min/max width/height döner. |
| **Constraints** | **Artık var:** `includeLayout: true` veya `verbosity: 'full'` ile `constraints: { horizontal, vertical }` döner. |
| **Node bazlı görsel spec** | **Artık var:** `includeVisual: true` veya `verbosity: 'full'` ile node başına `fills`, `strokes`, `effects`, `opacity`, `cornerRadius`, `strokeWeight`, `strokeAlign` döner. |
| **Node bazlı tipografi** | **Artık var:** `includeTypography: true` veya `verbosity: 'full'` ile TEXT node’larda `fontName`, `fontSize`, `lineHeight`, `textStyleId` döner. |
| **Code Connect** | Figma’nın Code Connect (get/add/suggestions/send) özellikleri **REST API’ye bağlı**; F-MCP plugin-only modda bunlar yok. |
| **FigJam (tam)** | FigJam dosyalarına plugin erişebilir; ancak FigJam’e özel REST özellikleri F-MCP’de yok. Sadece plugin’in erişebildiği kısım limitsiz. |
| **REST’e özel meta** | Yorumlar, versiyon geçmişi, paylaşım linkleri vb. REST’e özel veriler plugin ile **alınamaz**. |

İsterseniz ileride `figma_get_design_context` / `figma_get_component` veya yeni bir araçla node bazlı layout (auto-layout, constraints) ve/veya resolve edilmiş fills/font bilgisi eklenebilir; şu anki durum yukarıdaki gibi.

---

## 3. Tasarımı “Birebir” Çıkartmada F-MCP Yeterli mi?

**Kısa cevap:** Çoğu ekran ve bileşen için **yeterli seviyede**; tam piksel-perfect otomasyon için **birkaç ek veri** (layout + node bazlı görsel/typography) eklenirse daha sağlam olur.

### F-MCP ile zaten yapılabilecekler (birebir’e yakın)

- **Hiyerarşi ve konum:** Tree + `absoluteBoundingBox` ile katman sırası ve x/y/width/height çıkarılabilir.
- **Metin:** Tüm görünür metin `characters` ile alınır.
- **Görsel referans:** Screenshot ile tasarım görsel olarak kıyaslanabilir.
- **Renk ve tipografi kaynağı:** Variables ve stiller (paint/text/effect) ile design system tutarlı şekilde koda taşınabilir; developer hangi style’ın nerede kullanıldığını manuel veya ek mantıkla eşleyebilir.
- **Bileşen yapısı:** Component/variant/property bilgisi ile doğru variant ve prop’lar kod tarafında üretilebilir.

### Eksik kalanlar (birebir’i zorlaştıran)

- **Auto-layout:** Padding, gap, alignment bilgisi olmadan flex/grid karşılığı tahmin edilir; özellikle karmaşık layout’larda tam birebir zor.
- **Constraints:** Responsive davranış (min/max, pin) kodda tam yansımaz.
- **Node bazlı renk/font:** Her node için resolve edilmiş fill/stroke ve font bilgisi yok; stil kataloğu + screenshot veya ek bir “node spec” çıktısı gerekir.

### Sonuç

- **Design system tabanlı, token + stil kullanımı:** F-MCP **yeterli seviyede** (variables, stiller, yapı, metin, screenshot).
- **Pixel-perfect, otomatik kod üretimi:** Mevcut haliyle **kısmen yeterli**; layout (auto-layout, constraints) ve isteğe bağlı node bazlı görsel/typography çıktısı eklendiğinde birebir çıkartma daha güvenilir hale gelir.

---

## 4. Özet Tablo

| İhtiyaç | F-MCP ile? | Not |
|---------|------------|-----|
| Dosya/yapı/hiyerarşi | ✅ | `figma_get_file_data`, `figma_get_design_context` |
| Konum ve boyut (bounds) | ✅ | verbosity standard/full |
| Metin içeriği | ✅ | TEXT `characters` |
| Bileşen/variant/property | ✅ | `figma_get_component` |
| Screenshot | ✅ | `figma_capture_screenshot`, `figma_get_component_image` |
| Design tokens (variables) | ✅ | `figma_get_variables`, token browser |
| Stiller (katalog) | ✅ | `figma_get_styles` |
| Auto-layout (padding, gap, align) | ✅ | verbosity full veya includeLayout: true |
| Constraints | ✅ | verbosity full veya includeLayout: true |
| Node bazlı fills/strokes/effects | ✅ | verbosity full veya includeVisual: true |
| Node bazlı font/size/lineHeight | ✅ | verbosity full veya includeTypography: true |
| Variable’a bağlı fill/stroke → token adı | ✅ | `fillVariableNames`, `strokeVariableNames` (includeVisual) |
| Code Connect / FigJam REST | ❌ | Plugin-only kapsam dışı |

---

## 5. Uygulanan iyileştirmeler (Code-ready, SUI, token referansı)

- **Layout özeti:** `layoutSummary` (flex/grid, gap, padding); `outputHint: react` veya `tailwind` ile framework’e uygun metin.
- **Renk:** `colorHex` / `primaryColorHex` (ilk solid fill).
- **SUI bileşen adı:** `roleHint`, `suiComponent` (node name + description → PascalCase).
- **SUI token referansı:** Fill/stroke variable’a bağlıysa `fillVariableNames`, `strokeVariableNames` (variable **adı**; değer platform kütüphanesinden).
- **Instance:** `variantSummary`, `suggestedProps`.
- **Eksik uyarı:** `incompleteReasons`, `hasImageFill`.

**Not:** SUI token değerleri her platformda kendi kütüphanesinde olduğu için plugin yalnızca bileşen adı ve token **adı** üretir.

---

## 6. İleride / isteğe bağlı fikirler

- **İki kademeli istek:** Önce hafif yapı (id, name, bounds); Cursor “bu node’u implemente et” deyince sadece o node için full (layout + visual + typography). Token ve odak verimliliği artar.
- **Resolved variable değeri:** Figma’da seçili mode’a göre çözülmüş rengi döndürmek (şu an variable **adı** dönüyor; değer platformda).
- **Filtre:** Büyük sayfada sadece auto-layout frame’ler veya sadece component instance’lar; gürültü azalır, Cursor daha net odaklanır.

Bu doküman, F-MCP’nin Cursor developer deneyiminde Figma’dan neleri sağladığını ve birebir çıkartma için nerede yeterli, nerede ek geliştirme fırsatı olduğunu netleştirmek için yazılmıştır.
