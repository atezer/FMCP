---
name: figma-a11y-audit
description: Figma ekranını erişilebilirlik açısından denetler. Renk kontrastı (WCAG AA/AAA), minimum dokunma hedefi, fokus sırası, metin boyutu ve platform-bazlı ekran okuyucu önerileri (VoiceOver, TalkBack, ARIA) üretir. "a11y audit", "erişilebilirlik kontrol", "kontrast kontrol", "accessibility check", "ekran okuyucu spec", "WCAG kontrol" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designops
    - uidev
    - designer
---

# Figma A11y Audit — Erişilebilirlik Denetimi

## Overview

Bu skill, Figma ekranını erişilebilirlik (a11y) standartlarına göre denetler. Platform-bazlı (iOS VoiceOver, Android TalkBack, Web ARIA) raporlar üretir. Topluluk "Uber a11y ekran okuyucu spesifikasyonları" örneğinden esinlenilmiştir.

**Okuma + Yazma** — Denetim sonuçlarını okur, isteğe bağlı olarak annotation frame ekler.

## Prerequisites

- F-MCP Bridge plugin bağlı olmalı
- Hedef ekranın node ID'si veya URL'i bilinmeli

## F-MCP skill koordinasyonu

- **Önce (isteğe bağlı):** `audit-figma-design-system` (DS uyum denetimi) — a11y audit'ten bağımsız ama birlikte değerli
- **Sonra:** Bulgular varsa `fix-figma-design-system-finding` veya `apply-figma-design-system` ile düzeltme; kod tarafında `implement-design` çıktısında a11y attribute'ları
- **İlişkili:** `generate-figma-library` Faz 4 (a11y denetimi) bu skill'i referans alır

## WCAG 2.1/2.2 AA Hızlı Referans

Denetim sırasında bu 4 prensip ve 12 kriter referans alınmalıdır:

### Algılanabilir (Perceivable)
- **1.1.1 Metin Dışı İçerik:** Görseller, ikonlar ve dekoratif öğeler için alternatif metin veya `aria-hidden`
- **1.3.1 Bilgi ve İlişkiler:** Başlık hiyerarşisi (H1→H2→H3), form etiketleri, tablo başlıkları programatik olarak belirlenmeli
- **1.4.3 Kontrast (Minimum):** Normal metin ≥4.5:1, büyük metin (≥18px veya ≥14px bold) ≥3:1
- **1.4.11 Metin Dışı Kontrast:** UI bileşenleri (buton kenarları, input border, ikon) ve grafik öğeleri ≥3:1 — sadece metin değil!

### İşletilebilir (Operable)
- **2.1.1 Klavye:** Tüm işlevsellik klavyeyle erişilebilir olmalı
- **2.4.3 Odak Sırası:** Fokus sırası mantıksal ve anlamlı olmalı (görsel sırayla tutarlı)
- **2.4.7 Görünür Odak:** Klavye fokus göstergesi açıkça görünür olmalı (ör. 2px solid ring, minimum 3:1 kontrast)
- **2.5.5 Dokunma Hedefi (WCAG 2.2):** Tıklanabilir/dokunulabilir öğeler ≥44×44 CSS px (WCAG 2.2: ≥24×24 CSS px minimum)

### Anlaşılabilir (Understandable)
- **3.1.1 Sayfa Dili:** İçerik dili tanımlanmalı (lang attribute)
- **3.2.1 Fokusta Tahmin Edilebilirlik:** Bir öğeye odaklanmak beklenmeyen davranış tetiklememeli (ör. otomatik form submit)
- **3.3.1 Hata Tanımlama:** Hata tespit edildiğinde kullanıcıya metin olarak açıkça bildirilmeli
- **3.3.2 Etiketler veya Talimatlar:** Form alanlarında açık etiket ve gerektiğinde yardım metni

### Sağlam (Robust)
- **4.1.2 Ad, Rol, Değer:** Tüm UI bileşenlerinin adı (label), rolü (role) ve durumu (state) programatik olarak belirlenebilir olmalı

## Yaygın Sorunlar Kontrol Listesi

Denetimde sıkça karşılaşılan 8 sorun — her biri Step 4-8'de kontrol edilmelidir:

1. **Yetersiz renk kontrastı** — metin/arka plan oranı WCAG AA'yı karşılamıyor
2. **Eksik form etiketleri** — placeholder tek başına etiket yerine geçmez
3. **Klavye erişimi yok** — fare olmadan ulaşılamayan etkileşimli öğeler
4. **Alt text eksik** — bilgi taşıyan görsellerde alternatif metin yok
5. **Focus trap hatalı** — modal/drawer'da odak tuzağı eksik veya bozuk
6. **ARIA landmark eksik** — sayfa bölümleri (nav, main, footer) işaretlenmemiş
7. **Otomatik oynatılan medya** — ses/video otomatik başlıyor, durdurma kontrolü yok
8. **Zaman limitleri** — oturum zaman aşımı uzatma seçeneği sunulmuyor

## Test Yaklaşımı Sırası

A11y denetimi aşağıdaki sırayla yürütülmelidir:

| Aşama | Ne Yapılır | İlgili Step |
|-------|-----------|-------------|
| 1. Otomatik tarama | Kontrast hesaplama, dokunma hedefi boyutu, metin boyutu | Step 4, 5, 6 |
| 2. Klavye-only navigasyon | Fokus sırası, görünür fokus göstergesi, focus trap | Step 7c, 7e |
| 3. Ekran okuyucu testi | Başlık hiyerarşisi, form ilişkilendirme, alt text | Step 7a, 7b, 7d |
| 4. Kontrast doğrulama | Gradient/overlay kaçırılanlar, UI bileşen kontrastı | Screenshot kontrolü |
| 5. %200 zoom testi | İçerik kaybı, yatay kaydırma oluşmamalı | Responsive kontrol |

## Required Workflow

### Step 1: Plugin Bağlantısını Doğrula

```
figma_get_status()
```

### Step 2: Hedef Ekranı Belirle

Figma URL veya node ID. `node-id=72-293` → `72:293` normalize et.

### Step 3: Yapı ve Görsel Veri Topla

```
figma_get_design_context(
  nodeId="<NODE_ID>",
  depth=2,
  verbosity="full",
  includeLayout=true,
  includeVisual=true,
  includeTypography=true
)
```

```
figma_capture_screenshot(nodeId="<NODE_ID>")
```

```
figma_get_design_context(nodeId="<NODE_ID>", depth=3)
```

### Step 4: Kontrast Analizi

`figma_execute` ile renk çiftlerini çıkar ve kontrast oranı hesapla:

```js
function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const root = await figma.getNodeByIdAsync("<NODE_ID>");
const textNodes = root.findAll(n => n.type === "TEXT");
const results = [];

for (const node of textNodes.slice(0, 50)) {
  if (!node.fills || !node.fills.length) continue;
  const fill = node.fills[0];
  if (fill.type !== "SOLID") continue;

  let parent = node.parent;
  let bgColor = null;
  while (parent && !bgColor) {
    if (parent.fills && parent.fills.length) {
      const pFill = parent.fills[0];
      if (pFill.type === "SOLID") bgColor = pFill.color;
    }
    parent = parent.parent;
  }
  if (!bgColor) bgColor = { r: 1, g: 1, b: 1 };

  const ratio = contrastRatio(
    luminance(fill.color.r, fill.color.g, fill.color.b),
    luminance(bgColor.r, bgColor.g, bgColor.b)
  );

  const fontSize = node.fontSize;
  const isLarge = fontSize >= 18 || (fontSize >= 14 && node.fontWeight >= 700);
  const passAA = isLarge ? ratio >= 3 : ratio >= 4.5;
  const passAAA = isLarge ? ratio >= 4.5 : ratio >= 7;

  if (!passAA) {
    results.push({
      nodeId: node.id,
      name: node.name,
      ratio: Math.round(ratio * 100) / 100,
      required: isLarge ? 3 : 4.5,
      level: "FAIL_AA",
      fontSize
    });
  }
}

return { contrastIssues: results, totalTextNodes: textNodes.length };
```

### Step 5: Dokunma Hedefi Kontrolü (WCAG 2.5.5)

> **Referans:** WCAG 2.5.5 Target Size — iOS HIG: 44×44pt, Android Material: 48×48dp, Web WCAG 2.2: min 24×24 CSS px

```js
const interactiveTypes = ["INSTANCE", "FRAME"];
const interactiveNames = /button|btn|link|input|toggle|switch|checkbox|radio|tab|chip/i;

const root = await figma.getNodeByIdAsync("<NODE_ID>");
const nodes = root.findAll(n =>
  interactiveTypes.includes(n.type) && interactiveNames.test(n.name)
);

const issues = [];
for (const node of nodes) {
  const w = node.width;
  const h = node.height;
  if (w < 44 || h < 44) {
    issues.push({
      nodeId: node.id,
      name: node.name,
      size: { width: Math.round(w), height: Math.round(h) },
      minimumRequired: { ios: "44x44", android: "48x48" },
      level: w < 24 || h < 24 ? "CRITICAL" : "WARNING"
    });
  }
}

return { touchTargetIssues: issues, totalInteractive: nodes.length };
```

### Step 6: Metin Boyutu Kontrolü

```js
const root = await figma.getNodeByIdAsync("<NODE_ID>");
const textNodes = root.findAll(n => n.type === "TEXT");
const smallText = textNodes.filter(n => {
  const size = typeof n.fontSize === "number" ? n.fontSize : 0;
  return size > 0 && size < 12;
}).map(n => ({
  nodeId: n.id,
  name: n.name,
  fontSize: n.fontSize,
  recommendation: "Minimum 12px (body 14-16px önerilir)"
}));

return { smallTextIssues: smallText };
```

### Step 7: Erişilebilirlik Notları (Annotation) Üretimi

**Referans:** Indeed Figma Accessibility Annotation Kit yaklaşımı. Denetim sonuçlarına göre, Figma tasarımına geliştirici notları eklenir. Bu notlar tasarım dosyasında kalır ve geliştirici handoff'unda kritik bilgi sağlar.

`figma_execute` ile ekranın yanına annotation frame'i oluştur:

```js
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });

const screen = await figma.getNodeByIdAsync("<NODE_ID>");

// Annotation frame — ekranın sağına yerleştir
const annotFrame = figma.createFrame();
annotFrame.name = "A11y Annotations";
annotFrame.layoutMode = "VERTICAL";
annotFrame.primaryAxisSizingMode = "AUTO";
annotFrame.counterAxisSizingMode = "AUTO";
annotFrame.itemSpacing = 16;
annotFrame.paddingLeft = 24;
annotFrame.paddingRight = 24;
annotFrame.paddingTop = 24;
annotFrame.paddingBottom = 24;
annotFrame.fills = [{ type: "SOLID", color: { r: 0.98, g: 0.95, b: 0.85 } }];
annotFrame.cornerRadius = 12;
annotFrame.x = screen.x + screen.width + 40;
annotFrame.y = screen.y;

// Helper: add annotation item
function addAnnotation(parent, emoji, title, body) {
  const item = figma.createFrame();
  item.name = "Annotation: " + title;
  item.layoutMode = "VERTICAL";
  item.primaryAxisSizingMode = "AUTO";
  item.itemSpacing = 4;
  item.fills = [];
  parent.appendChild(item);
  item.layoutSizingHorizontal = "FILL";

  const heading = figma.createText();
  heading.characters = emoji + " " + title;
  heading.fontSize = 14;
  heading.fontName = { family: "Inter", style: "Bold" };
  heading.fills = [{ type: "SOLID", color: { r: 0.1, g: 0.1, b: 0.1 } }];
  item.appendChild(heading);

  const desc = figma.createText();
  desc.characters = body;
  desc.fontSize = 12;
  desc.fontName = { family: "Inter", style: "Regular" };
  desc.fills = [{ type: "SOLID", color: { r: 0.3, g: 0.3, b: 0.3 } }];
  item.appendChild(desc);
  desc.layoutSizingHorizontal = "FILL";
}

return { annotFrameId: annotFrame.id };
```

#### 7a. Gesture Erişilebilirlik Kontrolleri

Mobil ve dokunmatik arayüzlerde gesture-bazlı etkileşimler klavye/switch kullanıcıları için erişilebilir alternatifler gerektir:

| Gesture | Gerekli Alternatif | Platform Notu |
|---------|-------------------|---------------|
| Swipe (kaydırma) | Buton / ok kontrolü | iOS VoiceOver: swipe gesture'lar yeniden atanır |
| Long-press (uzun basma) | Context menu butonu | Android: `onLongClick` + `contentDescription` |
| Pinch (çimdikleme) | +/- zoom butonları | Web: `wheel` event alternatifi |
| Pull-to-refresh | Yenile butonu | Ekran okuyucu ile pull gesture kullanılamaz |
| Drag & drop | Taşı butonu / sıralama menüsü | Klavye ile sürükle-bırak erişilemez |

**Annotation:** Gesture kullanan öğeleri tespit et ve alternatif kontrolün mevcut olup olmadığını raporla:

```
addAnnotation(annotFrame, "👆", "Gesture Kontrolü",
  "Swipe left → Sil butonu mevcut mi? Long-press → Context menu alternatifi var mı?");
```

#### 7b. Başlık Hiyerarşisi Notları

Ekrandaki metin elemanlarını analiz et ve başlık seviyelerini belirle. Geliştirici hangi metnin `<h1>`, `<h2>`, `<h3>` olduğunu bilmeli:

```
Başlık Hiyerarşisi:
  H1: "Hoş Geldiniz" (24px, Semi Bold) — Sayfa ana başlığı
  H2: "Hesabınıza giriş yapın" (16px, Regular) — Alt başlık / açıklama
  Body: Input placeholder, link, buton metinleri (14px)
```

**Kural:** Ekranda yalnızca 1 adet H1 olmalı. Başlık seviyeleri atlanmamalı (H1 → H3 yanlış, H1 → H2 → H3 doğru).

#### 7c. Form Alan-Etiket İlişkilendirme Notları

Form alanları ile etiketlerinin programatik olarak ilişkilendirilmesi gerekir. Aksi takdirde ekran okuyucu kullanıcıları alanın ne için olduğunu anlayamaz:

```
Form İlişkilendirme:
  Input "E-posta adresi":
    - label: "E-posta adresi" (for/id ilişkisi)
    - type: email
    - autocomplete: email
    - required: true
    - error: "Geçerli bir e-posta girin" (aria-describedby)

  Input "Şifre":
    - label: "Şifre" (for/id ilişkisi)
    - type: password
    - autocomplete: current-password
    - required: true
    - toggle: "Şifreyi göster/gizle" butonu (aria-label)
```

**Kural:** Her form alanının bir `<label>` ile ilişkilendirilmesi **zorunludur**. Placeholder tek başına etiket yerine geçmez.

#### 7d. Odak Sırası (Focus Order) Notları

Ekrandaki etkileşimli öğelerin odak sırası görsel sıradan farklı olabilir. Bu notlar geliştiriciye doğru `tabindex` sırasını bildirir:

```
Odak Sırası:
  1. "Hoş Geldiniz" (başlık — ekran okuyucu ilk buraya odaklanır)
  2. "E-posta adresi" input
  3. "Şifre" input
  4. "Giriş Yap" butonu
  5. "Şifremi unuttum" link
  6. "Google ile Giriş Yap" butonu
  7. "Kayıt Ol" link
```

**Kural:** Mantıksal akış yukarıdan aşağıya olmalı. Görsel olarak yan yana olan elemanlar (ör. iş ilanı + favori ikonu) için sıra açıkça belirtilmeli.

#### 7e. Görsel Alternatif Metin Notları

Her görsel için alt text veya dekoratif işaretleme:

```
Görsel Notları:
  Logo (Ellipse): alt="MyApp logosu" (bilgi taşıyan görsel)
  Divider çizgileri: role="presentation" (dekoratif — ekran okuyucudan gizle)
```

**Kural:** İçerik taşıyan görseller `alt` text almalı. Sadece estetik amaçlı görseller `role="presentation"` veya `aria-hidden="true"` ile gizlenmeli.

#### 7f. Modal/Dialog ve Dinamik İçerik Notları

Eğer ekranda modal, toast, alert gibi dinamik öğeler varsa:

```
Dinamik İçerik Notları:
  - Modal açıldığında: odak modal'a taşınmalı (focus trap)
  - Modal kapandığında: odak tetikleyen elemana dönmeli
  - Toast/alert: role="alert" veya aria-live="polite"
  - Loading: aria-busy="true", tamamlanınca aria-busy="false"
```

**Kural:** Dinamik içerik değişiklikleri `aria-live` region ile duyurulmalı. Modal'larda fokus tuzağı (focus trap) **zorunludur**.

### Step 8: Erişebilirlik-Tasarım Tutarlılık Kontrolü

Annotation'lar üretildikten sonra, gerçek tasarımın erişebilirlik kurallarıyla tutarlı olduğunu doğrula. `figma_execute` ile otomatik kontrol:

```js
const screen = await figma.getNodeByIdAsync("<NODE_ID>");
const checks = [];

// 1. Başlık hiyerarşisi — max 1 adet H1 (>= 24px)
const allText = screen.findAll(n => n.type === "TEXT");
const h1Count = allText.filter(n => n.fontSize >= 24).length;
checks.push({ rule: "Single H1", pass: h1Count <= 1 });

// 2. Min font size 12px
const tooSmall = allText.filter(n => typeof n.fontSize === "number" && n.fontSize < 12);
checks.push({ rule: "Min font 12px", pass: tooSmall.length === 0 });

// 3. Body text min 14px
const bodySmall = allText.filter(n => n.fontSize >= 12 && n.fontSize < 14);
checks.push({ rule: "Body min 14px", pass: bodySmall.length === 0 });

// 4. Touch target min 44px (iOS HIG)
const interactive = screen.findAll(n =>
  n.type === "INSTANCE" || (n.type === "FRAME" && /input|button|btn/i.test(n.name))
);
const smallTargets = interactive.filter(n => n.width < 44 || n.height < 44);
checks.push({ rule: "Touch 44px", pass: smallTargets.length === 0 });

// 5. Input min height 48px (Android Material)
const inputs = screen.findAll(n => n.type === "FRAME" && /input/i.test(n.name));
const smallInputs = inputs.filter(n => n.height < 48);
checks.push({ rule: "Input 48px", pass: smallInputs.length === 0 });

// 6. Tüm renkler token-bound (hard-coded fill yok)
let hardCoded = 0;
function chk(node) {
  if (node.name === "_spacer") return;
  if (node.fills?.length > 0 && node.fills[0].type === "SOLID") {
    if (!node.boundVariables?.fills) hardCoded++;
  }
  if (node.children && node.type !== "INSTANCE") node.children.forEach(c => chk(c));
}
chk(screen);
checks.push({ rule: "Colors token-bound", pass: hardCoded === 0 });

// 7. Auto-layout (responsive) — tüm content frame'ler
const noLayout = screen.findAll(n => n.type === "FRAME" && n.name !== "_spacer" && (!n.layoutMode || n.layoutMode === "NONE"));
checks.push({ rule: "Auto-layout", pass: noLayout.length === 0 });

// 8. Fokus göstergesi renk kontrastı — focus ring var mı ve görünür mü?
const focusable = screen.findAll(n =>
  n.type === "INSTANCE" || (n.type === "FRAME" && /focus|focused/i.test(n.name))
);
const hasFocusState = focusable.some(n => /focus/i.test(n.name));
checks.push({ rule: "Focus indicator", pass: hasFocusState || focusable.length === 0 });

// 9. Hata mesajı ilişkilendirme — error text + input yakınlığı
const errorTexts = allText.filter(n => /error|hata|geçersiz|invalid/i.test(n.name));
checks.push({ rule: "Error association", pass: true, note: `${errorTexts.length} hata metni tespit edildi — aria-describedby ilişkisi geliştiriciye bildirilmeli` });

// 10. UI bileşen kontrastı (1.4.11) — buton/input border rengi arka plana karşı ≥3:1
checks.push({ rule: "Non-text contrast 3:1", pass: true, note: "Manuel kontrol gerekli — buton/input kenar renkleri ve ikon kontrastı screenshot ile doğrulanmalı" });

return { pass: checks.filter(c => c.pass).length, total: checks.length, checks };
```

**Tüm kontroller PASS olmalı.** FAIL varsa, ilgili bulguyu düzelt ve tekrar çalıştır.

### Step 9: Platform-Bazlı Rapor Üret

#### iOS (VoiceOver) Raporu

```markdown
### VoiceOver Spesifikasyonu

| Öğe | accessibilityLabel | accessibilityTraits | Sıra |
|---|---|---|---|
| Logo | "Uygulama logosu" | .image | 1 |
| Başlık | "Hoş geldiniz" | .header | 2 |
| E-posta | "E-posta adresi" | .none (textField) | 3 |
| Giriş butonu | "Giriş yap" | .button | 4 |
```

#### Android (TalkBack) Raporu

```markdown
### TalkBack Spesifikasyonu

| Öğe | contentDescription | Role | importantForAccessibility |
|---|---|---|---|
| Logo | "Uygulama logosu" | IMAGE | yes |
| Başlık | "Hoş geldiniz" | HEADING | yes |
| E-posta | "E-posta adresi" | EDIT_TEXT | yes |
| Giriş butonu | "Giriş yap" | BUTTON | yes |
```

#### Web (ARIA) Raporu

```markdown
### ARIA Spesifikasyonu

| Öğe | role | aria-label | tabindex |
|---|---|---|---|
| Logo | img | "Uygulama logosu" | -1 |
| Başlık | heading (h1) | — | -1 |
| E-posta | textbox | "E-posta adresi" | 0 |
| Giriş butonu | button | "Giriş yap" | 0 |
```

## Türkçe Karakter Kuralı (ZORUNLU)

Tüm Türkçe metin içeriklerinde (Figma text node, kod string, dokümantasyon) doğru Unicode karakterler kullanılmalıdır. ASCII karşılıkları YASAKTIR:

| Doğru | Yanlış | Doğru | Yanlış |
|-------|--------|-------|--------|
| ş | s | Ş | S |
| ı | i | İ | I |
| ö | o | Ö | O |
| ü | u | Ü | U |
| ç | c | Ç | C |
| ğ | g | Ğ | G |

Son adım: Üretilen tüm Türkçe metinleri karakter kontrolünden geçir.

## Çıktı Formatı

- **Varsayılan:** Markdown rapor (tüm platformlar)
- **`--json`:** Yapılandırılmış JSON (CI entegrasyonu için)
- **`--platform=ios`:** Yalnızca VoiceOver raporu
- **`--platform=android`:** Yalnızca TalkBack raporu
- **`--platform=web`:** Yalnızca ARIA raporu

## Bulgu Öncelikleri

| Seviye | Açıklama | Örnek |
|---|---|---|
| **CRITICAL** | WCAG AA başarısız, kullanılamaz | Kontrast < 2:1, touch target < 24px |
| **HIGH** | WCAG AA sınırda | Kontrast 3-4.5:1 normal metin |
| **MEDIUM** | Best practice ihlali | Touch target 24-44px, metin < 14px |
| **LOW** | İyileştirme önerisi | AAA başarısız ama AA geçiyor |

## Annotation Çıktı Formatı

Skill çalıştırıldığında, Figma dosyasında ekranın yanına sarı bir annotation frame oluşturulur:

```
┌──────────────────────────────────────┐
│ A11y Annotations                     │
│                                      │
│ 🏷️ Başlık Hiyerarşisi               │
│ H1: "Hoş Geldiniz"                  │
│ H2: "Hesabınıza giriş yapın"        │
│                                      │
│ 🔗 Form İlişkilendirme              │
│ "E-posta" → label + type=email       │
│ "Şifre" → label + type=password      │
│                                      │
│ 🔢 Odak Sırası                       │
│ 1→Başlık 2→Email 3→Şifre 4→Giriş   │
│ 5→Şifremi unuttum 6→Google 7→Kayıt  │
│                                      │
│ 🖼️ Görsel Alt Text                   │
│ Logo: alt="MyApp logosu"             │
│ Divider: decorative (gizle)          │
│                                      │
│ ⚡ Kontrast Sonuçları                │
│ Primary: 5.17:1 ✅ AA                │
│ Secondary: 16.13:1 ✅ AA+AAA        │
│ Disabled: 4.39:1 ℹ️ Muaf            │
│                                      │
│ 📐 Touch Target                     │
│ Tüm butonlar ≥44px ✅               │
│ Tüm inputlar ≥48px ✅               │
└──────────────────────────────────────┘
```

Bu annotation frame'i Figma dosyasında kalır ve geliştirici handoff paketinin bir parçası olur. `ai-handoff-export` skill'i bu notları otomatik olarak HANDOFF.md'ye dahil eder.

## Doğrulama Kontrol Listesi

Skill tamamlandığında şu kontroller yapılmalı:

- [ ] Tüm renk çiftleri WCAG AA kontrolünden geçti mi?
- [ ] Tüm interaktif elemanlar ≥44px (iOS) / ≥48px (Android) mu?
- [ ] Tüm metinler ≥12px mi? Body metinler ≥14px mi?
- [ ] Başlık hiyerarşisi doğru mu? (tek H1, seviye atlama yok)
- [ ] Form alanları etiketlerle ilişkilendirildi mi?
- [ ] Odak sırası mantıksal mı?
- [ ] Dekoratif görseller işaretlendi mi?
- [ ] Annotation frame oluşturuldu mu?
- [ ] Platform-bazlı rapor (VoiceOver/TalkBack/ARIA) üretildi mi?

## Evolution Triggers

- WCAG 3.0 yayınlandığında kontrast algoritması (APCA) güncellenmeli
- Bridge'e a11y-spesifik araç eklenirse (ör. erişilebilirlik ağacı aracı) iş akışı güncellenmeli
- Yeni platform (Flutter, .NET MAUI) desteği eklenirse rapor şablonları genişletilmeli
