# F-MCP Bridge — Tam Araç Listesi (Referans)

Config’te **`dist/local-plugin-only.js`** kullanıldığında aşağıdaki araçların **tamamı** MCP üzerinden görünür. Claude veya başka bir istemci “kısa” liste görüyorsa: config’te `local-plugin-only.js` kullanıldığını, `npm run build` yapıldığını ve yeni bir sohbet açıldığını kontrol edin.

## Tam liste (alfabetik)

| Araç | Açıklama |
|------|----------|
| `figma_add_mode` | Koleksiyona mod ekle |
| `figma_arrange_component_set` | Birden fazla component’i component set’e dönüştür (combineAsVariants) |
| `figma_batch_create_variables` | Tek çağrıda en fazla 100 variable oluştur |
| `figma_batch_update_variables` | Tek çağrıda en fazla 100 variable güncelle |
| `figma_bind_variable` | Node property'sine (fill, stroke, padding, radius, gap…) team library variable'ı bağla — import + setBoundVariable tek çağrıda |
| `figma_capture_screenshot` | Node’dan ekran görüntüsü (base64) |
| `figma_check_design_parity` | Figma token’ları ile kod token’larını karşılaştır (design–code gap) |
| `figma_clear_console` | Plugin console log buffer’ını temizle |
| `figma_clear_rest_token` | REST API token’ı bellekten temizle |
| `figma_clone_screen_to_device` | Ekranı başka cihaz boyutuna klonla (örn. iPhone → Android); auto-layout ve binding'ler korunur |
| `figma_create_frame` | Yeni frame oluştur (x, y, width, height, fillColor, parentId) |
| `figma_create_group` | Mevcut node'ları grupla (nodeIds dizisi) |
| `figma_create_interaction` | Node'a tek etkileşim ekle — trigger (ON_CLICK/ON_HOVER/ON_KEY_DOWN…) + action + transition |
| `figma_create_mini_ds` | Boş dosyaya mini design system kur: renk+boyut koleksiyonları, text style'lar, temel component'ler |
| `figma_create_prototype_connection` | İki node arasında prototip bağlantısı kur (navigation + animasyon; 9 trigger / 8 action / 9 transition) |
| `figma_create_rectangle` | Yeni dikdörtgen oluştur (boyut, renk, cornerRadius) |
| `figma_create_text` | Yeni metin node'u oluştur (text, fontSize, fontFamily, fillColor) |
| `figma_create_variable` | Yeni değişken oluştur |
| `figma_create_variable_collection` | Yeni koleksiyon oluştur |
| `figma_delete_variable` | Değişken sil |
| `figma_delete_variable_collection` | Koleksiyon sil |
| `figma_enumerate_library_components` | AÇIK library dosyasının tüm COMPONENT/COMPONENT_SET'lerini canlı listele — {name, key, kind, props} |
| `figma_enumerate_published_components` | Library dosyası KAPALIYKEN yayınlanmış component'leri REST ile listele (libraryFileKey + filter; büyük DS'lerde filter zorunlu) |
| `figma_execute` | Figma Plugin API ile doğrudan JS çalıştır |
| `figma_export_nodes` | Batch SVG/PNG/JPG/PDF export (1-50 node, scale 0.5-4, base64). Token gerektirmez |
| `figma_get_code_connect` | Code Connect hint'leri (documentationLinks + componentKey) — v1.9.8+ |
| `figma_get_component` | Belirli bir node’un metadata’sı |
| `figma_get_component_for_development` | Component metadata + base64 screenshot (tek çağrı) |
| `figma_get_component_image` | Sadece node screenshot’ı (base64) |
| `figma_get_console_logs` | Plugin console log’larını getir (limit parametresi) |
| `figma_get_design_context` | Belirli node veya dosya için yapı + metin (TEXT `characters`); get_design_context tarzı isteklerde **token tasarruflu**, Figma token/screenshot yok |
| `figma_get_design_system_summary` | Hızlı genel bakış (koleksiyonlar, bileşen sayıları); varsayılan currentPageOnly (büyük dosyada timeout önlemi) |
| `figma_get_file_data` | Dosya hiyerarşisi, sayfalar, katmanlar (depth / verbosity) |
| `figma_get_library_variables` | Team library variable'larını HEDEF dosyadan listele — import key + resolvedType + koleksiyon (library dosyası açık olmasa da çalışır) |
| `figma_get_prototype_connections` | Node altındaki veya tüm sayfadaki prototip reaction'larını oku (read-only audit; flowStartingPoints dahil) |
| `figma_get_rest_token_status` | Token durumu + rate limit bilgisi + düşük limit uyarısı |
| `figma_get_status` | Plugin bağlantısını kontrol et |
| `figma_get_styles` | Paint, Text, Effect stilleri |
| `figma_get_token_browser` | Değişken + stiller hiyerarşik tarama (Token Browser) |
| `figma_get_variables` | Tüm değişken koleksiyonları |
| `figma_import_style` | Team library stilini key ile hedef dosyaya import et (text/paint/effect) |
| `figma_instantiate_component` | Yeni bileşen örneği oluştur |
| `figma_list_connected_files` | Bridge’e bağlı Figma/FigJam dosyalarının listesi (`fileKey` yönlendirmesi için) |
| `figma_plugin_diagnostics` | Plugin sağlık kontrolü (uptime, bellek, bağlantı durumu, port) |
| `figma_refresh_variables` | Değişkenleri yenile |
| `figma_rename_mode` | Modu yeniden adlandır |
| `figma_rename_variable` | Değişkeni yeniden adlandır |
| `figma_rest_api` | Direkt REST API çağrısı (export, comments, versions). Otomatik cevap kırpma (200KB üstü), 429 retry |
| `figma_scan_ds_compliance` | Ekranı DS uyumu açısından tara — hardcoded değer örnekleri + primitive-token fallback listesi (read-only) |
| `figma_search_assets` | Takım kütüphanesi variable collection arama (plugin teamLibrary API) |
| `figma_search_components` | İsimle bileşen arama; varsayılan currentPageOnly (büyük dosyada timeout önlemi); çıktıda **`key`** (`componentKey`) — `figma_instantiate_component` ile uyum |
| `figma_set_description` | Component/set/style node’a description (markdown destekli) |
| `figma_set_flow_starting_point` | Sayfada prototip flow başlangıç noktası tanımla (isim + node) |
| `figma_set_instance_properties` | Instance özelliklerini değiştir (TEXT, BOOLEAN, VARIANT) |
| `figma_set_port` | Runtime’da WebSocket bridge portunu değiştir (5454–5470). Port meşgulse farklı porta geç |
| `figma_set_rest_token` | Figma REST API token girişi (figd_...). Token doğrulama + bellekte saklama |
| `figma_set_scroll_behavior` | Node'un prototip scroll davranışını ayarla (overflow yönü + sticky header/footer) |
| `figma_setup_design_tokens` | Atomik: koleksiyon + modlar + variable’lar (rollback destekli) |
| `figma_update_variable` | Değişken değerini güncelle |
| `figma_use` | Yüksek seviyeli orchestrator: component + token + design_context bundle — v1.9.8+ |
| `figma_validate_screen` | Ekranın DS disiplin skorunu hesapla (0-100): instance/token-binding/auto-layout coverage + ihlal listesi (read-only) |
| `figma_watch_console` | Yeni console log’ları timeout’a kadar stream et |

**Toplam: 48 araç.** (Plugin-only `registerTool` ile uyumlu.)
Claude’un gördüğü liste bu sayıdan azsa, [TROUBLESHOOTING.md](TROUBLESHOOTING.md) içindeki “Yeni araçlar entegre değil” bölümüne bakın.

**Design context / token tasarrufu:** Kullanıcı "bu frame'deki metin", "node 45:4602 için context" veya Figma'nın `get_design_context` benzeri bir istekte bulunursa, **`figma_get_design_context`** (veya `figma_get_file_data` ile `verbosity: standard`/`full`) kullanın. Yapı + metin **Figma token tüketmeden** ve **düşük context token** ile alınır; screenshot dahil edilmez.

**Detaylı kullanım (parametreler, örnekler):** [TOOLS.md](TOOLS.md)
