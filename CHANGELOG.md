# Changelog

Bu dosya [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) biçimine uygundur. Sürüm numaraları [`package.json`](package.json) ile uyumludur.

**Sürüm takibi (kullanıcılar için):**

| Kanal | Açıklama |
|-------|----------|
| [GitHub Releases](https://github.com/atezer/FMCP/releases) | Sürüm etiketleri ve (yayımlandığında) derlenmiş notlar |
| [npm - @atezer/figma-mcp-bridge](https://www.npmjs.com/package/@atezer/figma-mcp-bridge) | Yayınlanan paket sürümü; `npm view @atezer/figma-mcp-bridge version` ile kontrol |
| Bu dosya | Repoda her sürüm için özet değişiklik listesi |

Bu changelog'a ekleme öncesi sürümlerin tam ayrıntıları için `git log` kullanılabilir.

## [1.9.5] - 2026-04-17

### Chat Context Korumaları — Screenshot Method Selection + Discovery Budget

Claude Desktop'ta test edilen gerçek oturumda context bütçesi patlaması (188K/200K = %94 dolu, 3 base64 screenshot %45 context yedi, üretim fazına bile gelinmedi) gözlemlenince bu sürüm acil hazırlandı. v1.9.4 üretim enforcement'ı doğruydu ama **keşif aşamasını korumuyordu**. v1.9.5 bu eksikliği kapatır.

**Felsefe:** "Screenshot yasak" yanlış — bazen gerekli. Çözüm **yasak** değil, **doğru yöntem seçimi**. Claude bağlama göre 4 mode'dan seçer.

**Değişiklikler:**

- **`figma_capture_screenshot` 4 returnMode** (src/local-plugin-only.ts + f-mcp-plugin/code.js):
  - `"file"` (yeni default): Screenshot `~/.fmcp/screenshots/<timestamp>-<nodeId>.jpg` altına yazılır, response'ta sadece `filePath` döner. Context maliyeti 30K → 0.3K token (100× tasarruf). Claude Desktop `open <filePath>` ile açabilir.
  - `"summary"`: Screenshot çekilmez; yerine metadata özeti (sections, dominantColors, textRoles, layoutMode, dimensions) plugin API ile çıkarılır. Planlama aşaması için. ~0.5-1K token.
  - `"regions"`: `regionStrategy: "children"` ile node'un top-level child'ları ayrı ayrı export edilir, her biri dosyaya. Büyük/scroll'lu ekranlarda parçalı inceleme için. `regionStrategy: "slices"` v1.9.5'te henüz desteklenmiyor (Figma exportAsync crop API'si yok).
  - `"base64"`: Eski davranış, opt-in. Response'a `_warning: "BASE64_MODE..."` eklenir.
  - Tüm mode'lar backwards compatible; default değişti ama eski `"base64"` explicit çağrılırsa çalışır.

- **`src/core/discovery-counter.ts` (YENİ)**: Session-level keşif budget counter. `figma_get_*`, `figma_search_*`, `figma_list_*`, `figma_capture_screenshot` çağrıları sayılır. `figma_execute` için kod pattern analizi: read-only (`findAll`, `getNodeByIdAsync`) → discovery; mutation (`createFrame`, `setBoundVariable`) → build, counter reset. 8 çağrıda `_warnings: ["DISCOVERY_BUDGET_WARNING..."]`, 12'de `_DISCOVERY_BUDGET_EXCEEDED_BLOCKING: true`.

- **`scripts/cleanup-ports.sh` (YENİ)**: 5454-5470 aralığındaki zombie FMCP process temizleyici. Sadece `figma-mcp-bridge` / `local-plugin-only` / `@atezer` ile eşleşenleri öldürür, diğer node process'lerine dokunmaz. "Plugin bağlanmıyor" sorununa karşı.

- **Skill güncellemeleri:**
  - `skills/fmcp-intent-router/SKILL.md`: v1.9.5 Elicitation Kuralı — maks 1 `AskUserQuestion`, "devam et" sonrası soru yasak.
  - `skills/fmcp-screen-orchestrator/SKILL.md`: v1.9.5 Discovery Budget Rule (maks 3 keşif → plan sun) + Screenshot Method Selection (karar ağacı: summary → file → regions → base64).
  - `skills/figma-canvas-ops/SKILL.md`: v1.9.5 Concise Query Rule — boyut sorgusu tek satır (`n.width/height`), 20+ satır defansif kod yasak.

- **Doc güncellemeleri:**
  - `install/claude-desktop/HOW-TO-ENFORCE.md`: v1.9.5 sertleştirilmiş başlangıç prompt'u — discovery budget + screenshot method selection + elicitation kuralları. cleanup-ports.sh rehberi eklendi.
  - `README.md`: Claude Desktop sınırlamaları güncellendi (dört katmanlı enforcement), cleanup-ports.sh notu.
  - `.claude/design-systems/README.md`: user-local `file-map.md` bölümü eklendi.
  - `.claude/design-systems/sui/SUI_CHEATSHEET.md`: Anti-pattern tablosu yöntem-odaklı güncellendi (yasak yerine doğru yöntem örnekleri).

- **Plugin version sync**: `code.js`, `ui.html`, `package.json` → `1.9.5`. Plugin'de `buildNodeSummary()` helper metadata çıkarımı için eklendi.

**Kullanıcı için ne değişir:**

1. **Screenshot default `file` mode**: Artık Claude screenshot aldığında base64 context'e girmez — dosyaya yazılır, sadece filePath görünür. Context maliyeti 100× düşer.
2. **Büyük ekran → regions mode önerisi**: 2000px+ ekranda Claude `returnMode: "regions"` kullanır, parçalı exports.
3. **Discovery budget**: Claude 12. keşif çağrısında BLOCKING alır, plan sunmaya zorlanır.
4. **Plugin bağlantı sorunu**: `bash scripts/cleanup-ports.sh` ile zombie temizle.
5. **Elicitation**: Claude artık "devam et" dedikten sonra soru sormaz.

**Regresyon:** Sıfır. Backwards compatible:
- Eski `figma_capture_screenshot` çağrıları (`returnMode` belirtilmeyen) yeni `"file"` default kullanır — response format farklı (base64 yok, filePath var). Bu explicit bir upgrade. Eski `"base64"` davranışı için `returnMode: "base64"` explicit geçin.
- Plugin VALIDATE_SCREEN handler (v1.9.4) aynen çalışır.
- figma_execute BLOCKING signal (v1.9.4) aynen çalışır.

**Test matrisi:**
- TypeScript type-check: PASS
- Build: PASS
- `discovery-counter.ts`: kod pattern analizi read-only vs mutation ayrımı
- Plugin handler'lar: summary, regions (children), file (default), base64 (legacy) dört mode mevcut
- `cleanup-ports.sh`: chmod +x, process-name filter

**Not:** Plugin yeniden yüklenmeli. `@latest` npm tag v1.9.5'i işaret eder. Claude Desktop'ı tamamen kapat-aç, Figma plugin'i reload et.

## [1.9.4] - 2026-04-17

### Claude Desktop Enforcement Gap Kapatma — Runtime DS Compliance Scan + BLOCKING signal

Claude Desktop'ta (hook/sub-agent/slash command yok) token binding ve DS disiplininin skip edilmesini engelleyen üç katmanlı enforcement sistemi. Önceki sürümlerde skill'lerde HARD LANGUAGE (168+ ZORUNLU/MUTLAK keyword) vardı ama Claude Desktop'ta plugin tarafında runtime zorlayıcı yoktu. Gerçek bir test ekranında (SUI Anasayfa, 217 node) padding %5, radius %3, text style %25 bound olduğu ölçülünce bu sürüm acil hazırlandı.

**Değişiklikler:**

- **Yeni tool `figma_scan_ds_compliance`** (`src/local-plugin-only.ts`): Post-creation full-tree audit. Granular coverage (fills/paddings/radius/itemSpacing/textStyle/textColor/strokes), hardcoded hex sample'ları, hardcoded fontSize sample'ları, primitive frame fallback listesi, auto-layout overflow analizi döner. Default threshold 85 (stricter than validate_screen's 80). Read-only.
- **Plugin `VALIDATE_SCREEN` genişletildi** (`f-mcp-plugin/code.js`): `breakdown` artık `coverage` ve `overflow` alanlarını her zaman döndürür. `detailed: true` param ile `samples.hardcodedHex`, `samples.hardcodedFontSize`, `samples.primitiveFrames` eklenir. Backwards compatible — eski alanlar korunur.
- **`_designSystemViolations` action metni BLOCKING seviyeye yükseltildi** (`src/local-plugin-only.ts`): Yeni top-level flag `_DESIGN_SYSTEM_VIOLATIONS_BLOCKING: true`, severity field, retry_required field. Claude Desktop response'u skip edemesin diye dil güçlendirildi: "❌ BLOCKING: Bu kodu simdi duzelt ve tekrar calistir."
- **Skill `fmcp-screen-recipes/SKILL.md` Adım 9** genişletildi: 9a inline scan (M3/M4 sonrası) + 9b final validate. `passed: false` veya coverage <%90 → retry zorunlu. Son Rapor'da coverage yüzdeleri, hardcoded sample'lar, overflow durumu zorunlu alanlar.
- **Skill `figma-canvas-ops/SKILL.md` Rule 10a** (yeni): Her execute sonunda inline bind verification — `assertBound(node)` fonksiyonu. Unbound fill/padding/radius/text style tespit edilirse `throw` atar, execute başarısız sayılır.
- **Doc `.claude/project-context.md`** güncellendi: "Pre-Commit Validation (v1.9.4)" bölümü. Plugin BLOCKING signal'inin yorumu.
- **Yeni doc `install/claude-desktop/HOW-TO-ENFORCE.md`**: Claude Desktop kullanıcıları için step-by-step enforcement rehberi — Project Knowledge upload sırası, kopyala-yapıştır başlangıç prompt'u, mekanizma tablosu, test prompt'u, sorun giderme.
- **`install/claude-desktop/PROJECT-KNOWLEDGE.md`** güncellendi: Enforcement paketi listesi (fmcp-project-rules, project-context.md, figma-canvas-ops, fmcp-screen-recipes, HOW-TO-ENFORCE.md) eklendi.
- **`README.md`** güncellendi: "Claude Desktop sınırlamaları (v1.9.4 notu)" bölümü — hook/sub-agent/slash yok ama enforcement yine de çalışıyor, HOW-TO-ENFORCE'a link.
- **Plugin version string sync**: `code.js`, `ui.html`, `package.json` → `1.9.4`.

**Kullanıcı için ne değişir:**

1. Ekran tamamlandığında `figma_scan_ds_compliance(nodeId, threshold=85)` çağrılır (skill direktifi). Coverage yüzdeleri dökülür. <%90 → derhal düzelt.
2. `figma_execute` response'unda `_DESIGN_SYSTEM_VIOLATIONS_BLOCKING: true` görürsen kodu düzelt ve retry et — skip yok.
3. Claude Desktop kullanıcıları: `install/claude-desktop/HOW-TO-ENFORCE.md` rehberindeki **Adım 3 başlangıç prompt'unu** her oturumun ilk mesajı olarak kopyala. Bu prompt Claude'a enforcement kurallarını hatırlatır.
4. Eski `figma_validate_screen` tool aynen çalışır (backwards compat) — `breakdown` artık coverage + overflow da içerir, mevcut kullanıcılar kırılmaz.

**Regresyon:** Sıfır. Plugin API (`validateScreen`) backwards compatible — tüm mevcut alanlar korundu, yeni alanlar eklendi. Connector API ek method (`scanDsCompliance`) aldı, mevcut `validateScreen` aynı kaldı. Plugin transport protokolü (`msg.type === 'VALIDATE_SCREEN'`) tek handler kullanıyor, `detailed` param opsiyonel.

**Test matrisi:**

- TypeScript: ✅ `npm run type-check` temiz
- Build: ✅ `npm run build` temiz
- Eski test ekranı (node 241:11896) ölçümü: padding %5, radius %3, text style %25 — bu sürümden önce sessizdi, şimdi SEVERE BLOCKING döner
- Yeni tool (`figma_scan_ds_compliance`) Claude Desktop restart sonrası register olur

**Not:** Hook/sub-agent/slash command Claude Desktop'ta hâlâ yok (Anthropic platform sınırı). Bu sürüm mevcut platform kapasitesi içinde mümkün olan en güçlü enforcement'ı sağlar.

## [1.9.3] - 2026-04-17

### DS Cache İki Katmanlı Mimari + Güvenlik Redact

Tasarım sistemi cache framework'ü **public template + user-local cache** olarak iki katmana ayrıldı. Kurumsal Figma library key'leri (componentKey, variableKey, file key) artık **repo'ya yazılmaz**; her kullanıcının makinesinde `~/.claude/data/fcm-ds/<file-key>/` altında tutulur.

**Neden:**

FCM açık kaynak MCP server/plugin dağıtımı — `@atezer/figma-mcp-bridge` npm paketi ve GitHub repo public. Önceki `tokens.md` / `components.md` stub'ları gerçek key ile doldurulduğunda kurumsal Figma IP'si (hash key'ler, file key'ler) repo'ya sızıyor ve kullanıcıya özel çözüm sunmuyordu. Ek olarak Figma'da variable/component rename olunca cache'lenmiş key invalid oluyordu.

**Değişiklikler:**

- `.claude/design-systems/README.md`: İki-katman mimari dokümante edildi (public template vs user-local cache), skill okuma sırası tanımlandı (user-local → repo template → runtime resolve)
- `.claude/design-systems/active-ds.md`: Gerçek `file key` kaldırıldı, user-local pointer pattern'ine geçildi
- `.claude/design-systems/sui/tokens.md`: Generic token isim paternleri (spacing/radius/surface/typography rol haritası) — variableKey yok
- `.claude/design-systems/sui/components.md`: Generic component isim paternleri (Top usage-ranked) + eksik listesi + primitive fallback tablosu — componentKey yok
- `.claude/design-systems/sui/SUI_CHEATSHEET.md` (yeni): 10 bölümlük workflow rehberi (karar ağacı, 9 recipe index, 5-tab IA, custom dashboard pattern, 3 mutlak kural, anti-pattern listesi, hedef metrikleri, sorun giderme)
- `.gitignore`: DS cache güvenlik katmanı eklendi (`.claude/design-systems/*/_meta.md`, `*.cache.md`, `*.local.md`)
- `CHANGELOG.md`: v1.7.30 entry'sinden `P31qJTP8XVupmZG4BlTtPG` file key redact
- `install/TOKEN-BUDGET.md`: Text style import key redact (`fb3591835c86d00580e1f0cea2343d033107dc67`)

**Kullanıcı için ne değişir:**

- İlk kurulum: `/ds-sync sui` (veya "SUI cache oluştur") komutu ile kendi makinenizde user-local cache oluşur; repo'ya girmez
- `fmcp-screen-recipes` cache-first mantığı değişmez ama artık önce user-local'e bakar, yoksa repo template'ine düşer, yoksa runtime resolve yapar
- Mevcut cache'i olan kullanıcılar: `.claude/design-systems/<lib>/` altında gerçek key varsa manuel olarak `~/.claude/data/fcm-ds/<file-key>/` altına taşıyın

**Regresyon:** Sıfır. Plugin / MCP server kodu değişmedi; yalnızca `.claude/` dokümantasyon + `.gitignore` + iki CHANGELOG redact.

**Not:** `.claude/` klasörü npm paketinin `files` alanında değildir; bu release npm paket içeriğini değiştirmez. Release yalnızca CHANGELOG + version tutarlılığı içindir.

## [1.9.2] - 2026-04-17

### Plugin Version Sync + Diagnostic Startup Log (v1.9.1 Tamamlayıcı Hotfix)

v1.9.1 release'inde plugin tarafındaki `FMCP_PLUGIN_VERSION` string'i (`ui.html` + `code.js`) `'1.8.2'`'de kalmıştı — server-side kod v1.9.1 olarak yayınlanmış olmasına rağmen. Bu hotfix plugin version'unu senkronize eder ve plugin yüklendiğinde belirgin bir startup log ekler.

**Değişiklikler:**

- `f-mcp-plugin/ui.html`: `FMCP_PLUGIN_VERSION = '1.8.2'` → `'1.9.2'`
- `f-mcp-plugin/code.js`: aynı
- `f-mcp-plugin/ui.html`: Plugin yüklendiğinde `console.log('[F-MCP v1.9.2] Plugin loaded — server-side sibling discovery active')` startup log'u eklendi

**Neden önemli:**

v1.9.1'de plugin tarafı kod düzeltildi (welcome handler'a `activeBridges` branch eklendi, `scanOtherPorts` artık sadece fallback olarak çalışıyor) ama Figma plugin iframe'i bazen eski cache'ini tutuyor. Bu hotfix'teki startup log sayesinde:

- Plugin'i açıp DevTools → Console'da `[F-MCP v1.9.2]` log'u görüyorsan → **yeni kod yüklendi, blind scan devre dışı**
- Log göremiyorsan → eski cache hâlâ aktif, `docs/TROUBLESHOOTING.md`'deki plugin remove + re-add talimatını uygula

**Regresyon:** Sıfır. Sadece version string güncellemesi ve tek satır console.log — fonksiyonel davranış aynen kalır.

## [1.9.1] - 2026-04-17

### Plugin Multi-Bridge Discovery — Server-Side (Console Errors Tamamen Giderildi)

Plugin DevTools console'unda görülen 22+ `WebSocket connection to ws://localhost:5458-5470/ failed: net::ERR_CONNECTION_REFUSED` hataları v1.9.1 ile **tamamen giderildi**. Plugin artık blind port scan yapmıyor; server'ın probe ettiği aktif bridge listesini kullanıyor.

**Server tarafı (yeni — `src/core/plugin-bridge-server.ts`):**

- `probeSiblingBridges()` metodu eklendi: 5454-5470 aralığını paralel probe eder, aktif fmcp bridge'leri tespit eder (mevcut `probePort` + `probeStatus` yeniden kullanılır)
- Startup'ta initial probe (background, non-blocking) + 30 saniyede bir periyodik refresh
- Welcome mesajına `activeBridges: number[]` field'ı eklendi (cache'ten, 0ms overhead)
- Sibling değişikliklerinde `activeBridgesUpdate` push mesajı tüm bağlı plugin client'larına broadcast edilir
- `stop()` içinde sibling probe interval temizlenir

**Plugin tarafı (`f-mcp-plugin/ui.html`):**

- Welcome handler: `msg.activeBridges` varsa sadece listed portlara `connectToExtraPort` çağırır, `scanOtherPorts` ve periyodik timer ÇAĞRILMAZ → console'da 0 `ERR_CONNECTION_REFUSED`. Field yoksa fallback olarak eski scan davranışı korunur (backward compat)
- Yeni `activeBridgesUpdate` push handler: server yeni sibling keşfettiğinde otomatik ek port'lara bağlanır (30s içinde)
- `switchActivePort()` bug fix: `mcpBridgeWs` ve `mcpConnectedPort` değişikliği kaldırıldı. Önceki kod main connection'ın response routing'ini bozuyordu (switch sonrası main'den gelen istekler yanlış porta cevap veriyordu). Artık switch sadece UI "aktif port" göstergesi için kullanılır; her connection kendi closure ws'inde (ui.html:1682, 1866) paralel çalışır

**Backward Compatibility:**

| Server | Plugin | Davranış |
|--------|--------|----------|
| v1.9.1 | v1.9.1 | Server `activeBridges` gönderir, plugin sadece listed'a bağlanır — **0 console error** |
| v1.9.0 | v1.9.1 | Welcome'de field yok, plugin fallback scan — eski davranış (~22 error) |
| v1.9.1 | v1.9.0 | Server field gönderir, plugin ignore eder, fallback scan — eski davranış |
| v1.9.0 | v1.9.0 | Hiç değişmemiş |

**Fonksiyonel Kazanımlar:**

- Multi-client routing (Claude + Cursor + Windsurf aynı anda): aynen çalışır, her connection bağımsız closure ws
- Port label + ◀▶ switch butonları: aynen çalışır (artık daha doğru, routing'i bozmadan)
- `mcpConnections` Map: aktif kullanımda kalır (response routing için)
- Yeni MCP process başlatıldığında plugin otomatik keşfeder (30s içinde, eskiden plugin restart gerekiyordu)
- Welcome hızlı: cache'ten 0ms overhead (background probe startup'ta paralel yapılır)

**Dokümanlar:**

- `docs/TROUBLESHOOTING.md`: v1.9.1+ için "console hatası yok" notu, eski sürümler için `-WebSocket` filter talimatı
- `docs/MULTI_INSTANCE.md`: yeni server-side discovery yaklaşımı belgelendi

## [1.9.0] - 2026-04-17

### Kural Enflasyonu Temizliği + Bridge Crash Koruması + SUI Cache

5 ardışık testten (FP-1-R serisi) elde edilen bulgularla yapılan kapsamlı temizlik. Skill dosyaları %57 küçültüldü, plugin tarafında büyük component set'lerin bridge'i kilitlemesi engellendi, SUI cache altyapısı eklendi.

**Skill Compaction — 2298 → 979 satır (%57 azalma, ~10K token tasarruf):**

- `skills/fmcp-screen-recipes/SKILL.md` — 1090 → 528 satır
  - Devre dışı bırakılmış Adım 3 (breakpoint bind) ve Adım 4a (collection enum NO-OP) uzun açıklamaları 1 satıra indirildi
  - v1.9.x tarihçe anlatıları, FP-1-R test narratifleri, "neden" blokları kaldırıldı
  - Execute 1 kod bloğu Türkçe comment'leri temizlenip sıkıştırıldı
  - 8 recipe'ye (Login, Profile, List, Detail, Form, Onboarding, Dashboard, Settings) explicit `setProperties` override listesi eklendi — Payment v2.0.1'de yapılan düzeltme diğer recipe'lere de yayıldı
  - Known Limitations, Tool Chunking Rules, Evolution Triggers bölümleri kompaktlandı

- `skills/figma-canvas-ops/SKILL.md` — 805 → 285 satır
  - Rule 22 async API tablosu Rule 2'ye taşındı, wrapper prose silindi
  - Rule 23 (style import fail) 38 satırlık kod bloğu 15 satırlık try-catch iskeletine indirildi
  - Rule 25 (validate timeout) 3 seviyeli fallback 10 satıra kısaltıldı, timeout gerekçesi tarihçesi silindi
  - Rule 26 (component discovery) NavigationTopBar örnek çıktısı silindi, Text Style Discovery recipes Adım 1.6'ya cross-reference ile değiştirildi
  - Rule 5a'daki timeout değeri "5000ms" → "15000ms" (gerçek koda uyumlu)
  - Auto-layout, Component, Variable pattern'leri kompaktlandı

- `skills/fmcp-screen-orchestrator/SKILL.md` — 403 → 166 satır
  - Advanced section %60 kısaltıldı — Detay 1.0 Inspiration Handoff JSON schema örneği, Detay 6 Claude Web satırı, Detay 7 Verification Checklist Self-Audit Gate'e taşındı
  - Filesystem MCP direktifi 17 → 5 satır, Resmi Figma MCP yasağı 17 → 8 satır

**Bridge Crash Koruması:**

- `f-mcp-plugin/code.js:extractComponentSetData` — `MAX_VARIANTS = 50` guard eklendi. SUI Button (336 variant) gibi büyük component set'lerin children iterasyonu ilk 50 ile sınırlandırıldı. Response'a `_totalVariantCount` ve `_truncated` metadata alanları eklendi. 4+ dakika bridge timeout ve plugin crash riski ortadan kaldırıldı.
- `f-mcp-plugin/code.js:extractComponentData` + componentSetData properties bloğu — `MAX_PROPERTIES = 100` guard eklendi. `componentPropertyDefinitions` iterasyonu property sayısıyla sınırlandırıldı.
- `src/local-plugin-only.ts:figma_execute` — Timeout clamp 120s → 30s'ye indirildi. 15 op = ~200ms gerçek test verisi; 30s hâlâ çok bol. Yüksek timeout'lar artık bridge hang'lerini maskeleyemez.

**Collection Keyword Match Düzeltmesi:**

- `skills/fmcp-screen-recipes/SKILL.md:Adım 1.5 Execute 1` — `findColl(["semantic color", "s theme", "theme"])` içindeki jenerik `"theme"` fallback keyword'ü kaldırıldı. SUI dışı DS collection'larının yanlışlıkla match edip her testte 1 ek düzeltme execute'u harcamasına neden oluyordu. `"s theme"` SUI'nin "S Theme Colors" collection'ını zaten tam olarak yakalar.

**SUI Component Key Cache Altyapısı (yeni):**

- `.claude/design-systems/sui/components.md` (yeni) — component key cache şablonu. NavigationTopBar, Button, Divider_H, TextField, Card, Avatar, ListItem, SearchBar, Chip, BottomNavBar için slot'lar. Recipes Adım 6 bu dosyayı önce okur; cache varsa (< 7 gün) `figma_search_assets` çağrısını atlar, direkt `importComponentByKeyAsync(key)` kullanır.
- `.claude/design-systems/sui/tokens.md` (yeni) — spacing token'ları, collection info (S Theme Colors, Semantic Sizes), surface background için cache şablonu. Recipes Adım 1.5 bu cache'i önce okur, fresh ise token discovery'yi komple atlar.

**Beklenen Etkiler:**

- Claude Desktop'ta her recipe çağrısı için okunacak skill yükü ~25K → ~12K token (%52 azalma, ~10K token/oturum)
- SUI gibi büyük library'lerle çalışırken bridge crash riski sıfıra yakın (variant/property guard)
- Fast Path recipe süresi hedefi: 30+ dk → 10-12 dk (cache-first + skill compaction etkisi bir arada)
- Collection/component discovery için harcanan execute sayısı: -2 ile -3 arası (cache hit durumunda)

**Dokunulmayanlar (kasıtlı):**

- `skills/generate-figma-screen/SKILL.md` (v1.8.x full workflow korundu)
- `skills/inspiration-intake/SKILL.md`, `skills/fmcp-intent-router/SKILL.md`
- `agents/*.md` delegator'lar
- `f-mcp-plugin/ui.html` port scanning mantığı (v1.9.6 throttle'ı zaten yeterli)

## [1.8.2] - 2026-04-14

### DS Discipline Hotfix — Clone Tool Narrow Use + Build-from-Scratch Enforcement

Hotfix for v1.8.1 live test findings. The root cause of "Claude produces 3 identical clones instead of 3 distinct alternatives" was diagnosed, validated against live Figma data, and fixed across 4 layers (plugin performance + static analysis + SKILL + instructions).

**Live test evidence (what v1.8.1 did wrong):**
- User requested "3 alternatives" (Hero Card / Liste Odaklı / Dark Header)
- Claude used `figma_clone_screen_to_device` as shortcut → cloned benchmark 3 times → renamed → "done"
- All 3 "alternatives" turned out **byte-for-byte identical** (same 14 children, same 3 SUI instances, zero layout variation)
- Claude picked the **wrong benchmark** (139:3678 "Hesaplarım" draft with 14 children + `_childrenTruncated: 9`) instead of the ready-to-use `169:1917 v10 Hero Card` (4 clean children)
- Clone timed out repeatedly (30s too short), leaving **7 orphan duplicates** in the file
- `getNodeById` sync call hit dynamic-page error (Claude had no warning)
- Validate timed out too (30s + serial `await getMainComponentAsync` on every instance)

**Phase 14A — Plugin Performance Fix:**
- `f-mcp-plugin/ui.html` — `cloneScreenToDevice` timeout 30s → **120s**, `validateScreen` timeout 30s → **90s**
- `f-mcp-plugin/code.js:CLONE_SCREEN_TO_DEVICE` — orphan cleanup on error: if clone was created but resize/reparent failed, `clonedNode.remove()` runs in catch block + `orphanCleanedUp: true` flag in response
- `f-mcp-plugin/code.js:CLONE_SCREEN_TO_DEVICE` — warn when source has 20+ children (likely timeout candidate)
- `f-mcp-plugin/code.js:VALIDATE_SCREEN` — **Pass 2 batch optimization**: first pass collects instances serially using sync `mainComponent`, deferred instances batch-resolve via `Promise.all([getMainComponentAsync()...])` in Pass 2. ~10x faster for 100+ node trees (60s → 5s typical).

**Phase 14B — Static Analysis Expansion:**
- `src/core/code-warnings.ts` — 5 new SYNC_API patterns added (v1.8.2 dynamic-page fixes):
  - `figma.getNodeById(` → `figma.getNodeByIdAsync(`
  - `figma.getStyleById(` → `figma.getStyleByIdAsync(`
  - `figma.variables.getVariableById(` → `figma.variables.getVariableByIdAsync(`
  - `figma.variables.getVariableCollectionById(` → `figma.variables.getVariableCollectionByIdAsync(`
  - `figma.importComponentByKey(` → `figma.importComponentByKeyAsync(`
- `tests/core/code-warnings.test.ts` — **6 new unit tests** (test count 77 → 83)
- Now Claude's `figma_execute` code is statically checked for the common `Cannot call with documentAccess: dynamic-page` failure BEFORE it runs.

**Phase 14C — SKILL Recovery + Benchmark Validation:**
- `skills/fmcp-intent-router/SKILL.md` — New section **"Tool Failure Recovery Protocol"**:
  - Retry rules: max 1 retry with different params, then STOP and ask user
  - Orphan cleanup mandate: `figma_get_file_data` → detect orphans → list to user → delete with consent
  - Failure Escalation Template (retries exhausted → user choice menu)
- `skills/fmcp-intent-router/SKILL.md` — New section **"Benchmark Selection Validation"**:
  - If node.type === PAGE → list child alternatives, ask user which one
  - If FRAME childCount > 15 → warn about timeout risk
  - If FRAME childCount > 25 → REFUSE auto-selection, force user choice
  - Sibling scan: look for `v10`, `v11`, `alternative`, `variant` keywords and suggest cleaner alternatives
  - Responsive pre-check: warn if benchmark has `layoutMode === NONE`
- `skills/generate-figma-screen/SKILL.md` — New **Step 6.6: Inter-Screen Checkpoint Gate + Turn Budget**:
  - 90s per-turn time limit
  - Max 2 failed tool calls per turn
  - Each alternative = separate turn (NO multi-alternative in single turn)
  - Mandatory AskUserQuestion checkpoint after each turn ([Beğendim/Revize/Dur])
- `src/core/instructions.ts` — New **"TOOL FAILURE RECOVERY"** section with retry/cleanup/turn-budget rules

**Phase 14F REVIZE — Clone Tool Narrow Use + Build-from-Scratch (EN KRITIK):**

Paradigma düzeltmesi kullanıcıdan geldi:
> "Mevcut benchmark her zaman fikir olsun diye var ama sen doğrusunu yapmakla yükümlüsün. Responsive, auto-layout'lu, tasarım sistemine uygun — skillerindeki tüm gereksinimleri uygulamış olmalısın."

Claude v1.8.1'de `figma_clone_screen_to_device` tool'unu **shortcut** olarak kullandı. Clone, benchmark'ın mevcut yanlışlıklarını (hardcoded rectangle, missing token binding, non-responsive layout) kopyaladı. Sonuç: **3 identik "alternatif"**.

v1.8.2 bu tool'un kullanımını **4 katmanda** sertleştirdi:

1. **Tool description sertleştirildi** (`src/local-plugin-only.ts`):
   ```
   ⚠️ NARROW USE CASE — Device migration ONLY.
   USE ONLY WHEN: same DS + same layout + only size changes.
   DO NOT USE FOR: creating alternatives, variations, or new designs.
   If the user says 'alternatif', 'varyasyon', 'farklı', 'yeni', 'tasarla'
   — USE figma_execute + Step 5, NOT this tool.
   Benchmark is INSPIRATION, not a copy source for variations.
   Clone copies benchmark's EXISTING mistakes.
   ```

2. **`skills/generate-figma-screen/SKILL.md`** — New **Step 3.5: Clone Tool'u Tuzağı**:
   - Decision matrix: user request → correct tool
   - "alternatif/varyasyon/farklı/yeni/tasarla/iyileştir/redesign" → BUILD, NOT CLONE
   - Build-from-scratch flow documented (search_assets → instantiate_component → setBoundVariable → auto-layout FILL)
   
3. **`skills/generate-figma-screen/SKILL.md`** — New **Step 5.17: Quality Gate**:
   - Mandatory 12-item checklist after each section creation
   - Covers: layoutMode, primaryAxisSizingMode, counterAxisSizingMode, fill bindings, padding bindings, itemSpacing binding, cornerRadius binding, setTextStyleIdAsync, DS instance count, layoutSizingHorizontal = FILL
   - Fail → delete section, rewrite complying with all rules
   - Automatic JS-level check example provided

4. **`skills/fmcp-intent-router/SKILL.md`** — New **Adım 3b: Approach Karar Mantığı**:
   - Keyword detection table: "alternatif/varyasyon/..." → `approach = build-from-scratch` (DEFAULT)
   - "migrate/boyut/klonla" → `approach = clone-to-device`
   - "hizala/tokenize" → `approach = apply-ds-to-existing`
   - Summary screen shows chosen approach explicitly: "Clone tool kullanılmayacak çünkü alternatif istenmiş"

5. **`src/core/instructions.ts`** — New **"CLONE vs BUILD DECISION"** section (v1.8.2+ CRITICAL):
   - Explicit rule list with example user phrases
   - "Benchmark is ALWAYS inspiration, never a copy source for alternatives"
   - Critical rule enforced at session-start instructions level

**Phase 14G — Orphan Cleanup (canlı dosya):**

v1.8.1 test session'ından dosyada kalan **7 orphan node silindi**:
- 6 duplicate "Hesaplarım — Hero Card — iPhone 17" frame (`175:12172`, `175:12302`, `176:12751`, `176:13011`, `176:13510`, `176:13511`)
- 1 orphan "iOS & Android Status Bars" instance (`176:13512`)

Cleanup `figma_execute` ile yapıldı, tümü başarılı: `removed: 7/7, failed: 0`.

**Files changed (v1.8.2 total):**
- `src/core/code-warnings.ts` — 5 new SYNC_API patterns
- `tests/core/code-warnings.test.ts` — 6 new unit tests
- `src/core/instructions.ts` — CLONE vs BUILD DECISION + TOOL FAILURE RECOVERY
- `src/local-plugin-only.ts` — figma_clone_screen_to_device description sertleştirme
- `f-mcp-plugin/code.js` — CLONE_SCREEN_TO_DEVICE cleanup + VALIDATE_SCREEN Pass 2 batch + FMCP_PLUGIN_VERSION='1.8.2'
- `f-mcp-plugin/ui.html` — timeout 30s→120s + 30s→90s + FMCP_PLUGIN_VERSION='1.8.2'
- `skills/fmcp-intent-router/SKILL.md` — Tool Failure Recovery + Benchmark Selection Validation + Adım 3b Approach Decision
- `skills/generate-figma-screen/SKILL.md` — Step 3.5 Clone Tuzağı + Step 5.17 Quality Gate + Step 6.6 Turn Budget
- `package.json` + `src/core/version.ts` — 1.8.1 → 1.8.2

**Test coverage:** 83/83 passing (47 eski + 30 Phase 12A + 6 Phase 14B). Build clean, type-check clean.

**Backwards compatibility:** 100% additive. All v1.8.1 tools still work; `figma_clone_screen_to_device` description changed but API unchanged. No breaking changes.

**Migration from v1.8.1:**
1. Reinstall Figma plugin from `f-mcp-plugin/` (new handlers require v1.8.2 plugin)
2. Restart Claude Desktop (new `FMCP_INSTRUCTIONS` loads on session start)
3. New test prompt: "alternatif" keyword triggers build-from-scratch automatically (no prompt changes needed)

**Expected v1.8.2 test result:**
- `figma_clone_screen_to_device` NOT called for alternatives
- Claude uses `figma_execute` + Step 4-5 build pattern
- Each alternative is ACTUALLY different (different layouts, different token usage)
- Each turn has a user checkpoint
- 0 orphans, 0 timeouts
- Total time ≤ 5 minutes for 3 alternatives

**Referenced plan:** `.claude/plans/compressed-wondering-lynx.md` (Phases 14A, 14B, 14C, 14F REVIZE, 14G)

## [1.8.1] - 2026-04-14

### DS Discipline Enforcement + Intent Router + High-Level Screen Tools

Root cause fix for "Claude ignores SUI tokens and builds screens from scratch". v1.8.0 added SKILL-level "MUTLAK ZORUNLU" wording but Claude still bypassed it on simple "ekran yap" requests. v1.8.1 combines three independent layers of enforcement:

1. **Proaktif** — `figma_execute` code is statically analyzed for hardcoded colors/paddings/typography + no-instance usage; violations surface as `_designSystemViolations` banner Claude cannot ignore
2. **Upstream** — `fmcp-intent-router` meta-SKILL forces Claude to gather missing inputs + obtain explicit confirmation BEFORE executing any write tool
3. **Hızlı ve doğru kısayol** — `figma_clone_screen_to_device` + `figma_validate_screen` replace 100+ lines of hand-written `figma_execute` with 1 tool call each

**Phase 12A — Static Analysis Enforcement:**
- New module `src/core/code-warnings.ts` (extracted from `local-plugin-only.ts` for testability + single responsibility)
- `CodeWarning` type with `SEVERE | ADVISORY` severity split
- 6 new SEVERE categories: `HARDCODED_COLOR`, `NO_INSTANCE_USAGE`, `HARDCODED_FONT_SIZE`, `HARDCODED_SPACING`, `HAND_BUILT_SEPARATORS`, `NO_AUTO_LAYOUT`
- Preserved 3 ADVISORY categories from v1.8.0: `ORDERING` (FILL/ABSOLUTE before appendChild), `SYNC_API`, `FONT_LOAD`
- `figma_execute` response shape: SEVERE → `_designSystemViolations` top-level prominent field with `message`, `count`, `violations[]`, `action`. ADVISORY → `_warnings` legacy format
- Regex patterns detect both multi-line and compact SOLID color literals, `.fontSize = N`, spacing property assignments, `createFrame`/`createRectangle` counts with instance/binding negation
- 30 new unit tests in `tests/core/code-warnings.test.ts` — positive pattern detection + false-positive prevention + multi-violation + structural invariants

**Phase 13 — Universal Intent Clarification & Skill Routing:**
- New meta-SKILL `skills/fmcp-intent-router/SKILL.md` — 8-step protocol (analyze → state check → decide skill → read required_inputs → gather missing → summary+confirm → execute → persist)
- Fast path (detailed request skips question gathering), repeat path (single "öncekiyle aynı mı?"), partial reuse path (only changed fields asked)
- Ambiguity handling: generic request, multi-match, wrong-skill prevention
- Anti-patterns documented: don't skip confirmation, don't assume defaults, don't execute without routing
- `required_inputs` YAML metadata added to 8 priority skills:
  - `generate-figma-screen` (device, ds, reference, type, sections, variants)
  - `apply-figma-design-system` (target_scope, target_node, ds, backup, preserve_content, swap_strategy)
  - `audit-figma-design-system` (target_scope, target_node, ds, severity, report_format)
  - `generate-figma-library` (source_type, source_path, library_name, components, tokens, theme_support)
  - `implement-design` (source_node, target_platform, output_dir, tests, existing_components)
  - `code-design-mapper` (direction, figma_component, code_path, platform, output)
  - `visual-qa-compare` (figma_source, rendered_source, rendered_url, threshold, categories)
  - `design-token-pipeline` (direction, target_format, source_path, output_path, token_types, themes)
- New state files: `.claude/design-systems/last-intent.md` (single most recent intent), `.claude/design-systems/intent-history.md` (LRU 5 — for fast reuse path)
- `FMCP_INSTRUCTIONS` (src/core/instructions.ts) grew from 137 → ~220 lines: new "INTENT ROUTER ENTRY (ALWAYS FIRST)" section with 8-step protocol + fast/repeat paths + FORBIDDEN list

**Phase 12B — `figma_clone_screen_to_device` tool:**
- Primary answer to "hızlı ve doğru" — clones benchmark screen + adapts to target device dimension + preserves library instances + bound variables + auto-layout
- 4-layer implementation: MCP tool schema + connector method + plugin handler `CLONE_SCREEN_TO_DEVICE` + ui.html dispatch
- New `src/core/device-presets.ts` with 22 built-in presets (iPhone 17, iPhone 16 Pro Max, Android Compact, iPad Pro, MacBook Pro, Apple Watch, etc.) + custom "WxH" dimension support
- Auto-layout resize fix: switch `primaryAxisSizingMode`/`counterAxisSizingMode` from AUTO to FIXED before `resize()` to prevent hug-content no-op
- Clone counts preserved elements (totalNodes, instanceCount, libraryInstanceCount, boundVariableCount) and returns them in result for Claude to verify
- Example: `figma_clone_screen_to_device({ sourceNodeId: "139:3407", targetDevice: "iPhone 17" })` → new node with all SUI instances preserved, root resized to 402×874, auto-layout intact

**Phase 12D — `figma_validate_screen` tool:**
- Post-creation audit. Iterative (stack-safe, max 5000 nodes) tree walker computes 3 DS compliance metrics:
  - `instanceCoverage` (library instance usage — normalized 30-100 scale when any library instance exists)
  - `autoLayoutCoverage` (frames with `layoutMode != NONE`)
  - `tokenBindingCoverage` (nodes with `boundVariables` populated)
- Weighted aggregate score: 40% instances + 30% bindings + 30% layout
- Returns `{ score, passed, breakdown, violations (capped 20), recommendation }`
- Read-only — never mutates the file
- Violation categories: `NO_AUTO_LAYOUT`, `HARDCODED_FILL` (with node ID, name, severity, message)

**Phase 12E — `generate-figma-screen` Step 6.5 Self-Audit Mandate:**
- New ZORUNLU step in SKILL: call `figma_validate_screen` before reporting to user
- Score ≥ 80 → accept, report breakdown
- Score 60-79 → read violations, targeted fixes, re-validate
- Score < 60 → delete screen, rebuild (max 3 attempts)
- Anti-patterns documented: "screenshot güzel, validate'e gerek yok" (yanlış — token binding gözle görünmez)
- Fail-after-3 → ask user "elle düzeltmek mi, farklı yaklaşım mı?"

**Phase 12F — `figma_create_frame` DS token binding params:**
- New params: `fillVariableKey`, `paddingVariableKey`, `itemSpacingVariableKey`, `cornerRadiusVariableKey`
- `fillColor` and `cornerRadius` marked DEPRECATED in schema description — prefer variable keys
- Plugin execution via `figma.variables.importVariableByKeyAsync` + `setBoundVariableForPaint` (fills) or `setBoundVariable` (spacing/radius)
- Returns `boundVariableCount` in result so Claude can verify binding worked
- Graceful fallback: if variable import fails, logs warning and proceeds without binding (caller can retry with correct key)

**Files changed (v1.8.1 total):**
- NEW: `src/core/code-warnings.ts` (analyzeCodeForWarnings + CodeWarning type)
- NEW: `src/core/device-presets.ts` (22 presets + resolveDevice helper)
- NEW: `skills/fmcp-intent-router/SKILL.md` (meta-skill, 400+ lines)
- NEW: `.claude/design-systems/last-intent.md`, `intent-history.md` (state templates)
- NEW: `tests/core/code-warnings.test.ts` (30 tests)
- UPDATED: `src/local-plugin-only.ts` (import code-warnings + device-presets, figma_execute SEVERE split, figma_clone_screen_to_device, figma_validate_screen, figma_create_frame variable binding params)
- UPDATED: `src/core/plugin-bridge-connector.ts` (cloneScreenToDevice, validateScreen methods)
- UPDATED: `src/core/instructions.ts` (INTENT ROUTER ENTRY section)
- UPDATED: `f-mcp-plugin/code.js` (CLONE_SCREEN_TO_DEVICE + VALIDATE_SCREEN handlers, FMCP_PLUGIN_VERSION='1.8.1')
- UPDATED: `f-mcp-plugin/ui.html` (cloneScreenToDevice + validateScreen window functions + method dispatch, FMCP_PLUGIN_VERSION='1.8.1')
- UPDATED: 8 SKILL files with `required_inputs` metadata (generate-figma-screen, apply-figma-design-system, audit-figma-design-system, generate-figma-library, implement-design, code-design-mapper, visual-qa-compare, design-token-pipeline)
- UPDATED: `skills/generate-figma-screen/SKILL.md` Step 6.5 Self-Audit Mandate
- UPDATED: `package.json` + `src/core/version.ts` (1.8.0 → 1.8.1)

**Test coverage:**
- 47 pre-existing tests preserved (regression-free)
- 30 new code-warnings tests
- **Total: 77/77 passing**
- Build: TypeScript strict mode, 0 errors

**Backwards compatibility:**
- No API shape changes. All new tools are additive
- `fillColor` / `cornerRadius` still work on `figma_create_frame` — just marked DEPRECATED
- `_warnings` response field preserved for legacy SKILL consumers
- Plugin v1.8.0 + server v1.8.1: `figma_clone_screen_to_device` and `figma_validate_screen` will return "Unknown message type" until plugin is reinstalled. `figma_get_status` warns about version mismatch
- `FMCP_LEGACY_DEFAULTS=1` env flag from v1.8.0 still works

**Migration from v1.8.0:**
1. Reinstall plugin from `f-mcp-plugin/` in Figma (to get CLONE_SCREEN_TO_DEVICE + VALIDATE_SCREEN handlers)
2. New Claude sessions will automatically use Intent Router protocol via updated `FMCP_INSTRUCTIONS`
3. `figma_execute` calls with hardcoded patterns now show `_designSystemViolations` — Claude will self-correct

**Referenced plan:** `.claude/plans/fmcp-v1.8.1-ds-discipline-enforcement.md` (Phases 12A, 12B, 12D, 12E, 12F, 13A, 13B, 13D, 13E)

## [1.8.0] - 2026-04-14

### Context-Safe Defaults + Plugin Response Guard + DS Context Enforcement

Major improvement: Claude chat'te F-MCP kullanırken context bloat ve runtime hataları kökünden çözüldü. 1-2 tool çağrısından sonra "This conversation is too long" hatası alan kullanıcılar artık tek session'da tam bir Figma → SUI ekran üretim akışını tamamlayabilir.

**Context Bloat Fix'leri (E1 — kritik):**
- `figma_get_design_context`: default `depth=2 → 1`, `verbosity="standard" → "summary"`. Tipik response 150-400 KB → 5-25 KB. ~%75 token tasarrufu.
- 3 katmanda eşzamanlı default alignment: MCP zod schema (`local-plugin-only.ts:298-299`) + connector (`plugin-bridge-connector.ts:289-290`) + plugin handler (`f-mcp-plugin/code.js:2587, 2646`). Tek katman update yetersizdi.
- `figma_capture_screenshot`: default `format="PNG" → "JPG"`, `scale=2 → 1`, yeni `jpegQuality=70` param. Base64 boyutu ~%80 küçüldü. `figma_get_component_image`, `figma_get_component_for_development`, `figma_export_nodes` aynı default'ları kullanıyor.
- **`truncatePluginResponse`** (yeni `response-guard.ts` fonksiyonu): Plugin response'ları için 4-stage progressive pruning (children cap → effects/boundVariables → fills/strokes → minimal). `PLUGIN_SIZE_THRESHOLDS` (40/80/160/250 KB) — REST limitlerinden çok daha sıkı. Worst-case'i capluyor.
- `toolResult()` shared envelope helper — okuma tool'larını wrap eder, `_responseGuard` marker ile telemetri sunar.
- **`ResponseCache` wire-up**: Önceden dormant olan cache (line 200, sadece `invalidateCache()` 19 yerden çağrılıyordu) artık `figma_get_design_context` ve `figma_get_file_data`'da TTL=60s ile aktif. SKILL chain içinde duplicate fetch'leri elimine ediyor. Yeni `debug=true` param cache bypass için.
- Plugin handler falsy bug fix: `msg.depth || 2` → `msg.depth != null ? msg.depth : 1`. `depth=0` artık doğru iletiliyor.
- `FMCP_LEGACY_DEFAULTS=1` env var: v1.7.x default'larına geri dönmek için escape hatch (v1.9.0'da kaldırılacak).

**Runtime Hata Fix'leri (E2-E7):**
- **E2 — SHBGrotesk Medium font hatası**: `figma-canvas-ops` Kural 8a-1 eklendi — `figma.listAvailableFontsAsync()` ile available weight check + `pickStyle()` fallback (Medium → Semi Bold → Regular). DS fontlarında "Medium"un yokluğu artık otomatik handle ediliyor.
- **E3 — `layoutPositioning = ABSOLUTE` parent layoutMode hatası**: `figma-canvas-ops` Kural 11 genişletildi. `appendChild` ÖNCE, `layoutPositioning` SONRA. Yeni `appendAbsolute(child, parent, x, y)` helper pattern dokümante edildi.
- **E4 — Wrong MCP server selection**: `FMCP_INSTRUCTIONS` (`src/core/instructions.ts`) tamamen yeniden yazıldı. Yeni "TOOL SELECTION" bölümü Claude'a F-MCP plugin bağlıyken resmi Figma MCP `search_design_system`'i çağırmamasını söylüyor. "Resource links not supported" hatası önlendi.
- **E5 — Frame oluşturma auto-layout eksik**: `figma_create_frame` MCP tool'una auto-layout parametreleri eklendi: `layoutMode` (default `"VERTICAL"`), `paddingTop/Bottom/Left/Right` (default 16), `itemSpacing` (default 12), `primaryAxisSizingMode/counterAxisSizingMode` (default `"AUTO"`), `primaryAxisAlignItems`, `counterAxisAlignItems`, `layoutWrap`. `layoutMode="NONE"` ile legacy free-form frame de mümkün.
- **E6 — Library bileşen keşfi (SUI Button vb.)**: Plugin handler `SEARCH_LIBRARY_ASSETS` genişletildi. INSTANCE node'larını tarayarak `mainComponent.key` üzerinden remote library bileşenlerini keşfediyor. Yeni `libraryComponents` field ile dönüyor. `figma_search_assets({assetTypes: ['components'], currentPageOnly: false})` artık SUI gibi DS bileşenlerini bulup `figma_instantiate_component` ile kullanılabilir hale getiriyor.
- **E7 — Token binding eksik**: `figma-canvas-ops` Kural 10 (token binding) MUTLAK ZORUNLU olarak işaretlendi. Pre-flight checklist eklendi (active DS / component cache / token cache / font weights / variable keys). Eğer DS'te token yoksa Claude DURDURUR ve kullanıcıya sorar — sessizce hardcoded fallback YASAK.

**DS Context Enforcement (yeni paradigm):**
- **`.claude/design-systems/active-ds.md`**: Yeni state file. Kullanıcı bir kez DS seçtiğinde burada saklanır, sonraki ekran/bileşen oluşturma akışlarında otomatik kullanılır. "Hangi DS?" sorusu sadece active-ds.md `Status: ❌` ise sorulur.
- `figma-canvas-ops` SKILL'e **Section 0 — Design System Context** eklendi. Her yazma akışının ilk adımı DS check.
- `generate-figma-screen` SKILL'e **Step 0 — Aktif DS Kontrolü** eklendi. Cache-First Kuralı ZORUNLU PRE-FLIGHT BLOCKER yapıldı: cache yoksa ekran üretimi başlayamaz.
- `FMCP_INSTRUCTIONS`'a **DESIGN SYSTEM CONTEXT** bölümü eklendi (Step A-D protokol).

**Plugin Handshake Genişlemesi:**
- WebSocket "ready" mesajına `pluginVersion` field eklendi (`f-mcp-plugin/ui.html:1410, 1710`).
- `f-mcp-plugin/code.js` ve `ui.html`'e `FMCP_PLUGIN_VERSION = '1.8.0'` sabiti eklendi.
- `ClientInfo` interface'e `pluginVersion?: string` (`plugin-bridge-server.ts:55-63`).
- `ConnectedFileInfo` interface'e `pluginVersion: string | null`.
- `figma_get_status` artık `serverVersion` ve plugin version mismatch warning (`versionWarning` field) döndürüyor. Eski plugin (v1.7.x) + yeni server (v1.8.0) çalışmaya devam eder ama kullanıcıya update öneri gelir.

**FMCP_INSTRUCTIONS — Context-Safe Protocol:**
- "CONTEXT-SAFE PROTOCOL (REQUIRED for Claude chat)" bölümü Claude'a 5 adımlı cheap-first workflow öğretiyor: plugin discovery → structural overview → minimum-verbosity targeting → screenshot only when needed → cache reuse.
- "TOOL SELECTION" bölümü resmi Figma MCP vs F-MCP eşleşmesini açık yazıyor.
- "DESIGN SYSTEM CONTEXT (REQUIRED for screen/component creation)" — DS soru protokolü ve token binding zorunluluğu.
- "COMMON GOTCHAS" — Plugin API'nin 5 yaygın hatası (layoutSizing/layoutPositioning ordering, font weights, setCurrentPageAsync, import reserved word).

**Test Coverage:**
- `tests/core/response-guard.test.ts` 11 yeni test eklendi: `truncatePluginResponse` (8) + `PLUGIN_SIZE_THRESHOLDS` (2). Toplam 47 test, 3 suite, hepsi geçiyor.
- Coverage: tree pruning (4 stage), envelope handling, custom maxKB, null/primitive handling, _responseGuard marker.

**SKILL Güncellemeleri:**
- `skills/figma-canvas-ops/SKILL.md`: Section 0 DS context check (yeni), Kural 8a-1 font availability check (genişletildi), Kural 10 token binding mutlak zorunluluk (güçlendirildi), Kural 11 layoutPositioning ABSOLUTE (genişletildi), Section 7 hata kurtarma (yeni hata satırları).
- `skills/generate-figma-screen/SKILL.md`: Step 0 DS check (yeni), Step 3 cache-first ZORUNLU pre-flight blocker (güçlendirildi), Step 3 resmi Figma MCP uyarısı (yeni).
- `.claude/design-systems/active-ds.md`: Yeni state file şablonu.

**Backwards Compatibility:**
- Default değişiklikleri observable ama API shape değişmedi. Explicit `verbosity="standard"`/`depth=2` geçen caller'lar etkilenmez.
- `FMCP_LEGACY_DEFAULTS=1` env var: v1.7.x davranışına geri dön (v1.9.0'da kaldırılacak).
- `debug=true` per-tool param: cache bypass + `_responseGuard` include (eski davranışa benzer).
- `excludeScreenshot` param schema'da kaldı (SKILL'lerde kullanılıyor) ama plugin handler'ı zaten implement etmiyordu — değişiklik yok.
- Plugin/server version mismatch'i `figma_get_status` warning ile bildirilir, çalışmaya devam eder.

**Kritik Dosya Değişiklikleri:**
- `src/local-plugin-only.ts`: defaults, helpers (`toolResult`, `makeCacheKey`, `errorResult`), figma_get_design_context+figma_get_file_data cache+truncation wireup, figma_capture_screenshot+component_image+component_for_development+export_nodes screenshot defaults, figma_create_frame auto-layout params, figma_get_status pluginVersion mismatch warning, figma_search_assets description update.
- `src/core/response-guard.ts`: `PLUGIN_SIZE_THRESHOLDS` constant, `truncatePluginResponse()` with 4-stage progressive pruning, `pruneNodeTree()` helper.
- `src/core/plugin-bridge-connector.ts`: `getNodeContext` defaults align (`depth ?? 1`, `verbosity ?? "summary"`), `captureScreenshot` `jpegQuality` param.
- `src/core/plugin-bridge-server.ts`: `ClientInfo.pluginVersion`, `ConnectedFileInfo.pluginVersion`, "ready" handler reads `msg.pluginVersion`, `listConnectedFiles()` returns it.
- `src/core/instructions.ts`: tamamen yeniden yazıldı — Context-Safe Protocol + Tool Selection + DS Context + Common Gotchas.
- `src/core/version.ts`: `1.7.30` → `1.8.0`.
- `package.json`: `1.7.30` → `1.8.0`.
- `f-mcp-plugin/code.js`: `FMCP_PLUGIN_VERSION = '1.8.0'`, GET_NODE_CONTEXT defaults align, CAPTURE_SCREENSHOT format/scale/jpegQuality defaults, SEARCH_LIBRARY_ASSETS instance scan for library components.
- `f-mcp-plugin/ui.html`: `FMCP_PLUGIN_VERSION` const, "ready" handshake `pluginVersion` field (2 lokasyon), `captureScreenshot` `jpegQuality` passthrough.
- `skills/figma-canvas-ops/SKILL.md`, `skills/generate-figma-screen/SKILL.md`, `.claude/design-systems/active-ds.md`.
- `tests/core/response-guard.test.ts`: 11 yeni test.

**Migration:**
- Yeni server v1.8.0 + eski plugin v1.7.x: çalışır, `figma_get_status` warning gösterir. Plugin'i Figma'da yeniden yükleyin (`f-mcp-plugin/manifest.json`).
- Eski default'lara dönmek isteyenler: `FMCP_LEGACY_DEFAULTS=1` env var set edin.
- Per-call cache bypass: tool çağrısına `debug: true` ekleyin.

## [1.7.30] - 2026-04-14

### SUI Design System Integration — search_assets bridge fix, new library tools, SKILL corrections

F-MCP Bridge ile SUI gibi team library tabanli tasarim sistemleri kullanmak artik tam destekli. `figma_search_assets` artik bridge handler'ini dogru kullaniyor (hem variable hem local component dondurur), 3 yeni arac ile team library variable/style import + binding mumkun, SKILL'lerdeki "DS dosyasinda calistir" celiskisi giderildi.

**Kritik Bug Fix'leri:**
- `figma_search_assets` artik plugin'in `SEARCH_LIBRARY_ASSETS` handler'ini kullaniyor (eski inline executeCodeViaUI bypass'i kaldirildi). `assetTypes`, `limit`, `currentPageOnly`, `figmaUrl`, `fileKey` parametreleri eklendi. Hem variable collection'lari hem local file component'lerini donduruyor.
- `fileKey: null` race condition: Plugin baglandiginda fileKey "ready" mesajiyla set ediliyor, arada gelen istekler hata aliyordu. `waitForClient(2s)` polling + transient retry eklendi.
- `figma_execute` static analysis (`_warnings`): FILL before appendChild, sync API kullanimi, eksik loadFontAsync, sync currentPage atamasi tespit edilip uyari donuyor. Uyarilar TUM response path'lerinde (success + plugin error + try-catch error).

**Yeni Araclar:**
- `figma_get_library_variables` — Team library variable koleksiyonlarini import key'leriyle birlikte listeler. Hedef dosyada calisir, DS source dosyasina baglanmak GEREKMEZ. Filter: `query`, `collectionName`, `libraryName`, `limit`.
- `figma_bind_variable` — Library variable'ini import edip node property'sine baglar. Renkler icin `setBoundVariableForPaint` (fills/strokes), spacing/sizing icin `setBoundVariable` (paddingLeft, itemSpacing, cornerRadius, vb.). Token degisince node otomatik guncellenir.
- `figma_import_style` — Team library text/paint/effect style'ini import edip node'a uygular. TEXT style: `setTextStyleIdAsync` (font + size + weight). PAINT/EFFECT: `fillStyleId` / `effectStyleId`. Sadece PUBLISHED LIBRARY style'lar — local style'lar icin acik hata mesaji ve cozum yonlendirmesi.

**SKILL Duzeltmeleri:**
- `figma-canvas-ops/SKILL.md` ve `generate-figma-screen/SKILL.md`: "DS dosyasinda calistir" yaklasimi kaldirildi, `figma.teamLibrary` API zinciri ile hedef dosyada calisma akisi eklendi.
- `fmcp-project-rules/SKILL.md`: LOCAL vs LIBRARY token ayrimi netlestirildi. `figma_get_styles()` ve `figma_get_variables()` sadece dosya ici degerleri donduruyor — kutuphane token'lari icin yeni `figma_get_library_variables` araci kullanilmali.
- Font fallback: Kullanici "sen sec" derse once DS kutuphanesi text style'larindan font cikarilir, sonra Inter fallback. SUI gibi custom font (SHBGrotesk) kullanan kutuphanelerde dogru calisir.
- Cache invalidation: `.claude/libraries/<ds>.md` cache'i 24 saatten eski ise yenilenir, `lastUpdated` alani eklendi.

**Tool Description Iyilestirmeleri:**
- `figma_execute`: FILL ordering, sync API, font loading, setCurrentPageAsync gotcha'lari description'da.
- `figma_create_text`: SUI/DS kullaniyorsan SHBGrotesk gibi DS fontunu belirt uyarisi (Inter default).
- `figma_instantiate_component`: Library component destegi + `setProperties` kurali (findAll(TEXT) yerine).

**Etkilenen Dosyalar:**
- `src/core/plugin-bridge-connector.ts`: `searchLibraryAssets()` metodu + transient retry kosulu
- `src/core/plugin-bridge-server.ts`: `waitForClient()` + race condition fix
- `src/local-plugin-only.ts`: 1 bug fix + 1 enrichment + 3 yeni tool + description guncellemeleri
- `skills/figma-canvas-ops/SKILL.md`, `skills/generate-figma-screen/SKILL.md`, `skills/fmcp-project-rules/SKILL.md`

**Test Edildi:** Ozel bir consumer Figma dosyasi uzerinde SUI kutuphanesi ile uctan uca dogrulandi: `figma_search_assets` 25 variable + 4 lib collection donduruyor, `figma_get_library_variables` 84-100 variable key'iyle donuyor, frame olusturma → `figma_bind_variable` ile `Surface/background level-0` baglama → screenshot dogrulamasi basarili, `_warnings` static analiz hem success hem error path'lerinde calisiyor.

---

## [1.7.29] - 2026-04-13

### Smart Port Auto-Increment — Coexistence Fix

Birden fazla F-MCP bridge instance (Claude Desktop + Claude Code worktree) artik birbirini oldurmuyor. Yeni instance mevcut bridge'in sagligini kontrol eder ve uygun porta otomatik gecer.

**Kor Degisiklik:**
- `GET /status` endpoint: Client sayisi, uptime, versiyon dondurur — yeni instance'lar saglik kontrolu yapabilir
- `tryListenWithAutoIncrement()`: Port 5454'ten baslayip 5470'e kadar otomatik deneme
  - Saglikli bridge (clients > 0) → ATLA, sonraki porta gec
  - Yeni baslamis bridge (uptime < 30s) → ATLA (race condition onleme)
  - Stale bridge (0 client, uptime >= 30s) → TAKEOVER (mevcut davranis)
  - Eski versiyon bridge (/status yok) → ATLA (guvenli taraf)
  - Baska servis (non-FMCP) → ATLA
- `probeStatus()`: Mevcut bridge'in client sayisi ve uptime bilgisini sorgular
- `sendShutdownRequest()`: Callback tabanli shutdown helper
- `createBridgeHttpServer()`: HTTP server factory — kod tekrari onlendi
- `setupBridgeOnServer()`: WebSocket/heartbeat setup — kod tekrari onlendi

**figma_get_status Iyilestirmeleri:**
- `preferredPort`, `autoIncremented` alanlari eklendi
- `portHint`: Otomatik port gecisi bilgisi gosterir

**figma_plugin_diagnostics Iyilestirmeleri:**
- `preferredPort`, `actualPort`, `autoIncremented` alanlari eklendi

**tryListenAsync Timeout:**
- 5000ms → 30000ms (17 port taramasi icin yeterli sure)

**Canli Test Sonuclari:**
- Port 5454 (Claude Desktop, eski versiyon) → ATLANDI (bilinmeyen saglik)
- Port 5455 (Claude Code, yeni versiyon) → BAGLANDI, 2 plugin aktif
- `figma_execute` port 5455 uzerinden basarili (36ms)
- `GET /status` endpoint: `{"clients":2,"uptime":33,"version":"1.7.29"}` dondu
- Her iki bridge ayni anda calisir — coexistence dogrulandi

**Plugin UI:** Degisiklik gerekmez — zaten 5454-5470 portlarini tarar (`scanOtherPorts()`).

## [1.7.28] - 2026-04-11

### figma_execute Savunmaci Enrichment Fix

v1.7.27 canli testinde tespit edilen enrichment kaybi duzeltildi. 6/6 test GECTI.

- `categorizeExecuteError()` null-safety: `(message ?? "").toLowerCase()`
- figma_execute handler'indaki 3 code path'e (success, plugin-error, catch) ic try-catch — `safeToolHandler` dis catch'ine kacan hatalar artik enrichment kaybetmez
- `.claude-plugin/plugin.json` ve `.cursor-plugin/plugin.json` versiyon senkronizasyonu
- Canli test sonuclari: errorCategory (SYNTAX/RUNTIME/TIMEOUT), `_metrics` (durationMs, timeoutMs), hint (Turkce cozum onerisi), safeSerialize (`{__figmaNode:true}`)

## [1.7.27] - 2026-04-11

### figma_execute Hatasiz Calisma — Kok Neden Analizi ve Cozum

9 kok neden tespit edildi ve tumu duzeltildi. figma_execute artik hata kategorisi, cozum onerisi ve execution metrikleri donuyor.

**Timeout Zinciri Duzeltmesi (En sik hata kaynagi):**
- Default timeout 5000ms → 15000ms (tum 3 katman: MCP handler, UI, plugin)
- Timeout clamping: min 3s, max 120s — asiri kisa/uzun degerler engellenir
- UI deadline margin 2s → 5s — round-trip icin yeterli sure

**Sonuc Serializasyon Guvenligi:**
- `safeSerialize()` fonksiyonu: Figma node objeleri → `{id, type, name}`, circular ref korunakli, array >500 truncate
- WebSocket sessiz catch kaldirild — response kaybi artik `console.error` ile loglanir, `SERIALIZATION_ERROR` mesaji donuyor
- JSON.stringify basarisiz olursa sessizce yutmak yerine acik hata raporu

**Hata Kategorilendirme:**
- `categorizeExecuteError()`: TIMEOUT, SYNTAX, RUNTIME, CONNECTION, SERIALIZATION, FONT_NOT_LOADED, VALIDATION
- `getErrorHint()`: Her kategori icin kullaniciya ozel Turkce cozum onerisi
- Plugin `success: false` sonuclari da kategorilendiriliyor (onceden sadece throw edilen hatalar icin calisiyor)

**Otomatik Retry:**
- Connector'da 1 kez retry: sadece transient hatalar (WebSocket disconnect, send_failed)
- Timeout ve runtime hatalari retry edilmez

**Execution Metrikleri:**
- Plugin: `executionMs` (kod calisma suresi)
- MCP handler: `_metrics: { durationMs, timeoutMs }` (toplam sure + timeout limiti)
- `resultAnalysis`: sonuc tipi, bos/null/undefined uyarilari

**Hook ve Skill:**
- PreToolUse hook: 6 maddelik kontrol listesi (font, sayfa reset, return formati, timeout, findAll, DS)
- `PluginExecuteResult` tipi genisletildi: errorCategory, hint, executionMs, resultAnalysis, _metrics

**Savunmaci Enrichment Fix (canli test sonrasi):**
- `categorizeExecuteError()` null-safety: `(message ?? "").toLowerCase()`
- figma_execute handler'indaki 3 code path'e (success, plugin-error, catch) ic try-catch eklendi — `safeToolHandler` dis catch'ine kacan hatalar artik enrichment kaybetmez
- `.claude-plugin/plugin.json` versiyon senkronizasyonu (1.7.25 → 1.7.27)
- 6/6 canli test GECTI: errorCategory (SYNTAX/RUNTIME/TIMEOUT), _metrics, hint, safeSerialize

## [1.7.26] - 2026-04-11

### Performans ve Stabilite Optimizasyonu

Satirsatir kod taramasi ile tespit edilen 5 kritik bug, 6 performans sorunu ve 6 stabilite riski duzeltildi.

**Bug Duzeltmeleri:**
- `local-plugin-only.ts`, `plugin-bridge-server.ts` — Versiyon uyumsuzlugu: hardcoded `"1.7.24"` yerine `FMCP_VERSION` sabiti
- `response-guard.ts` — Agresif truncation ikinci pasi etkisizdi, parametrik `truncate()` ile duzeltildi
- `local-plugin-only.ts` — `figma_search_assets` dead code: `getAvailableLibraryComponentsAsync` cagirilmiyordu
- `local-plugin-only.ts` — `figma_watch_console` busy-loop: 120 WebSocket istegi yerine backoff + early exit
- `f-mcp-plugin/manifest.json` — Trailing comma gecersiz JSON, Figma plugin yuklenemiyordu

**Performans:**
- `safeToolHandler()` wrapper ile tum tool handler'lara try-catch (30+ handler)
- `JSON.stringify(x, null, 0)` gereksiz parametreler kaldirildi (25 yer)
- `ResponseCache` sinifi: read-only tool'lar icin TTL cache (5-10s), LRU eviction (yeni dosya: `src/core/response-cache.ts`)
- `figma_check_design_parity` tek-pas optimizasyonu (`codeMap.delete` ile cift dongu kaldirildi)
- Heartbeat `setInterval` -> recursive `setTimeout` (overlap riski yok)
- Process tree walk async: constructor'daki `execSync` bloklama kaldirildi

**Stabilite:**
- `closeAuditLog()` eklendi, shutdown handler'da cagirilir (`audit-log.ts`)
- `getConfig()` ilk load sonrasi cache'ler (`config.ts`)
- `figma_execute` 50,000 karakter limiti
- Mutating tool'lar (`create_*`, `update_*`, `delete_*`, `execute`) cache invalidation

**Tip Guvenligi:**
- `PluginBridgeConnector`: 15+ method `Promise<unknown>` -> tipli return
- `as any` cast'ler kaldirildi
- `BridgeResponse` bos result uyari logu

**Skill/Agent:**
- 6 skill'e standart Hata Yonetimi bolumu eklendi
- 3 agent'a Hata Kurtarma dokumantasyonu eklendi
- `validate-fmcp-skills-tools.mjs`: YAML frontmatter ve hata bolumu yapisal kontrolu

## [1.7.23] - 2026-04-11

### Refactor: Local Full + Cloudflare Modları Kaldırıldı

Proje artık yalnızca **plugin-only** modunu destekliyor. CDP debug port (9222), Figma REST API ve Cloudflare Workers modları kaldırıldı. ~15.000+ satır kod temizlendi.

**Kaldırılan:**
- `src/local.ts` — Full local server (CDP + REST + Puppeteer)
- `src/index.ts` — Cloudflare Workers entry point
- `src/browser/` — Tüm browser modülleri (Puppeteer, Cloudflare Browser Rendering)
- `src/cloud-*.ts` — Cloudflare cloud-specific modüller
- `src/core/figma-tools.ts` — REST API araç kaydı (3,564 satır)
- `src/core/figma-desktop-connector.ts` — CDP connector (1,391 satır)
- `src/core/figma-api.ts`, `console-monitor.ts`, `snippet-injector.ts`, `design-system-manifest.ts`, `figma-reconstruction-spec.ts`
- `src/core/enrichment/` — Tüm enrichment modülleri
- `tsconfig.cloudflare.json`, `wrangler.jsonc`, `worker-configuration.d.ts`
- Bağımlılıklar: `@cloudflare/puppeteer`, `agents`, `puppeteer-core`, `wrangler`

**Güncellenen:**
- `package.json` — main/types → local-plugin-only, bin sadeleştirildi, 3 runtime + 1 dev bağımlılık kaldırıldı
- `tsconfig.local.json` — Sadece plugin-only + core
- `scripts/validate-fmcp-skills-tools.mjs` — Kaynak: sadece local-plugin-only.ts
- `.github/workflows/ci.yml` — local.ts version check kaldırıldı
- `KURULUM.md`, `CONTRIBUTING.md`, `f-mcp-plugin/README.md`, `f-mcp-plugin/manifest.json`
- `.cursor/skills/f-mcp/TOOL_MAPPING.md` — 19 kaldırılan araç temizlendi
- `src/core/types/index.ts` — Kullanılmayan tipler kaldırıldı
- `src/core/config.ts` — Browser/console/screenshot config kaldırıldı

**Korunan:** 46 MCP aracı, 19 skill, plugin bridge (WebSocket 5454), audit log

## [1.7.19] - 2026-04-10

### Fix: `figma_create_frame` Otomatik Pozisyonlama

Frame'ler x parametresi verilmeden oluşturulduğunda (0,0)'da üst üste biniyordu. Artık x belirtilmezse `figma.currentPage.children` taranarak mevcut içeriğin sağına +100px boşlukla otomatik konumlandırma yapılır.

- `x` parametresi opsiyonel, default değer kaldırıldı — verilmezse auto-position
- `parentId` kullanıldığında veya explicit x verildiğinde eski davranış korunur
- Response'a `x` ve `y` bilgisi eklendi

## [1.7.18] - 2026-04-10

### Fix: P3.6 MCP Bridge Araç Sorunları Düzeltmesi

Canlı Figma testi sırasında tespit edilen 4 araç sorunu düzeltildi. Plugin kodu + sunucu tarafı + skill dokümantasyonu güncellendi.

**C1. `figma_setup_design_tokens` mode name → mode ID mapping** (`f-mcp-plugin/code.js`)
- Mode name'leri (`"Light"`, `"Dark"`) mode ID'ye çeviren `modeNameToId` haritası eklendi
- İlk mod `renameMode()` ile kullanıcının istediği isme yeniden adlandırılıyor ("Mode 1" → "Light")
- COLOR tipi token'lar için `hexToFigmaRGB()` dönüşümü eklendi
- Geriye uyumlu: ham mode ID geçilirse de çalışır (`modeNameToId[mid] || mid`)

**C2. ALL_FILLS scope çakışma doğrulaması** (`f-mcp-plugin/code.js` + `src/core/plugin-bridge-connector.ts`)
- Plugin tarafı: scope atamadan önce ALL_FILLS mutual exclusion kontrolü
- Sunucu tarafı: `createVariable()` metoduna erken doğrulama (defense in depth)
- Net hata mesajı: "Scope conflict: ALL_FILLS cannot be combined with..."

**C3. FigJam `shapeWithText` font dokümantasyonu** (2 skill dosyası)
- `figma-canvas-ops/SKILL.md` Kural 8'e FigJam özel durumu eklendi
- `figjam-diagram-builder/SKILL.md`'ye FigJam Font Kuralı bölümü eklendi
- Kural: varsayılan font "Inter Medium" (Regular DEĞİL)

**C4. FigJam timeout limiti dokümantasyonu** (2 skill dosyası)
- `figma-canvas-ops/SKILL.md` Kural 5'e timeout yapılandırması eklendi
- `figjam-diagram-builder/SKILL.md` Common Issues'a timeout bölümü eklendi
- Güvenli limitler: 1-6 node → 5sn | 7-12 → 10sn | 13+ → böl veya 15-30sn

**Canlı Figma Doğrulama:** Tüm düzeltmeler Skill Test dosyasında birebir test edildi ve PASS aldı.

## [1.7.17] - 2026-04-08

### Skill: P3.5 Hata Düzeltmeleri + Dış Kaynak İyileştirmeleri + Canlı Figma Testi

19 F-MCP skill'i canlı Figma dosyasında satır satır test edildi. Tespit edilen 10 hata düzeltmesi (A1-A10) + 12 iyileştirme (B1-B12) uygulandı. Test sonuçları: **18 PASS, 1 PARTIAL, 0 SKIP**.

**Hata düzeltmeleri (A1-A10):**
- **A1** `ai-handoff-export`: Duplike Step 6 numaralama düzeltildi (6→10 kaydırma + cross-ref güncellemesi)
- **A2** `figma-a11y-audit`: "Salt okunur" iddiası → "Okuma + Yazma" (Step 7 annotation oluşturuyor)
- **A3** `figma-a11y-audit`: `h1Count <= 2` → `<= 1` (kural "max 1 H1")
- **A4** `figma-a11y-audit`: Body text filtresi mantık hatası düzeltildi (`>= 12 && < 14`)
- **A5** `figma-screen-analyzer`: Duplike `figma_get_design_context` çağrısı silindi
- **A7** `figma-a11y-audit`: WCAG versiyon tutarlılığı (2.1 → 2.1/2.2)
- **A8** `component-documentation`: Compact formatta Copy Spec eksikliği belirtildi
- **A9** `generate-figma-library`: Faz 1 çıkış kriteri STRING/FLOAT scope ayrımı
- **A10** `SKILL_INDEX.md`: DesignOps akışına `ux-copy-guidance` eklendi

**İyileştirmeler (B1-B12):**
- **B1** `audit-figma-design-system`: CI ortam tespiti (JSON default)
- **B2** `apply-figma-design-system`: İki giriş modu (`review-then-apply` + `apply-known-scope`)
- **B3** `apply-figma-design-system`: %80 uyum eşiği kapısı
- **B4** `fix-figma-design-system-finding`: 3 girdi formatı otomatik algılama
- **B5** `generate-figma-screen`: Loading state karar ağacı (skeleton/spinner/progress)
- **B7** `generate-figma-library`: 60-30-10 renk kuralı (palette + kullanım rehberi)
- **B8** `figma-a11y-audit`: Gesture a11y kontrolleri (7a)
- **B10** `audit-figma-design-system`: Nielsen 10 sezgisel (`--heuristic` flag)
- **B11** `component-documentation`: State machine geçiş diyagramı (Mermaid)
- **B12** `implement-design`: Gesture platform mapping tablosu (iOS/Android/Web)

**Canlı Figma Testi (feedback için):**
- Test dosyası: [Figma Design](https://www.figma.com/design/QNtXuQ5PshxcbkiyMc0YlA/Untitled?node-id=0-1) — 20 sayfa, her skill için görsel doğrulama
- FigJam testi: [Design System JIRA Backlog Süreci](https://www.figma.com/board/roQjK1YgnJBHOTLbtjqFck/Design-System-JIRA-backlog-süreci?node-id=0-1) — `figjam-diagram-builder` swimlane testi
- 6/7 bug gerçek Figma dosyasında düzeltildi (Button touch target, placeholder kontrast, variable bağlama, Türkçe karakter)

**Versiyon tutarlılığı düzeltmesi:**
- `.cursor-plugin/plugin.json`: 1.7.14 → 1.7.17 (v1.7.15/v1.7.16'da atlanmıştı)
- `KURULUM.md`: 1.7.14 → 1.7.17 (v1.7.15/v1.7.16'da atlanmıştı)

**P3.6 plan (sonraki sürümde):** 4 araç sorunu FUTURE.md'de plan halinde — `figma_setup_design_tokens` mode name mapping, `ALL_FILLS` scope validation, FigJam `shapeWithText` font dokümantasyonu, FigJam timeout limiti. Plugin kodu bu sürümde dokunulmadı.

## [1.7.15] - 2026-04-08

### Skill: Anthropic Design Skill Entegrasyonu + Marka Profili + UX Copy

Anthropic built-in design skill'leri (accessibility-review, design-handoff, design-critique, design-system-management, ux-writing, frontend-design) ile F-MCP skill'leri satır satır karşılaştırıldı. Eksik tasarım prensipleri, yapısal çerçeveler, estetik yönlendirme ve kişiselleştirme mekanizmaları entegre edildi.

**Yeni dosyalar:**
- **ux-copy-guidance/SKILL.md (YENİ):** UX yazarlık rehberi — 5 temel prensip, 6 copy kalıbı (CTA, hata, boş durum, onay, başarı, yükleme), ses/ton rehberi, marka profili kişiselleştirmesi, çok dilli/i18n kuralları, Figma text node entegrasyonu (19. skill)
- **BRAND_PROFILE_SCHEMA.md (YENİ):** `.fmcp-brand-profile.json` şema tanımı — tüm skill'lerin kişiselleştirilebilmesi için merkezi yapılandırma (ses/ton, tipografi, estetik yön, copy kuralları, i18n)

**Genişletilen skill'ler (10):**
- **figma-a11y-audit:** WCAG 2.1 AA hızlı referans (12 kriter), yaygın sorunlar listesi (8), test yaklaşımı sırası (5 aşama), Step 5'e WCAG referansı, Step 8'e 3 yeni kontrol (fokus göstergesi, hata ilişkilendirme, UI bileşen kontrastı)
- **ai-handoff-export:** Handoff prensipleri (4), etkileşim spesifikasyonları, içerik spesifikasyonları, uç durumlar tablosu, erişilebilirlik spesifikasyonları, marka profili entegrasyonu
- **audit-figma-design-system:** DS eksiksizlik çerçevesi (token kategorileri, bileşen durum kapsamı, pattern katmanı), DS prensipleri, JSON şemasına `dsCompleteness`
- **figma-screen-analyzer:** İlk İzlenim Analizi (2sn testi), görsel hiyerarşi 4 yeni soru, geri bildirim prensipleri (5), marka profili entegrasyonu
- **generate-figma-screen:** Tasarım Yönü Belirleme (Step 2.5), tipografi stratejisi, görsel derinlik (Step 5.5), anti-pattern kontrolü, marka profili entegrasyonu
- **component-documentation:** Durumlar bölümü ve Copy Spec bölümü eklendi (Standard format 8→10 bölüm), marka profili entegrasyonu
- **implement-design:** Step 7d durum/etkileşim kapsamı kontrolü (6 kontrol), marka profili entegrasyonu
- **generate-figma-library:** Faz 1'e motion token (1f) ve shadow token (1g), Faz 3'e durum kapsamı kontrolü (3d), marka profili entegrasyonu
- **design-system-rules:** DS prensipleri (Step 3.5), pattern katmanı kuralları (Step 3.6)
- **design-drift-detector:** Motion token drift kontrolü (Step 5.5)

**Güncellenen referans dosyalar:**
- **SKILL_INDEX.md:** Kişiselleştirme bölümü, skill sayısı 18→19, persona akışları güncellenmiş, uçtan uca akış güncellenmiş
- **FUTURE.md:** P3 tüm maddeler [TAMAMLANDI], sürüm referansları güncellenmiş

## [1.7.14] - 2026-04-07

### Kurulum Deneyimi İyileştirmesi

Kaynak: `fmcp-feedback.md` — terminal bilgisi olmayan kullanıcının kurulum zorluğu feedback'i.

- **`scripts/setup.sh`** eklendi: Node.js kontrolü, build, MCP config otomatik ayarı — tek komutla kurulum
- **`scripts/setup-npx.sh`** eklendi: NPX ile kurulum — repo indirmeden, config otomatik
- **`scripts/update.sh`** eklendi: Tek komutla otomatik güncelleme
- **Plugin UI:** "auto port" → "otomatik bağlantı aktif" mesajı; port input title'ları daha açıklayıcı
- **README.md** sadeleştirildi: Teknik bilgisi olmayan kullanıcı için net kurulum akışı
- **ONBOARDING.md** güncellendi: Tek komutluk kurulum referansı
- **KURULUM.md** güncellendi: Script referansı, sürüm güncelleme
- **UPDATE.md** güncellendi: Otomatik güncelleme bölümü eklendi
- **FUTURE.md** güncellendi: Kurulum deneyimi hedefleri (pre-built binary, GUI installer)
- **TEST_REPORT.md** sürüm güncellendi

## [1.7.13] - 2026-04-07

### Plugin UI: Dark/Light Tema Uyumu ve Font Okunabilirliği

**Kök neden düzeltmesi:**
- **`@media (prefers-color-scheme: light)` kaldırıldı:** Figma plugin iframe'inde bu media query çalışmıyor. Figma `themeColors: true` ile `<html>` elementine `.figma-light` / `.figma-dark` class ekler — artık resmi Figma tema sistemi kullanılıyor.
- **`@media` fallback eklendi:** Browser preview ve Figma dışı ortamlarda da light tema çalışır (`:root:not(.figma-dark)` selector ile).

**Renk düzeltmeleri:**
- **17 CSS custom property tanımlandı:** `--fmcp-bg-subtle`, `--fmcp-text-secondary`, `--fmcp-border-light` vb. Dark tema varsayılan, `.figma-light` ve `@media light` ile override.
- **Tüm hardcoded `rgba(255,255,255,...)` inline renkler** CSS variable'lara çevrildi — light temada artık okunaklı.
- **Tüm `color: inherit` ve `color: #fff`** kaldırıldı, tema-uyumlu `var()` fallback'lere çevrildi.
- **Figma `--figma-color-*` variable fallback'leri** `var(--fmcp-*)` ile değiştirildi — Figma variable inject etmediğinde bile doğru renk.
- **3 JS dinamik renk** (`updateTokenUI`, `updatePortLabel`) `fmcpVar()` helper ile tema-uyumlu.

**Font okunabilirliği:**
- **Tüm font boyutları +2px büyütüldü:** body 11→13, label/toggle 10→12, info 9→11, note 8→10, icon 7→9.
- **Icon boyutları da +2px:** info butonları 13→15px, rate-limit info 11→13px (line-height uyumlu).

**Etkilenen alanlar:** Status bar, Advanced panel, Host/Port input, Port switcher, API Token section, Rate limit bar, Connections panel — tümü dark ve light temada okunaklı.

## [1.7.10] - 2026-04-05

### Doküman: Kapsamlı Güncelleme Rehberi

- **docs/UPDATE.md (YENİ):** NPX cache temizleme, clone güncelleme, Claude Code, Windsurf, Figma plugin güncelleme, sorun giderme, rollback — tüm senaryolar tek rehberde
- **docs/ONBOARDING.md:** Kırık link düzeltmesi (`README.md#sürüm-ve-güncellemeler` anchoru yoktu), `figma-mcp-bridge-plugin` binary name eklendi
- **README.md:** Dokümanlar tablosuna UPDATE.md linki, sürüm bilgisi güncellendi
- **FUTURE.md:** Sürüm referansları güncellendi
- **.cursor-plugin/plugin.json:** Sürüm güncellendi

## [1.7.9] - 2026-04-05

### Türkçe Karakter Düzeltmesi (Kapsamlı)

**Kök neden düzeltmesi:**
- **7 skill'e Türkçe Karakter Kuralı eklendi:** generate-figma-screen, generate-figma-library, implement-design, ai-handoff-export, component-documentation, figma-a11y-audit, figma-screen-analyzer. Tüm Türkçe metin üretiminde doğru Unicode karakter kullanımı artık zorunlu.

**Skill iç düzeltmeleri:**
- **component-documentation/SKILL.md:** Dosyanın tamamı (~52 satır) ASCII Türkçe → doğru Unicode'a dönüştürüldü
- **generate-figma-library/SKILL.md:** Satır 166-425 arası Kritik Kurallar bölümü (~35 satır) düzeltildi

**Test output dosyaları:**
- **HANDOFF.md:** ~37 düzeltme (Geliştirici → Geliştirici, Şifre, Bileşen, Erişebilirlik vb.)
- **LoginScreen.tsx:** 2 düzeltme ("Sifre" → "Şifre")
- **LoginView.swift:** 3 düzeltme ("Sifre" → "Şifre", "Hesabiniz" → "Hesabınız")
- **LoginScreen.kt:** 2 düzeltme ("Sifre" → "Şifre", "Hesabiniz" → "Hesabınız")

**Figma tasarım dosyası:**
- 48+ text node ve frame ismi düzeltildi (A11y Annotations panel, component documentation frame dahil)
- İteratif doğrulama döngüsü: 3 tur tarama ile 327 text node'da 0 kalan hata

**Dokümantasyon:**
- TEST_REPORT.md, FUTURE.md, CHANGELOG.md — tüm ASCII Türkçe düzeltildi

**Yanlış pozitif koruması:** "Şifremi unuttum" (6 instance korundu), kod identifier'ları ve token isimleri değişmedi.

## [1.7.8] - 2026-04-05

### Fix
- **CI version consistency:** Kaynak dosyalardaki (local.ts, local-plugin-only.ts, plugin-bridge-server.ts) versiyon stringleri package.json ile senkronize edildi. CI "Version consistency check" artık başarılı.

## [1.7.6] - 2026-04-05

### component-documentation Skill (YENİ — 18. skill)

- **Format seçimi zorunlu:** Standard (~2400px) ve Compact (~1300px) seçenekleri kullanıcıya sunulur, onay olmadan frame oluşturulmaz
- **Görsel Do/Dont örnekleri:** Gerçek component instance'larıyla doğru/yanlış çift kartlar (hiyerarşi, etiket, variant kullanımı)
- **Endüstri standartları referansı:** `reference_industry_design_standards.md` hafıza dosyası (14 bölüm: M3, HIG, WCAG 2.2, shadcn/ui, Tailwind, Radix, Lucide, DTCG)
- **Yıllık güncelleme:** Standart kontrolü 1 yıldan eskiyse kullanıcıya güncelleme önerisi (9 kaynak)
- **SKILL_INDEX.md:** 17→18 skill, "Dokümantasyon" kategorisi eklendi

### generate-figma-library Skill (Zenginleştirme)

- **Token bağlama tablosu:** fill, text fill, stroke, strokeWeight, radius, padding, gap, minHeight, fontSize — tüm değerlerin variable'a bağlı olması zorunlu
- **Text hizalama kuralı:** Bileşen tipine göre textAlignHorizontal tablosu (Button=CENTER, Input=LEFT vb.)
- **Bileşen sizing kuralı:** Button/Tag=HUG, Input=FILL — Fixed width butonlarda yazı ortalanmaz
- **Code only props:** `layoutPositioning = "ABSOLUTE"` zorunlu — auto-layout gap'te boşluk yaratmayı önler
- **Component set oluşturma:** `figma_arrange_component_set` + sonrasında `figma_execute` ile stroke/auto-layout/rename

### Plugin Bug Fix

- **`figma_arrange_component_set`:** `getNodeById` → `getNodeByIdAsync` düzeltildi (documentAccess: dynamic-page hatası)

### FUTURE.md

- P2: Component documentation skill'inin diğer bileşen tiplerinde testi (Input, Card, Modal, Nav)

## [1.7.4] - 2026-04-04

### Graceful Port Takeover — Oturum Geçişi Sorunu Çözüldü

**Bridge (plugin-bridge-server.ts):**
- **Graceful shutdown endpoint (`POST /shutdown`):** HTTP server'a `/shutdown` endpoint'i eklendi. Yeni bridge instance'ı eskisine shutdown isteği gönderir, eski bridge gracefully kapanır.
- **`requestShutdownAndRetry()` metodu (YENİ):** Port meşgulse ve başka bir F-MCP bridge tespit edilirse, otomatik olarak shutdown isteği gönderir + aynı portu devralır. Plugin port değişikliği gerektirmez.
- **Port stratejisi güncellendi:** "no auto-scanning" → "graceful takeover". Eski oturum kapandığında yeni oturum aynı portu (varsayılan 5454) devralır, plugin otomatik bağlanır.
- **Eski davranış (kaldırıldı):** Port meşgulse hata verip kullanıcıdan `figma_set_port` çağrısı bekliyordu. Artık otomatik devralma yapıyor.

**Etki:** Claude Code / Cursor'da yeni oturum başlatıldığında eski oturumun bridge'i portu tutuyordu. Kullanıcının plugin'de portu elle değiştirmesi gerekiyordu. Artık yeni bridge eskisini otomatik kapatıp portu devralır.

## [1.7.2] - 2026-04-04

### Kapsamlı Entegrasyon Testi + 11 Skill Güncelleme + Code-Only Props

**Test:**
- Uçtan uca entegrasyon testi: 46 araç, 17 skill, 11 faz
- 120 token (Primitives + Primitives Dark + Semantic), 6 ekran (3 boyut x 2 tema), 1 component set (5 variant)
- 10 dosya üretildi: 3 kod (React/Swift/Kotlin), 5 token (CSS/Tailwind/Swift/Kotlin/JSON), 1 handoff
- WCAG AA erişebilirlik: tüm renk çiftleri PASS, tüm touch target >= 44px

**Skill düzeltmeleri (9):**
- `audit/apply-figma-design-system`: figma_take_screenshot → figma_capture_screenshot
- `ai-handoff-export`: figma_get_component_details → figma_get_component_for_development
- `implement-design`: componentId → nodeId
- `figma-screen-analyzer`: DS compliance formülü düzeltildi
- `ds-impact-analysis`: sayfa limiti 5→20, transitif bağımlılık eklendi
- `fix-figma-design-system-finding`: 3 remediasyon modu kod örneği
- `generate-figma-library`: batch hata yönetimi pattern

**Skill zenginleştirmeleri (20):**
- Token description + code syntax (Web/Android/iOS) zorunlu adımı
- Semantic Token = Alias zorunlu kuralı
- Breakpoint / ekran boyut token'ları
- Dark mode token stratejisi (Pro+ native vs Free workaround)
- Code-Only Props katmanı (Nathan Curtis yaklaşımı)
- Responsive boyut presetleri (3 boyut + dark = 6 ekran zorunlu)
- MinHeight token binding zorunlu adımı
- A11y annotation frame (başlık hiyerarşisi, form ilişkilendirme, odak sırası, alt text, dinamik içerik)
- Erişebilirlik-tasarım tutarlılık kontrolü (7 kural)
- Code-Only Props spec data çıkarma (handoff)

**FUTURE.md eklemeleri:**
- P0: Figma Make entegrasyonu + canlı prototip süreci
- P0: Figma prototip bağlantıları + animasyonlar
- P1: Figma Dev Mode entegrasyonu

## [1.7.0] - 2026-04-04 (güncelleme)

### Claude Code Desteği ve Test Raporu (YENİ)

- **README: Claude Code kurulum bölümü eklendi.** `.mcp.json` dosyası ile NPX tabanlı config. `~/.claude/settings.json`'in MCP için çalışmadığına dair uyarı notu.
- **`.mcp.json` güncellendi:** Cursor'a özel bash script yerine evrensel NPX config (hem Claude Code hem Cursor ile uyumlu).
- **`docs/TEST_REPORT.md` (YENİ):** 46 aracın tamamı test edildi (40 PASS, 4 beklenen Figma kısıtı, 2 güvenlik nedeniyle SKIP). Free/Pro/Org/Enterprise plan bazlı yetenek matrisi. Adım adım test rehberi.

## [1.7.0] - 2026-04-03

### Çoklu Port + Otomatik AI Aracı Tespiti (YENİ)

- **Plugin çoklu port bağlantısı:** 5454-5470 arasını periyodik tarar (10s), bulunan tüm bridge'lere sessizce bağlanır.
- **AI aracı otomatik tespiti:** Bridge parent process'ten (Claude, Cursor, Claude Code, Windsurf) veya `FIGMA_MCP_CLIENT_NAME` env var'dan otomatik tespit. Welcome mesajında `clientName` gönderilir.
- **Port geçiş UI:** ◀▶ ok tuşlarıyla bağlı portlar arası geçiş. Status bar'da "Ready" + aktif port etiketi.
- **(i) info paneli:** Tıklanınca bağlı portlar listesi açılır (● aktif ○ diğerleri).
- **"Otomatik tara" butonu kaldırıldı:** Çoklu port bunu otomatik yapar.
- **SVG/PNG export düzeltmesi:** `batchExportNodes` handler + result case eklendi (timeout sorunu çözüldü).
- **Token disabled:** Token girildikten sonra input + süre seçici disabled (sadece sil + yeniden ekle).
- **Responsive layout:** İçerik taşma önlendi, sabit genişlik sadece yükseklik dinamik.
- **Plugin max height:** 420→700 (içerik kesilmez).

## [1.6.3] - 2026-04-03

### Dokümantasyon temizliği

- **28→21 aktif doküman:** 10 dosya arşivlendi (OAUTH_SETUP, SELF_HOSTING, DEPLOYMENT_COMPARISON, CLAUDE_DESKTOP_CONFIG, FIGMA_USE, FMCP_AGENT_CANVAS_COMPAT, RECONSTRUCTION_FORMAT, PUBLISH-PLUGIN, DEPENDENCY_LAYERS, RELEASE_NOTES_TEMPLATE + root: SECURITY_FIXES_ANALYSIS, HANDOFF_TEMPLATE)
- **Kırık link: 0** — tüm referanslar güncellendi veya kaldırıldı
- **README sadeleştirildi:** Doküman tablosu kullanıcı odaklı, gereksiz satırlar kaldırıldı
- **TOOLS.md:** Agent Canvas referansları v1.6 araçlarıyla güncellendi

## [1.6.2] - 2026-04-02

### Dokümantasyon düzeltmeleri

- README: 5 kırık archived link düzeltildi, figma_export_nodes eklendi, REST_API_GUIDE + CONTRIBUTING referansları eklendi
- README: "33 araç" → "46 araç", tekrar eden satırlar kaldırıldı
- FUTURE.md: 9 tamamlanan P0-P3 maddesi işaretlendi
- KURULUM.md: versiyon 1.2.0 → 1.6.2

## [1.6.1] - 2026-04-02

### Batch Export (YENİ — 1 tool)

- **`figma_export_nodes`**: SVG/PNG/JPG/PDF batch export (1-50 node). Plugin exportAsync kullanır, REST token gerektirmez. Base64 çıktısı, ölçeklendirilebilir (0.5-4x). SVG vektörel koruma, outline text ve node ID options.
- **`BATCH_EXPORT_NODES`** plugin handler eklendi (code.js). Promise.all ile paralel export, node başına hata yönetimi.
- **Connector**: `batchExportNodes()` metodu eklendi.
- **Tip tanımları**: `PluginExportResult`, `PluginBatchExportPayload` (types/figma.ts).

### Toplam: 46 araç (önceki: 45)

## [1.6.0] - 2026-04-02

### Tasarım Oluşturma Araçları (YENİ — 4 tool)

- **`figma_create_frame`**: Yeni frame oluşturma (x, y, boyut, renk, parentId)
- **`figma_create_text`**: Yeni metin node'u (font, boyut, renk)
- **`figma_create_rectangle`**: Dikdörtgen oluşturma (boyut, renk, cornerRadius)
- **`figma_create_group`**: Mevcut node'ları gruplama

### Kütüphane ve Tanılama (YENİ — 2 tool)

- **`figma_search_assets`**: Takım kütüphanesi variable collection arama (plugin teamLibrary API)
- **`figma_plugin_diagnostics`**: Plugin sağlık kontrolü (uptime, bellek, bağlantı, port, rate limit)

### Dokümantasyon

- **CONTRIBUTING.md**: Yerel kurulum, test, tool ekleme, versiyon güncelleme rehberi
- **docs/REST_API_GUIDE.md**: Token kurulumu, örnek çağrılar, hibrit akış, rate limit yönetimi
- **npm keywords**: design-system, design-tokens, ui-automation, zero-trust, cursor, agent eklendi

### Toplam: 45 araç (önceki: 39)

## [1.5.2] - 2026-04-02

### Test altyapısı

- **36 test:** response-guard.ts (18 test) + figma-url.ts (16 test) + basic (2 test)
- **CI'a test adımı eklendi:** `npm test` her push/PR'da otomatik çalışır
- **Coverage config:** Plugin-only modüla odaklı; tam mod dosyaları hariç tutuldu
- **Test dosyaları:** `tests/core/response-guard.test.ts`, `tests/core/figma-url.test.ts`

## [1.5.1] - 2026-04-02

### TypeScript tip güvenliği

- **Yeni tip dosyası:** `src/core/types/figma.ts` — RGBColor, FigmaVariable, FigmaVariableCollection, FigmaPaintStyle, FigmaTextStyle, FigmaComponent, PluginVariablesPayload, PluginStylesPayload, PluginComponentPayload vb.
- **Plugin-only `any` azaltma:** 34 → 5 (%85 azalma). Kalan 5: Zod şema (z.any) ve resolvedType cast.
- **Connector `any` azaltma:** 46 → 1 (%98 azalma). Tüm Promise<any> dönüşleri tipli hale getirildi.
- **Bridge server `any` azaltma:** 3 → 1 (%67). WebSocket mesaj tipleri iyileştirildi.
- **Plugin minify geri alındı:** esbuild minify Figma sandbox'ında "Syntax error" oluşturuyordu. Orijinal code.js geri yüklendi.

## [1.5.0] - 2026-04-02

### Plugin optimizasyonu

- **Plugin minify:** `f-mcp-plugin/code.js` esbuild ile minify (101KB→65KB, %37 küçük). `build:plugin` script eklendi; `prepublishOnly` otomatik minify.

### CI/CD güçlendirme

- **TypeScript tip kontrolü:** `tsc --noEmit` CI'a eklendi — derleme hataları artık otomatik yakalanıyor.
- **Build doğrulama:** `npm run build:local` CI'da çalıştırılır.
- **Versiyon tutarlılık kontrolü:** CI, `package.json` versiyonunun `src/` dosyalarıyla eşleşip eşleşmediğini otomatik kontrol ediyor.
- **Güvenlik taraması:** `npm audit` CI'a eklendi.

### Temizlik

- **Archive silindi:** 8.1 MB gereksiz dosya (eski zip, görseller, eski sürüm dosyaları) — git geçmişinde mevcut.
- **Belgeler arşivlendi:** 6 tekrar eden / eski belge `docs/archived/` klasörüne taşınarak aktif belge sayısı 30→24'e indirildi.
- **TODO'lar temizlendi:** `enrichment-service.ts` ve `style-resolver.ts`'deki 6 TODO/FIXME notu açıklayıcı yorumlarla değiştirildi. Kaynak kodda sıfır TODO.

## [1.4.4] - 2026-04-02

### Versiyon tutarlılığı (kesin düzeltme)

- Tüm kaynak kod, doküman, config ve dist dosyalarındaki versiyon string'leri 1.4.4 olarak senkronize.
- npm paketi güncel dist ile yeniden yayınlandı (önceki 1.4.3 npm'de eski dist içerebiliyordu).
- NPX örnekleri @latest kullanacak şekilde güncellendi.

## [1.4.3] - 2026-04-02 [NOT: npm paketi eski dist içerebilir, 1.4.4 kullanın]

### Versiyon tutarlılığı

- Tüm kaynak kod, doküman ve config dosyalarındaki versiyon referansları senkronize edildi.

## [1.4.2] - 2026-04-02

### Kritik düzeltme

- **dist/browser pakete geri eklendi:** v1.4.1'de tam mod (local.js) `dist/browser/local.js`'i import ediyordu ama dosya paketten çıkarılmıştı → MODULE_NOT_FOUND hatası. `dist/cloudflare/` hariç tutuldu (bu kullanılmıyor).

## [1.4.1] - 2026-04-02 [YANLIŞ — tam mod kırık, 1.4.2 kullanın]

### npm paket optimizasyonu

- **Paket boyutu:** 284 KB → 230 KB (%19 küçük), açık 1.7 MB → 1.2 MB (%30 küçük)
- **Dosya sayısı:** 128 → 96 (32 gereksiz dosya çıkarıldı)
- **Çıkarılan:** `dist/cloudflare/` (440 KB), `dist/browser/` (44 KB) — plugin-only modda kullanılmıyordu
- **Korunan:** `dist/local.js` (tam mod), `dist/core/` (paylaşımlı), `f-mcp-plugin/`

## [1.4.0] - 2026-04-02

### Figma REST API entegrasyonu (YENİ)

- **`figma_set_rest_token`**: Figma REST API token girişi (figd_... formatı). Token doğrulama (/v1/me), 10s timeout.
- **`figma_rest_api`**: Direkt REST API çağrısı (export, comments, versions, teams). Endpoint-bazlı akıllı kırpma, 429 retry (3 deneme, exponential backoff), rate limit ön kontrolü.
- **`figma_get_rest_token_status`**: Token durumu, rate limit bilgisi, düşük limit uyarısı.
- **`figma_clear_rest_token`**: Token temizleme.

### Response Guard — Context koruması

- **`response-guard.ts`**: Paylaşımlı cevap kırpma modülü. AI context penceresi taşmasını önler.
- **Endpoint-bazlı kırpma**: comments → son 20, versions → son 10, files → ilk 20 sayfa (children stripped).
- **Boyut limitleri**: 200KB üstü otomatik kırpma. Gerçek test: 237KB → 10KB (comments), 533KB → 1KB (file).
- **AI bilgilendirme**: Kırpılan cevaplara `_truncated` ve `_responseGuard` metadata eklenir.

### 429 Rate Limit korumaları

- **Otomatik retry**: 429 durumunda 3 deneme, Retry-After header veya exponential backoff (5s→10s→20s), max 45s.
- **Ön kontrol**: remaining=0 → kısa devre hata; remaining<10 → cevaba uyarı bloğu.
- **Rate limit broadcast**: Her REST çağrısından sonra güncellenen limitler tüm plugin'lere bildirilir.

### Plugin UI — Token ve limit yönetimi

- **Token girişi**: Advanced panelinde şifrelenmiş input + süre seçici (1/7/30/90 gün).
- **Kalıcı depolama**: `figma.clientStorage` ile token plugin kapatılıp açılsa bile kalır. Süre dolunca otomatik temizlenir.
- **Otomatik restore**: Plugin açıldığında → clientStorage → UI + bridge otomatik gönderi.
- **Rate limit göstergesi**: Kullanım bar'ı (yeşil/sarı/kırmızı), düşük limit uyarısı (%20), kritik uyarı (%5, nabız animasyonu), doldu mesajı.
- **Token süresi**: Kalan gün sayacı + bitiş tarihi; ≤7 gün sarı uyarı, dolmuş → kırmızı + otomatik silme.

### Kod kalitesi

- **`response-guard.ts`** yeni modül: `estimateTokens()`, `calculateSizeKB()`, `truncateResponse()`, `truncateRestResponse()`.
- **Port değişiminde token koruma**: `restart()` token'ı save/restore eder.
- **Token reconnect**: WebSocket yeniden bağlandığında kaydedilmiş token otomatik gönderilir.

## [1.3.2] - 2026-04-02

### Bridge (hata düzeltmeleri)

- **Hafıza sızıntısı düzeltmesi:** `tryListenAsync()` timeout yolunda `_listenResolve` temizlenmiyordu; tekrarlanan port değişikliklerinde bellek şişiyordu.
- **bridgeVersion:** Plugin welcome mesajında `"1.1.0"` → `"1.3.2"` olarak güncellendi.
- **Versiyon tutarlılığı:** McpServer version, `.cursor-plugin/plugin.json`, `package-lock.json` hepsi senkronize edildi.
- **Stale dist temizliği:** Silinen `figma-style-extractor` kaynak dosyasının artık dist/ kopyaları kaldırıldı.

## [1.3.1] - 2026-04-02

### Bridge (hata düzeltmeleri)

- **`restart()` race condition düzeltmesi:** `tryListenSync()` fire-and-forget yaklaşımı yerine async Promise tabanlı `tryListenAsync()` — port bind sonucu kesin olarak beklenir (500ms sabit delay kaldırıldı).
- **`figma_set_port` concurrent koruma:** Mutex flag ile eşanlı çağrılarda "devam ediyor" hatası; ikinci çağrı önceki tamamlanmadan başlamaz.
- **`probePort().then()` eksik `.catch()`:** Probe hatalarında `startError` set edilir, sessiz hata önlenir.
- **`_listenResolve` callback:** Başarılı/başarısız bind sonrası async restart akışını bilgilendirir.

### Versiyon tutarlılığı

- McpServer version: `"1.1.2"` → `"1.3.0"` (`local-plugin-only.ts`, `local.ts`)
- `.cursor-plugin/plugin.json`: `"1.2.1"` → `"1.3.0"`
- `package-lock.json` senkronize edildi

### Dokümantasyon

- `docs/TOOLS_FULL_LIST.md`: `figma_set_port` eklendi; araç sayısı 34 → 35

### Temizlik

- **Atıl kod:** `figma-style-extractor.ts` (hiç import edilmiyor) silindi; `extractVariant()` (hiç çağrılmıyor) silindi
- **Orphan script'ler:** `launch-figma-debug.ps1/.sh`, `launch-figma-with-plugin.sh`, `plugin-ac.py` silindi
- **Archive duplicate:** `archive/skills-root-duplicate/` silindi (`.cursor/skills/f-mcp/` ile aynı)

## [1.3.0] - 2026-04-02

### Bridge (port yönetimi)

- **`figma_set_port` aracı (YENİ):** Runtime'da WebSocket bridge portunu değiştirme. Port meşgulse AI aracı (Claude/Cursor) `figma_set_port(5456)` çağırarak başka bir porta geçer; Figma plugin'de aynı portu seçince bağlantı kurulur. Aralık: 5454-5470.
- **Port çatışması artık öldürücü değil:** Port meşgulse `process.exit(1)` yerine MCP stdio sunucusu ayakta kalır ve `figma_get_status` üzerinden hata mesajı döner. Kullanıcı `figma_set_port` ile farklı porta geçebilir.
- **`figma_get_status` genişledi:** `bridgeListening`, `startError` alanları eklendi; bridge dinlemiyorsa net hata mesajı ve port değiştirme yönlendirmesi.
- **`PluginBridgeServer` yeni API'ler:** `restart(port)`, `getPort()`, `isListening()`, `getStartError()` metodları eklendi.

### Çoklu AI aracı (aynı anda Claude + Cursor)

- Claude Desktop ve Cursor aynı anda çalıştığında port çatışmasını çözen akış: ilk açılan varsayılan portu (5454) alır, ikinci açılan `figma_set_port` ile farklı porta geçer. Her AI aracı kendi bridge'i üzerinden bağımsız çalışır.

### Bridge (önceki unreleased)

- **Sabit port stratejisi:** Otomatik port taraması (5454-5470 sıralı deneme) kaldırıldı. Bridge artık yapılandırılan porta doğrudan bağlanır; port meşgulse HTTP health-check ile canlı F-MCP / ölü süreç / farklı servis ayırt edilir; ölü port için kısa gecikmeli tek retry.
- **Graceful shutdown:** `local-plugin-only.ts`'e SIGINT/SIGTERM handler eklendi -- IDE veya Claude kapandığında `bridge.stop()` çağrılarak port anında serbest bırakılır (ölü port sorununun ana düzeltmesi).
- **probePort edge case:** `FIGMA_BRIDGE_HOST=0.0.0.0` durumunda port probe'u `127.0.0.1` üzerinden yapılır.

### Dokümantasyon

- [docs/MULTI_INSTANCE.md](docs/MULTI_INSTANCE.md): "Tek MCP = tüm pencereler aynı oturum" bölümü, **"Paralel görevler (Claude + Cursor + ikinci hat)"** bölümü (mimari, port tablosu, plugin Advanced uyarısı, Cursor paylaşımlı MCP notu, audit log çakışma notu).
- [docs/CLAUDE_DESKTOP_CONFIG.md](docs/CLAUDE_DESKTOP_CONFIG.md): çoklu `mcpServers` örneği (5455 + 5470 farklı sunucu adlarıyla).
- [KURULUM.md](KURULUM.md): Claude config "sık görülen hatalar" özeti.
- [README.md](README.md): Port çatışması uyarısı güncellemesi.

### Araçlar

- `npm run check-ports` -- [`scripts/check-ports.sh`](scripts/check-ports.sh): 5454-5470 arasında LISTEN durumundaki süreçleri listeler (paralel görev doğrulaması ve sorun giderme için).

### Cursor skills (F-MCP)

- Yeni skill'ler: `audit-figma-design-system`, `fix-figma-design-system-finding`, `apply-figma-design-system` (tuval içi design system audit/fix/apply; F-MCP Bridge araç eşlemesi).
- Mevcut F-MCP skill'lerine karşılıklı **F-MCP skill koordinasyonu** bölümleri eklendi.
- Tuval skill'lerinde `figma_get_metadata` kaldırıldı; Bridge ile uyum için `figma_get_file_data` / `figma_get_component` / `figma_get_design_context` eşlemesi; **design-drift-detector** koordinasyonunda tipik sıra (implement - drift) netleştirildi; **audit** içinde zincir performans notları.
- [.cursor/skills/f-mcp/SKILL_INDEX.md](.cursor/skills/f-mcp/SKILL_INDEX.md): tüm skill'lerin dizini, workspace kökü (FCM) notu, özet akış.
- `npm run validate:fmcp-skills` -- [`scripts/validate-fmcp-skills-tools.mjs`](scripts/validate-fmcp-skills-tools.mjs): skill `.md` içindeki `figma_*` adlarını `src/local.ts`, `src/local-plugin-only.ts`, `src/core/figma-tools.ts` içindeki `registerTool` birleşimine göre doğrular.
- GitHub Actions: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) -- `master` / `main` için PR ve push'ta `npm run validate:fmcp-skills` zorunlu.

### Plugin (F-MCP Bridge)

- Gelişmiş panel: **Otomatik tara** düğmesi -- port alanıyla tek porta kilitlenmeyi kaldırıp 5454-5470 taramasını yeniden başlatır.
- Advanced panel kapatıldığında aynı kilit kalkar (ilk yüklemede çift bağlantı tetiklenmez).

### Süreç (bakımcılar)

- Sonraki sürüm: `CHANGELOG.md` güncelle - `docs/releases/vX.Y.Z-body.md` oluştur - [RELEASE_NOTES_TEMPLATE.md](docs/RELEASE_NOTES_TEMPLATE.md) içindeki `gh release create` / `gh release edit` ile GitHub Release aç veya güncelle.

## [1.2.1] - 2026-04-01

GitHub Release: [v1.2.1](https://github.com/atezer/FMCP/releases/tag/v1.2.1); gövde: [docs/releases/v1.2.1-body.md](docs/releases/v1.2.1-body.md).

### Bridge

- **`figma_search_components`:** Çıktı özetine bileşen **`key`** alanı eklendi; `figma_instantiate_component(componentKey)` akışı ile uyum.
- **`prepublishOnly`:** `npm publish` öncesi `build:local` + `validate:fmcp-skills` (Worker `build:cloudflare` ayrı; npm paketi bin'leri `dist/local*.js`).

### Dokümantasyon

- **`docs/TOOLS.md`**, **`docs/TOOLS_FULL_LIST.md`:** `dist/local-plugin-only.js` ile parite; `figma_search_assets` / `figma_get_code_connect` / `figma_use` bu build'de kayıtlı değildir notu; `figma_search_components` + `key` açıklaması.
- **`docs/FMCP_AGENT_CANVAS_COMPAT.md`:** Bölüm 3 güncel envanter / planlanan ayrımı.
- **`docs/FIGMA_USE_STRUCTURED_INTENT.md`:** `figma_use` taslak; canlı araç `figma_execute` notu.

## [1.2.0] - 2026-03-27

### Dokümantasyon

- Sürüm takibi ve güncelleme adımları: [README.md](README.md#surum-ve-guncellemeler), [KURULUM.md](KURULUM.md#surum-takibi-ve-guncelleme-notlari).
- Bu changelog dosyası eklendi; GitHub Releases ve npm ile birlikte tek referans olarak kullanılmalıdır.
- GitHub [Release v1.2.0](https://github.com/atezer/FMCP/releases/tag/v1.2.0); gövde: [docs/releases/v1.2.0-body.md](docs/releases/v1.2.0-body.md). Bakımcı akışı: [docs/RELEASE_NOTES_TEMPLATE.md](docs/RELEASE_NOTES_TEMPLATE.md).

### Bakım ve doğrulama (2026-03)

- [FUTURE.md](FUTURE.md) kod taraması: npm `@atezer/figma-mcp-bridge@1.2.0` doğrulandı; `dist/` ile `docs/TOOLS.md` Agent Canvas üçlüsü uyumsuzluğu not edildi (doküman düzeltmesi S7'de açık).
- Figma Organization private plugin yayını tamamlandı (FUTURE S5).

### Not

Bu sürüm, npm paketi `@atezer/figma-mcp-bridge@1.2.0` ve depo kökündeki `package.json` ile hizalıdır. Önceki sürümlerin ayrıntılı kaydı bu dosyada başlamaktadır.
