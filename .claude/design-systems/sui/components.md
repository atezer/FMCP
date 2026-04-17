# SUI Component Reference (Public Template)

> Bu dosya **public template**'dir. Gerçek `componentKey` değerleri **burada tutulmaz**.
> Kullanıcıya özel cache: `~/.claude/data/fcm-ds/<file-key>/components.md`
> İlk kurulumda `/ds-sync sui components` veya "SUI component cache'ini doldur" komutu çalıştırılır.

---

## Resolve Stratejisi (Key-less)

`fmcp-screen-recipes` Adım 6 önce **user-local cache**'e bakar. Yoksa runtime discovery:

```js
// 1. Current file instance'larından mainComponent.key topla
const instances = figma.currentPage.findAllWithCriteria({ types: ['INSTANCE'] });
const seen = new Map();
for (const inst of instances) {
  const main = await inst.getMainComponentAsync();
  const parent = main?.parent;
  const isSet = parent?.type === 'COMPONENT_SET';
  const key = isSet ? parent.key : main.key;
  const name = isSet ? parent.name : main.name;
  if (!seen.has(key)) seen.set(key, { key, name, propDefs: (isSet ? parent : main).componentPropertyDefinitions });
}
// 2. İsim patern'i ile bul (örn. NavigationTopBar)
const match = Array.from(seen.values()).find(c => c.name === "NavigationTopBar");
// 3. Import et ve instance oluştur
const main = await figma.importComponentByKeyAsync(match.key);
const inst = main.createInstance();
```

**Niye key tutmuyoruz:** Component rename/silme → key invalid; Figma library içerikleri IP olduğu için repo'ya girmemeli.

---

## Component İsim Patternleri (Public)

SUI'de en sık karşılaşılan component **isimleri** (Figma'daki generic adlandırma — IP değil, kullanım rehberi):

### Navigation & Structure
- `NavigationTopBar` — ekranın üst bar'ı (edge-to-edge)
- `.AppBar Item` — top bar içindeki icon button slot
- `iOS & Android Status Bars` — status bar (edge-to-edge, en üst)
- `iOS Bars / Home Indicator / iPhone / Light - Portrait` — home indicator (edge-to-edge, en alt)
- `Sahibinden Appbar` — (kardeş ürün, SUI ekranda kullanma)

### Buttons & Actions
- `Button` — primary action (en sık kullanılan component)
- `CTA / Action Icon Buttons` — horizontal 3-slot quick action row (dashboard için ideal)

### Layout Helpers
- `Divider_H` — yatay ayırıcı (FILL horizontal)
- `Divider_V` — dikey ayırıcı (FILL vertical)

### Content
- `Label` — list item / row (label + value + desc + trailing)
- `Badge` — status/count chip
- `.line / point` — pagination dot / carousel indicator
- `.label-atom / bottom` — chart x-axis label

### Eksik (İlk kullanımda keşfedilecek)

Aşağıdaki component'ler SUI library'de olabilir ama playground tüketici dosyada instance yok. İlk ihtiyaçta `figma_search_assets(query=...)` ile keşfet.

| Component | Keyword | Primitive fallback |
|-----------|---------|-------------------|
| Card | `["card", "surface"]` | Frame + radius-100 + surface bind |
| ListItem | `["list item", "row"]` | `Label` component yerine geçer |
| TextField | `["text field", "input"]` | Frame + `Component/input/background` bind |
| SearchBar | `["search bar"]` | Frame + `Component/search input/background` bind |
| Chip | `["chip", "filter chip"]` | Frame + radius-full + `Component/tile/background` |
| BottomNavBar | `["bottom nav", "tab bar"]` | 5× auto-layout row + icon + caption |
| Avatar | `["avatar", "profile picture"]` | Circle + `Component/image/background` |
| FAB | `["fab", "floating button"]` | Button + radius-full |
| Snackbar | `["snackbar", "toast"]` | Frame + `Component/inline message/background` |
| Banner | `["banner", "alert"]` | Frame + surface + icon |
| Toggle / Switch | `["toggle", "switch"]` | — (keşfet) |
| ProgressBar | `["progress"]` | Frame + inner fill frame |
| Tab (sekme) | `["tab"]` | Tab bg tokens mevcut |
| TabBar | `["tab bar", "tabs"]` | Horizontal row + Tab × N |
| Stepper | `["stepper", "step"]` | `.line / point` veya numbered circle |

### Icon Component Patterns

Icon'lar `⮑ Change` property swap'ları ile kullanılır (Button, Badge, NavigationTopBar slot'larında). Yaygın isimler:

`chevron_right`, `chevron_left`, `arrow_diagonal_up_right`, `arrow_left`, `dots_vertical`, `close`, `search`, `notification_default`, `user_circle`, `info`, `eye`, `plus_circle`, `star`, `bank-note-02`, `qr-code-01`, `menu_vitrin`, `menu_ilan_ver`, `menu_servis_360`

---

## Property Naming Pattern

SUI component property ID'leri şu formatı takip eder (Figma standart):

```
<PropName>#<numericId>:<variantId>
```

Örnek (Button):
- `Value#44:2` — button label text
- `Icon (L)#44:1` — left icon boolean
- `⮑ Change (L)#44:4` — left icon instance swap
- `Type`, `Style`, `State`, `Size`, `Disabled` — variants

`setProperties` çağrısında **tam ID string'ini** kullan:
```js
inst.setProperties({ "Value#44:2": "Giriş Yap" });
```

Property ID'ler key gibi değil — `main.componentPropertyDefinitions` ile runtime'da listelenebilir. **En güvenli:** instance oluşturduktan sonra `Object.keys(inst.componentProperties)` ile doğrulama.

---

## Edge-to-edge Routing

Parent seçimi:
```js
const edgeNames = /^(navigation|nav|top|bottom|status|tabbar|tab_bar|iOS |Android)/i;
const parentId = edgeNames.test(spec.name) ? frameId : contentBodyId;
```

- **Ana Frame'e (edge-to-edge)**: `NavigationTopBar`, `iOS & Android Status Bars`, `iOS Bars / Home Indicator`, `BottomNavBar`
- **Content Body'ye (padding'li)**: `Button`, `Label`, `Divider_H`, `Badge`, `CTA / Action Icon Buttons`, diğer her şey

---

## Kullanım

Adım 6 bu akışı takip eder:

1. **User-local cache var mı?** → `~/.claude/data/fcm-ds/<file-key>/components.md` oku
2. Cache varsa ve <7 gün → direkt `importComponentByKeyAsync(key)`
3. Yoksa → runtime discovery (yukarıdaki "Resolve Stratejisi")
4. Eksik component → `figma_search_assets(query=<keyword>)` fallback
5. Başarılı resolve → **user-local cache**'i güncelle (bu dosyayı DEĞİL)

**Kritik:** Bu dosyaya componentKey yazma. Key'ler `<file-key>/components.md` user-local cache'tedir ve `.gitignore`'dadır.

İlk kurulum: `/ds-sync sui` veya "SUI cache'i oluştur".
