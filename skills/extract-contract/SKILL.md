---
name: extract-contract
description: Seçili Component Set'i analiz edip design contract JSON spec üretir — props, anatomy, token bindings, variant overrides, resolved tokens, a11y kontrast ve base specs dahil. "contract çıkar", "JSON spec üret", "contract extract", "bileşen speci", "design contract", "component spec çıkar" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - uidev
    - designops
    - designer
---

# Contract Extractor

Seçili bir Component Set'i (veya içindeki bir variant'ı / instance'ını) analiz ederek tam bir **design contract JSON spec** üret. Contract; props, anatomy (token bindings), variant overrides, resolved tokens (mode bazlı alias chain), base specs ve WCAG kontrast denetimini tek dosyada toplar — design-to-code handoff'un ve bileşen codegen'inin tek doğruluk kaynağıdır.

## Tetikleme

Kullanıcı bir Component Set (veya içindeki bir variant) seçtiğinde ya da nodeId/URL verdiğinde ve şu ifadeleri kullandığında: "contract çıkar", "JSON spec üret", "contract extract", "bileşen speci", "design contract", "component spec".

## Birincil Yol — `figma_extract_contract` (tek çağrı)

v1.9.14+ sunucuda bu iş tek araca indirgendi:

```
figma_extract_contract({ nodeId?: "12:345", figmaUrl?, fileKey?, importPathTemplate? })
```

- `nodeId` verilmezse **aktif Figma seçimi** kullanılır. COMPONENT_SET, COMPONENT veya INSTANCE kabul edilir (variant/instance otomatik set'e çözülür).
- Araç 3 aşamalı okur: **structure** (props + default variant ağacı) → **overrides** (her variant değerinin default'a karşı token diff'i) → **tokens** (tüm mode'larda alias-chain çözümü). Birleştirme sunucu tarafında yapılır.
- Dönüş: `{ success, contract, report }`.
  - `contract` — aşağıdaki şemada tam spec (`status: "draft"`).
  - `report` — prop sayısı, çözülen token sayısı, a11y fail sayısı, orphan prop listesi, önerilen dosya adı.
- `importPathTemplate` ile `anchors.code.importPath` şablonu değiştirilebilir (default `@ds/components/{Name}`).

### Araç çıktısında otomatik olan davranışlar

- **Boolean-like variant:** Seçenekleri tam olarak True/False olan VARIANT prop'ları `boolean` tipine ve `is` prefix'li camelCase ada çevrilir (`Selected` → `isSelected`).
- **State detection:** "State" / "Durum" / "Interaction" adlı variant prop değerleri `states` dizisine normalize edilir (`pressed`→`active`, `focus`→`focus-visible`).
- **Semantic naming:** Generic adlar (Frame 1, Group 2) bağlama göre anlamlı ada çevrilir (label, divider, content); instance'lar main component set adının kebab-case halini alır; çakışmalar `-2` soneki alır.
- **A11y kontrast:** Her stil varyantı için root background × text foreground token çifti tüm renk mode'larında (Light/Dark vb.) WCAG 2.1 oranıyla hesaplanır. Alpha'lı renkler **alpha-blend edilir** (opak varsayımı yapılmaz — 8 haneli hex'lerde oran bu yüzden daha düşük/doğru çıkabilir). Şeffaf zeminli stiller (ghost/clear) çift üretmez.
- **Orphan tespiti:** Default variant ağacında hiçbir katmanın referans vermediği BOOLEAN/TEXT/INSTANCE_SWAP prop'ları rapora yazılır.

### Sonuç sunumu

1. `report.suggestedFileName` ile dosya adını bildir: `{kebab-name}-spec.json`.
2. Kısa rapor sun: kaç prop, kaç resolved token, a11y fail sayısı, orphan uyarıları.
3. "Status: draft — anchors.code needs manual verification" notunu ilet.
4. Kullanıcı isterse contract'ı dosyaya kaydet (Write) veya `figma_execute` ile seçili bileşenin `pluginData`'sına yaz.

## Contract Şeması (özet)

```json
{
  "id": "ds.badge",
  "name": "Badge",
  "version": "0.1.0",
  "status": "draft",
  "semantics": { "element": "div" },
  "props": [ { "name", "type", "default", "bindings": { "figma", "code" } } ],
  "anatomy": { "layout", "tokens": { "gap": "{Spacing.sm}" }, "parts" },
  "resolvedTokens": { "Color.badge.primary.background": { "type", "collection", "values", "aliasChain" } },
  "baseSpecs": { "root", "children" },
  "a11y": { "contrastPairs": [ { "foreground", "background", "ratios", "wcagAA", "wcagAAA" } ] },
  "anchors": { "figma": { "fileKey", "componentSetKey", "nodeId" }, "code": { "importPath", "export" } },
  "variantOverrides": { "styleOverrides": { "primary": { "root": { "tokens" }, "children": { "tokens" } } } }
}
```

Token referans formatı: `{Collection.Path.Name}` (variable adındaki `/` → `.`). Default'tan kaldırılan değerler `"(none)"`.

## Fallback Yolu — `figma_extract_contract` yoksa

Eski sunucu sürümlerinde aynı çıktıyı 3 ayrı `figma_execute` çağrısıyla üret (tek seferde çok büyük olur — böl):

1. **props + anatomy:** `componentPropertyDefinitions` + default variant traverse (boundVariables → CSS eşleme).
2. **resolvedTokens + variantOverrides:** variable alias zinciri (visited set ile döngü koruması) + her variant prop değerinin default'la diff'i.
3. **a11y + baseSpecs:** WCAG relative luminance (`0.2126R + 0.7152G + 0.0722B`, linearize edilmiş) ve ham ölçüler.

## Hata Yönetimi

| Hata | Anlamı | Çözüm |
|---|---|---|
| `NO_SELECTION` | Figma'da seçim yok ve nodeId verilmedi | Kullanıcıdan Component Set seçmesini iste veya nodeId/URL al |
| `NOT_COMPONENT:<type>` | Seçili node set'e çözülemedi (ör. FRAME) | COMPONENT_SET / COMPONENT / INSTANCE seçilmeli |
| `NODE_NOT_FOUND` | nodeId bu dosyada yok | `figma_get_file_data` ile doğru id'yi bul; `fileKey`/`figmaUrl` routing'ini kontrol et |
| `CONNECTION` / plugin not connected | F-MCP Bridge plugin kapalı | Figma → Plugins → F-MCP ATezer Bridge açtır, "Bridge active" bekle |
| TIMEOUT (çok büyük set) | 30 sn'de aşama bitmedi | Variant sayısı çok yüksekse nodeId ile tek COMPONENT hedefle; sonucu birleştir |
| `{unresolved:VariableID:...}` token referansı | Variable silinmiş/erişilemez | Rapordaki id'yi kullanıcıya bildir; kütüphane bağlantısını kontrol et |

## Notlar

- Bu araç **salt okunurdur** — tuvale hiçbir şey yazmaz. Kaydetme işlemleri (dosya, pluginData, canvas text node) ayrı ve onaylı adımlardır.
- DS-agnostic: koleksiyon/font/tema adı varsaymaz; ne bağlıysa onu raporlar.
- Çok büyük setlerde token çözümü ilk 150 variable ile sınırlanır; `report.notes` bunu belirtir.
- Contract'ı `implement-design`, `code-design-mapper` veya `component-documentation` skill'lerine girdi olarak verebilirsin.
