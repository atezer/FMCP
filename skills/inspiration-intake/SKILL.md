---
name: inspiration-intake
description: Image (kullanıcı tarafından sohbete yüklenmiş) veya Figma benchmark linkini "inspiration only" disiplinle structural niyete dönüştürür. DEĞER (renk hex, font adı, radius/spacing px) ASLA çıkarmaz — yalnızca layout yönü, hiyerarşi, bölüm sırası, spacing intent. Çıktı JSON olarak caller'a döner, caller bunu `generate-figma-screen`'in `reference_benchmark` parametresine structural_intent olarak iletir.
metadata:
  mcp-server: user-figma-mcp-bridge
  version: 1.8.3
  priority: 90
  phase: intake
  personas:
    - designer
    - uidev
required_inputs:
  - name: source_type
    type: "enum: image_uploaded | image_url | figma_node | figma_url"
    description: "Kaynak tipi. image_uploaded: kullanıcı sohbete görseli yüklemiş. image_url: internet URL'i. figma_node: Figma nodeId. figma_url: tam Figma linki."
  - name: source_ref
    type: string
    description: "image_uploaded için sohbete yüklenen görsel referansı (Claude zaten görüyor); image_url için URL; figma_node için nodeId (örn. '139:3407'); figma_url için tam Figma linki."
outputs:
  - name: structural_intent_json
    type: object
    schema: "{ layout_direction, sections[], hierarchy_notes, spacing_intent }"
---

# Inspiration Intake — Inspiration Only Structural Extraction

## Neden Var?

FCM'de ekran üretmek için kullanıcı üç farklı girdi türünden biriyle gelebilir:

1. **Fikir metni** ("sepet ekranı yap") — bu zaten `generate-figma-screen` tarafından işlenir
2. **Figma benchmark** ("şu linkteki ekrandan ilham al") — benchmark'ın **layout niyetini** almak ama **değerlerini** almamak gerekir
3. **İnternet görseli** (dribbble/behance link veya direkt yüklenmiş görsel) — aynı disiplin

Bu skill girdi 2 ve 3 için **intake katmanı** sağlar. Temel kural şudur: **benchmark/görsel ilham içindir, kopya için değildir.** Renkleri, fontları, spacing sayılarını benchmark'tan almak `generate-figma-screen` Step 5 ve `figma-canvas-ops` Rule 10 ile çatışır — tüm değerler yüklü DS'in token/style'larından gelmelidir.

v1.8.2 build-from-scratch kuralı ile tam uyumludur: benchmark'ı `figma_clone_screen_to_device` ile kopyalamak yerine, bu skill benchmark'tan yalnızca **structural intent** çıkarır ve `generate-figma-screen` build-from-scratch akışına besler.

## Çıktı Şeması

```json
{
  "layout_direction": "vertical|horizontal|grid",
  "sections": [
    {
      "role": "hero|nav|header|list|card|cta|form|footer|sidebar|detail|stats|...",
      "child_type_hints": ["image", "text_heading", "text_body", "button", "input", "avatar", "icon", "divider"]
    }
  ],
  "hierarchy_notes": "örn: headline → sub → CTA; avatar + name + action row; ...",
  "spacing_intent": "dense|airy|standard"
}
```

**Şemada olmayan HİÇBİR alan eklenmez.** Özellikle şu alanlar **YASAK**:
- `color`, `fill`, `background`, `text_color`, `#rgb`, `rgba(...)`
- `font_family`, `font_name`, `typeface`
- `font_size_px`, `padding_px`, `radius_px`, herhangi bir sayısal ölçü (px, pt, rem, em)

---

## Protokol (4 Adım)

### Adım 0 — Source Fetch (type'a göre)

#### `image_uploaded`
Kullanıcı sohbete görseli drag & drop veya Ctrl+V ile yüklemiştir. Claude zaten görseli context'inde görür. **Doğrudan Adım 1'e geç.**

#### `image_url`
1. **(a) URL fetch denemesi:**
   ```
   WebFetch(url, prompt="Describe the visible layout sections and hierarchy only — do not mention colors, fonts, or pixel sizes")
   ```
2. **(b) Fetch sonucu görsel içermez** (çoğu zaman WebFetch sadece text summary döner — bu beklenen sonuçtur):
   - **DUR ve kullanıcıya mesaj** (sohbete yaz):
     > "URL'den görsel indirme şu an desteklenmiyor. Lütfen görseli doğrudan sohbete yükle (drag & drop veya Ctrl+V), sonra devam ederim."
   - Skill **duraklatılır**. Kullanıcı görseli yüklediğinde `image_uploaded` moduna düş ve Adım 1'e geç.

#### `figma_node` / `figma_url`
1. `figma_url` verildiyse nodeId'yi parse et (URL'de `node-id=X-Y` → `X:Y`)
2. **Minimal read:**
   ```
   figma_get_design_context(
     nodeId=<parsed>,
     depth=1,
     verbosity="summary"
   )
   ```
3. Yalnızca **yapı** bilgisi (child tipleri, layout yönü, bölüm sayısı) okunur. Renk, font, padding değerleri **göz ardı edilir** — Adım 1 bunları çıktıya geçirmez.

### Adım 1 — Structural Extraction

Kaynaktan yalnızca şu alanları çıkar:

1. **`layout_direction`** — genel akış: üstten alta (vertical), soldan sağa (horizontal), grid
2. **`sections`** — ana bölümler listesi, her biri:
   - `role` — semantik etiket (hero, nav, list, card, cta, ...). Açıklayıcı olsun, "section_1" gibi jenerik YASAK.
   - `child_type_hints` — içindeki öğe tipleri (image, text_heading, text_body, button, input, avatar, icon, divider). Bunlar DS component kategori hint'idir, değer değil.
3. **`hierarchy_notes`** — kritik okuma sırası: "headline → sub → CTA" gibi kısa notasyon
4. **`spacing_intent`** — genel his: dense (sıkışık, bilgi yoğun), airy (nefes alan, premium), standard (dengeli). Bu **üç enum'dan biri**, sayı değil.

### Adım 2 — "Inspiration Only" Guard (Self-Check)

Çıktı üretildikten sonra kendi kendini denetler. Şu paternlerden herhangi biri çıktıda varsa çıktıyı **REJECT** et, Adım 1'e dön ve yeniden üret:

| Pattern | Regex (kavramsal) | Örnek YASAK |
|---|---|---|
| Hex kodu | `#[0-9a-fA-F]{3,8}` | `#0066cc`, `#fff` |
| RGB fonksiyonu | `rgb\(.*\)`, `rgba\(.*\)` | `rgb(255, 0, 0)` |
| HSL fonksiyonu | `hsl\(.*\)` | `hsl(210, 50%, 40%)` |
| Font family | Inter, Roboto, SF Pro, Helvetica, Arial, ... | `"font": "Inter"` |
| Numeric size | Sayı + px/pt/rem/em | `"padding": 16`, `"size": "24px"` |
| Color names (semantic sınıra yakın) | red, blue, green, ... | `"color": "blue"` — semantic rol olarak "primary" kabul ama "blue" YASAK |

Semantik kabul edilenler: `primary`, `secondary`, `hero`, `cta`, `dense`, `airy`, `standard`, `vertical`, `horizontal`, `grid`, `image`, `text_heading`, `text_body`, `button`, `input`, `avatar`, `icon`, `divider`, bölüm `role` değerleri.

### Adım 3 — Handoff

1. Validated JSON'u caller'a döndür (stdout veya sohbet output'u olarak)
2. Caller (tipik olarak `screen-builder`) bu JSON'u `generate-figma-screen`'in `required_inputs.reference_benchmark` alanına **structural_intent** olarak besler
3. `generate-figma-screen` kendi Step 2.5'te aesthetic direction'ı **brand profile** veya **active-ds**'ten çeker — inspiration-intake yalnızca layout niyeti sağlar
4. Kısa rapor yaz:
   ```
   📥 Inspiration Intake — <source_type>
   Kaynak: <source_ref kısaltılmış>
   Layout: <direction>
   Bölüm sayısı: <n>
   Spacing intent: <intent>
   Çıktı: generate-figma-screen reference_benchmark'ına iletildi
   ```

---

## Kullanım Örneği

### Örnek 1 — Yüklenmiş görsel

**Kullanıcı:** [sohbete bir mobil app screenshot yükler] "bu tarzda bir sepet ekranı yap"

**Caller (screen-builder):**
1. Mode tespit: `image_uploaded`
2. `Read("skills/inspiration-intake/SKILL.md")`
3. Skill workflow: Adım 0 → direkt Adım 1 → yapısal çıkarma:
   ```json
   {
     "layout_direction": "vertical",
     "sections": [
       { "role": "header", "child_type_hints": ["text_heading", "icon"] },
       { "role": "list", "child_type_hints": ["image", "text_heading", "text_body", "button"] },
       { "role": "cta", "child_type_hints": ["button"] }
     ],
     "hierarchy_notes": "header → scrollable list → bottom sticky CTA",
     "spacing_intent": "standard"
   }
   ```
4. Adım 2 guard: hex/font/px yok → PASS
5. Adım 3: JSON'u `generate-figma-screen`'e ilet

### Örnek 2 — Figma benchmark

**Kullanıcı:** "figma.com/file/abc/xyz?node-id=139-3407 bu ekrandan 3 alternatif üret"

**Caller (screen-builder):**
1. Mode tespit: `figma_url`
2. `Read("skills/inspiration-intake/SKILL.md")`
3. Skill workflow:
   - Adım 0: nodeId parse `139:3407`, `figma_get_design_context(nodeId="139:3407", depth=1, verbosity="summary")`
   - Adım 1: sections listesini çıkar (değer yok)
   - Adım 2: guard PASS
   - Adım 3: JSON döner
4. Caller 3 farklı varyasyon için `generate-figma-screen`'i 3 kez çağırır (her biri ayrı turn), her birine aynı `structural_intent`'i besler ama farklı aesthetic angle

### Örnek 3 — URL fallback

**Kullanıcı:** "https://dribbble.com/shots/xyz-landing-page buradan ilham al, kurumsal SaaS için tasarla"

**Caller (screen-builder):**
1. Mode tespit: `image_url`
2. `Read("skills/inspiration-intake/SKILL.md")`
3. Skill workflow:
   - Adım 0a: `WebFetch("https://dribbble.com/shots/xyz-landing-page", ...)` dener
   - Adım 0b: Sonuç text-only summary → **dur ve kullanıcıya mesaj yaz**
   - Skill duraklar, caller kullanıcı yanıtını bekler
4. Kullanıcı görseli yükler → mode `image_uploaded` → caller skill'i yeniden çağırır → normal akış

---

## Kurallar (Özet)

1. **Değer çıkarma YASAK.** Sadece yapı + semantik rol + spacing enum.
2. **Self-check zorunlu.** Çıktıda hex/font/px var mı? Varsa REJECT.
3. **Minimal API.** `figma_get_design_context` → `depth=1`, `verbosity="summary"`.
4. **URL fetch fallback hazır.** WebFetch image döndürmez — kullanıcıdan yükleme iste, skill'i duraklat.
5. **Caller'a teslim.** Skill karar vermez, sadece structural_intent üretir ve döner.
6. **Rapor Türkçe.** Metrik bloğu ortak protokole uygun.
