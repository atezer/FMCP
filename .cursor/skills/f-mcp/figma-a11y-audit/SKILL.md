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

**Salt okunur** — Figma tuvalinde değişiklik yapmaz.

## Prerequisites

- F-MCP Bridge plugin bağlı olmalı
- Hedef ekranın node ID'si veya URL'i bilinmeli

## F-MCP skill koordinasyonu

- **Önce (isteğe bağlı):** `audit-figma-design-system` (DS uyum denetimi) — a11y audit'ten bağımsız ama birlikte değerli
- **Sonra:** Bulgular varsa `fix-figma-design-system-finding` veya `apply-figma-design-system` ile düzeltme; kod tarafında `implement-design` çıktısında a11y attribute'ları
- **İlişkili:** `generate-figma-library` Faz 4 (a11y denetimi) bu skill'i referans alır

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

### Step 5: Dokunma Hedefi Kontrolü

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

### Step 7: Fokus Sırası Analizi

Ekrandaki etkileşimli öğelerin görsel sırası ile mantıksal okuma sırası karşılaştırılır:

1. Etkileşimli öğeleri konumlarına göre sırala (soldan sağa, yukarıdan aşağıya)
2. Auto-layout sırası ile karşılaştır
3. Uyumsuzluk varsa rapor et

### Step 8: Platform-Bazlı Rapor Üret

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

## Evolution Triggers

- WCAG 3.0 yayınlandığında kontrast algoritması (APCA) güncellenmeli
- Bridge'e a11y-spesifik araç eklenirse (ör. erişilebilirlik ağacı aracı) iş akışı güncellenmeli
- Yeni platform (Flutter, .NET MAUI) desteği eklenirse rapor şablonları genişletilmeli
