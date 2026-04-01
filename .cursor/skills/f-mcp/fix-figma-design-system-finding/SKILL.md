---
name: fix-figma-design-system-finding
description: audit-figma-design-system ile tespit edilen tek bir design system bulgusunu Figma tuvalinde dar kapsamda düzeltir (swap, token bağlama, variant hizalama). F-MCP Bridge ve figma_execute gerektirir. "tek bulguyu düzelt", "ds finding fix", "şu node'u kütüphaneye bağla" ifadeleriyle tetiklenir.
metadata:
  mcp-server: user-figma-mcp-bridge
---

# Fix Figma Design System Finding (dar yazma)

## Overview

**Tek bulgu**, **tek sorunlu node veya minimal küme**, **minimal okuma/yazma**. `audit-figma-design-system` çıktısı veya eşdeğer net görev tanımı olmadan kapsamı sessizce genişletme.

Ekran geneli veya çoklu bölüm için **apply-figma-design-system** kullan.

## F-MCP araç eşlemesi

| Niyet | F-MCP Bridge |
|--------|----------------|
| Okuma | `figma_get_design_context`, `figma_capture_screenshot`, `figma_get_file_data` (gerekirse düşük `depth`), `figma_get_component`, `figma_get_variables`, `figma_get_styles` |
| Kütüphane adayı | `figma_search_components`, `figma_get_component` |
| Tuval yazma / Plugin API | `figma_execute` (Figma plugin JS; swap, import, yedek kopya) |
| Bağlantı | `figma_get_status()` |

`figma_execute` içinde büyük JSON döndürme; **figjam-diagram-builder** skill’indeki kısa dönüş disiplinine benzer şekilde özet sonuç tercih et.

## F-MCP skill koordinasyonu

| Durum | Sonraki skill |
|--------|----------------|
| Audit’ten önce tek düzeltme istendi | İsteğe bağlı kısa `audit-figma-design-system` ile doğrula; sonra bu skill |
| Birden fazla bulgu, koordineli reconcile | **apply-figma-design-system** |
| Sadece kod token dosyası güncellemesi | **design-token-pipeline** (tuval + kod ayrı) |
| Düzeltme sonrası kod parity | **design-drift-detector** |
| Mapping güncellemesi | **code-design-mapper** |
| İsteğe bağlı regresyon (tuval) | **audit-figma-design-system** ile aynı node’u yeniden denetle |

## Beklenen girdi

- `audit-figma-design-system` JSON’undan tek `finding`, veya
- Aynı JSON + hangi bulgunun hedeflendiği, veya
- Sorun özeti + Figma URL / `fileKey` + `nodeId`

Audit JSON kullanılıyorsa `code_location.absolute_file_path` içinden `fileKey` ve `nodeId` çıkar: `/figma/<fileKey>/nodes/<nodeId>`.

## Kapsam kuralı

Seçilen bulgu çözülene, **blocked** veya **needs-follow-up** raporlanana kadar başka cleanup yapma. Birden fazla bulgu kullanıcıda varsa birini seç veya en yüksek öncelikli tekini uygula; geri kalanı için audit/apply yönlendir.

## Required Workflow

1. **Normalize:** `fileKey`, `nodeId`, bulgu başlığı ve gerekçe.
2. **Uyumluluk (belirsiz replacement’ta):** Yazmadan önce hangi component/variant, override’lar, layout sözleşmesi — sonuç `safe-to-apply` \| `blocked` \| `needs-human-choice`. `blocked` / `needs-human-choice` ise yazma; durumu bildir.
3. **Minimal kanıt:** `figma_capture_screenshot`; yapı için `figma_get_design_context` veya `figma_get_file_data` (dar kapsam); token bulgusuysa `figma_get_variables` / `figma_get_styles`; gerekirse `figma_search_components`.
4. **Remediasyon modu (tek seç):** `swap-instance` \| `compose-from-primitives` \| `bind-tokens` \| `align-variant` \| `blocked`. En küçük yeterli değişiklik.
5. **Yedek:** Yıkıcı düzenlemeden önce yalnızca etkilenen alt ağacı veya minimal üst section’ı çoğalt; net isimlendir (`Backup - Fix finding …`). Mümkünse ayrı `figma_execute` çağrısı; dönen node id’yi not et.
6. **Uygula:** `figma_execute` ile adım adım; mümkünse `swapComponent` benzeri koruyucu yollar; karşılaştırmalı rebuild gerekiyorsa orijinalin yanında inşa et.
7. **Doğrula:** Bulgunun özellikle çözüldüğünü screenshot ve yapı ile kanıtla; global pattern dokunduysa genişlet.
8. **İsteğe bağlı:** Regresyon için **audit-figma-design-system** ile aynı kapsamı yeniden çalıştır (özellikle çok adımlı fix sonrası).

## Yazma kuralları

- Belirsiz replacement’ta `safe-to-apply` yoksa yazma.
- Tek bulgu düzeltildi diye tüm ekranı “sistemde” ilan etme.
- Component key ve variable id’leri isimden önce tercih et.
- Import timeout / erişilemeyen kütüphane → `blocked`, zorla devam etme.

## Kapanış raporu

- **Finding fixed:** Ne değişti, hangi node.
- **Validation:** Orijinal şikayetin giderildiği kanıtı.
- **Blocked / Follow-up:** Varsa kısa.
