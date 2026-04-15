# FCM Token Budget — Baseline ve Gerçek Ölçümler

Bu dosya FCM orkestratör sisteminin token maliyetini ve platform-spesifik ölçümlerini özetler. Part 2 refactor sonrası gerçek rakamlarla güncel tutulur.

## Baseline (Part 1 Öncesi)

Orkestratör refactor'den önceki "worst case" token yükü, bir ekran üretimi için:

| Kaynak | Satır | Tahmini Token |
|---|---|---|
| `_orchestrator-protocol.md` | 185 | ~4K |
| `skills/fmcp-intent-router/SKILL.md` | 551 | ~12K |
| `skills/generate-figma-screen/SKILL.md` | 1002 | ~25K |
| `skills/figma-canvas-ops/SKILL.md` | 500 | ~12K |
| `skills/inspiration-intake/SKILL.md` | 195 | ~4K |
| Agent (eski, 170 satır) | 170 | ~4K |
| **Setup overhead (toplam)** | | **~61K** |

Bu 61K, gerçek Figma API çağrılarından **önce** sadece skill/agent content'in context'e düşmesinden geliyor.

Claude Code'da sub-agent isolation sayesinde main context ~4K'da kalıyordu (sadece `Task` call). Ama Cursor/Desktop/Web'de sub-agent yok → 61K direkt main context'e düşerdi (bu platformlar desteklenmiyordu zaten).

## Part 2 Sonrası — Faz A (Gerçek)

Orchestrator skill'ler + thin agent delegator + lazy sub-skill loading ile:

| Platform | Baseline | Faz A Gerçek | Kazanç |
|---|---|---|---|
| Claude Code (main context) | ~4K | ~4K | 0 (zaten düşüktü) |
| Claude Code (sub-agent) | ~61K | ~43.5K | **-29%** |
| Cursor (main context) | N/A | ~43.5K | +29% vs Part 1 başarısız |
| Claude Desktop (main context) | N/A | ~43.5K | +29% vs Part 1 başarısız |
| Claude Web (main context, plan-only) | N/A | ~10K | +29% vs Part 1 başarısız (sub-skill lazy skip olursa) |

*"N/A" = Part 1'de desteklenmiyordu, Part 2 ile destek geldi.*

### Sub-Agent Context Dökümü (Claude Code)

```
Faz A sub-agent context (common case — text_only intake):

- agent delegator (yeni):          1.5K   [screen-builder.md 73 satır]
- fmcp-screen-orchestrator (yeni): 5K     [229 satır]
- generate-figma-screen (lazy):    25K    [1002 satır, ana motor — her zaman lazım]
- figma-canvas-ops (lazy):         12K    [500 satır, pre-flight — her figma_execute öncesi]
─────────────────────────────────────
Toplam:                            ~43.5K

Atlananlar (lazy skip / embedding):
- _orchestrator-protocol.md (4K) → embedded in orchestrator Essentials
- fmcp-intent-router (12K) → common case text_only → skip
- inspiration-intake (4K) → common case text_only → skip
Toplam atlanan: 20K
```

### Platform-Specific Notlar

**Claude Code (sub-agent):**
- Sub-agent isolation sayesinde 43.5K **main conversation'a girmez**, sadece sub-agent'ta yaşar
- Main conversation sadece `Task` call + sonuç raporu görür (~4K)
- Paralel sub-agent spawn edilebilir (örn. 3 alternatif üretimi → 3 ayrı sub-agent, her biri 43.5K, toplam 130K ama hepsi izole)

**Cursor (main context):**
- Sub-agent yok → 43.5K main chat context'e düşer
- Uzun oturumlarda dikkat: 8-10 mesajda context şişer
- Öneri: her büyük iş için yeni chat aç

**Claude Desktop (main context):**
- Cursor ile aynı
- Ek dezavantaj: her yeni oturumda Project knowledge'dan orchestrator yeniden yüklenir (cache yok)

**Claude Web (plan-only mod, main context):**
- `figma_*` tool'ları yok → generate-figma-screen ve figma-canvas-ops lazım değil
- Sadece orchestrator Essentials yeterli
- Tahmini: ~5-10K (plan-only için minimal)
- Gerçek mutation gerektiğinde kullanıcı Claude Code'a aktarır

## Part 2 Hedef vs Gerçek Sapma

**İlk plan hedefi:** Setup overhead ≤15K (~%75 azalma)

**Gerçek:** ~43.5K (~%29 azalma)

### Neden Sapma?

Plan `generate-figma-screen` (25K) + `figma-canvas-ops` (12K) sabit yükünü hafife almıştı. Bu iki skill common case'de **her zaman** lazım:
- `generate-figma-screen` ana iş motoru
- `figma-canvas-ops` her `figma_execute` öncesi pre-flight

Lazy-loading bunları "yüklenmedi" haline getiremez çünkü fiilen gerekli. Asıl tasarruf protocol embedding, intent-router skip, inspiration-intake skip ve agent shrink'ten geldi — toplamı ~18K.

### %75 Hedefine Ulaşmak İçin Ne Gerekir?

`generate-figma-screen` ve `figma-canvas-ops` skill'lerinin **kendilerinin** Essentials/Advanced formatına refactor edilmesi gerekir. Bu, Part 2 scope dışı tutuldu çünkü:

1. Bu iki skill v1.8.x serisinde olgunlaştırıldı — regression riski yüksek
2. Büyük dosya değişiklikleri sub-skill consumer'lar için breaking olabilir
3. Token'dan kazanacağımız ek miktar (%29 → %75) cross-platform kapsama ana kazanım değildir

**Alternatif roadmap:** Part 3 milestone olarak "Sub-skill compaction" — plan dışı tutuldu, ileride gerekirse.

## Gerçek Telemetri Kayıtları

Bu bölüm kullanıcının verification senaryolarını çalıştırdıktan sonra doldurulur.

### Claude Code — Senaryo A (no_idea → sepet ekranı)

Henüz manuel test yapılmadı. Beklenen:
- Sub-agent context: ~43.5K
- `figma_execute` sayısı: ≤5
- Cache hit (ikinci çalıştırma): %60+
- `figma_validate_screen` skor: ≥80
- Türkçe rapor süresi: <2 dakika

| Test tarihi | Sub-agent context | figma_execute | Cache hit | Validate skor |
|---|---|---|---|---|
| TBD | | | | |

### Claude Code — Senaryo D (ds-auditor a11y)

Henüz manuel test yapılmadı. Beklenen:
- Sub-agent context: ~25K (audit orchestrator + figma-a11y-audit sub-skill, generate-figma-screen yok)
- `figma_execute` sayısı: 0 (read-only)
- Validate skor: N/A (audit mode)

| Test tarihi | Sub-agent context | Cache hit | SEVERE bulgu | Rapor süresi |
|---|---|---|---|---|
| TBD | | | | |

### Claude Code — Senaryo E (token-syncer Tailwind)

Beklenen:
- Sub-agent context: ~20K (token-sync orchestrator + design-token-pipeline)
- `figma_execute` sayısı: 0 (sadece read + Write)
- Diff preview: gösterildi
- Onay: alındı

| Test tarihi | Sub-agent context | Diff preview | Onay | Binding coverage |
|---|---|---|---|---|
| TBD | | | | |

### Cursor — Senaryo A (manuel test)

Kullanıcı tarafından yapılacak. Telemetri Cursor'ın context viewer'ında gözlemlenir.

| Test tarihi | Main context | figma_execute | Validate skor |
|---|---|---|---|
| TBD | | | |

### Claude Desktop — Senaryo A (manuel test)

Project knowledge referans akışı. Desktop'ta detaylı telemetri yok, kaba gözlem.

| Test tarihi | Hisli main context | figma_execute | Validate skor |
|---|---|---|---|
| TBD | | | |

## Sonuç

Cross-platform kapsama Part 2'nin asıl değeridir. %29 token azalması ek bonus, ama ana motivasyon 4 platformun desteklenmesi. Verification manuel testler tamamlandıkça bu dosya güncel rakamlarla zenginleşir.

Gelecekte %75+ hedefi için sub-skill compaction (Part 3) düşünülebilir, ama **gerekli olduğu kanıtlanana kadar** scope'a alınmadı.

---

## Known Limitations (Bilinen Kısıtlamalar)

Aşağıdaki kısıtlamalar Part 2 kapsamında kabul edildi — ya scope dışıydı, ya plugin-side refactor gerektiriyordu, ya da ileriye taşındı.

### 1. `figma_validate_screen` Dark Mode Variable Binding Coverage'ı Ölçmüyor

**Durum:** Plugin-side limitation (`f-mcp-plugin/code.js`).

**Açıklama:** `figma_validate_screen` tool'u 3 boyutlu score üretiyor:
- Instance coverage %40 (library component kullanımı)
- Token binding coverage %30 (bound variables sayısı)
- Auto-layout coverage %30 (layoutMode != NONE)

Bu üç boyut **sadece mevcut mod** için ölçülüyor. Yani:
- Light ekran: tüm fill'ler variable'a bağlı → token binding %100
- Dark ekran (klon): bazı fill'ler hardcoded kalmış olsa bile → token binding hâlâ yüksek görünebilir (çünkü klon kaynak ekran olan light'tan kalıtır, "binding oldu" bilgisi kopyalanır ama **değer** dark mode'da çözülür)

**Pratik sonuç:** Step 5.17 Quality Gate her fill'i binding'e zorlar. Eğer bu gate geçiliyorsa dark mode otomatik çalışır (çünkü `setExplicitVariableModeForCollection` tüm bound fill'leri dark değerleriyle değiştirir). Ama Quality Gate aşılmışsa veya manuel bir hardcoded fill kalmışsa validate_screen bunu yakalamaz.

**Mitigation:** `skills/generate-figma-screen/SKILL.md:Step 5.6` adım 4'te dark frame için ayrı `figma_validate_screen(minScore=80)` çağrısı zorunlu + manuel göz kontrolü. Scora tek başına güvenme.

**Çözüm roadmap'i (Part 3+ adayı):** `f-mcp-plugin/code.js` içindeki `validateScreen` fonksiyonuna 4. scoring boyutu (dark mode binding coverage) eklenebilir. Algoritma: dark mode'u explicit olarak uygula → tüm fill/stroke değerlerini resolve et → hardcoded (non-bound) sayısını say → oranı hesapla. Ama bu v1.8.x plugin kodunu değiştirir, regression riski yüksek. Şu an scope dışı.

### 2. figma-mcp-bridge Cloud Hosting (Claude Web)

**Durum:** Ertelendi, Part 2 scope dışı.

**Açıklama:** Bridge şu an local `localhost:5454` WebSocket. Claude Web browser'dan erişilemez. Claude Web'de `figma_*` tool'ları çalışmıyor — plan-only mod.

**Çözüm roadmap'i:** `install/claude-web/DEFERRED-BRIDGE.md` içinde 3 seçenek detaylandırılmış (ngrok tunnel / Cloudflare Workers / dedicated VPS). Part 3+ adayı.

### 3. %75 Token Optimization Hedefi Ulaşılmadı

**Durum:** Gerçekçi hedef %29 kabul edildi.

**Açıklama:** Part 2 planı başlangıçta %65-75 azalma öngörüyordu ama post-implementation ölçümde %29 olduğu anlaşıldı. Baseline 61K → 43.5K. Kalan ağır yük `generate-figma-screen` (~25K) + `figma-canvas-ops` (~12K) — common case'de ikisi de zorunlu.

**Mitigation:** %29 hâlâ değerli (cross-platform kapsama ana kazanım, token bonus). Kullanıcı kararıyla Faz B (orchestrator split) atlandı.

**Çözüm roadmap'i (Part 3+ adayı):** `generate-figma-screen` ve `figma-canvas-ops` skill'lerinin kendilerinin Essentials/Advanced formatına refactor'u. Lazy-load sub-sections. Regression riski orta.

### 4. Validate Score Responsive Mode Coverage'ı Ölçmüyor

**Durum:** Plugin-side, benzer Known Limitation #1.

**Açıklama:** Responsive frame'ler (mobile / tablet / web) için ayrı `figma_validate_screen` çağrıları yapılır. Her biri kendi modunda değerlendirilir. Ama "aynı bound variable farklı device mode'unda doğru resolve oluyor mu" kontrolü yok — manuel göz bakışı gerekir.

**Mitigation:** Step 5.6'daki "her frame için ayrı validate" kuralı + Step 6'daki "her frame için screenshot + kullanıcı onayı".

---

Bu limitations listesi ileride Part 3 milestone planlanırken kaynak olarak kullanılır.

---

## Fast Path Mode (v1.9.3+, Part 3 Revised)

Part 3'ün gerçek test sonrası revize edilmiş halinde yeni bir **Fast Path Recipe skill** eklendi: `skills/fmcp-screen-recipes/SKILL.md`. Bu skill common case (9 standart screen type) için generate-figma-screen ağır workflow'unu atlayıp linear recipe execution sağlar.

### Fast Path Tetiklenme Koşulları

Fast Path devreye girer ANCAK:
- ✅ Tek ekran
- ✅ Screen type match (login/payment/profile/list/detail/form/onboarding/dashboard/settings)
- ✅ DS tanımlı (active-ds.md Status: ✅)
- ✅ Platform belli
- ✅ Custom animation/prototype yok

Aksi → mevcut generate-figma-screen workflow'u.

### Fast Path Token Profili (Beklenen, Manuel Test Sonrası Güncellenecek)

| Bileşen | Mevcut akış | Fast Path | Kazanç |
|---|---|---|---|
| agent delegator | 1.5K | 1.5K | 0 |
| fmcp-screen-orchestrator | 5K | 5.3K (+routing) | +0.3K |
| fmcp-screen-recipes | — | 8K (YENİ, lazy-load) | +8K |
| inspiration-intake | 4K | 0 (Fast Path image_uploaded değil) | −4K |
| generate-figma-screen | 25K | **0 (SKIP)** | **−25K** |
| figma-canvas-ops | 12K | 12K (pre-flight zorunlu) | 0 |
| **Toplam sub-agent context** | **~47.5K** | **~26.8K** | **−20.7K (−44%)** |

Baseline (Part 2 öncesi) 61K → Fast Path ~26.8K = **%56 azalma**.

### Fast Path Süre Profili (Beklenen)

| Senaryo | Mevcut (Part 2+v1.9.1) | Fast Path | Azalma |
|---|---|---|---|
| Mobil login | ~110 sn | ~60 sn | −45% |
| Mobil payment | ~130 sn | ~75 sn | −42% |
| Profile | ~100 sn | ~55 sn | −45% |
| Dashboard | ~120 sn | ~70 sn | −42% |

Not: Bu rakamlar **tahmin**. Manuel test (FP-1-R senaryosu) sonrası gerçek telemetri ile güncellenecek.

### Chunking Kuralı (Rule 5a)

Fast Path'in uygulanabilmesi için `figma-canvas-ops` Rule 5a CHUNKING MANDATE kritik:

- Her `figma_execute` max 8 atomic operasyon
- Her recipe component'i AYRI execute
- Execute'ler arası state aktarımı (return nodeId → next getNodeByIdAsync)
- Plugin timeout 60 sn, bridge timeout 4 dk — tek execute'ta 20+ op → kesin fail

Gerçek test (2026-04-15) bu kuralın eksikliği sebebiyle 4 dk timeout yaşadı. Rule 5a ile fix edildi.

### Progress Streaming

Fast Path'in ana UX kazancı: Her figma_execute sonrası tek satır Türkçe micro-report. Kullanıcı her 5-10 sn'de bir progress görür, "sessizlik dönemi" yok.

```
✅ Pre-flight: screen_type=payment, platform=mobile, device=iPhone 17, variants=[light,dark]
✅ Frame oluşturuldu: iPhone 17 (402×874), background: SUI/Surface/background level-0
✅ Breakpoint: SUI/Breakpoints/Screen bound
✅ Theme: Light (SUI/Semantic Colors), Size: Mobil (SUI/Semantic Size)
✅ Auto-layout: VERTICAL, padding/spacing bound
✅ Component keşfi: 5 bulundu, 1 eksik
✅ AppBar eklendi: SUI/Navigation/TopBar
✅ Amount Display eklendi: SUI/Display/Large
⚠️ Payment Method Card eksik → token-bound primitive ile 3 adet inşa
✅ CTA Button eklendi: SUI/Button/Primary
✅ Dark variant oluşturuldu
✅ Validate Light: 92/100, Dark: 89/100
```

Her satır 3-10 sn sonra görünür. Kullanıcı 60-90 sn boyunca sürekli geri-besleme alır.

### Fast Path NE ZAMAN KULLANILMAZ

- Custom complex layout (9 recipe hiçbirine uymayan)
- Animation, prototype flow, micro-interaction
- Multi-screen flow (checkout 3 sayfa)
- Kullanıcı "generate-figma-screen tam workflow uygula" derse explicit
