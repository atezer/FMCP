# F-MCP Bridge ↔ Resmi Figma MCP Araç Eşleme Tablosu

> Yeni skill yazarken veya topluluk skill'lerini uyarlarken bu tabloyu referans alın.
> Kaynak doğrulama: `npm run validate:fmcp-skills`

## Tuval Yazma ve Çalıştırma

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| `use_figma` | `figma_execute` | Aynı amaç: JS çalıştırma. F-MCP'de `code` parametresi ile Plugin API kodu gönderilir. Topluluk skill'lerinde `skillNames` parametresi var; F-MCP'de yok. |
| — | `figma_instantiate_component` | Resmi MCP'de yok; F-MCP'ye özel bileşen instance oluşturma aracı. |
| — | `figma_set_instance_properties` | Resmi MCP'de yok; F-MCP'ye özel instance property ayarlama. |
| — | `figma_arrange_component_set` | F-MCP'ye özel; variant grid düzenleme. |

## Dosya ve Yapı Okuma

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| `get_metadata` | `figma_get_file_data` | Yapı ve metadata. F-MCP'de `depth` parametresi ile derinlik sınırlanır. |
| `get_design_context` | `figma_get_design_context` | Aynı ad, benzer çıktı. F-MCP'de `includeCodeReady` parametresi mevcut. |
| — | `figma_get_file_for_plugin` | Yalnızca F-MCP; plugin bağlamında dosya verisi. |

## Görsel Doğrulama

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| `get_screenshot` | `figma_capture_screenshot` | Node bazlı ekran görüntüsü. |
| — | `figma_take_screenshot` | Tarayıcı tabanlı tam ekran görüntüsü (CDP modunda). |

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
| — | `figma_get_token_values` | Doğrudan token değerleri (local.ts). |
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
| — | `figma_get_component_details` | Detaylı bileşen metadata (local.ts). |

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
| — | `figma_reconnect` | Yeniden bağlanma. |
| — | `figma_navigate` | Sayfa/node gezinme. |
| — | `figma_list_connected_files` | Bağlı dosya listesi. |

## Konsol ve Hata Ayıklama

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| — | `figma_get_console_logs` | Konsol çıktıları. |
| — | `figma_watch_console` | Canlı konsol izleme. |
| — | `figma_clear_console` | Konsol temizleme. |
| — | `figma_reload_plugin` | Plugin yeniden yükleme. |

## Doğrudan Node Düzenleme (yalnızca local.ts)

| Araç | Açıklama |
|---|---|
| `figma_resize_node` | Boyutlandırma |
| `figma_move_node` | Konum değiştirme |
| `figma_set_fills` | Dolgu ayarlama |
| `figma_set_strokes` | Çizgi ayarlama |
| `figma_clone_node` | Klonlama |
| `figma_delete_node` | Silme |
| `figma_rename_node` | Yeniden adlandırma |
| `figma_set_text` | Metin ayarlama |
| `figma_create_child` | Alt node oluşturma |
| `figma_set_description` | Açıklama ayarlama |
| `figma_add_component_property` | Bileşen özelliği ekleme |
| `figma_edit_component_property` | Bileşen özelliği düzenleme |
| `figma_delete_component_property` | Bileşen özelliği silme |

## Tasarım–Kod Parity

| Resmi Figma MCP | F-MCP Bridge | Fark / Not |
|---|---|---|
| — | `figma_check_design_parity` | Tasarım–kod uyum kontrolü (plugin-only). |
