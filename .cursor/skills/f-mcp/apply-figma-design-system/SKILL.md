---
name: apply-figma-design-system
description: Mevcut Figma ekranını yayınlanmış design system bileşenleri ve token'larıyla çok bölümlü şekilde hizalar; yedek, envanter, bölüm bölüm swap/compose. "ekranı ds'ye bağla", "kütüphaneye geçir", "design system apply", "tasarım sistemi uygula", "bileşenleri hizala", "token'ları bağla" ifadeleriyle tetiklenir. F-MCP Bridge ve figma_execute gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  personas:
    - designer
    - designops
---

# Apply Figma Design System (geniş yazma)

## Overview

Mevcut bir frame/page **published design system** kullanmalıdır; detached layer, yerel wrapper ve tek seferlik kompozisyonlar hedeflenir.

**Tek dar bulgu** için **fix-figma-design-system-finding** kullan; bu skill çok bölüm ve koordineli reconcile içindir.

## Giriş Modları

Bu skill iki farklı modda çalışabilir:

1. **review-then-apply** *(varsayılan)* — Tam audit → envanter → bölüm sınıflandırması → onay → uygulama. İlk kez DS hizalaması yapılıyorsa veya kapsamlı tarama istendiğinde kullanılır.
2. **apply-known-scope** — Kullanıcı hedef frame'leri ve stratejiyi zaten biliyorsa (ör. önceki audit'ten), audit adımları atlanır ve doğrudan uygulama başlar. Giriş: `{ frames: [{ id: "72:293", strategy: "exact-swap" | "compose-from-primitives" }] }`.

Mod, kullanıcı girdisinden otomatik çıkarılır: frame ID + strateji belirtilmişse `apply-known-scope`, aksi halde `review-then-apply`.

## %80 Uyum Eşiği

Bölüm sınıflandırması sonrası uyum oranı hesaplanır:
```
uyumOranı = (already-connected + exact-swap + compose-from-primitives) / toplamBölüm
```
- `uyumOranı >= 0.80`: Otomatik uygulama önerilir.
- `uyumOranı < 0.80`: Uyarı gösterilir — "67% (16/24) otomatik düzeltilebilir. Minimum %80 önerilir. Devam edilsin mi?" Kullanıcı onay vermeden uygulama başlamaz.

## Bölüm sınıflandırması

Her bölüm tam olarak biri:

- `already-connected` — Zaten kütüphane instance veya kullanıcıca kabul görmüş kompozisyon
- `exact-swap` — Tek bir library component/variant ile doğrudan değiştirilebilir
- `compose-from-primitives` — Tek composite yok; yayınlanmış primitive’lerle yeniden kurulur
- `blocked` — Kütüphane yok, import başarısız veya kasıtlı bespoke

## F-MCP araç eşlemesi

| Niyet | F-MCP Bridge |
|--------|----------------|
| Özet / sayfa yapısı | `figma_get_file_data`, `figma_get_design_system_summary` |
| Görsel | `figma_capture_screenshot` |
| Yapı envanteri | `figma_get_file_data`, `figma_get_design_context`, `figma_execute` (instance → mainComponent keşfi) |
| Aday bileşen | Önce aynı dosyadaki referans ekranlar; sonra `figma_search_components` |
| Token | `figma_get_variables`, `figma_get_styles` |
| Yazma | `figma_execute` |

## F-MCP skill koordinasyonu

| Önce | Sonra |
|------|--------|
| Kapsam belirsiz | **audit-figma-design-system** (veya eşdeğer iç audit) — tek bulgu çıkarsa **fix-figma-design-system-finding**’e geç |
| Token kodda da senkron olmalı | **design-token-pipeline** |
| Kod-Figma parity | **design-drift-detector**, **code-design-mapper** güncellemesi |
| Koda geçiş | **ai-handoff-export** veya **implement-design** |
| Repo kuralları | **design-system-rules** |

Uçtan uca önerilen sıra özeti: **audit-figma-design-system** skill’indeki “Önerilen uçtan uca akış” bölümüne bak.

## Core kural

Birkaç DS butonu içerdi diye bölüm “bağlı” sayılmaz. Bu skill **çok bölüm** reconcile içindir.

## Required Workflow (özet)

1. **Plugin bağlantısını doğrula:** `figma_get_status()` — bağlantı yoksa devam etme.
3. **Kapsam:** Gerekirse audit; tek bulguya düşerse fix skill’e yönlendir.
3. **Durum yakala:** `figma_get_file_data` (gerekirse düşük `depth`) + `figma_capture_screenshot`; isteğe bağlı `figma_get_design_context` (Code Connect uyarısı varsa araç talimatına uy).
4. **Yedek:** Hedef frame/page çoğalt, sağa `Backup - …` adıyla koy; mümkünse ayrı `figma_execute`, oluşan id’yi dön.
5. **Envanter:** `figma_execute` ile section instance’ları, `mainComponent`, remote/local, iç içe published kullanımı topla (Edenspiekermann örnek pattern’i referans: instance listesi JSON ile kısa dönüş).
6. **Harita:** Önce dosya içi kanıt ekranları, sonra gerekirse `figma_search_components`. Variant seçimini orijinal görsel/ipuçlarına göre yap; varsayılan variant’a sessizce düşme.
7. **Strateji:** Bölüm başına `exact-swap` vs `compose-from-primitives` vs `blocked` karar ver.
8. **Uygula:** **Bölüm bölüm**, tek script ile tüm ekranı yıkma; auto-layout olmayan üstlerde x/y ve boyutları açıkça koru; drift uyarısı ver.
9. **Import hata:** Dur; alakasız edit yapıp “bağlandı” deme; key doğrula, tekrar dene; olmazsa `blocked` raporla.
10. **Doğrula:** Her bölüm sonrası screenshot; sonda tam ekran.

## Import / layout kuralları

- `importComponentSetByKeyAsync` / `importComponentByKeyAsync` başarısız → dur, net blocker.
- Non-auto-layout parent: pozisyon ve boyut koru; swap sonrası kayma riskini kullanıcıya yaz.

## Kapanış özeti

`Swapped` / `Composed` / `Already connected` / `Blocked` (neden) listeleri. Hepsi blocked ise açıkça söyle.

## İlişkili skill

- Okuma-only ön kontrol: **audit-figma-design-system**
- Tek bulgu: **fix-figma-design-system-finding**

## Evolution Triggers

- Bridge'e yeni swap/compose araçları eklendiğinde reconcile stratejisi güncellenmeli
- `figma_search_components` kapasitesi değişirse bileşen eşleme adımları uyarlanmalı
- Yeni DS standartları (multi-brand, white-label) desteklenirse iş akışı genişletilmeli
