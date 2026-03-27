# FMCP × Figma Agent Canvas — Uygulama Planı

> **Hedef:** Figma'nın 24 Mart 2026'da duyurduğu agent canvas yeteneklerini,  
> resmi MCP'nin zorunlu kıldığı IDE/Claude Code bağımlılığı olmadan,  
> **MCP destekli istemciler + FMCP bridge** ile kullanılabilir hale getirmek.  
> *Not:* `claude.ai` ile yerel WebSocket köprüsü aynı model değildir; bkz. [docs/FMCP_AGENT_CANVAS_COMPAT.md](docs/FMCP_AGENT_CANVAS_COMPAT.md).

---

## 1. Mevcut Durum Analizi

### 1.1 Resmi Figma MCP — Yeni Canvas Yetenekleri (Mart 2026)

Figma'nın "Agents, meet the Figma canvas" blog yazısından çıkan kritik yetenekler:

| Yetenek | Tool | Kısıt |
|---|---|---|
| Canvas'a yazma (genel) | `use_figma` | Genelde remote MCP; tam matris için Figma Help. Özet: [docs/FMCP_AGENT_CANVAS_COMPAT.md](docs/FMCP_AGENT_CANVAS_COMPAT.md) § «Resmi use_figma». |
| Cross-library asset arama | `search_assets` | Remote server only |
| FigJam'a diagram yazma | `generate_diagram` | Remote server only |
| Canlı UI → Figma layer | `generate_figma_design` | Browser erişimi gerekli |
| Yeni dosya oluşturma | `create_file` | Remote server only |
| Code Connect mapping | `get_code_connect_map` | Remote server only |
| Skills sistemi | `.md` dosyaları | IDE/Claude Code gerekli |
| Self-healing loop | Screenshot + iterate | Claude Code gerekli |

### 1.2 FMCP — Mevcut Güçlü Yönler

- **Geniş `figma_*` yüzeyi** — envanter: [docs/TOOLS.md](docs/TOOLS.md) (`local.js` / `local-plugin-only.js`)
- **WebSocket → Figma Desktop Bridge** — Cursor, Claude Desktop vb. yerel MCP; `claude.ai` için remote katman gerekir ([FMCP_AGENT_CANVAS_COMPAT.md](docs/FMCP_AGENT_CANVAS_COMPAT.md))
- **Plugin API ile güçlü yazma** — `figma_create_child`, dolgu/stroke/metin, instantiate; resmi ajanın «parity» yol haritasıyla örtüşür
- **FigJam** — okuma + [`figjam-diagram-builder`](../.cursor/skills/f-mcp/figjam-diagram-builder/SKILL.md) skill ile programatik diyagram; ayrı MCP `figma_create_diagram` isteğe bağlı
- Mevcut SKILL.md mimarisi (DTCG, token pipeline, cross-platform)

### 1.3 Gap Özeti

```
Resmi MCP ile kıyas (güncel):

1. search_assets     → FMCP: figma_search_assets (kütüphane değişkenleri + dosya içi bileşen); tam published katalog için REST/CLI sınırları — docs/TOOLS.md
2. get_code_connect  → FMCP: figma_get_code_connect (documentationLinks + key ipuçları); tam Code Connect haritası repo/resmi MCP
3. Skills             → `.cursor/skills/f-mcp/` (ai-handoff-export, figjam-diagram-builder, …); eski kök kopya `archive/skills-root-duplicate/`
4. FigJam diagram     → Skill figjam-diagram-builder (+ figma_execute); generate_diagram ile birebir MCP adı yok
5. create_file        → Hâlâ backlog (MED)
```

---

## 2. Mimari Karar: Neden FMCP Avantajlı Kalır

```
Resmi MCP yolu:
  claude.ai  ✗  →  Claude Code CLI  →  Remote MCP  →  Figma Cloud

FMCP yolu:
  claude.ai  ✓  →  FMCP WebSocket  →  Figma Desktop  →  Canvas
```

Figma'nın blog yazısı açıkça belirtiyor: write to canvas **sadece Remote MCP server** ile çalışıyor. Desktop MCP bu özelliği almıyor. FMCP ise Desktop'a WebSocket ile bağlandığı için **Plugin API'nin tüm yüzeyine** erişiyor — resmi remote MCP'nin hâlâ ulaşamadığı katman.

Bu plana göre FMCP'ye eklenen her yetenek, claude.ai chat'ten çalışmaya devam eder.

---

## 3. Uygulama Planı

### Faz 1 — Temel Write Altyapısı (1-2 hafta)

**Hedef:** `use_figma` eşdeğeri — genel amaçlı canvas yazma tool'u

#### 3.1.1 `figma_use` Tool — Unified Write Dispatcher

FMCP'de 20+ atomik write tool var (`figma_batch_create_variables`, `figma_instantiate_component` vb.). Resmi `use_figma`'nın yaptığı şey bunları tek bir doğal dil arayüzü altında toplamak.

```javascript
// Yeni tool: figma_use
// Açıklama: "The general-purpose tool for writing to Figma.
//            Creates, edits, deletes, or inspects any object."
// Davranış: Gelen intent'i parse et → doğru atomik tool'a yönlendir

{
  "name": "figma_use",
  "description": "Universal Figma canvas write tool. Create, edit, delete frames, components, variables, styles, text, images. Checks design system for existing assets before creating from scratch.",
  "inputSchema": {
    "intent": "string",        // natural language instruction
    "target_file_key": "string?",
    "context_node_id": "string?"
  }
}
```

**Implementation notu:** Bu tool içinde `figma_execute` + `figma_get_design_context` + `figma_search_components` zinciri çalışmalı. Agent önce library'i kontrol etmeli, sonra yazmalı — bu resmi `/figma-use` skill'inin de temel prensibi.

#### 3.1.2 Self-Healing Loop Desteği

Resmi MCP'nin en önemli yeni özelliği: agent yazar, screenshot alır, iterate eder.

FMCP'de `figma_capture_screenshot` zaten var. Eksik olan **loop orchestration**:

```markdown
## Self-healing pattern (SKILL.md'ye eklenecek):

1. figma_use ile değişiklik yap
2. figma_capture_screenshot ile sonucu al
3. Beklenen output ile karşılaştır
4. Fark varsa → figma_use ile düzelt
5. Max 3 iterasyon, sonra kullanıcıya sor
```

Bu pattern mevcut araçlarla bugün çalışabilir — sadece SKILL.md dokümantasyonu gerekiyor.

---

### Faz 2 — Cross-Library Asset Arama (1 hafta)

**Hedef:** `search_assets` eşdeğeri — bağlı tüm library'lerde arama

#### 3.2.1 `figma_search_assets` Tool

Mevcut `figma_search_components` sadece açık dosyaya bakıyor. SUI'da Web, iOS, Android kütüphaneleri ayrı dosyalarda. 71+ component'i kapsamak için cross-file arama şart.

```javascript
{
  "name": "figma_search_assets",
  "description": "Search across ALL connected design libraries for components, variables, and styles matching a query. Returns matching assets with file references so the agent can reuse existing system elements.",
  "inputSchema": {
    "query": "string",
    "asset_types": ["components", "variables", "styles"],  // filtrelenebilir
    "library_scope": "all" | "current_file" | ["file_key_1", "file_key_2"]
  }
}
```

**Implementation:** Figma Plugin API'de `figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()` ve `figma.teamLibrary.getComponentsInLibraryAsync()` zaten bu veriyi veriyor. FMCP'nin WebSocket bridge'ine yeni bir handler eklemek yeterli.

**SUI için önem:** Agent bir button component oluşturmadan önce `search_assets("button")` çağırmalı. Library'de bulursa instantiate eder, bulmazsa scratch'ten yazar. Bu resmi skill'lerin de temel prensibi.

---

### Faz 3 — SUI Skills Sistemi (2-3 hafta)

**Hedef:** Figma Skills konseptini FMCP'ye uyarlamak

Resmi skills sistemi `.md` dosyaları olarak Claude Code'a yükleniyor. FMCP için eşdeğer mekanizma: claude.ai'da konuşma başında sistem prompt olarak enjekte edilen SKILL.md dosyaları.

#### 3.3.1 `/sui-use` — Temel SUI Skill (figma-use eşdeğeri)

```markdown
# /sui-use — SUI Temel Skill

## Tanım
Bu skill, SUI (Sahibinden User Interface) design system üzerinde
çalışan tüm agent operasyonları için temel kuralları tanımlar.

## Çalışma Prensibi
1. Her yazma işleminden önce figma_search_assets ile library'i tara
2. Mevcut SUI component'i varsa: instantiate et, sıfırdan yapma
3. Mevcut SUI variable'ı varsa: referans et, hardcode etme
4. Her işlem sonrası figma_capture_screenshot ile doğrula

## SUI Token Hiyerarşisi
Primitive → Alias → Semantic → Component
Yazarken daima Semantic layer token'larını kullan.

## Platform Kuralları
- Web: figma.skipInvisibleInstanceChildren = false
- iOS: @2x grid, 44pt minimum touch target
- Android: Material baseline grid (8dp)

## Yasak Eylemler
- Detach without justification
- Hardcoded color (#hex) kullanma
- Font-weight numeric kullanma (token kullan)
```

#### 3.3.2 `/sui-token-sync` — Token Drift Detection

`/sync-figma-token` skill'inin SUI uyarlaması. FMCP + DTCG SKILL.md kombinasyonu.

```markdown
# /sui-token-sync

1. figma_get_variables ile mevcut Figma token'larını çek
2. Kaynak JSON (W3C DTCG format) ile karşılaştır
3. Drift tespit et (ad değişikliği, değer farkı, eksik token)
4. figma_batch_update_variables ile sync et
5. Breaking change varsa: durdur, kullanıcıya sor
```

#### 3.3.3 `/sui-a11y-audit` — WCAG 2.2 Denetim Skill'i

Haziran 2027 Cumhurbaşkanlığı Genelgesi deadline'ı için kritik.

```markdown
# /sui-a11y-audit

1. Hedef frame'i seç
2. figma_get_design_context ile tüm text/color bilgisini al
3. Kontrast oranlarını hesapla (WCAG 2.2 Level A minimum)
4. figma_search_assets ile WCAG-compliant alternatifler öner
5. figma_capture_screenshot ile before/after kaydet
6. Rapor döndür: pass/fail + fix önerileri
```

#### 3.3.4 `/sui-component-from-code` — Code → Canvas

`/figma-generate-library` skill'inin SUI uyarlaması. Developer bir component yazar, FMCP bunu SUI'ya ekler.

```markdown
# /sui-component-from-code

Input: Component kodu (React/Swift/Kotlin)
1. Kodu parse et: props, variants, states
2. figma_search_assets ile benzer SUI component'i ara
3. Yoksa: figma_use ile yeni component oluştur
4. figma_arrange_component_set ile variant set'i düzenle
5. SUI token'larını bağla
6. figma_set_description ile dokümantasyon ekle
```

---

### Faz 4 — Code Connect Mapping (1-2 hafta)

**Hedef:** `get_code_connect_map` eşdeğeri

#### 3.4.1 `figma_get_code_connect` Tool

```javascript
{
  "name": "figma_get_code_connect",
  "description": "Returns mapping between Figma node IDs and their codebase implementations. Enables agent to use actual SUI components instead of generating new code.",
  "inputSchema": {
    "node_ids": ["string"],  // veya boş bırakılırsa tüm dosya
    "platform": "web" | "ios" | "android"
  },
  "returns": {
    "node_id": {
      "codeConnectSrc": "path/to/Button.tsx",
      "codeConnectName": "SUIButton",
      "platform": "web",
      "props": {}
    }
  }
}
```

**Implementation:** Figma Plugin API'de Code Connect verileri `figma.codeConnect` namespace'inde. FMCP handler olarak eklenebilir.

**SUI için değer:** Impact Intelligence projesiyle doğrudan bağlantı. Hangi Figma component'inin hangi kod dosyasını etkilediğini FMCP üzerinden de sorgulayabilir hale gelir.

---

### Faz 5 — FigJam Write (1 hafta)

**Hedef:** `generate_diagram` eşdeğeri

#### 3.5.1 `figma_create_diagram` Tool

```javascript
{
  "name": "figma_create_diagram",
  "description": "Creates flowcharts, sequence diagrams, and process maps in FigJam using shapes and connectors.",
  "inputSchema": {
    "diagram_type": "flowchart" | "sequence" | "component_map" | "token_hierarchy",
    "content": "string | object",  // natural language veya structured data
    "target_figjam_key": "string?"
  }
}
```

**SUI için kullanım senaryosu:**
- JIRA backlog'undaki bir süreç → anında FigJam flowchart
- Token hiyerarşisi görselleştirme
- Component dependency map'i

---

## 4. SKILL.md Mimarisi — Güncellenmiş Yapı

```
/mnt/skills/
├── sui-use/
│   └── SKILL.md          ← Temel SUI agent skill
├── sui-token-sync/
│   └── SKILL.md          ← DTCG + Figma sync
├── sui-a11y-audit/
│   └── SKILL.md          ← WCAG 2.2 denetim
├── sui-component-from-code/
│   └── SKILL.md          ← Code → Canvas
└── sui-impact-analysis/
    └── SKILL.md          ← Impact Intelligence entegrasyonu
```

Her skill dosyası şu bölümleri içermeli:

```markdown
# /skill-adı

## Ne zaman çağrılır
## Ön koşullar (hangi tool'ların mevcut olması gerekir)
## Adım adım workflow
## Hata durumları ve fallback
## Yasak eylemler
## Örnek prompt
```

---

## 5. FMCP Tool Ekleme Sıralaması

```
Öncelik 1 (Bu hafta, hemen yazılabilir):
  ├── figma_use               → figma_execute wrapper + intent routing
  └── figma_search_assets     → Plugin API handler (getAvailableLibraryVariables)

Öncelik 2 (Önümüzdeki hafta):
  ├── figma_get_code_connect  → Plugin API codeConnect namespace
  └── /sui-use SKILL.md       → Temel agent instruction dosyası

Öncelik 3 (2-3 hafta içinde):
  ├── figma_create_diagram    → FigJam write handler
  ├── /sui-token-sync         → DTCG entegrasyonu
  └── /sui-a11y-audit         → WCAG workflow

Öncelik 4 (1 ay içinde):
  ├── /sui-component-from-code
  ├── figma_create_file
  └── /sui-impact-analysis    → Impact Intelligence FMCP entegrasyonu
```

---

## 6. Test Senaryoları

Her yeni tool için minimum 3 test case:

### figma_search_assets
```
1. "SUI'da bir Button component var mı?"
   → Beklenen: Web, iOS, Android varyantlarını listeler
   
2. "spacing-md token'ı hangi collection'da?"
   → Beklenen: Collection adı + current value döndürür
   
3. "disabled state'li input component bul"
   → Beklenen: Fuzzy match + variant bilgisi döndürür
```

### figma_use + self-healing
```
1. "SUI primary button kullanarak bir CTA section oluştur"
   → Beklenen: Library'den button çeker, frame kurar, screenshot alır, iterate eder

2. "Bu frame'deki heading'leri SUI heading/h1 ile değiştir"
   → Beklenen: Mevcut text'i bulur, component swap yapar, screenshot ile doğrular
```

---

## 7. Dikkat Edilecek Riskler

| Risk | Açıklama | Önlem |
|---|---|---|
| Plugin API değişimi | Figma'nın async API migration'ı geçmişte bug yarattı | Her tool'a try-catch + version check |
| Library scope | Publish edilmemiş library'ler `getAvailableLibraryVariables`'da görünmez | Kullanıcıya uyarı ver |
| Ücretlendirme | Resmi write API beta sonrası ücretli olacak | FMCP Desktop bridge bu kısıtın dışında kalır |
| Self-healing loop | Sonsuz döngü riski | Max iteration limiti + timeout |
| Skills conflict | Birden fazla skill aynı anda yüklenirse çakışabilir | Skill priority sırası tanımla |

---

## 8. Figma Resmi Roadmap ile FMCP Senkronizasyonu

Figma'nın blog'unda açıklanan yakın vadeli planlar:

> "We'll also continue adding more functionality to this tool, working toward parity with the Plugin API, starting with **image support** and **custom fonts**."

FMCP'de bunlar zaten çalışıyor (Plugin API paritesi mevcut). Dolayısıyla:

- Figma resmi MCP, Plugin API'ye yetişmeye çalışıyor
- FMCP Plugin API'yi şimdiden kullanıyor
- Rekabet avantajı korunuyor; sadece **isimlendirme ve Skills katmanı** eklenmesi yeterli

---

## 9. Başlangıç Aksiyon Listesi

```
[ ] figma_use tool — FMCP'ye implement et
[ ] figma_search_assets tool — Plugin API handler yaz
[ ] /sui-use SKILL.md — ilk draft yaz
[ ] Self-healing loop pattern'ini mevcut SKILL.md'lere ekle
[ ] figma_get_code_connect — Code Connect namespace'ini araştır
[ ] SUI library key'lerini FMCP config'e ekle (cross-file search için)
```

---

*Plan versiyonu: 1.0 — 25 Mart 2026*  
*Kaynak: Figma blog (24.03.2026) + önceki FMCP gap analizi*
