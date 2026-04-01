# figma_use Structured Intent Spec

Bu dokuman, NL-only router yerine yapilandirilmis intent + alt-tool dispatch modelini tanimlar.

**Durum (2026-04):** Bu belge **taslak / planli** bir sozlesmedir. `dist/local-plugin-only.js` icinde **`figma_use` MCP araci kayitli degildir**; ayni ihtiyaclar icin dogrudan **`figma_execute`** ve diger `figma_*` araclari kullanilir. Gelecekte `figma_use` eklendiginde bu sema uygulanabilir.

## Neden?

- Salt dogal dil parser'i tutarsiz sonuc uretebilir.
- Ajanlar arasi tekrar edilebilirlik icin sabit bir sozlesme gerekir.
- Self-healing loop'ta adimlarin izlenebilir olmasi gerekir.

## Tool kontrati (onerilen)

```json
{
  "name": "figma_use",
  "description": "Structured dispatcher for Figma canvas operations",
  "inputSchema": {
    "intent": {
      "type": "string",
      "enum": [
        "search_assets",
        "instantiate_component",
        "create_node",
        "update_node",
        "token_sync",
        "validate_screenshot",
        "handoff_export"
      ]
    },
    "params": {
      "type": "object"
    },
    "context": {
      "type": "object",
      "properties": {
        "fileKey": { "type": "string" },
        "nodeId": { "type": "string" },
        "platform": { "type": "string", "enum": ["web", "ios", "android"] }
      }
    },
    "dryRun": { "type": "boolean", "default": false }
  }
}
```

## Intent -> Alt-tool haritasi

- `search_assets` -> `figma_search_components`, `figma_get_component_details`, `figma_get_token_values`
- `instantiate_component` -> `figma_instantiate_component`, opsiyonel `figma_set_instance_properties`
- `create_node` -> `figma_create_child`, `figma_set_text`, `figma_set_fills`, `figma_move_node`, `figma_resize_node`
- `update_node` -> `figma_set_text`, `figma_rename_node`, `figma_set_strokes`, `figma_set_fills`
- `token_sync` -> `figma_get_variables`, `figma_update_variable` / `figma_create_variable`
- `validate_screenshot` -> `figma_capture_screenshot` veya `figma_take_screenshot`
- `handoff_export` -> `figma_get_design_context` + `HANDOFF_TEMPLATE.md` doldurma

## Calisma kurallari

1. Her write islemi oncesi en az bir read adimi kos.
2. Design system reuse varsayilan davranis olsun.
3. Her write grubundan sonra screenshot tabanli dogrulama calissin.
4. Maksimum 3 self-healing iterasyonundan sonra islemi `manual_review_needed=true` ile sonlandir.

## Ornek cagrilar

### 1) Component reuse

```json
{
  "intent": "search_assets",
  "params": { "query": "button primary", "limit": 10 },
  "context": { "platform": "web" },
  "dryRun": true
}
```

### 2) Instantiate + validate

```json
{
  "intent": "instantiate_component",
  "params": {
    "componentKey": "12345:abcd",
    "variant": { "State": "Default", "Size": "M" },
    "position": { "x": 120, "y": 240 }
  },
  "context": { "fileKey": "abc123", "platform": "web" }
}
```

### 3) Handoff export

```json
{
  "intent": "handoff_export",
  "params": {
    "nodeIds": ["12:34"],
    "output": "markdown"
  },
  "context": { "fileKey": "abc123", "platform": "ios" }
}
```
