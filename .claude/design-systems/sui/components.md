# SUI Component Cache

> Auto-populated by fmcp-screen-recipes Adım 6.
> Son güncelleme: —

## Bilinen Component Key'leri

| Component | componentKey | setProperties (bilinen override'lar) |
|-----------|-------------|--------------------------------------|
| NavigationTopBar | `<key>` | Title Text, Right Controls, Subtitle, Product |
| Button | `<key>` | Value, Size, State, Type |
| Divider_H | `<key>` | — |
| TextField | `<key>` | Label, Placeholder, State |
| Card | `<key>` | — |
| Avatar | `<key>` | Size |
| ListItem | `<key>` | Title, Subtitle, Leading, Trailing |
| SearchBar | `<key>` | Placeholder |
| Chip | `<key>` | Label, Selected |
| BottomNavBar | `<key>` | — |

## Kullanım

Recipes Adım 6 önce bu dosyayı okur:
1. Cache varsa ve `Son güncelleme` < 7 gün → `importComponentByKeyAsync(key)` ile direkt kullan
2. Cache yoksa veya eskiyse → `figma_search_assets` + `figma_search_components` ile keşfet, sonra cache'i güncelle

## Cache Güncelleme

Başarılı bir component discovery sonrasında Claude bu dosyayı otomatik günceller:
- `<key>` yerine gerçek componentKey yazılır
- `Son güncelleme` tarihi set edilir
