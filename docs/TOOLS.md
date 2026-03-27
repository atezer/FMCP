# FMCP araç envanteri (tek doğruluk kaynağı)

Kaynak: `f-mcp-bridge/dist/local.js`, `f-mcp-bridge/dist/local-plugin-only.js`, `f-mcp-bridge/dist/core/figma-tools.js` içindeki `registerTool("figma_*")` çağrıları. Sürüm değişince bu dosya güncellenmeli.

## Giriş modları

| Mod | Dosya | Özet |
|-----|--------|------|
| **Tam (local)** | `dist/local.js` | Tasarım sistemi önbelleği, tarayıcı/CDP tabanlı REST araçları (`figma-tools.js` ile birlikte), plugin bridge yazma araçları. `FIGMA_ACCESS_TOKEN` vb. gerekebilir. |
| **Plugin-only** | `dist/local-plugin-only.js` | REST token yok; veri WebSocket + plugin. Önerilen zero-trust akış. |
| **Hibrit** | `local.js` içinde `figma-tools` | Bulut REST + yerel ekran görüntüsü (`figma_capture_screenshot`) birlikte. |

## `local.js` — `figma_*` araçları

- `figma_get_console_logs`, `figma_take_screenshot`, `figma_watch_console`, `figma_reload_plugin`, `figma_clear_console`
- `figma_navigate`, `figma_get_status`, `figma_reconnect`, `figma_execute`
- Değişkenler: `figma_update_variable`, `figma_create_variable`, `figma_create_variable_collection`, `figma_delete_variable`, `figma_delete_variable_collection`, `figma_rename_variable`, `figma_add_mode`, `figma_rename_mode`
- Tasarım sistemi önbelleği: `figma_get_design_system_summary`, `figma_search_components`, `figma_get_component_details`, `figma_get_token_values`
- Bileşen / node yazma: `figma_instantiate_component`, `figma_set_description`, `figma_add_component_property`, `figma_edit_component_property`, `figma_delete_component_property`
- Geometri / görünüm: `figma_resize_node`, `figma_move_node`, `figma_set_fills`, `figma_set_strokes`, `figma_clone_node`, `figma_delete_node`, `figma_rename_node`, `figma_set_text`, `figma_create_child`
- **Parite (Agent Canvas, plugin köprüsü):** `figma_search_assets`, `figma_get_code_connect`, `figma_use` — `local-plugin-only.js` ile aynı üç araç; `fileKey` / `figmaUrl` ile çoklu dosya yönlendirmesi için `getPluginBridgeConnector` kullanılır.

## `local-plugin-only.js` — `figma_*` araçları

- `figma_list_connected_files`, `figma_get_file_data`, `figma_get_design_context`
- `figma_get_variables`, `figma_get_component`, `figma_get_styles`, `figma_execute`, `figma_capture_screenshot`, `figma_set_instance_properties`
- Değişken CRUD / mod: `figma_update_variable` … `figma_rename_mode` (local.js ile aynı set)
- `figma_get_design_system_summary`, `figma_search_components`, `figma_instantiate_component`, `figma_refresh_variables`
- Konsol: `figma_get_console_logs`, `figma_watch_console`, `figma_clear_console`
- `figma_set_description`, `figma_get_component_image`, `figma_get_component_for_development`
- Toplu token: `figma_batch_create_variables`, `figma_batch_update_variables`, `figma_setup_design_tokens`, `figma_arrange_component_set`, `figma_check_design_parity`, `figma_get_token_browser`, `figma_get_status`
- **Parite (Agent Canvas):** `figma_search_assets`, `figma_get_code_connect`, `figma_use` (yapılandırılmış intent; bkz. [FIGMA_USE_STRUCTURED_INTENT.md](./FIGMA_USE_STRUCTURED_INTENT.md))

## `figma-tools.js` (REST / tarayıcı tarafı)

`figma_get_file_data`, `figma_get_variables`, `figma_get_component`, `figma_get_styles`, `figma_get_component_image`, `figma_get_component_for_development`, `figma_get_file_for_plugin`, `figma_capture_screenshot`, `figma_set_instance_properties`

## Şeffaf sınırlar

- **Tam katalog published library bileşenleri:** Plugin API, etkin kütüphanelerdeki değişken koleksiyonlarını `figma.teamLibrary` ile listeler; tüm published component envanteri için REST veya Code Connect CLI gibi ek kanallar gerekebilir. `figma_search_assets` bileşen tarafında dosyadaki yerel / içe aktarılabilir anahtarlar üzerinden arama yapar.
- **Code Connect dosya yolu eşlemesi:** Resmi Code Connect haritası çoğunlukla repodaki config ile yaşar. `figma_get_code_connect` node üzerindeki `documentationLinks`, açıklama ve component `key` ile **ipucu** döndürür; tam eşleme için Code Connect / REST kullanın.
