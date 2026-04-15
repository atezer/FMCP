# Claude Desktop — Project Knowledge Upload Rehberi

Bu rehber Claude Desktop "FCM Orchestration" Project'ine hangi dosyaların nasıl yüklenmesi gerektiğini adım adım gösterir.

## Neden Project Knowledge?

Claude Desktop'ın native **skill store** sistemi yoktur — Claude Code'daki gibi `agents/` veya `skills/` dizinini otomatik taramaz. Desktop'ta skill içeriği **Project knowledge** olarak yüklenir: PDF / Markdown / TXT dosyaları Project'e eklenir, Claude chat'te bu dosyalara referans verilebilir.

**Kritik kısıtlama:** Claude Desktop Project knowledge'ı **otomatik context'e eklemez**. Kullanıcı ilk prompt'ta explicit referans vermek zorundadır. Detay: `install/claude-desktop/README.md#manuel-referans-kuralı`.

## Yüklenecek Dosyalar (Öncelik Sırasına Göre)

### Zorunlu (3 dosya — her FCM kullanıcısı için)

| # | Dosya | Rol | Boyut |
|---|---|---|---|
| 1 | `skills/fmcp-screen-orchestrator/SKILL.md` | Ekran üretim orchestrator'ı | ~230 satır |
| 2 | `skills/fmcp-ds-audit-orchestrator/SKILL.md` | DS audit orchestrator'ı | ~205 satır |
| 3 | `skills/fmcp-token-sync-orchestrator/SKILL.md` | Token sync orchestrator'ı | ~200 satır |

Bu 3 dosya tüm ana iş akışlarını kapsar. Her dosya self-contained (Essentials + Advanced), ortak protokol embedded.

### Opsiyonel (ihtiyaca göre)

| # | Dosya | Ne zaman yüklenir? |
|---|---|---|
| 4 | `skills/fmcp-intent-router/SKILL.md` | Belirsiz istekler çok varsa — universal entry gate (551 satır) |
| 5 | `skills/inspiration-intake/SKILL.md` | Image / Figma benchmark intake sık yapılıyorsa (195 satır) |
| 6 | `agents/_orchestrator-protocol.md` | Orchestrator'ların kondense versiyonu yetmiyorsa full protokol (185 satır) |
| 7 | `skills/generate-figma-screen/SKILL.md` | **Dikkat:** 1002 satır, context'i çok şişirir. Sadece derinlemesine ekran üretimi tartışmaları için. Common case'de orchestrator buna referans verir, yüklenmese de çalışır. |
| 8 | `skills/figma-canvas-ops/SKILL.md` | 500 satır pre-flight kuralları. Benzer şekilde sadece teknik troubleshooting için. |

**Öneri:** Başlangıçta sadece 3 zorunlu dosyayı yükle. İş akışı tıkanırsa opsiyonel dosyaları ekle.

## Upload Adımları

### macOS / Windows / Linux

1. Claude Desktop aç
2. Sidebar'da **"Projects"** sekmesine git
3. **"+ New Project"** → isim: "FCM Orchestration" (veya istediğin isim)
4. Project açıldıktan sonra üst kısımda **"Project knowledge"** bölümü var
5. **"Add file"** veya drag-and-drop ile yukarıdaki dosyaları yükle
6. Her dosya için açıklama ekle (opsiyonel ama yararlı):
   - `fmcp-screen-orchestrator.md` → "Ekran üretimi için orchestrator"
   - `fmcp-ds-audit-orchestrator.md` → "DS ve a11y audit için orchestrator"
   - `fmcp-token-sync-orchestrator.md` → "Token sync için orchestrator"
7. Tüm dosyalar eklendikten sonra Project'te yeni bir chat aç

## Güncellemeler

Orchestrator skill dosyalarını FCM repo'da güncellediğinde (git pull sonrası):

1. Project'te mevcut skill dosyalarını **delete** et
2. Yeni versiyonlarını upload et
3. (Aynı dosya adıyla upload "replace" etmez; Desktop aynı ismi iki kez alabilir — eski versiyonu manuel silmek gerekir)

**İpucu:** Versiyon takibi için Project description'a "Son güncelleme: YYYY-MM-DD, commit: abc1234" yazabilirsin.

## Test Etme

Upload sonrası yeni chat aç ve sırayla test et:

### Test 1 — Dosya erişimi

```
Project knowledge'daki fmcp-screen-orchestrator.md dosyasında "Skill Registry" tablosunu bana göster.
```

**Beklenen:** Tablo formatında 6 skill listesi. Dosya okunamıyorsa upload başarısız.

### Test 2 — Workflow uygulama

```
Project knowledge'daki fmcp-screen-orchestrator.md'yi uygula.
Görev: simple bir login ekranı (email, şifre, giriş butonu).
```

**Beklenen:** Claude orchestrator'un "Karar Akışı"nı takip eder, aktif DS için soru sorar (düz metin), sonra `figma_*` tool'larını çağırır.

### Test 3 — Cross-referans

```
Project knowledge'daki fmcp-ds-audit-orchestrator.md'yi uygula.
Görev: az önce oluşturduğun ekranın a11y kontrolü.
```

**Beklenen:** Desktop birinci chat context'te oluşturulan ekranın nodeId'sini hatırlar (aynı oturumda), a11y audit yapar.

## Sorun Giderme

| Sorun | Çözüm |
|---|---|
| "Project knowledge'da bu dosya yok" | Upload başarısız → dosyayı tekrar yükle. Dosya boyutu limit aşıyor mu? Markdown < 10MB olmalı |
| Claude dosya yerine kendi yorumunu kullanıyor | Prompt'ta **explicit** "Project knowledge'daki X.md'yi referans al ve uygula" yaz. "X skill'ini kullan" yeterli değil |
| Aynı dosyanın iki kopyası var | Eski versiyonları manuel sil, yenisini yükle. Desktop aynı isimli dosyayı "replace" etmez |
| Project knowledge sınırı doldu | Opsiyonel dosyaları (4-8) kaldır, sadece zorunlu 3'le idare et |

## Token Maliyeti (Project Knowledge)

Desktop Project knowledge dosyaları Claude'un context'ine **her mesajda** yeniden yüklenmez — sadece ilgili kısımlar Claude tarafından RAG ile çekilir. Ancak:

- İlk referansta dosyanın büyük kısmı context'e girer (~3-5K orchestrator için)
- Sonraki prompt'larda aynı oturumda cache'lidir
- Yeni oturum → yeniden yükleme

Claude Code'daki ~43.5K sub-agent context ile kıyaslanabilir ama Desktop'ta main context olduğundan daha dikkatli olunmalı — **uzun oturumlarda yeni chat aç**.
