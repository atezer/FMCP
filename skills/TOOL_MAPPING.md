# F-MCP Bridge ↔ Resmi Figma MCP Araç Eşleme Tablosu

> Yeni skill yazarken veya topluluk skill'lerini uyarlarken bu tabloyu referans alın.
> Kaynak doğrulama: `npm run validate:fmcp-skills`

## Tuval Yazma ve Çalıştırma

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| `use_figma` | `figma_execute` | Aynı amaç: JS çalıştırma. F-MCP'de `code` parametresi ile Plugin API kodu gönderilir. |
| — | `figma_instantiate_component` | Resmi MCP'de yok; F-MCP'ye özel bileşen instance oluşturma aracı. |
| — | `figma_set_instance_properties` | Resmi MCP'de yok; F-MCP'ye özel instance property ayarlama. |
| — | `figma_arrange_component_set` | F-MCP'ye özel; variant grid düzenleme. |

## Dosya ve Yapı Okuma

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| `get_metadata` | `figma_get_file_data` | Yapı ve metadata. F-MCP'de `depth` parametresi ile derinlik sınırlanır. |
| `get_design_context` | `figma_get_design_context` | Aynı ad, benzer çıktı. F-MCP'de `includeCodeReady` parametresi mevcut. |

## Görsel Doğrulama

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| `get_screenshot` | `figma_capture_screenshot` | Node bazlı ekran görüntüsü. |

## Tasarım Sistemi Keşfi

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| `search_design_system` | `figma_search_components` + `figma_get_design_system_summary` | İki araç birlikte aynı kapsamı karşılar. `figma_search_components` bileşen arar; `figma_get_design_system_summary` genel DS özeti döner. |

## Değişkenler ve Token'lar

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| (use_figma ile) | `figma_get_variables` | Verbosity: `summary` / `full`. |
| — | `figma_refresh_variables` | Önbellek temizleme. |
| — | `figma_get_token_browser` | Token tarayıcı; kategoriye göre filtreleme. |
| — | `figma_create_variable` | Tekil variable oluşturma. |
| — | `figma_create_variable_collection` | Collection oluşturma. |
| — | `figma_batch_create_variables` | Toplu variable oluşturma. |
| — | `figma_batch_update_variables` | Toplu variable güncelleme. |
| — | `figma_update_variable` | Tekil güncelleme. |
| — | `figma_delete_variable` / `figma_delete_variable_collection` | Silme. |
| — | `figma_rename_variable` / `figma_rename_mode` / `figma_add_mode` | İsimlendirme ve mod yönetimi. |
| — | `figma_setup_design_tokens` | Toplu token kurulum aracı. |

## Stiller

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| (use_figma ile) | `figma_get_styles` | Paint, text, effect stilleri. |

## Bileşenler

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| — | `figma_get_component` | Tekil bileşen detayı. |
| — | `figma_get_component_image` | Bileşen SVG/PNG export. |
| — | `figma_get_component_for_development` | Geliştirici odaklı bileşen bilgisi. |

## Code Connect

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| `get_code_connect_suggestions` | **yok** | Bridge'de kayıtlı değil. FUTURE.md'de planlı. |
| `send_code_connect_mappings` | **yok** | Bridge'de kayıtlı değil. |

## Dosya Yönetimi

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| `create_new_file` | **yok** | Bridge'de kayıtlı değil. |
| `whoami` | **yok** | Bridge'de kayıtlı değil. |
| `generate_figma_design` | **yok** | Web-only paralel piksel referansı; bridge'de yok. |
| `create_design_system_rules` | **yok** | F-MCP'de `design-system-rules` skill'i AI tabanlı üretim yapar. |

## Bağlantı ve Durum

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| — | `figma_get_status` | Plugin bağlantı durumu. |
| — | `figma_list_connected_files` | Bağlı dosya listesi. |
| — | `figma_clear_console` | Konsol temizleme. |

## Doğrudan Node Düzenleme

> Node düzenleme işlemleri `figma_execute` ile Plugin API kodu çalıştırılarak yapılır.
> Ayrıca `figma_create_frame`, `figma_create_rectangle`, `figma_create_text`, `figma_create_group` özel araçları mevcuttur.

## Tasarım–Kod Parity

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| — | `figma_check_design_parity` | Tasarım–kod uyum kontrolü (plugin-only). |

## REST API ve Tanılama

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| — | `figma_rest_api` | Doğrudan Figma REST API çağrısı (token gerekir). |
| — | `figma_set_rest_token` / `figma_get_rest_token_status` / `figma_clear_rest_token` | REST token yönetimi. |
| — | `figma_set_port` | Bridge port değiştirme (5454-5470). |
| — | `figma_plugin_diagnostics` | Plugin bağlantı tanılama. |
| — | `figma_search_assets` | Kütüphane bileşen arama. |
| — | `figma_export_nodes` | Node export (SVG/PNG/JPG/PDF). |
| — | `figma_set_description` | Node açıklama ayarlama. |
| — | `figma_watch_console` | Konsol izleme. |
| — | `figma_get_console_logs` | Konsol çıktıları. |
