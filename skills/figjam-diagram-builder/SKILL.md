---
name: figjam-diagram-builder
description: F-MCP Bridge ile FigJam üzerinde güvenli ve ölçekli diyagram/süreç şeması üretir. 1MB tool-result taşmalarını önlemek için kısa dönüş, adımlı üretim ve deterministik koordinat stratejisi uygular. "figjam çiz", "swimlane oluştur", "figjam diyagram", "process map", "flowchart figjam", "akış şeması çiz", "süreç haritası" ifadeleriyle tetiklenir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designer
    - designops
    - po
---

# FigJam Diagram Builder (FMCP Safe Mode)

## Overview

Bu skill, FMCP ile FigJam üzerinde programatik diyagram üretirken iki kritik problemi çözer:

1. Tool result boyutunun büyüyerek oturumu kırması
2. Çok adımlı üretimde context şişmesi ve kararsız yerleşim

Skill, her adıma kısa ve güvenli dönüş zorunluluğu getirir; node/connector pozisyonlarını saklamak yerine yeniden hesaplar.

## Prerequisites

- F-MCP Bridge plugin açık ve bağlı olmalı
- Hedef FigJam dosyası Figma Desktop'ta açık olmalı
- Kullanıcıdan şema tipi alınmalı (swimlane, flowchart, karar ağacı vb.)

## F-MCP skill koordinasyonu

- Süreç/diyagram odaklıdır; token veya kod üretim döngüsüyle zorunlu sıra yoktur. Ürün ekranı ve implementasyon için **implement-design** veya **ai-handoff-export** ayrı akıştır; tuval DS düzeltmesi için **apply-figma-design-system** / **audit-figma-design-system**.

## Required Workflow

### Step 1: Plugin Bağlantısını Doğrula

```txt
figma_get_status()
figma_list_connected_files()
```

- `pluginConnected=false` ise kullanıcıdan plugin'i ilgili FigJam dosyasında yeniden çalıştırmasını iste.
- Port uyuşmazlığında plugin portunu `bridgePort` ile eşleştir.

### Step 2: Güvenli execute kuralları

`figma_execute` dönüşü her zaman kısa olmalı:

- Kısa durum string'i: `"OK: 12 node, 14 connector"`
- Kısa hata string'i: `"HATA: ..."` (maksimum ~200 karakter)
- Küçük JSON: `{"count": 12, "x": 3500, "y": 100}`

Asla büyük node listesi, `currentPage.children`, büyük JSON veya pluginData dump döndürme.

**Timeout:** Varsayılan 5000ms. Çok node oluşturma işlemlerinde `timeout` parametresini artır (maks 30000ms). Bkz. "Common Issues" bölümü.

### FigJam Font Kuralı

`createShapeWithText()` varsayılan fontu **"Inter Medium"**'dir. Shape text düzenlemeden ÖNCE:

```js
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
```

"Inter Regular" yüklemek YETMEZ — FigJam shape'leri "Medium" kullanır. Alternatif olarak mevcut fontu dinamik kontrol et:
```js
await figma.loadFontAsync(shape.text.fontName);
```

### Step 3: Adımlar arası veri stratejisi

Veriyi `setPluginData/getPluginData` ile taşımak yerine her adımda aynı layout sabitlerinden yeniden hesapla.

Önerilen sabitler:

```txt
OX=3500, OY=100, LW=160, CW=300, LH=200, HH=64, NW=240, NH=76
```

### Step 4: 3 fazlı üretim (önerilen)

1. Zemin: lane/background/header
2. Node'lar: kartlar, metinler, rozetler
3. Connector'lar: oklar ve karar bağlantıları

Her faz sonunda kısa sonuç döndür.

### Step 5: Viewport ve tarama güvenliği

- `figma.currentPage.children` tarama/return yapma
- Yalnızca o adımda oluşturulan node'ları lokal `created[]` listesinde tut
- Zoom için sadece `created[]` kullan

### Step 6: Büyük dosyada veri okuma

Önce düşük kapsamla başla:

```txt
figma_get_file_data(depth=1, verbosity="summary")
figma_get_design_context(depth=1, verbosity="summary", excludeScreenshot=true)
```

Detay gerekiyorsa parçalı ilerle (node bazlı çek).

## FigJam Swimlane Pattern

### Renk kullanımı

- FigJam uyumlu RGB (0-1 aralığı) renkler kullan
- Lane bazında semantic palet tanımla (ör. müşteri, operasyon, ortak hizmet)

### Connector stili

- Varsayılan stroke + arrow cap
- Opsiyonel dashed pattern ile alternatif akışları ayır

### Karar noktası

- `createPolygon(pointCount=4)` + `rotation=45` ile diamond üret

## Context Safety Checklist

Her `figma_execute` öncesi kontrol et:

- [ ] Dönüş < 500 karakter mi?
- [ ] `currentPage.children` erişimi var mı? Varsa kaldır
- [ ] Büyük pluginData yazma/okuma var mı? Varsa kaldır
- [ ] Pozisyonlar sabitlerden yeniden hesaplanıyor mu?
- [ ] Zoom sadece lokal `created[]` ile mi yapılıyor?

## Common Issues and Solutions

### Sorun: 1MB tool result hatası

Çözüm: Return değerini kısa string/özet JSON'a indir; node listesi döndürme.

### Sorun: Çok adımda yerleşim kayıyor

Çözüm: Koordinatları persist etme; her adımda sabitlerden deterministik hesapla.

### Sorun: Bağlantı koptu

Çözüm: `figma_get_status()` ile kontrol et, plugin'i ilgili dosyada yeniden başlat, `figma_list_connected_files()` ile doğrula.

### Sorun: Timeout — çok node tek çağrıda

FigJam `createShapeWithText()` her biri font yükleme gerektirdiğinden Figma Design node'larından yavaştır.

**Güvenli node limitleri (tek `figma_execute` çağrısı, varsayılan 5000ms):**
- 1-6 shapeWithText: varsayılan timeout yeterli
- 7-12 node: `timeout: 10000` kullan
- 13+ node: İşlemi birden fazla çağrıya böl (önerilen)

```
figma_execute({ code: "...", timeout: 15000 })
```

Fontu her çağrıda bir kez yükle, ardından tüm node'ları oluştur (her node için ayrı `loadFontAsync` çağırma):
```js
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
// Tüm node'ları oluştur — font zaten yüklü
for (let i = 0; i < 8; i++) {
  const s = figma.createShapeWithText();
  s.text.characters = "Node " + i;
}
```

## Hata Yonetimi

1. **Plugin baglanti hatasi:** `figma_get_status()` ile kontrol et. Bagli degilse kullaniciya Figma'da F-MCP ATezer Bridge plugin'ini acmasini soyler.
2. **Tool timeout:** Bir kez tekrar dene. Basarisizsa kapsami daralt (daha az node, daha dusuk depth).
3. **Bos yanit:** Hedef node veya sayfa var mi kontrol et. Kullaniciya net bilgi ver.
4. **Rate limit (REST tool'lar):** `figma_get_rest_token_status()` ile kontrol et. Limit dolduysa bekle.
5. **Beklenmeyen hata:** Hata mesajini kullaniciya goster, alternatif yaklasim oner.

## Evolution Triggers

- Bridge'e FigJam-spesifik araçlar eklenirse (ör. connector oluşturma aracı) adımlı üretim stratejisi basitleştirilebilir
- `figma_execute` boyut/payload limiti değişirse kısa dönüş kuralları uyarlanmalı
- Yeni diyagram türleri (Gantt, mindmap) talep edilirse koordinat şablonları eklenmeli
