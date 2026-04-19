---
name: figma-prototype-flow
description: Üretilen Figma ekranları arasında otomatik prototip bağlantıları, animasyonlar ve flow starting point oluşturur. Screen envanteri → navigasyon haritası → reactions → validate → dokümantasyon. "prototip bağla", "ekranları bağla", "prototype connections", "flow oluştur", "navigasyon kur", "animasyon ekle", "interaction ekle" ifadeleriyle tetiklenir. F-MCP Bridge ve figma_create_prototype_connection gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  version: 1.9.9
  personas:
    - designer
    - uidev
required_inputs:
  - name: screen_scope
    type: enum
    options:
      - "Tüm sayfa"
      - "Seçili frame'ler"
      - "Node ID listesi"
    question: "Hangi ekranları bağlayalım?"
    required: true
    default: "Tüm sayfa"
  - name: flow_name
    type: string
    question: "Flow adı ne olsun? (örn. 'Login Akışı')"
    required: true
  - name: starting_screen
    type: node_id_or_auto
    question: "Başlangıç ekranı hangisi? ('auto' derseniz ilk Login/Onboarding/Home tipindeki ekran seçilir.)"
    required: false
    default: "auto"
  - name: animation_profile
    type: enum
    options:
      - "Varsayılan (FUTURE.md animasyon tablosu)"
      - "Hızlı (200ms EASE_OUT)"
      - "Yumuşak (400ms GENTLE)"
      - "Özel (her bağlantı için sor)"
    required: false
    default: "Varsayılan (FUTURE.md animasyon tablosu)"
  - name: autonomy_mode
    type: enum
    options:
      - "Otonom (varsayılan — kritik dallanmada sorar)"
      - "Onaylı (her adımda kullanıcı onayı ister)"
    required: false
    default: "Otonom (varsayılan — kritik dallanmada sorar)"
---

# Figma Prototype Flow — Ekranlar Arası Navigasyon ve Animasyon

> **Otonom çalışma ilkesi (v1.9.9+):** Bu skill varsayılan olarak otonom çalışır. Screen envanteri, button text heuristic'i, animasyon eşleme ve bağlantı oluşturma kullanıcı onayı gerektirmeden yürütülür. Kullanıcıya yalnızca **kritik dallanma** noktalarında sorulur: (1) heuristic hedef çözümleyemediğinde, (2) 50+ bağlantı tespit edildiğinde, (3) orphan/circular overlay bulunduğunda, (4) `autonomy_mode=Onaylı` seçildiğinde her adımda.

## Overview

Bu skill, Figma sayfasındaki ekranlar (FRAME'ler) arasında prototip bağlantıları, animasyonlar ve flow starting point'i otomatik oluşturur. Figma Prototype panel'inin tüm özellikleri (9 trigger, 8 action, 9 transition tipi × 4 yön, 11 easing, scroll behavior, overlay ayarları) desteklenir.

**Temel ilke:** Kullanıcının ekranlarını tarar, button/link text'lerinden niyeti çıkarır, navigasyon haritasını üretir ve `setReactionsAsync` ile Figma reactions API'sini çağırır. Her şey plugin context'inde çalışır, REST API gerekmez.

## Skill Boundaries

- **Bu skill:** prototip bağlantı + animasyon + flow starting point + scroll behavior
- Ekran üretimi → [generate-figma-screen](../generate-figma-screen/SKILL.md)
- Code Connect eşlemesi → [code-design-mapper](../code-design-mapper/SKILL.md)
- A11y focus order → [figma-a11y-audit](../figma-a11y-audit/SKILL.md)
- Handoff diagram → [ai-handoff-export](../ai-handoff-export/SKILL.md)

## Prerequisites

- F-MCP Bridge plugin bağlı (`figma_get_status` yeşil dönmeli)
- Hedef sayfada en az 2 FRAME
- Ekranlar içinde Button/Link instance'ları isimlendirilmiş olmalı (navigasyon haritası için — isimlendirilmemiş jenerik Rectangle'lar yakalanmaz)

## F-MCP skill koordinasyonu

- **Önce:** `generate-figma-screen` veya `fmcp-screen-recipes` ile ekranlar üretilmiş olmalı
- **Birlikte:** `figma-canvas-ops` (her `figma_execute` öncesi zorunlu)
- **Sonra:** `figma-a11y-audit` (focus sırası cross-check), `ai-handoff-export` (flow diagram)

## Required Workflow

**Bu adımları sırayla uygula. Adım atlama.**

### Step 0: Ön koşullar ve Otonom Mod Ayarı

```
1. figma_get_status() → plugin bağlı mı?
2. .claude/design-systems/active-ds.md kontrolü (DS context bilgisi için)
3. autonomy_mode girdisini oku:
   - "Otonom" → varsayılan, kritik dallanmalarda sor
   - "Onaylı" → her Step sonunda kullanıcıya özet + AskUserQuestion
```

### Step 1: Screen Envanteri

```js
// Plan A: figma_get_file_data(depth=1) ile üst seviye FRAME listesi
const data = await figma_get_file_data({ depth: 1, verbosity: "standard" });
// Plan B (daha zengin): figma_execute ile page.children filtrele
// return figma.currentPage.children.filter(c => c.type === "FRAME").map(f => ({ id: f.id, name: f.name, width: f.width, height: f.height }));
```

Çıktı tablosu:

| # | Frame ID | Frame Adı | Rol Tahmini | Boyut |
|---|---|---|---|---|
| 1 | `1:2` | "Login / Mobile" | Login | 402×874 |
| 2 | `1:3` | "Home / Mobile" | Home | 402×874 |
| 3 | `1:4` | "Register" | Register | 402×874 |

**Rol tahmini regex'leri (case-insensitive):**
- Login: `/^(login|giriş|sign ?in)/i`
- Home / Dashboard: `/^(home|anasayfa|dashboard|main)/i`
- Register: `/^(register|kayıt|sign ?up)/i`
- ForgotPassword: `/^(forgot|şifre)/i`
- Check Email: `/^(check email|e-posta kontrol|onay)/i`
- Settings / Profile: `/^(settings|ayarlar|profile|profil)/i`
- Onboarding: `/^(onboard|welcome|hoşgeldin)/i`

Eşleşme yoksa rol = `Generic`; heuristic'te kullanıcıya sorulur.

### Step 2: Navigasyon Haritası (Heuristic-Based)

#### 2a. Etkileşimli eleman tespiti

Her frame içinde:

```js
frame.findAll(n =>
  (n.type === "INSTANCE" && /button|btn|cta|link|action/i.test((n.mainComponent?.name || n.name))) ||
  (n.type === "TEXT" && n.parent?.type !== "TEXT" && /^(Giriş|Kayıt|Şifre|Devam|Geri|İptal|Tamam|Login|Sign|Back|Cancel|Submit|Continue)/i.test(n.characters || "")) ||
  (n.type === "FRAME" && /clickable|hotspot|tappable/i.test(n.name))
)
```

Button text'i: `button.findOne(t => t.type === "TEXT")?.characters` ile okunur.

#### 2b. Button text → hedef heuristic tablosu (TR + EN)

| Button text pattern (regex, case-insensitive) | Muhtemel hedef rol | Action | Transition |
|---|---|---|---|
| `^(giriş yap\|giriş\|login\|sign ?in)` | Home \| Dashboard \| Main | NAVIGATE | SLIDE_IN / RIGHT |
| `^(kayıt ol\|kayıt\|sign ?up\|register)` | Register \| SignUp | NAVIGATE | SLIDE_IN / RIGHT |
| `^(şifremi unuttum\|forgot)` | ForgotPassword | NAVIGATE | SLIDE_IN / RIGHT |
| `^(gönder\|submit\|send)` | Success \| Confirmation \| CheckEmail | NAVIGATE | SLIDE_IN / RIGHT |
| `^(geri\|back\|<)` | — (navigation history) | BACK | SLIDE_IN / LEFT |
| `^(iptal\|cancel\|×\|✕\|kapat\|close)` | — (overlay ise CLOSE, aksi BACK) | CLOSE / BACK | DISSOLVE |
| `^(devam\|continue\|ileri\|next)` | Sayfa sıralamasında sonraki frame | NAVIGATE | SLIDE_IN / RIGHT |
| `^(google ile\|facebook ile\|apple ile\|sign in with)` | Auth overlay | OVERLAY | DISSOLVE |
| `^(kaydet\|save\|onayla\|confirm)` | Success \| Confirmation | NAVIGATE | SLIDE_IN / RIGHT |
| `^(çıkış\|logout\|sign ?out)` | Login \| Landing | NAVIGATE | SLIDE_IN / LEFT |
| Hedef eşleşmiyor | — | **Kullanıcıya sor** (AskUserQuestion — kritik dallanma) | — |

#### 2c. Frame adı çözümleme

Heuristic'teki "Muhtemel hedef rol" → sayfadaki frame adıyla eşle:
- Regex: `home` → `/home|dashboard|anasayfa|main/i`
- TR↔EN yaklaşıklığı: `home ≈ anasayfa`, `register ≈ kayıt`, `success ≈ onay`

Eşleşme yoksa → `destination: "?"` → kullanıcıya sor (kritik dallanma).

#### 2d. Otonom mod davranışı

- **`autonomy_mode=Otonom` (varsayılan):** Heuristic %100 eşleşen bağlantılar otomatik uygulanır. Sadece `destination: "?"` olan satırlar için AskUserQuestion.
- **`autonomy_mode=Onaylı`:** Tüm harita markdown tablo olarak `AskUserQuestion` ile sunulur, kullanıcı satır-bazlı onaylar.

**Çıktı formatı (her iki modda gösterilir):**
```
| # | Kaynak | Button | → Hedef | Action | Transition | Mod |
|---|--------|--------|---------|--------|------------|-----|
| 1 | Login  | "Giriş Yap" | Home     | NAVIGATE | SLIDE_IN/RIGHT | auto |
| 2 | Login  | "Kayıt Ol"  | Register | NAVIGATE | SLIDE_IN/RIGHT | auto |
| 3 | Login  | "Devam"     | ?        | ?        | ?              | ask  |
```

### Step 3: Reactions Oluştur (Chunking Kuralı)

#### 3a. Ölçek tespiti

| Bağlantı sayısı | Strateji |
|---|---|
| ≤ 20 | Tek seferde hepsi, her 5 bağlantıda 1 micro-report |
| 21-50 | 10'lu chunk'lara böl, her chunk sonrası `figma_capture_screenshot` + progress |
| > 50 | **Kritik dallanma** — kullanıcıya sor: "Önce kritik flow'ları mı (Auth/Onboarding/Ana akış)?" |
| > 100 | **HARD STOP** — "Bu ölçekte batch modu gelecekte. Şimdi en kritik 50 bağlantıyı seç." |

#### 3b. Animasyon standartları (FUTURE.md:232-241)

| Geçiş | transitionType | direction | duration | easing | matchLayers |
|---|---|---|---|---|---|
| İleri navigasyon | `SLIDE_IN` | `RIGHT` | 300 | `EASE_OUT` | — |
| Geri navigasyon | `SLIDE_IN` | `LEFT` | 300 | `EASE_OUT` | — |
| Push ileri | `PUSH` | `RIGHT` | 300 | `EASE_OUT` | — |
| Modal açma | `DISSOLVE` | — | 200 | `EASE_IN` | — |
| Modal kapama | `DISSOLVE` | — | 150 | `EASE_OUT` | — |
| Smart variant | `SMART_ANIMATE` | — | 300 | `EASE_IN_AND_OUT` | `true` |
| Hover state | `SMART_ANIMATE` | — | 150 | `EASE_IN` | `true` |
| Press state | `SMART_ANIMATE` | — | 100 | `EASE_OUT` | `true` |
| Anlık | `INSTANT` | — | — | — | — |

#### 3c. Her bağlantı için tool çağrısı

```js
await figma_create_prototype_connection({
  sourceNodeId: button.id,
  destinationNodeId: homeFrame.id,
  trigger: "ON_CLICK",
  action: "NAVIGATE",
  transitionType: "SLIDE_IN",
  direction: "RIGHT",
  duration: 300,
  easing: "EASE_OUT"
});
```

**Çoklu trigger:** Aynı node'a birden fazla reaction gerekiyorsa (hover + click aynı button'da), default `replace: false` sayesinde append edilir.

### Step 4: Flow Starting Point

```js
// autonomy_mode=Otonom: starting_screen="auto" ise ilk Login/Onboarding/Home tipi frame seçilir
const start = startingScreen === "auto"
  ? screens.find(s => ["Login","Onboarding","Home"].includes(s.role)) || screens[0]
  : screens.find(s => s.id === startingScreen);

await figma_set_flow_starting_point({
  nodeId: start.id,
  name: flowName,
  description: `Auto-generated by figma-prototype-flow skill on ${new Date().toISOString()}`
});
```

### Step 5: Scroll Behavior (Opsiyonel)

Sayfada scroll gereken ekranlar varsa (uzun content, header'ı sticky yapılacak element):

```js
// Ana frame vertical scroll
await figma_set_scroll_behavior({ nodeId: frame.id, overflowDirection: "VERTICAL" });
// Header sticky
await figma_set_scroll_behavior({ nodeId: header.id, scrollBehavior: "FIXED" });
```

Otonom modda: frame height > viewport height ise otomatik `overflowDirection: "VERTICAL"` öner.

### Step 6: Validasyon

```js
const audit = await figma_get_prototype_connections({ pageScope: true });
```

Kontroller:
- Haritadaki her kaynağın `audit.connections[]` içinde en az 1 reaction'ı var mı?
- Tüm `destinationId`'ler hâlâ çözülüyor mu? (silinen frame → orphan)
- `audit.flowStartingPoints` doldu mu?
- Circular overlay var mı? — OVERLAY graph DFS, A→B→A kontrolü

Orphan veya circular bulunursa → **kritik dallanma**, kullanıcıya rapor.

### Step 7: Dokümantasyon

- `figma_capture_screenshot({ nodeId: pageRoot, scale: 1 })` ile flow overview
- JSON özet → `ai-handoff-export` ile uyumlu şekilde `prototypeFlow` anahtarı altında
- Mermaid `graph TD` diagram (handoff entegrasyonu için)

**Final Türkçe rapor:**
```
✅ Flow "Login Akışı" oluşturuldu
   - 12 bağlantı (11 auto, 1 manual)
   - Flow starting point: Login / Mobile
   - Orphan reaction: 0
   - Circular overlay: 0
   - Screenshot: ~/.fmcp/screenshots/<timestamp>-<nodeId>.png
```

## Türkçe Karakter Kuralı (ZORUNLU)

Tüm çıktılarda Türkçe karakterler (ş, ç, ğ, ö, ü, ı, İ) doğru kullanılmalı. Her Write sonrası bozuk encoding kontrolü:
```bash
grep -P "[ÃÄ]" <dosya>
```

## Hata Yonetimi

| Err prefix | Neden | Ne yap |
|---|---|---|
| `SOURCE_NOT_FOUND` | sourceNodeId geçersiz | Node ID'yi doğrula, sayfa değişmiş olabilir |
| `DESTINATION_NOT_FOUND` | destinationNodeId geçersiz | Hedef frame silinmiş olabilir — haritayı yeniden oluştur |
| `DESTINATION_REQUIRED` | NAVIGATE/OVERLAY vb. için hedef verilmemiş | BACK/CLOSE/URL dışında destinationNodeId zorunlu |
| `NAVIGATE_REQUIRES_FRAME` | NAVIGATE hedefi FRAME değil | Hedef node'u FRAME'e çevir |
| `UNSUPPORTED_NODE_TYPE` | Source reactions desteklemiyor (SLICE/CONNECTOR) | FRAME/INSTANCE/COMPONENT/GROUP/SECTION kullan |
| `KEYCODES_REQUIRED` | ON_KEY_DOWN trigger için keyCodes eksik | En az 1 tuş kodu (örn. [13]=Enter) ver |
| `DIRECTION_REQUIRED` | DirectionalTransition için direction eksik | LEFT/RIGHT/TOP/BOTTOM ver |
| `NO_COMPONENT_SET` | Variant değişimi için COMPONENT_SET context yok | Instance'ın main component'i COMPONENT_SET içinde olmalı |
| `VARIANT_NOT_FOUND` | targetVariantName set içinde yok | `figma_get_component_for_development` ile variant adlarını doğrula |
| `FLOW_REQUIRES_FRAME` | Flow starting point FRAME olmalı | nodeId'yi FRAME olarak seç |
| `MISSING_SCOPE` | `figma_get_prototype_connections`'a ne nodeId ne pageScope verilmiş | En az birini belirt |
| `OVERFLOW_REQUIRES_FRAME_LIKE` | overflowDirection FRAME benzeri node gerektirir | FRAME/COMPONENT/COMPONENT_SET/INSTANCE kullan |
| `SCROLL_BEHAVIOR_UNSUPPORTED` | scrollBehavior node tipi desteklemiyor | SceneNode subtype kullan |
| `MISSING_PARAM` | `figma_set_scroll_behavior` — en az bir param gerekli | overflowDirection veya scrollBehavior ver |

## Çıktı Formatı

Her oturum sonunda kullanıcıya:
- Toplam bağlantı sayısı (auto + manual ayrımı)
- Flow starting point: ad + node id
- Validasyon raporu: orphan reactions, circular overlays, eksik bağlantılar
- Screenshot path: flow overview
- Animasyon kullanım özeti: kaç SLIDE_IN, kaç DISSOLVE, kaç SMART_ANIMATE

## Evolution Triggers

- Figma Plugin API yeni Transition tipi eklerse → `transitionType` enum'a ekle
- SET_VARIABLE / CONDITIONAL action v2'de desteklenecek → ayrı tool adı önerisi: figma\_create\_prototype\_variable\_action (gelecek sürüm, henüz YOK)
- ON_KEY_DOWN gamepad desteği gerekirse → `device` enum zaten mevcut (XBOX_ONE/PS4/SWITCH_PRO)
- `batch` modu eklenirse → 100+ bağlantı için performans iyileşir (şu an her çağrı tek reaction = N roundtrip)
- Smart Animate için otomatik child matching heuristics → kullanıcı matchLayers seçmek zorunda kalmaz
- Overlay preset konumlar (centered/top/bottom) — şu an sadece manual `overlayRelativePosition`
