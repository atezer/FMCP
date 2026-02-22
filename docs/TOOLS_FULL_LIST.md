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
| `figma_create_variable` | Yeni değişken oluştur |
| `figma_create_variable_collection` | Yeni koleksiyon oluştur |
| `figma_delete_variable` | Değişken sil |
| `figma_delete_variable_collection` | Koleksiyon sil |
| `figma_execute` | Figma Plugin API ile doğrudan JS çalıştır |
| `figma_get_component` | Belirli bir node’un metadata’sı |
| `figma_get_component_for_development` | Component metadata + base64 screenshot (tek çağrı) |
| `figma_get_component_image` | Sadece node screenshot’ı (base64) |
| `figma_get_console_logs` | Plugin console log’larını getir (limit parametresi) |
| `figma_get_design_system_summary` | Hızlı genel bakış (koleksiyonlar, bileşen sayıları) |
| `figma_get_file_data` | Dosya hiyerarşisi, sayfalar, katmanlar (depth / verbosity) |
| `figma_get_status` | Plugin bağlantısını kontrol et |
| `figma_get_styles` | Paint, Text, Effect stilleri |
| `figma_get_token_browser` | Değişken + stiller hiyerarşik tarama (Token Browser) |
| `figma_get_variables` | Tüm değişken koleksiyonları |
| `figma_instantiate_component` | Yeni bileşen örneği oluştur |
| `figma_refresh_variables` | Değişkenleri yenile |
| `figma_rename_mode` | Modu yeniden adlandır |
| `figma_rename_variable` | Değişkeni yeniden adlandır |
| `figma_search_components` | İsimle bileşen arama |
| `figma_set_description` | Component/set/style node’a description (markdown destekli) |
| `figma_set_instance_properties` | Instance özelliklerini değiştir (TEXT, BOOLEAN, VARIANT) |
| `figma_setup_design_tokens` | Atomik: koleksiyon + modlar + variable’lar (rollback destekli) |
| `figma_update_variable` | Değişken değerini güncelle |
| `figma_watch_console` | Yeni console log’ları timeout’a kadar stream et |

**Toplam: 32 araç.** (Claude ile test edilmiş; plugin-only bağlantıda tamamı sorunsuz çalışır.)  
Claude’un gördüğü liste bu sayıdan azsa, [TROUBLESHOOTING.md](TROUBLESHOOTING.md) içindeki “Yeni araçlar entegre değil” bölümüne bakın.

**Detaylı kullanım (parametreler, örnekler):** [TOOLS.md](TOOLS.md)
