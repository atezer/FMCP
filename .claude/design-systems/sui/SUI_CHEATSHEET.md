# SUI Cheatsheet — Ekran Üretim Rehberi (Public)

> Bu dosya **public template**'dir — sadece pattern, isim ve iş akışı içerir. Kurumsal key'ler yoktur.
> Kişisel cache: `~/.claude/data/fcm-ds/<file-key>/SUI_CHEATSHEET.md` (opsiyonel, kendi notlarınız).

---

## 1. 5 Saniyelik Karar Ağacı

```
Kullanıcı ekran istiyor mu?
├── Standart tip mi? (login/payment/profile/list/detail/form/onboarding/dashboard/settings)
│   ├── EVET → fmcp-screen-recipes Recipe N (bkz. §2)
│   └── HAYIR → Custom Path (bkz. §4)
├── Multi-screen akış / prototype / custom animation?
│   └── EVET → generate-figma-screen skill (Fast Path bypass)
└── Variable bind / re-theme / audit?
    └── fmcp-ds-audit-orchestrator veya apply-figma-design-system
```

**Fast Path aktif olursa beklenen metrik:** ≤5 execute, ≤10 dk, validate ≥80.

---

## 2. 9 Recipe — Hızlı Index

| Screen Type | Trigger | Çekirdek component isimleri |
|-------------|---------|-----------------------------|
| **login** | giriş, sign in | NavigationTopBar · Logo · Label · Button × 2 · Divider_H |
| **payment** | ödeme, checkout | NavigationTopBar · Label (amount) · Button primary · Divider_H |
| **profile** | profil, hesap | NavigationTopBar · user_circle icon · Label × N · Button destructive |
| **list** | liste, arama | NavigationTopBar · search icon · Label rows · chevron_right |
| **detail** | detay, ürün | NavigationTopBar · Label · Button primary |
| **form** | form, başvuru | NavigationTopBar · Label (inputs) · .line/point (stepper) · Button primary |
| **onboarding** | karşılama | Label (hero) · .line/point (pagination) · Button primary |
| **dashboard** | dashboard, anasayfa | NavigationTopBar · CTA/Action Icon Buttons · Label × N · Badge · Divider_H |
| **settings** | ayarlar | NavigationTopBar · Label × N · Button destructive |

Recipe detayları: `skills/fmcp-screen-recipes/SKILL.md:357-471`.

---

## 3. SUI Bilgi Mimarisi (5 Tab — Anasayfa için Referans)

Sahifinans ana uygulamasının navigasyon iskeleti:

| # | Tab | İkon Pattern | Açıklama |
|---|-----|--------------|----------|
| 1 | **Ana Sayfa** | home | Kullanıcı dashboard, hero card, quick actions |
| 2 | **Varlıklar** | bank-note | Hesaplar, kartlar, yatırım |
| 3 | **Planla** | plus_circle | Orta FAB / merkez action |
| 4 | **Tüm İşlemler** | list | Transaction history |
| 5 | **Profil** | user_circle | Settings, hesap |

---

## 4. Custom Dashboard Pattern (8-Section)

Standart recipe yetmezse bu iskeleti kullan:

```
Ana Frame (device preset, padding=0, gap=0, VERTICAL, bg=Surface/background level-0)
├── [edge] iOS & Android Status Bars instance
├── Content Body (FILL both, padding=spacing-100, gap=spacing-150, VERTICAL)
│   ├── Section 1: Header Row (avatar + greeting + notification)
│   ├── Section 2: Balance Hero Card (amount + eye toggle + delta)
│   │   bg=Surface/background level-1 · radius=radius-100 · padding=spacing-150
│   ├── Section 3: Quick Actions Row (CTA / Action Icon Buttons)
│   ├── Section 4: Accounts Carousel (horizontal scroll, gap=spacing-100)
│   ├── Section 5: Cards Widget (Label list)
│   ├── Section 6: Investment Mini Widget (Label + chart + indicator)
│   ├── Section 7: Campaign Banner (Component/badge/primary/background)
│   └── Section 8: Recent Transactions (Label × 5 + Divider_H between)
├── [edge] BottomNavBar (veya 5× row primitive fallback)
└── [edge] iOS Bars / Home Indicator
```

**Mega-adım dağılımı (hedef ≤5 execute):**
1. **M1:** Pre-flight + cache hit (token/component discovery ATLA) + text style scan
2. **M2:** Ana Frame + Content Body + Status Bar + Home Indicator (tek execute, ~8 op)
3. **M3:** Section 1-4 component placement (tek execute, ~12 op)
4. **M4:** Section 5-8 + BottomNavBar (tek execute, ~12 op)
5. **M5:** Dark variant + validate

---

## 5. Device Presets — Hızlı Tablo

| Preset | W | H | Default for |
|--------|---|---|-------------|
| **iPhone 17** | 402 | 874 | mobile (default) |
| iPhone 16 & 17 Pro | 402 | 874 | — |
| iPhone 16 | 393 | 852 | — |
| iPhone 13 & 14 | 390 | 844 | legacy |
| Android Compact | 412 | 917 | android |
| iPad Pro 11" | 834 | 1194 | tablet |
| Desktop | 1440 | 900 | desktop/web |

---

## 6. 3 MUTLAK KURAL

### Kural 1 — Fill Bind Zorunlu
```js
const paint = { type: 'SOLID', color: { r: 1, g: 1, b: 1 } };
const bgVar = await figma.variables.importVariableByKeyAsync(surfaceKey);
node.fills = [figma.variables.setBoundVariableForPaint(paint, 'color', bgVar)];
// Fill panel'de 🎨 variable icon GÖRÜNMELİ. Hardcoded hex YASAK.
```

### Kural 2 — Variant Seçim: DEFAULT Koru
```js
// İYİ — sadece override edilecekler
navBar.setProperties({ "Title Text#3107:6": "Ödeme" });
// KÖTÜ — default'u zorla override
navBar.setProperties({ "Title Text#3107:6": "Ödeme", "Subtitle#610:5": false, "Product": "main" });
```

### Kural 3 — Token Bind, Alias Resolve ETME
```js
// İYİ
const v = await figma.variables.importVariableByKeyAsync(spacing100Key);
node.setBoundVariable("paddingLeft", v);
// KÖTÜ — timeout riski
const resolved = v.valuesByMode[modeId];
```

### Kural 4 — appendChild ÖNCE, FILL SONRA (Rule 11)
```js
parent.appendChild(child);
child.layoutSizingHorizontal = "FILL";
```

---

## 7. Anti-Pattern Listesi

| ❌ Yapma | ✅ Doğrusu |
|---------|-----------|
| Screenshot ile ilham toplama | Metadata + layer tree (`findAll`) |
| Her execute'ta bir frame (parent/body/nav ayrı) | Tek execute'ta hiyerarşi |
| Sıralı tool zinciri | **Paralel** tool çağrıları (tek mesajda 3-4) |
| `figma_search_components` her seferinde | Cache-first (user-local) |
| `get_library_variables` filtresiz (96K char!) | `query:` veya `collectionName:` ile filtrele |
| 127 component full tarama | Top 30'a cache, eksik için on-demand |
| `valuesByMode` alias traversal | `setBoundVariable` yeterli |
| 20+ op tek `batch_design` | Max 15 op/execute |
| Her adımda narrate | Mega-adım sonu tek satır micro-report |
| Gerçek `componentKey` / `variableKey` repo'ya yazma | User-local cache + runtime resolve |

---

## 8. Hedef Metrikleri

| Metrik | Hedef | Tolerans |
|--------|-------|----------|
| Toplam `figma_execute` | ≤5 | 7 |
| Op/execute | ≤15 | 18 |
| Süre | ≤10 dk | 15 dk |
| `figma_validate_screen` | ≥80 | 70 (3 retry → fallback) |
| Hardcoded hex | 0 | 0 |
| Hardcoded fontSize | 0 | 0 |
| Cache hit (tokens) | %100 | %80 |
| Cache hit (components) | %80+ | %60 |

**Fallback tetik:** 3× validate <80 veya 2× execute timeout → `generate-figma-screen` skill.

---

## 9. Hızlı Komutlar

| İhtiyaç | Komut |
|---------|-------|
| İlk SUI cache'i oluştur | `/ds-sync sui` veya `"SUI cache oluştur"` |
| Ekran üret | `"SUI <screen_type> <platform>"` |
| Token cache yenile | `/ds-sync sui tokens` |
| Component cache yenile | `/ds-sync sui components` |
| Cache son sync | `"SUI ne zaman sync edildi?"` |
| Eksik component ekle | `"<ComponentName> bul ve cache'e ekle"` |

---

## 10. Sorun Giderme

| Sorun | Sebep | Çözüm |
|-------|-------|-------|
| `importComponentByKeyAsync` null | Key eskimiş | `/ds-sync sui components` → yeniden |
| `setProperties` "invalid property" | Property ID değişti | `main.componentPropertyDefinitions` oku |
| Fill panel'de 🎨 yok | `setBoundVariableForPaint` eksik | Kural 1 |
| Variant default bozuk | Gereksiz prop override | Kural 2 |
| Execute timeout | 15+ op | Mega-adımı böl |
| Dark=Light | `setExplicitVariableModeForCollection` atlanmış | Mode apply kontrol |
| FILL bozuk | appendChild sonrası sizing | Kural 4 |

---

## Referans

- `.claude/design-systems/sui/tokens.md` — token isim paternleri
- `.claude/design-systems/sui/components.md` — component isim paternleri + eksik listesi
- `~/.claude/data/fcm-ds/<file-key>/` — **gerçek cache** (user-local, gitignored)
- `skills/fmcp-screen-recipes/SKILL.md` — 5 mega-adımlı detay
- `skills/fmcp-screen-orchestrator/SKILL.md` — Fast Path tetiklenme
- `skills/figma-canvas-ops/SKILL.md` — Chunking + async kuralları
