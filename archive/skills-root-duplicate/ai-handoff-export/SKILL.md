---
name: ai-handoff-export
description: Figma tasarım verisini AI'nın kod üretimi için kullanabileceği tek bir handoff paketine dönüştürür (HANDOFF şablonu + JSON manifest). Node kimlikleri, design context özeti, token özeti, ekran görüntüsü referansları ve opsiyonel Code Connect haritası üretir. "AI handoff", "handoff dosyası", "handoff export", "teslimat paketi", "figma handoff", "koda teslim özeti", "design handoff oluştur" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
---

# AI Handoff Export

## Overview

Bu skill, dağınık Figma çıktılarını tek bir teslimat formatında toplar:

- `HANDOFF_TEMPLATE.md` (insan okunur)
- `handoff.manifest.json` (makine okunur, schema tabanlı)

Şablon: repo kökünde `HANDOFF_TEMPLATE.md`; şema: `docs/handoff.manifest.schema.json`.

## Required Workflow

### Step 1: Bağlantıyı doğrula

`figma_get_status`

### Step 2: Hedef node'ları netleştir

- Kullanıcı URL verdiyse `node-id` değerini ayıkla.
- Node belirsizse `figma_get_file_data(depth=1)` ile kapsam çıkar.

### Step 3: Design context topla

`figma_get_design_context` çağrısı:

- `includeLayout=true`
- `includeVisual=true`
- `includeTypography=true`
- `includeCodeReady=true`
- `depth=2`

### Step 4: Token ve component reuse özeti çıkar

- `figma_get_variables`
- `figma_search_components`
- gerekiyorsa `figma_get_component_details`

### Step 5: Screenshot referansı ekle

- `figma_capture_screenshot` veya `figma_take_screenshot`

### Step 6: Handoff dosyalarını üret

1. `HANDOFF_TEMPLATE.md` içini doldur.
2. `docs/handoff.manifest.schema.json` uyumlu `handoff.manifest.json` çıktısı oluştur.

### Step 7: Self-healing sonucunu işle

- İterasyon sayısını kaydet (`0-3`).
- Açık kalan sapmaları `openIssues` alanına yaz.
- Çözülemeyen fark varsa `manualReviewNeeded=true`.

## Rules

- Hardcoded renk/font yerine mevcut token isimlerini yaz.
- "Yeni component oluştur" kararı vermeden önce component araması yap.
- Handoff dosyasında varsayımları açıkça "riskler" altında belirt.
- Code Connect verisi yoksa alanı boş bırak; uydurma map yazma.
