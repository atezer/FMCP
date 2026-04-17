# SUI Token Reference (Public Template)

> Bu dosya **public template**'dir. Gerçek `variableKey` / `collId` değerleri **burada tutulmaz**.
> Kullanıcıya özel cache: `~/.claude/data/fcm-ds/<file-key>/tokens.md`
> İlk kurulumda `/ds-sync sui tokens` veya "SUI token cache'ini doldur" komutu çalıştırılır.

---

## Resolve Stratejisi (Key-less)

`fmcp-screen-recipes` Adım 1.5 önce **user-local cache**'e bakar (`~/.claude/data/fcm-ds/<file-key>/tokens.md`). Orada key yoksa veya cache eskiyse **isim-bazlı runtime resolve** yapar:

```js
// 1. Library variables listele (teamLibrary API — REST token gerekmez)
const vars = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collKey);
// 2. İsim patern'i ile bul (endsWith — SUI nested path formatına uyar)
const v = vars.find(x => x.name.endsWith("/" + suffix) || x.name === suffix);
// 3. Import et ve bind et (key cache'e yazılmaz, runtime'da resolve edilir)
const imported = await figma.variables.importVariableByKeyAsync(v.key);
node.setBoundVariable("paddingLeft", imported);
```

**Niye key tutmuyoruz:** (1) SUI'de variable rename → key değişir, cache invalid olur; (2) Figma library paylaşımı = IP; key'ler dağıtıma girmemeli.

---

## Collection Patterns (Public)

Bu isimler SUI'nin Figma'daki **collection adları**. Key'leri runtime'da `teamLibrary.getAvailableLibraryVariableCollectionsAsync` ile resolve et.

| Collection Name | İçerik | Mode Naming Pattern |
|-----------------|--------|---------------------|
| `Semantic Colors (S Theme)` | Surface, component backgrounds, text colors | `Light`, `Dark` |
| `Semantic Sizes (Web/Mobil)` | Spacing, radius, sizing | `Mobil & Web Mobil`, `Tablet`, `Web (Desktop)` |
| `Primitive Colors` | Raw color palette (alpha-black, brand hues) | `Light` |

**Keyword match** (case-insensitive `includes`):
- Colors coll → `["semantic color", "s theme"]`
- Sizes coll → `["semantic size", "semantic sizes", "size"]`

---

## Spacing Token Roles (Pattern)

Token **isimleri** (generic Figma naming convention — public-safe):

| Role | Name pattern | Tipik kullanım |
|------|-------------|----------------|
| tightest | `Spacing/spacing-050` | chip internal padding |
| tight | `Spacing/spacing-075` | card internal gap |
| default | `Spacing/spacing-100` | card padding, section padding |
| loose | `Spacing/spacing-150` | section gap |
| loosest | `Spacing/spacing-200` | large section spacing |

Tam set: `spacing-none` → `spacing-2000` (0'dan 2000 px'e değin granül).

## Radius Token Roles

| Role | Name pattern |
|------|-------------|
| none | `Radius/radius-none` |
| tight | `Radius/radius-010` · `Radius/radius-025` |
| default | `Radius/radius-050` |
| loose | `Radius/radius-100` |
| pill | `Radius/radius-full` |

## Surface Tokens

`frame.fills` için variable-bound surface. En sık kullanılan:

- `Surface/background level-0` — ana sayfa bg (default)
- `Surface/background level-1` — elevated card bg
- `Surface/background level-2`, `level-3` — daha yüksek elevation

## Component-Level Backgrounds (Name Pattern)

Primitive fallback senaryosunda component'i imitate etmek için isim paternleri:

- `Component/button/{primary|secondary|warning|success|error}/{default|hover|pressed|disabled}/background`
- `Component/input/background`, `Component/input/active background`, `Component/input/disabled-background`
- `Component/search input/background`
- `Component/tile/background`, `Component/tile/active background`
- `Component/badge/{primary|secondary|default|custom}/background`
- `Component/image/background`
- `Component/tab/{index|solid} tab/{selected|unselected|disabled}-background`
- `Component/inline message/background`
- `Component/Mobil/nav top bar/{main|s-pro|old-main}-background`
- `State/disabled/background`

## Typography (Text Styles)

SUI'de tipografi Figma **text style** olarak tanımlı (variable değil). Role map:

| Role | Keyword patterns |
|------|------------------|
| display | `display`, `hero`, `amount`, `title-xl` |
| title | `section-title`, `title`, `heading` |
| subtitle | `subtitle`, `body-semibold`, `body-bold` |
| body | `body-medium`, `body-regular`, `body` |
| caption | `small`, `caption`, `footnote` |
| button | `button` |

**Bind:** `await textNode.setTextStyleIdAsync(roleMap.title.id)` — `importStyleByKeyAsync` veya `fontSize` set ETME (Rule 23).

---

## Kullanım

Adım 1.5 bu akışı takip eder:

1. **User-local cache var mı?** → `~/.claude/data/fcm-ds/<file-key>/tokens.md` oku
2. Cache varsa ve <7 gün → direkt `importVariableByKeyAsync(key)` kullan
3. Yoksa → runtime resolve (yukarıdaki "Resolve Stratejisi")
4. Sync tamamlanırsa → **user-local cache'i** güncelle (bu dosyayı DEĞİL)

**Kritik:** Bu dosyaya key yazma. `<file-key>/tokens.md` user-local cache'tir ve `.gitignore`'dadır.

İlk kurulum için: `/ds-sync sui` veya "SUI cache'i oluştur" komutu.
