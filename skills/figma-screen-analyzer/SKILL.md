---
name: figma-screen-analyzer
description: Figma ekranını teknik olmayan dilde analiz eder. Bileşen envanteri, DS uyum oranı, görsel hiyerarşi, kullanıcı akışı özeti ve design token kapsamı raporlar. PO, PM ve SEM'lerin tasarım durumunu anlamaları için tasarlanmıştır. "ekranı analiz et", "tasarım raporu", "screen analysis", "UI raporu çıkar", "ne var bu ekranda", "bileşen sayısı", "DS uyum oranı" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - po
    - designer
---

# Figma Screen Analyzer — UI Analiz Raporu

## Overview

Bu skill, Figma ekranını **teknik olmayan** dilde analiz ederek PO, PM ve SEM'ler için anlaşılır bir rapor üretir. DS uyum oranı, bileşen envanteri, görsel hiyerarşi değerlendirmesi ve aksiyon önerileri içerir.

**Salt okunur** — Figma tuvalinde değişiklik yapmaz.

## Prerequisites

- F-MCP Bridge plugin bağlı olmalı
- Hedef ekranın node ID'si veya URL'i bilinmeli

## F-MCP skill koordinasyonu

- **İlişkili:** `audit-figma-design-system` (teknik DS denetimi — bu skill'in PO/PM versiyonu)
- **Sonra:** Bulgulara göre `apply-figma-design-system` veya `ai-handoff-export` önerilir
- **Karşılaştırma:** İki ekran karşılaştırması için her ikisine de ayrı analiz yapılır

## Required Workflow

### Step 1: Plugin Bağlantısını Doğrula

```
figma_get_status()
```

### Step 2: Ekran Verisi Topla

> **DERİN ANALİZ KURALI:** Sadece frame/node isimlerine bakarak sonuç çıkarma. Her node'un içindeki text content (`characters`), instance prop'ları ve child yapılarını detaylı oku. Bir şeyin "eksik" veya "yok" olduğunu iddia etmeden önce tüm child node'ların içeriğini kontrol et.

> **GÖRSEL DOĞRULAMA KURALI:** Analiz sonucunu raporlamadan önce `figma_capture_screenshot` ile ekran görüntüsü al ve görsel olarak kontrol et. Text content ile screenshot'ın tutarlı olduğunu teyit et. Çelişki varsa screenshot'ı esas al.

```
figma_get_design_context(
  nodeId="<NODE_ID>",
  depth=3,
  verbosity="full",
  includeLayout=true,
  includeVisual=true,
  includeTypography=true
)
```

```
figma_capture_screenshot(nodeId="<NODE_ID>")
```

### Step 3: İlk İzlenim Analizi (2 Saniye Testi)

Screenshot'a bakarak hızlı sezgisel değerlendirme yap (DS metriklerinden ÖNCE):

1. **Göz çekimi:** İlk bakışta göz nereye gidiyor? Bu doğru öğe mi? (CTA, başlık, hero görsel?)
2. **Duygusal tepki:** Ekran güven mi, kafa karışıklığı mı, heyecan mı uyandırıyor?
3. **Amaç netliği:** Ekranın ne için olduğu 2 saniyede anlaşılıyor mu?
4. **Görsel yoğunluk:** Sıkışık mı, dengeli mi, çok boş mu?

> Bu bölüm **sezgisel** — metrik değil, izlenim. Raporda "İlk İzlenim" başlığı altında 2-3 cümle.

### Step 4: DS Uyum Analizi

```
figma_get_design_system_summary()
```

`figma_execute` ile instance ve token sayımı:

```js
const page = figma.currentPage;
const target = page.findOne(n => n.id === "<NODE_ID>");
if (!target) return { error: "Node bulunamadı" };

const allNodes = target.findAll(() => true);
const instances = target.findAll(n => n.type === "INSTANCE");
const textNodes = target.findAll(n => n.type === "TEXT");
const frames = target.findAll(n => n.type === "FRAME");

let boundVariableCount = 0;
let unboundCount = 0;
allNodes.forEach(n => {
  if (n.boundVariables && Object.keys(n.boundVariables).length > 0) {
    boundVariableCount++;
  }
  if (n.fills && n.fills.length > 0 && n.type !== "INSTANCE") {
    const hasBound = n.boundVariables && n.boundVariables.fills;
    if (!hasBound) unboundCount++;
  }
});

const uniqueComponents = new Map();
instances.forEach(inst => {
  const mc = inst.mainComponent;
  const key = mc?.key || mc?.id;
  const name = mc?.name || "Bilinmeyen";
  if (key) {
    if (!uniqueComponents.has(key)) uniqueComponents.set(key, { name, count: 0 });
    uniqueComponents.get(key).count++;
  }
});

return {
  totalNodes: allNodes.length,
  instanceCount: instances.length,
  textNodeCount: textNodes.length,
  frameCount: frames.length,
  boundVariableCount,
  unboundFillCount: unboundCount,
  uniqueComponents: [...uniqueComponents.values()],
  dsComplianceRate: Math.round(((instances.length + boundVariableCount) / Math.max(allNodes.length, 1)) * 100)
};
```

### Step 5: Görsel Hiyerarşi Değerlendirmesi

AI analizi ile:

1. **Ana bölümler:** Ekranın kaç ana bölümü var (header, content, footer, sidebar vb.)
2. **Görsel akış:** Kullanıcı gözünün doğal akışı (F-pattern, Z-pattern, üstten alta)
3. **Öne çıkan öğeler:** CTA butonları, başlıklar, görsel odak noktaları
4. **Boşluk dengesi:** Sıkışık mı, dengeli mi, çok boş mu
5. **Okuma sırası doğru mu?** Başlık → alt başlık → içerik → CTA sırası mantıklı mı?
6. **Vurgu doğru elemanda mı?** CTA görsel olarak en dikkat çekici mi, yoksa dekoratif bir öğe mi öne çıkıyor?
7. **Tipografi hiyerarşisi net mi?** Kaç farklı boyut var? 3-4 kademe yeterli, 7+ sorun işareti
8. **Beyaz alan etkili mi?** Kasıtlı dramatik boşluk mu, dengesiz dağılım mı, sıkışıklık mı?

### Step 6: Geri Bildirim Prensipleri

Rapor üretilirken aşağıdaki prensiplere uyulmalı:

1. **Spesifik ol** — "CTA navigasyonla yarışıyor" yaz, "layout kafa karıştırıcı" yazma
2. **Neden'i açıkla** — Geri bildirimi tasarım prensibine veya kullanıcı ihtiyacına bağla
3. **Alternatif öner** — Sadece sorun tespit etme, çözüm de sun
4. **İyi olanı kabul et** — Yalnızca eleştiri değil, iyi yapılan şeyleri de raporla
5. **Aşamaya göre ayarla** — Erken keşif farklı feedback alır, son düzeltme farklı

### Step 7: Rapor Üret

> **Marka Profili Entegrasyonu:** `.fmcp-brand-profile.json` varsa `aestheticDirection` ve `typography` bilgisiyle değerlendir — ekranın marka estetiğiyle uyumu raporla.

## Çıktı Formatı

### Executive Summary (Varsayılan)

```markdown
# Ekran Analiz Raporu — [Ekran Adı]

## Özet Tablo

| Metrik | Değer | Durum |
|---|---|---|
| Toplam öğe | 127 | — |
| DS bileşeni (instance) | 23 | ✓ İyi |
| Benzersiz bileşen türü | 8 | — |
| Token'a bağlı öğe | 45 | ✓ İyi |
| Bağsız renk (hardcode) | 5 | ⚠ Düzeltilmeli |
| DS Uyum Oranı | %85 | ✓ Kabul edilebilir |

## Bileşen Envanteri

| Bileşen | Kullanım Sayısı |
|---|---|
| Button | 5 |
| Input | 3 |
| Card | 4 |
| NavBar | 1 |
| Avatar | 2 |
| Badge | 3 |
| Icon | 5 |

## Görsel Hiyerarşi

- **Ana akış:** Üstten alta, F-pattern
- **Bölümler:** Header → Arama → Filtreler → Kart Listesi → Footer
- **CTA:** "Yeni Ekle" butonu sağ üstte — dikkat çekici konumda ✓
- **Boşluk:** Dengeli — bölümler arası tutarlı spacing

## Öneriler

1. 5 hardcode renk token'a bağlanmalı (tema değişikliğinde kırılır)
2. Alt bölümdeki 2 custom card DS Card bileşenine çevrilebilir
3. Genel DS uyumu iyi — üretime hazır

## Sonraki Adımlar
→ `audit-figma-design-system` ile detaylı teknik denetim
→ `ai-handoff-export` ile implementasyon paketi
```

### Karşılaştırmalı Rapor (İki Ekran)

İki ekran ID'si verildiğinde yan yana karşılaştırma:

```markdown
## Karşılaştırma — Ekran A vs Ekran B

| Metrik | Ekran A | Ekran B | Fark |
|---|---|---|---|
| DS Uyum | %85 | %72 | Ekran B %13 düşük |
| Instance sayısı | 23 | 15 | Ekran B'de daha az DS kullanımı |
| Hardcode renk | 5 | 12 | Ekran B'de 2.4x daha fazla |
```

### JSON Çıktı (`--json`)

Yapılandırılmış JSON — dashboard veya CI entegrasyonu için.

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

## Hata Yonetimi

1. **Plugin baglanti hatasi:** `figma_get_status()` ile kontrol et. Bagli degilse kullaniciya Figma'da F-MCP ATezer Bridge plugin'ini acmasini soyler.
2. **Tool timeout:** Bir kez tekrar dene. Basarisizsa kapsami daralt (daha az node, daha dusuk depth).
3. **Bos yanit:** Hedef node veya sayfa var mi kontrol et. Kullaniciya net bilgi ver.
4. **Rate limit (REST tool'lar):** `figma_get_rest_token_status()` ile kontrol et. Limit dolduysa bekle.
5. **Beklenmeyen hata:** Hata mesajini kullaniciya goster, alternatif yaklasim oner.

## Evolution Triggers

- PO/PM geri bildirimine göre rapor metrikleri genişletilmeli
- Yeni DS analiz araçları bridge'e eklenirse daha detaylı metrikler çıkarılmalı
- Sprint/milestone bazlı trend izleme desteği eklenebilir
