# F-MCP Bridge — Tam Araç Listesi (Referans)

Config’te **`dist/local-plugin-only.js`** kullanıldığında aşağıdaki araçların **tamamı** MCP üzerinden görünür. Claude veya başka bir istemci “kısa” liste görüyorsa: config’te `local-plugin-only.js` kullanıldığını, `npm run build:local` yapıldığını ve yeni bir sohbet açıldığını kontrol edin.

## Tam liste (alfabetik)

| Araç | Açıklama |
|------|----------|
| `figma_add_mode` | Koleksiyona mod ekle |
| `figma_arrange_component_set` | Birden fazla component’i component set’e dönüştür (combineAsVariants) |
| `figma_batch_create_variables` | Tek çağrıda en fazla 100 variable oluştur |
| `figma_batch_update_variables` | Tek çağrıda en fazla 100 variable güncelle |
| `figma_capture_screenshot` | Node’dan ekran görüntüsü (base64) |
| `figma_check_design_parity` | Figma token’ları ile kod token’larını karşılaştır (design–code gap) |
| `figma_clear_console` | Plugin console log buffer’ını temizle |
| `figma_create_frame` | Yeni frame oluştur (x, y, width, height, fillColor, parentId) |
| `figma_create_group` | Mevcut node'ları grupla (nodeIds dizisi) |
| `figma_create_rectangle` | Yeni dikdörtgen oluştur (boyut, renk, cornerRadius) |
| `figma_create_text` | Yeni metin node'u oluştur (text, fontSize, fontFamily, fillColor) |
| `figma_create_variable` | Yeni değişken oluştur |
| `figma_create_variable_collection` | Yeni koleksiyon oluştur |
| `figma_delete_variable` | Değişken sil |
| `figma_delete_variable_collection` | Koleksiyon sil |
| `figma_execute` | Figma Plugin API ile doğrudan JS çalıştır |
| `figma_get_component` | Belirli bir node’un metadata’sı |
| `figma_get_component_for_development` | Component metadata + base64 screenshot (tek çağrı) |
| `figma_get_component_image` | Sadece node screenshot’ı (base64) |
| `figma_get_console_logs` | Plugin console log’larını getir (limit parametresi) |
| `figma_get_design_system_summary` | Hızlı genel bakış (koleksiyonlar, bileşen sayıları); varsayılan currentPageOnly (büyük dosyada timeout önlemi) |
| `figma_get_design_context` | Belirli node veya dosya için yapı + metin (TEXT `characters`); get_design_context tarzı isteklerde **token tasarruflu**, Figma token/screenshot yok |
| `figma_get_file_data` | Dosya hiyerarşisi, sayfalar, katmanlar (depth / verbosity) |
| `figma_list_connected_files` | Bridge’e bağlı Figma/FigJam dosyalarının listesi (`fileKey` yönlendirmesi için) |
| `figma_get_status` | Plugin bağlantısını kontrol et |
| `figma_get_styles` | Paint, Text, Effect stilleri |
| `figma_get_token_browser` | Değişken + stiller hiyerarşik tarama (Token Browser) |
| `figma_get_variables` | Tüm değişken koleksiyonları |
| `figma_instantiate_component` | Yeni bileşen örneği oluştur |
| `figma_refresh_variables` | Değişkenleri yenile |
| `figma_rename_mode` | Modu yeniden adlandır |
| `figma_rename_variable` | Değişkeni yeniden adlandır |
| `figma_search_components` | İsimle bileşen arama; varsayılan currentPageOnly (büyük dosyada timeout önlemi); çıktıda **`key`** (`componentKey`) — `figma_instantiate_component` ile uyum |
| `figma_set_description` | Component/set/style node’a description (markdown destekli) |
| `figma_set_instance_properties` | Instance özelliklerini değiştir (TEXT, BOOLEAN, VARIANT) |
| `figma_set_port` | Runtime’da WebSocket bridge portunu değiştir (5454–5470). Port meşgulse farklı porta geç |
| `figma_set_rest_token` | Figma REST API token girişi (figd_...). Token doğrulama + bellekte saklama |
| `figma_setup_design_tokens` | Atomik: koleksiyon + modlar + variable’lar (rollback destekli) |
| `figma_update_variable` | Değişken değerini güncelle |
| `figma_watch_console` | Yeni console log’ları timeout’a kadar stream et |
| `figma_rest_api` | Direkt REST API çağrısı (export, comments, versions). Otomatik cevap kırpma (200KB üstü), 429 retry |
| `figma_get_rest_token_status` | Token durumu + rate limit bilgisi + düşük limit uyarısı |
| `figma_clear_rest_token` | REST API token’ı bellekten temizle |
| `figma_export_nodes` | Batch SVG/PNG/JPG/PDF export (1-50 node, scale 0.5-4, base64). Token gerektirmez |
| `figma_search_assets` | Takım kütüphanesi variable collection arama (plugin teamLibrary API) |
| `figma_plugin_diagnostics` | Plugin sağlık kontrolü (uptime, bellek, bağlantı durumu, port) |

**Toplam: 46 araç.** (Plugin-only `registerTool` ile uyumlu; `figma_search_assets` / `figma_get_code_connect` / `figma_use` bu listede yoktur.)  
Claude’un gördüğü liste bu sayıdan azsa, [TROUBLESHOOTING.md](TROUBLESHOOTING.md) içindeki “Yeni araçlar entegre değil” bölümüne bakın.

**Design context / token tasarrufu:** Kullanıcı "bu frame'deki metin", "node 45:4602 için context" veya Figma'nın `get_design_context` benzeri bir istekte bulunursa, **`figma_get_design_context`** (veya `figma_get_file_data` ile `verbosity: standard`/`full`) kullanın. Yapı + metin **Figma token tüketmeden** ve **düşük context token** ile alınır; screenshot dahil edilmez.

**Detaylı kullanım (parametreler, örnekler):** [TOOLS.md](TOOLS.md)
