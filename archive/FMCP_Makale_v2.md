# Figma'ya Anten Taktık. Hem de Bedava.

*"Figma MCP varken buna ne gerek?" diyorsanız, haklı soru. Cevaplayayım.*

---

## Önce Temel Fark

Figma MCP ne yapar?

Ekran görüntüsü alır. AI kendi yorumunu katar.

Sizi hayal kırıklığına uğratan da budur: "Figma'daki kırmızı renk nedir?" diye sordunuzda `#FF0000` değil, "kırmızı bir buton görünüyor" cevabı alırsınız. Tahmin. Yorum. Gerçek veri değil.

FMCP ne yapar?

Node ID'yi verir. Frame içindeki metni verir. Token değerini birebir verir. Bileşenin variable'ını verir.

Hayal değil. Gerçek veri.

Bu yazıdaki teknik çerçeve, repodaki **FMCP 1.2.0** (`@atezer/figma-mcp-bridge`) sürümüyle uyumludur; araç listesi ve modlar için [`docs/TOOLS.md`](docs/TOOLS.md) tek doğruluk kaynağıdır.

Fark nerede? REST API bazlı çözümler Figma'nın internet sunucularına istek gönderir; veri Figma'nın bulutundan gelir. FMCP farklı çalışır: **F-MCP Bridge adlı bir plugin, Figma uygulamasının içinde çalışır.** Figma'nın resmi Plugin API'si üzerinden, uygulamanın belleğindeki dokümanı doğrudan okur; internete çıkmadan, token olmadan. Kütüphane değişken araması için plugin manifestinde `teamlibrary` izni tanımlıdır (`figma_search_assets` vb.).

Bir ev analojisi: REST API, dışarıdan kapı çalmak gibi; Figma'nın sunucusu size açar. Plugin API ise evin içinde birinin olması gibi; doğrudan erişim, veri dışarı çıkmıyor.

---

## Mimari: Neden Token Yok, REST API Yok?

Çoğu Figma MCP çözümü şu yolu izler: Figma REST API → PAT (Personal Access Token) → veri dışarı çıkar.

*PAT nedir?* Figma hesabınıza programatik erişim sağlayan kişisel token. Bir şifre gibi: kaybederseniz, başkasının eline geçerse, ya da hizmet kesintisi olursa bağımlısınız.

FMCP farklı bir yol seçti:

```
Claude (MCP) → figma-mcp-bridge → Plugin → Figma Desktop / Browser / FigJam (yerel)
```

*WebSocket nedir?* İki uygulama arasında sürekli açık, çift yönlü bir bağlantı. Figma plugin'i ile bridge bu bağlantıyla konuşuyor; yerel makinenizde, 5454 portu üzerinden. İnternete çıkmıyor.

Sonuç:
- REST API çağrısı yok → Figma'ya veri göndermiyorsunuz
- Token yok → kaybolacak, ele geçirilecek bir şifre yok
- Figma verisi makinenizden çıkmıyor
- **Toplam REST API token tüketimi: 0.** Dosya okuma, bileşen arama, değişken oluşturma, screenshot alma — hepsi yerel plugin üzerinden. Figma API kotanıza dokunmuyor, rate limit riski yok.

Buna **Zero Trust mimarisi** deniyor. README'deki resmi tanım: *"Sunucuya güvenme, yerelde doğrula."* Veri yalnızca sizin ortamınızda kalıyor.

---

## Figma 126.1.2 ve CDP'nin Sonu

Burada bir parantez açmam gerekiyor, çünkü bu makalenin zamanlaması için önemli.

*CDP nedir?* Chrome DevTools Protocol; Chromium tabanlı uygulamaların debug edilmesini sağlayan protokol. Figma Desktop, Chromium üzerinde çalıştığı için bazı araçlar buna bağlanarak Figma'yı kontrol ediyordu.

Figma Desktop 126.1.2, startup'ta şunu yapıyor:

```javascript
app.commandLine.removeSwitch("remote-debugging-port")
```

*Remote debugging port nedir?* CDP bağlantısının dinlediği kapı. Bu kapı kapatılırsa CDP çalışmıyor.

Kaynak: Figma forum, 17 Şubat 2026. Yusuf Yilmaz soruyu sordu, Jefferson Costa koddan tespit etti.

- 126.0.4: CDP çalışıyor ✅
- 126.1.2: CDP çalışmıyor ❌

Auto-update açıksa kullanıcı fark etmeden yeni versiyona geçiyor. Resmi Figma açıklaması henüz yok: regression mı, bilinçli karar mı belirsiz. Ama etki net: CDP'ye bağlı araçlar bu versiyonda çalışmıyor.

**FMCP bu değişiklikten etkilenmiyor.** Çünkü CDP hiçbir zaman plugin-only tasarımın parçası olmadı. Fallback bile değil, sadece yok.

Burada dürüst olmak istiyorum: southleft/figma-console-mcp'nin WebSocket bridge'i var. Tüm araçları CDP'ye bağlı değil. Ama CDP'ye bağlı araçları şu an çalışmıyor ve bu durum değişene kadar güvenilir bir bağımlılık olmaktan çıktı.

---

## Multi-File, FigJam ve Browser Desteği

Önceki versiyonda FMCP yalnızca tek bir Figma Desktop dosyasıyla çalışıyordu. Artık değil.

**Multi-file / Multi-window:** `figma_list_connected_files` aracıyla bağlı tüm Figma ve FigJam pencerelerini görebilirsiniz. Her araç artık `fileKey` veya `figmaUrl` parametresi alıyor; hangi dosyada çalışmak istediğinizi belirtebilirsiniz. Üç dosya açık, üç farklı sorgu — aynı anda.

**FigJam desteği — test edildi, çalışıyor:** Sadece Figma değil, FigJam board'ları da destekleniyor. Bunu canlı test ettim: `figma_get_status` ile bağlantı kontrolü, `figma_get_file_data` ile board içeriğini okuma, `figma_execute` ile FigJam'da akış oluşturma, `figma_capture_screenshot` ile doğrulama görseli — dördü de çalıştı. Toplam REST API token tüketimi: sıfır. Kritik not: aynı oturumda Figma Resmi MCP'nin `get_metadata` aracını da denedim — FigJam board'larını desteklemiyor, sadece Design dosyaları için çalışıyor. Dolayısıyla FigJam senaryosunda Figma Resmi MCP kullanılamadı.

**Browser Figma:** Figma Desktop zorunluluğu kalktı. Tarayıcıdan açılan figma.com'da da plugin çalışıyor. IT ekibinin Desktop kurulumu onaylayamadığı durumlarda bile kullanılabilir.

**Multi-client:** Birden fazla AI agent aynı anda farklı dosyalarda çalışabiliyor. Bir agent token'ları kontrol ederken, diğeri bileşen envanteri çıkarıyor. Ekip düzeyinde otomasyon için önemli bir adım.

---

## Kurumsal Kullanım: KVKK, Debug Modu ve Yaygınlaştırma

Kurumsal güvenlik ekibi "veri nereye gidiyor?" dediğinde tek cümle yeterli:

**"Figma verisi makineden çıkmıyor."**

Üç teknik detay bunu destekliyor:

**Debug modu kapalı.** Figma'yı normal açıyorsunuz. `--remote-debugging-port` ile özel başlatma yok. IT ekibine anlatması kolay, denetimi kolay.

**Organization plugin desteği.** *(Figma Org veya Enterprise planı gerekli.)* Plugin'i kurumsal hesaba bir kez kaydedin, herkese açın. Herkes tek tıkla erişir, tek tek kurulum yok. Figma Desktop'ta da çalışır, Figma Web'de de. Tarayıcıdan açılan her Figma linkinde kurum adı altında hazır, sayfa gezerken açık kalır.

**KVKK/GDPR uyumu.** README ve repodaki [`PRIVACY.md`](PRIVACY.md) çerçevesinde: kurumsal güvenlik ve gizlilik politikalarına uyum kolaylaşıyor. Veri işleme anlaşması gerektiren üçüncü taraf API çağrısı yok. Kurumsal süreç ve ekip akışları için [`docs/FMCP_ENTERPRISE_WORKFLOWS.md`](docs/FMCP_ENTERPRISE_WORKFLOWS.md) ayrıca referans alınabilir.

---

## Kurulum: 2 Adım

Teknik bilgi şart değil. Tüm dokümanlar Türkçe, ekibinizdeki her seviyeden kişi okuyabilir. Adım adım rehber için [`KURULUM.md`](KURULUM.md) ve araç listesi için [`docs/TOOLS.md`](docs/TOOLS.md) kullanılabilir.

**1. Adım: Plugin**

Plugin'i kurumsal Figma hesabına kaydedin ve herkese açın. Artık ekibinizdeki herkes, hangi cihazdan olursa olsun, Figma'yı açtığında plugin hazır.

Plugin açıldığında iki durum görebilirsiniz:
- 🟢 **"ready"** → Bağlantı tamam, kullanmaya başlayabilirsiniz.
- 🔴 **"no server"** → Bridge çalışmıyor, 2. adıma geçin.

**2. Adım: MCP**

Claude ya da Cursor'a şunu söyleyin:
`"github.com/atezer/FMCP, bu MCP'yi kur."`

Ya da doğrudan:

```
npx @atezer/figma-mcp-bridge@latest
```

Paket, **plugin-only** girişi için `figma-mcp-bridge-plugin` adlı bir `bin` de sunar (`dist/local-plugin-only.js`); MCP istemcisinde `command`/`args` ile doğrudan bu binary veya `node …/dist/local-plugin-only.js` kullanılabilir.

Aç-kapa. Bitti. Plugin-only modda Claude'u başlatınca MCP sunucusu 5454 portunu kendisi açıyor, ekstra terminal komutu bile gerekmiyor. Figma'da plugin açık, AI aracına Figma linki verin, başlayın.

---

## MCP araçları: Kim İçin Ne?

Plugin-only MCP sunucusunda (`dist/local-plugin-only.js`) **37** adet `figma_*` aracı kayıtlıdır; tam mod (`dist/local.js`) aynı sete ek olarak yazma/REST/figma-tools katmanıyla genişler. Güncel sayım ve modlar: [`docs/TOOLS.md`](docs/TOOLS.md). Öne çıkanlar üç role göre:

**Ürün Yöneticileri için:** `figma_get_design_system_summary`, `figma_check_design_parity`, `figma_list_connected_files`: tasarım sistemi özeti, bileşen sayıları, Figma ile kod arasındaki farklar, bağlı dosya envanteri. Geliştirici ekibe "bu token eksik" diyebilmek için ekran görüntüsüne değil, veriye bakıyorsunuz.

**Geliştiriciler için:** `figma_get_variables`, `figma_get_styles`, `figma_get_component_for_development`, `figma_get_design_context`: CSS, Tailwind veya TypeScript'e export için gerçek değerler. `figma_get_design_context` ile bir node'un layout, tipografi ve görsel bilgilerini tek çağrıda alabilirsiniz; `outputHint` parametresiyle react veya tailwind odaklı çıktı isteyebilirsiniz. Agent Canvas paritesi: `figma_search_assets` (kütüphane değişkenleri + dosya içi bileşen), `figma_get_code_connect` (node ipuçları), `figma_use` (yapılandırılmış intent) — hem `local-plugin-only` hem `local.js` içinde. Yoruma gerek yok.

**DesignOps için:** `figma_setup_design_tokens`, `figma_batch_create_variables`, `figma_check_design_parity`, `figma_create_variable_collection`, `figma_delete_variable_collection` ve kritik bir detay: `figma_setup_design_tokens` rollback destekliyor. Token kurulumu yarıda kalırsa sistem tutarlı kalıyor. Variable collection CRUD artık tam: oluşturma, güncelleme, silme, yeniden adlandırma — hepsi mevcut.

**Cursor / AI Skills (repoda):** Bridge bağlıyken tekrarlanabilir iş akışları için skill dosyaları tanımlıdır — örneğin tasarımı koda aktarma (`implement-design`), bileşen eşleme (`code-design-mapper`), drift tespiti (`design-drift-detector`), design system kuralları (`design-system-rules`), token pipeline (`design-token-pipeline`), AI handoff paketi (`ai-handoff-export`), FigJam diyagram (`figjam-diagram-builder`). Kaynak: `.cursor/skills/f-mcp/` (eski kök `skills/` kopyası `archive/skills-root-duplicate/` altında arşivlendi).

*Design-code parity nedir?* Figma'daki token değerleri ile koddaki token değerlerinin karşılaştırılması. "Figma'da `#1A73E8`, kodda `#1a74e8`" gibi farkları otomatik tespit etmek.

---

## Üç Araç, Dürüst Karşılaştırma

Piyasada öne çıkan üç çözüm var. Önce güçlü yanlarını kabul etmek gerekiyor.

**Figma Resmi MCP** (beta, Ekim 2025): Figma'nın kendi geliştirdiği çözüm. Code Connect entegrasyonu, VS Code/Cursor/Claude Code desteği. İki modu var: Desktop (lokal) ve Remote (mcp.figma.com). Design system rule generation mevcut. Düşünülmüş bir ürün.

**southleft/figma-console-mcp**: 436 star, aktif topluluk, 56+ araç. Okur, yazar, düzenler. Geniş araç seti.

**FMCP**: Okur, analiz eder, token'ları yönetir. Zero Trust mimarisi, veri dışarı çıkmaz. Artık multi-file, FigJam ve browser desteğiyle.

---

**Erişim ve Güvenlik**

| | FMCP | Figma Resmi MCP | Southleft |
|---|---|---|---|
| API token gerekli mi? | Hayır | Remote modda evet | Evet |
| Dev Seat / ücretli plan şart mı? | Hayır | Tam erişim için evet | Hayır |
| Figma verisi nereye gidiyor? | Lokalinizde kalır | Remote modda Figma bulutuna | Figma REST API'ye |
| Figma 126.1.2 sonrası çalışıyor mu? | Evet | Evet | Kısmen, CDP araçları çalışmıyor |
| Multi-file / FigJam desteği | Evet (test edildi) | FigJam desteklenmiyor | Hayır |
| Browser Figma desteği | Evet | Desktop modu hayır | Hayır |

**Özellikler**

| | FMCP | Figma Resmi MCP | Southleft |
|---|---|---|---|
| Variable okuma | ✅ | ✅ | ✅ |
| Variable oluşturma / güncelleme (toplu) | ✅ | ⚠️ Sınırlı | ✅ |
| Variable collection CRUD (tam) | ✅ | ⚠️ Kısmi | ⚠️ Kısmi |
| Design token kurulumu (rollback ile) | ✅ | | |
| Design-code uyum kontrolü | ✅ | ⚠️ Kısmi | |
| Design context (react/tailwind hint) | ✅ | | |
| Code Connect entegrasyonu | ⚠️ `figma_get_code_connect` (node ipuçları; tam harita repo/REST) | ✅ | |
| Node / katman düzenleme | ✅ (`local.js` + plugin bridge) | | ✅ |
| Yeni katman / frame oluşturma | ✅ (`figma_create_child` vb.) | | ✅ |

---

**Figma Resmi MCP için not:** Code Connect kullanıyorsanız ve design-to-code workflow kuruyorsanız güçlü bir seçenek. Ancak üç nokta var: Remote modda Figma bulutuna veri akışı, tam erişim için Dev Seat gereksinimi ve FigJam board'larını desteklememesi. FigJam'da workshop, brainstorm veya akış diyagramı kullanan ekipler için bu önemli bir boşluk.

**Southleft için:** Figma'yı AI ile düzenlemek, katman oluşturmak istiyorsanız en geniş araç seti orada. Ancak dikkat: token zorunlu, REST API bağımlı, CDP araçlarının 126.1.2 sonrası çalışıp çalışmadığı belirsiz.

---

## Şeffaf Sınırlar

Güncel araç listesi için repoda [docs/TOOLS.md](docs/TOOLS.md) tek doğruluk kaynağıdır. Agent Canvas uyumu ve `figma_use` / `figma_search_assets` gibi parite araçları için [`docs/FMCP_AGENT_CANVAS_COMPAT.md`](docs/FMCP_AGENT_CANVAS_COMPAT.md) kullanılabilir. `figma_use` parametre şekilleri ve intent sözlüğü: [`docs/FIGMA_USE_STRUCTURED_INTENT.md`](docs/FIGMA_USE_STRUCTURED_INTENT.md).

Özet: **plugin bridge + `local.js`** ile çoğu canvas yazma işlemi (dolgu, stroke, metin, boyut, konum, `figma_create_child` ile yeni frame/şekil vb.) desteklenir; Southleft kadar geniş ayrıntı veya yorum/prototip odaklı araç seti olmayabilir.

FMCP ile hâlâ zor veya kapsam dışı sayılabilecekler: **yorum (comments) yönetimi**, **prototip bağlantılarının** tam programatik yönetimi, **bulut REST kotası olmadan** dosya-geneli published library bileşen kataloğu (plugin `teamLibrary` öncelikle **etkin kütüphanelerdeki değişken koleksiyonları** içindir; `figma_search_assets` bunu genişletir), **Code Connect’in** tam dosya yolu haritası (çoğunlukla Code Connect CLI / resmi MCP).

`figma_execute` ham Plugin API JS çalıştırmaya devam eder; üstünde `figma_use` (yapılandırılmış intent) ve adlı MCP araçları tercih edilmelidir.

---

## Kimin İçin?

**Uygun:**
- KVKK/GDPR hassasiyeti olan kurumsal ekipler
- Güvenlik ekibinin "veri nereye gidiyor?" dediği şirketler
- Figma 126.1.2+ kullananlar ve CDP sorunuyla karşılaşanlar
- Token kurmak istemeyen/edemeyen freelancer ve öğrenciler
- Free/Starter planda çalışan küçük ekipler
- DesignOps ekipleri: design-code parity, batch token yönetimi, rollback
- Birden fazla Figma/FigJam dosyasıyla aynı anda çalışan ekipler
- FigJam'da workshop, brainstorm ve akış diyagramı kullanan ekipler
- Figma Desktop kuramayan, browser'dan çalışan ekipler

**Uygun olmayabilir:**
- Yorum akışını MCP ile yönetmek isteyenler → Southleft veya özel otomasyon
- Tam Code Connect + bulut-native resmi ajan yolunu tek başına FMCP’siz isteyenler → Figma Resmi MCP ile birlikte değerlendirin

---

## Son Söz

CDP'nin gideceğini bilmiyordum.

Ama CDP olmadan çalışan bir mimari kurmuştum.

Ve sonra multi-file, FigJam, browser desteği ekledim — çünkü plugin-only mimari bunları mümkün kılıyordu. Doğru temel, doğru genişlemeyi getiriyor.

Bazen doğru tasarım kararları kendini sonradan kanıtlıyor.

---

Figma 126.1.2 sonrası MCP kurulumunuz çalışmayı bıraktı mı? Ya da güvenlik ekibinizle çatıştınız mı?

*Bu deneyimi yorumlarda paylaşın, hem topluluk için hem de yol haritası için.*

P.S. Kurulum sırasında takıldığınız yer varsa dokümanlar Türkçe: [github.com/atezer/FMCP](https://github.com/atezer/FMCP)

---

#DesignOps #DesignSystems #Figma #FigmaMCP #MCP #KVKK #AI #FigJam
