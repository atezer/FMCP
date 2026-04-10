---
name: ds-impact-analysis
description: Bir DS token'ı veya bileşeni değiştirildiğinde hangi ekranlar ve dosyalar etkileneceğini analiz eder. Etki yarıçapı, bağımlılık grafiği ve risk skoru üretir. "etki analizi", "impact analysis", "bu token'ı değiştirirsem ne olur", "bileşen bağımlılık", "DS change impact", "değişiklik etkisi" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designops
    - po
---

# DS Impact Analysis — Tasarım Sistemi Etki Analizi

> **Design Token Kuralı:** Bu skill'deki kod örneklerinde geçen font adları, renk kodları, piksel boyutları yalnızca FORMAT gösterimidir. Çalışma anında tüm design token değerleri (font, renk, boyut, spacing, radius, gölge) kayıtlı kütüphaneden (`figma_get_variables`, `figma_get_styles`) veya kullanıcıdan okunmalıdır. Hardcoded token değeri kullanma. Detay: `project-context.md` → "Design Token Kuralı".

## Overview

Bu skill, bir design system token'ı veya bileşeni değiştirildiğinde etkilenecek tüm ekranları, bileşenleri ve dosyaları analiz eder. DesignOps ekiplerinin değişiklik kararlarını bilinçli vermesini sağlar.

**Salt okunur** — Figma tuvalinde değişiklik yapmaz.

## Prerequisites

- F-MCP Bridge plugin bağlı olmalı
- Değiştirilmek istenen token/bileşen bilgisi (isim veya ID)

## F-MCP skill koordinasyonu

- **Önce (isteğe bağlı):** `audit-figma-design-system` ile mevcut DS durumunu anla
- **Sonra:** Etki analizi onaylandıktan sonra:
  - Token değişikliği → `design-token-pipeline` (reverse flow ile güncelle)
  - Bileşen değişikliği → `apply-figma-design-system` veya `fix-figma-design-system-finding`
  - Kod güncellemesi → `implement-design` + `design-drift-detector`

## Required Workflow

### Step 1: Plugin Bağlantısını Doğrula

```
figma_get_status()
```

### Step 2: Değişiklik Kapsamını Belirle

Kullanıcıdan değişikliği öğren:

**Token değişikliği:**
- Hangi token/variable? (ör. `color/primary/500`, `spacing/md`)
- Yeni değer ne? (ör. `#2563EB` → `#3B82F6`)
- Hangi mode'lar etkileniyor? (ör. Light, Dark, her ikisi)

**Bileşen değişikliği:**
- Hangi bileşen? (ör. Button, Card, NavBar)
- Ne değişiyor? (ör. variant ekleme/kaldırma, property değişikliği, boyut)

### Step 3: Token Bağımlılık Ağacı

Token değişikliği için:

```
figma_get_variables(verbosity="full")
```

`figma_execute` ile bağımlılık taraması:

```js
const targetVarName = "<TOKEN_NAME>";

const collections = await figma.variables.getLocalVariableCollectionsAsync();
const allVariables = [];
for (const col of collections) {
  for (const varId of col.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(varId);
    allVariables.push(v);
  }
}

const targetVar = allVariables.find(v => v.name === targetVarName);
if (!targetVar) return { error: "Variable bulunamadı: " + targetVarName };

// Alias zincirleri: transitif bağımlılık taraması (A → B → C zinciri)
function findDependents(varId, visited = new Set()) {
  if (visited.has(varId)) return []; // döngü koruması
  visited.add(varId);
  const direct = allVariables.filter(v =>
    Object.values(v.valuesByMode).some(val =>
      val && val.type === "VARIABLE_ALIAS" && val.id === varId
    )
  );
  const transitive = [];
  for (const d of direct) {
    transitive.push(...findDependents(d.id, visited));
  }
  return [...direct, ...transitive];
}

const allDependents = findDependents(targetVar.id);
const uniqueDeps = [...new Map(allDependents.map(d => [d.id, d])).values()];

return {
  target: { id: targetVar.id, name: targetVar.name, type: targetVar.resolvedType },
  directDependents: uniqueDeps.map(d => ({
    id: d.id, name: d.name, type: d.resolvedType
  })),
  dependentCount: uniqueDeps.length
};
```

### Step 4: Ekran Etki Taraması

```js
const targetVarId = "<VARIABLE_ID>";
const affectedNodes = [];

const pages = figma.root.children;
for (const page of pages.slice(0, 20)) {
  await figma.setCurrentPageAsync(page);

  const nodes = page.findAll(n => {
    if (!n.boundVariables) return false;
    return Object.values(n.boundVariables).some(binding => {
      if (Array.isArray(binding)) {
        return binding.some(b => b.id === targetVarId);
      }
      return binding && binding.id === targetVarId;
    });
  });

  nodes.forEach(n => {
    affectedNodes.push({
      pageId: page.id,
      pageName: page.name,
      nodeId: n.id,
      nodeName: n.name,
      nodeType: n.type,
      boundProperties: Object.keys(n.boundVariables).filter(k => {
        const b = n.boundVariables[k];
        if (Array.isArray(b)) return b.some(x => x.id === targetVarId);
        return b && b.id === targetVarId;
      })
    });
  });
}

return { affectedNodes, totalAffected: affectedNodes.length };
```

### Step 5: Bileşen Etki Taraması (bileşen değişikliği için)

```
figma_search_components(query="<COMPONENT_NAME>", currentPageOnly=false)
```

```js
const targetComponentKey = "<COMPONENT_KEY>";
const instances = [];

const pages = figma.root.children;
for (const page of pages.slice(0, 20)) {
  await figma.setCurrentPageAsync(page);

  const pageInstances = page.findAll(n => {
    if (n.type !== "INSTANCE") return false;
    const mc = n.mainComponent;
    return mc && (mc.key === targetComponentKey ||
      (mc.parent?.type === "COMPONENT_SET" && mc.parent.key === targetComponentKey));
  });

  pageInstances.forEach(n => {
    instances.push({
      pageId: page.id,
      pageName: page.name,
      nodeId: n.id,
      nodeName: n.name,
      variantName: n.mainComponent?.name
    });
  });
}

return { instances, totalInstances: instances.length };
```

### Step 6: Kod Tarafı Etki Analizi

Kod tabanında etkilenen dosyaları ara:

1. Token dosyalarında referans arama (CSS var, Swift Color, Android color resource)
2. Bileşen dosyalarında import/kullanım arama
3. `.figma-mappings.json` varsa eşleme tablosundan referansları çek

### Step 7: Risk Skoru Hesapla

| Faktör | Ağırlık | Puan |
|---|---|---|
| Etkilenen ekran sayısı | x3 | 0-10 |
| Etkilenen bileşen instance sayısı | x2 | 0-10 |
| Alias zinciri derinliği | x2 | 0-5 |
| Kod tarafı dosya sayısı | x1 | 0-10 |
| Platform sayısı (iOS+Android+Web) | x1 | 1-3 |

**Risk seviyeleri:**
- **Düşük (0-15):** Dar kapsamlı değişiklik, güvenle uygulanabilir
- **Orta (16-35):** Dikkatli uygulama, test gerekli
- **Yüksek (36-50):** Geniş etki, staged rollout önerilir
- **Kritik (51+):** Çok geniş etki, ekip toplantısı ve planlama gerekli

### Step 8: Etki Raporu Üret

Toplanan verilerden aşağıdaki formatta yapılandırılmış etki raporu oluştur.

## Çıktı Formatı

```markdown
# DS Etki Analizi — [Token/Bileşen Adı]

## Değişiklik Özeti
- **Hedef:** `color/primary/500`
- **Mevcut değer:** #2563EB (Light), #60A5FA (Dark)
- **Yeni değer:** #3B82F6 (Light), #93C5FD (Dark)
- **Risk Skoru:** 28/50 (Orta)

## Etki Yarıçapı

### Figma Tarafı
- **Doğrudan bağlı node:** 47 adet (5 sayfada)
- **Alias zincirleri:** 3 semantic variable bu primitive'e bağlı
  - `color/primary` → `color/button/primary-bg` → 12 instance
  - `color/primary` → `color/link/default` → 8 instance
  - `color/primary` → `color/focus/ring` → 5 instance
- **Toplam etkilenen node:** 72

### Kod Tarafı
- **iOS:** 4 dosya (Colors.swift, ButtonComponent.swift, LinkText.swift, FocusRing.swift)
- **Android:** 3 dosya (colors.xml, ButtonComponent.kt, LinkText.kt)
- **Web:** 5 dosya (tokens.css, Button.tsx, Link.tsx, FocusRing.tsx, tailwind.config.js)

## Bağımlılık Grafiği

    color/primary/500
    ├── color/button/primary-bg (12 instance)
    │   ├── Login Screen → 2 Button
    │   ├── Dashboard → 4 Button
    │   └── Settings → 1 Button
    ├── color/link/default (8 instance)
    │   ├── Home → 3 Link
    │   └── Help → 2 Link
    └── color/focus/ring (5 instance)
        └── Tüm form ekranları → Input focus

## Önerilen Aksiyon Planı

1. **Faz 1:** Token değerini Figma'da güncelle (`design-token-pipeline --direction=code-to-figma`)
2. **Faz 2:** Kod token dosyalarını güncelle (`design-token-pipeline`)
3. **Faz 3:** Her platformda regression testi (`visual-qa-compare`)
4. **Faz 4:** Parity doğrulama (`design-drift-detector`)

## Tahmini İş Yükü
- Figma güncelleme: ~15 dk (otomatik, variable binding sayesinde)
- Kod güncelleme: ~1 saat (12 dosya, 3 platform)
- QA/Test: ~2 saat
```

## Evolution Triggers

- Bridge'e bağımlılık grafiği aracı eklenirse (ör. dependency graph aracı) Step 3-5 basitleştirilebilir
- Çoklu dosya desteği eklenirse cross-file etki analizi genişletilebilir
- Sprint planlama entegrasyonu için Jira/Linear ticket oluşturma eklenebilir
