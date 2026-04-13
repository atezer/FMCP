# FMCP + Figma Capture Bookmarklet Entegrasyon Planı

## Context

LinkedIn'de viral olan bir paylaşım, Figma'nın kamuya açık `capture.js` betiğini (`https://mcp.figma.com/mcp/html-to-design/capture.js`) bir tarayıcı yer imi (bookmarklet) ile kullanarak herhangi bir web sayfasını doğrudan Figma'ya aktarmanın mümkün olduğunu gösteriyor. Paylaşımın mesajı: "Claude'a ihtiyacınız yok, API anahtarı yok, tek seferlik bir yer imi dışında kurulum yok."

Bu, FMCP için hem bir tehdit hem de bir fırsat. Tehdit değil çünkü bookmarklet ile FMCP farklı katmanlarda çalışıyor. Fırsat çünkü bookmarklet'in yaptığı "capture" işlemi, FMCP'nin AI-destekli iş akışlarının doğal bir giriş noktası olabilir.

**Amaç:** FMCP'ye web capture yetenekleri ekleyerek, bookmarklet'in tek başına yapamayacağı AI-destekli analiz, karşılaştırma ve otomasyon iş akışları sunmak.

---

## Karşılaştırma: Bookmarklet vs FMCP

| Özellik | Bookmarklet (Tek Başına) | FMCP + Web Capture |
|---|---|---|
| Web sayfasını Figma'ya aktar | Manuel, clipboard, tek tek | Otomatik, doğrudan Figma'ya |
| Capture sonrası işlem | Yok | AI analizi, token çıkarma, DS eşleme |
| Figma tasarımı ile karşılaştırma | Yapamaz | `visual-qa-compare` + `design-drift-detector` |
| Rakip analizi | Yapamaz | Token/renk/tipografi karşılaştırma |
| Toplu sayfa yakalama | Yapamaz | Batch capture & analiz |
| Design token çıkarma | Yapamaz | CSS → Figma variable otomasyonu |
| CSP engeli | Birçok sitede engellenir | Tarayıcı eklentisi ile aşılır |

**Sonuç:** Bookmarklet bir tornavida. FMCP bir atölye. Strateji: capture'ı subsume et, AI-orchestrated workflow'un bir adımı yap.

---

## Mimari Karar: Puppeteer Geri Eklenmeyecek

FMCP v1.7.23'te Puppeteer/CDP kasıtlı olarak kaldırıldı (plugin-only mimarisi). Bu doğru bir karardı. Web capture, mevcut plugin-bridge mimarisine 3 alternatif yolla eklenir:

1. **Geliştirilmiş Bookmarklet** (P0 — en düşük sürtünme)
2. **Tarayıcı Eklentisi** (P1 — en güçlü)
3. **AI-destekli HTML parse** (P2 — URL'den doğrudan)

---

## Uygulama Planı

### Faz 1 — Temel Altyapı (P0)

#### 1.1 Tür Tanımları

**Dosya:** `src/core/types/figma.ts`

Yeni interface'ler ekle:

```typescript
export interface WebCaptureNode {
  tag: string;
  type: "FRAME" | "TEXT" | "RECTANGLE" | "GROUP" | "IMAGE";
  name?: string;
  bounds: { x: number; y: number; width: number; height: number };
  styles: {
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    borderRadius?: number;
    padding?: { top: number; right: number; bottom: number; left: number };
    gap?: number;
    flexDirection?: "row" | "column";
  };
  text?: string;
  children?: WebCaptureNode[];
}

export interface WebCapturePayload {
  id: string;
  url: string;
  title: string;
  viewport: { width: number; height: number };
  capturedAt: number;
  rootNode: WebCaptureNode;
  extractedTokens?: {
    colors: Record<string, number>;
    fontFamilies: Record<string, number>;
    fontSizes: Record<string, number>;
    spacingValues: Record<string, number>;
  };
}
```

#### 1.2 HTTP POST Endpoint — Capture Veri Alımı

**Dosya:** `src/core/plugin-bridge-server.ts`

Mevcut `createServer` handler'ına (satır ~290) yeni endpoint ekle:

- `POST /api/capture` — bookmarklet/extension'dan gelen capture verisini kabul eder
- Capture buffer'ı: `Map<string, WebCapturePayload>` (max 10, LRU)
- CORS header'ları zaten var (`Access-Control-Allow-Origin: *`, satır 302-305)
- Yeni public metotlar: `storeCapture(payload)`, `getCapture(id?)`, `listCaptures()`

```typescript
// Mevcut handler'a eklenecek (POST /shutdown'dan sonra):
if (req.method === "POST" && req.url === "/api/capture") {
  // JSON body parse → captureBuffer.set(id, payload)
  // Max 5MB payload limit
  // Return { success: true, captureId: "..." }
}
if (req.method === "OPTIONS") {
  // CORS preflight for bookmarklet cross-origin POST
}
if (req.method === "GET" && req.url === "/api/captures") {
  // List stored captures (id, url, title, capturedAt)
}
```

#### 1.3 Yeni MCP Araçları

**Dosya:** `src/local-plugin-only.ts`

**Araç 1: `figma_generate_bookmarklet`** (salt okunur, hemen kullanılabilir)

```
Amaç: Kullanıcıya özelleştirilmiş bir bookmarklet JS kodu üretir.
Bookmarklet capture.js'yi inject eder + capture verisini FMCP bridge'e POST eder.

Input:
- mode: "full-page" | "select-element" | "viewport" (default: "full-page")
- port: number (default: bridge'in aktif portu)

Output: javascript: URL string + kurulum talimatları
```

**Araç 2: `figma_import_web_capture`** (yazma, Figma'da node oluşturur)

```
Amaç: Capture verisini alıp Figma'da native node'lar olarak oluşturur.

Input:
- captureId: string (buffer'daki capture ID) VEYA
- captureData: string (doğrudan JSON payload)
- targetNodeId: string? (hedef parent node)
- importMode: "full" | "layout-only" | "tokens-only"
- namePrefix: string? (ör. "Competitor/HomePage")

Implementasyon:
- WebCaptureNode ağacını traverse et
- Her node için figma_execute benzeri Plugin API kodu üret
- Batch olarak plugin'e gönder (conn.executeCodeViaUI)
- Büyük sayfalar için chunked import (timeout önleme)
```

**Araç 3: `figma_list_web_captures`** (salt okunur)

```
Amaç: Buffer'daki capture'ları listeler.
Output: Array<{ id, url, title, capturedAt, nodeCount }>
```

#### 1.4 Plugin Tarafı — Batch Node Oluşturma

**Dosya:** `f-mcp-plugin/code.js`

Yeni message type: `BATCH_CREATE_NODES`

```javascript
if (msg.type === 'BATCH_CREATE_NODES') {
  // WebCaptureNode[] → Figma node tree
  // Recursive: createFrame, createText, createRectangle
  // Fill, stroke, typography mapping
  // Result: created node IDs
}
```

Bu, `EXECUTE_CODE` (satır 433) ile benzer ama yapılandırılmış veri alır — eval yerine güvenli, tipli node oluşturma.

#### 1.5 Yeni AI Skill

**Dosya:** `skills/web-capture-import/SKILL.md` (yeni)

Workflow:
1. `figma_generate_bookmarklet` ile bookmarklet oluştur
2. Kullanıcıya kurulum talimatları ver
3. Kullanıcı sayfayı yakalar → veri FMCP'ye gelir
4. `figma_import_web_capture` ile Figma'ya aktar
5. AI, import edilen yapıyı analiz eder:
   - Mevcut DS token'larıyla eşleştirme öner
   - Renk/tipografi/spacing token çıkarma
   - Component pattern tanıma

**Persona:** designer, uidev

**SKILL_INDEX.md'ye ekle** — "Tuval Yazma ve Oluşturma" kategorisine

---

### Faz 2 — Akıllı Katman (P1)

#### 2.1 Araç: `figma_compare_web_with_design`

```
Amaç: Yakalanan web sayfasını mevcut Figma tasarımıyla karşılaştırır.
Mevcut visual-qa-compare skill'inin güçlendirilmiş versiyonu.

Input:
- captureId veya captureData
- referenceNodeId (karşılaştırılacak Figma node)
- compareMode: "visual" | "tokens" | "layout" | "full"

Output: Yapısal diff raporu
- Renk farkları (hex vs Figma fill)
- Tipografi farkları (font-size, weight, family)
- Spacing farkları (padding, margin, gap)
- Layout farkları (flex direction, alignment)
```

#### 2.2 Araç: `figma_extract_tokens_from_capture`

```
Amaç: Capture'dan design token çıkarır, opsiyonel olarak Figma variable oluşturur.

Input:
- captureData
- createVariables: boolean (Figma'da oluştur mu?)
- collectionName: string
- deduplicateThreshold: number (min tekrar sayısı)

Output:
- Çıkarılan token listesi (renkler, fontlar, spacing'ler)
- Oluşturulan variable ID'leri (createVariables=true ise)
```

#### 2.3 Yeni Skill: `competitor-design-analysis`

**Dosya:** `skills/competitor-design-analysis/SKILL.md`

Workflow:
1. Rakip sitesini bookmarklet ile yakala
2. Figma'ya "Competitors" sayfasına import et
3. Token çıkarma (renkler, tipografi, spacing)
4. Kendi DS token'larıyla karşılaştırma
5. Rekabet analizi raporu:
   - Renk paleti karşılaştırma
   - Tipografi ölçek karşılaştırma
   - Erişilebilirlik karşılaştırma (kontrast oranları)

**Persona:** designer, designops, po

#### 2.4 Yeni Skill: `live-site-visual-qa`

**Dosya:** `skills/live-site-visual-qa/SKILL.md`

Mevcut `visual-qa-compare` skill'inin web capture destekli versiyonu:
1. Canlı siteyi bookmarklet ile yakala
2. Otomatik olarak Figma tasarımıyla karşılaştır
3. Üç seviyeli karşılaştırma: yapısal, görsel, token
4. Aksiyon alınabilir rapor: "Button border-radius kodda 4px ama Figma'da 8px (token: radius.md)"

**Persona:** uidev, designops

#### 2.5 Tarayıcı Eklentisi (Chrome/Edge/Firefox)

**Dizin:** `fmcp-browser-extension/` (yeni)

```
fmcp-browser-extension/
  manifest.json          (Manifest V3)
  background.js          (Service worker — FMCP bridge'e WebSocket)
  content.js             (DOM capture logic, element picker)
  popup.html + popup.js  (UI: capture modu, bağlantı durumu)
  capture-lib.js         (Özel capture implementasyonu)
```

Bookmarklet'e göre avantajları:
- CSP tarafından engellenmez
- Kalıcı WebSocket bağlantısı (her seferinde yeniden bağlanmaz)
- Gelişmiş element seçici (DevTools benzeri)
- `getComputedStyle` ile tam CSS erişimi
- Cross-origin iframe desteği
- Otomatik güncelleme

---

### Faz 3 — Gelişmiş (P2)

#### 3.1 `figma_batch_capture_compare` — Çoklu sayfa toplu karşılaştırma
#### 3.2 `design-system-reverse-engineer` skill — Herhangi bir siteden tam DS çıkarma
#### 3.3 Extension DevTools paneli — Gelişmiş CSS inspector entegrasyonu

---

## Değiştirilecek Kritik Dosyalar

| Dosya | Değişiklik | Faz |
|---|---|---|
| `src/core/types/figma.ts` | `WebCaptureNode`, `WebCapturePayload` interface'leri | 1 |
| `src/core/plugin-bridge-server.ts` | `POST /api/capture` endpoint, capture buffer, CORS preflight | 1 |
| `src/local-plugin-only.ts` | 3 yeni araç kaydı (generate_bookmarklet, import, list) | 1 |
| `f-mcp-plugin/code.js` | `BATCH_CREATE_NODES` message handler | 1 |
| `skills/web-capture-import/SKILL.md` | Yeni skill (capture → import workflow) | 1 |
| `skills/SKILL_INDEX.md` | Yeni skill'leri dizine ekle | 1-2 |
| `src/local-plugin-only.ts` | 2 ek araç (compare, extract_tokens) | 2 |
| `skills/competitor-design-analysis/SKILL.md` | Yeni skill | 2 |
| `skills/live-site-visual-qa/SKILL.md` | Yeni skill | 2 |
| `fmcp-browser-extension/` | Tüm yeni dizin | 2 |
| `FUTURE.md` | Web capture roadmap ekleme | 1 |
| `docs/TOOLS.md` | Yeni araç dokümantasyonu | 1-2 |

## Yeniden Kullanılacak Mevcut Kod

| Mevcut Kaynak | Nerede Kullanılacak | Dosya |
|---|---|---|
| `PluginBridgeServer.createServer` HTTP handler | Capture endpoint ekleme | `src/core/plugin-bridge-server.ts:290` |
| `conn.executeCodeViaUI()` pattern | Capture import node oluşturma | `src/core/plugin-bridge-connector.ts` |
| `EXECUTE_CODE` message handler | `BATCH_CREATE_NODES` handler modeli | `f-mcp-plugin/code.js:433` |
| `figma_create_frame/text/rectangle` araç pattern'i | Import tool'un node oluşturma kodu | `src/local-plugin-only.ts` |
| `response-guard.ts` truncation | Büyük capture payload'ları kırpma | `src/core/response-guard.ts` |
| `response-cache.ts` LRU pattern | Capture buffer LRU implementasyonu | `src/core/response-cache.ts` |
| Mevcut Zod schema pattern'leri | Yeni araçların input validation'ı | `src/local-plugin-only.ts` |

---

## Riskler ve Önlemler

| Risk | Etki | Önlem |
|---|---|---|
| `capture.js` format değişikliği | Import aracı bozulur | Format parse'ı adapter arkasına al; kendi formatımızı da destekle |
| CSP bookmarklet'i engeller | Bazı sitelerde çalışmaz | Tarayıcı eklentisi birincil yol, bookmarklet fallback |
| Büyük capture payload'ları | Bellek/performans sorunu | Max 5MB limit, `response-guard.ts` truncation uygula |
| Plugin API node oluşturma yavaş | Timeout | Chunked import (önce üst yapı, sonra detaylar) |
| Figma `capture.js`'ye bağımlılık | Harici bağımlılık | Extension'da kendi capture implementasyonumuzu kullan |

---

## Doğrulama (Test Planı)

### Faz 1 Testi
1. `npm run build` — derleme başarılı olmalı
2. `npm test` — mevcut testler geçmeli
3. Bridge'i başlat → `POST /api/capture` ile örnek JSON gönder → `GET /api/captures` ile doğrula
4. `figma_generate_bookmarklet` çağır → dönen JS kodunu tarayıcıya yapıştır → çalışmalı
5. Örnek bir siteyi yakala → `figma_import_web_capture` ile Figma'ya aktar → node'lar oluşmalı
6. Yeni skill'i SKILL_INDEX'te kontrol et

### Faz 2 Testi
7. `figma_compare_web_with_design` — yakalanan sayfa vs Figma frame diff raporu
8. `figma_extract_tokens_from_capture` — çıkarılan token'lar makul olmalı
9. Tarayıcı eklentisi: Chrome'a yükle → popup'tan capture → Figma'da node oluşturma

---

## Sonuç: FMCP'nin Farklılaşması

Bu entegrasyonla FMCP şunları sunar (ne bookmarklet ne de resmi Figma MCP yapamaz):

1. **Capture → Figma → AI Analiz** tek akışta (bookmarklet sadece capture yapar)
2. **Design System eşleme** — yakalanan sayfanın token'larını mevcut DS ile karşılaştırma
3. **Rakip analizi otomasyonu** — capture + token çıkarma + karşılaştırma raporu
4. **Visual QA otomasyonu** — canlı site vs Figma tasarımı diff
5. **Zero-trust korunur** — tüm veri lokalde kalır, capture verisi de dahil
6. **CSP-proof** — tarayıcı eklentisi ile CSP kısıtlaması aşılır

Bookmarklet "araç", FMCP "platform" olur. Capture sadece bir giriş noktasıdır; asıl değer sonrasındaki AI-destekli iş akışlarındadır.
