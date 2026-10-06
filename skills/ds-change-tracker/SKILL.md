---
name: ds-change-tracker
description: Design system değişiklik takibi. Figma DS dosyalarındaki bileşen, varyant, token ve ikon değişikliklerini snapshot karşılaştırması (token + bileşen) ve REST sürüm geçmişi (yalnızca bileşen/yapı) ile tespit eder, "eski → yeni" raporlar ve dev ekibi için iş taslağı hazırlar. "DS değişikliklerini takip et", "token ne değişti", "DS'de ne değişti", "değişiklik raporu", "sürümler arası fark", "Jira taslağı" ifadeleriyle tetiklenir. F-MCP Bridge plugin bağlantısı gerektirir.
metadata:
  mcp-server: user-figma-mcp-bridge
  version: 1.0.0
  personas:
    - designops
    - designer
    - uidev
---

# DS Change Tracker — Tasarım Sistemi Değişiklik Takibi

> **Design Token Kuralı:** Bu skill'deki örneklerde geçen token adları ve değerler yalnızca FORMAT gösterimidir. Çalışma anında tüm değerler hedef dosyadan (`figma_get_variables`, `figma_get_styles`) okunmalıdır. Detay: `fmcp-project-rules` → "Design Token Kuralı".

## Overview

Bir Figma design system dosyasında **ne değişti** sorusunu cevaplar ve değişikliği dev'e taşınabilir iş taslağına çevirir.

**Salt okunur** — Figma tuvalinde ve variable'larda değişiklik yapmaz.

## Prerequisites

- F-MCP Bridge plugin bağlı (`figma_get_status` → plugin bağlı).
- Takip edilecek dosyaların `fileKey` listesi (kullanıcı verir; URL'den parse et).
- *(İsteğe bağlı)* Sürüm geçmişi için Figma REST token'ı: plugin **Advanced → API Token** veya `/setup-rest-token`. Kontrol: `figma_get_rest_token_status`. Token'ı sohbete yapıştırtma.

## F-MCP skill koordinasyonu

- **Sonra (değişiklik bulunduysa):**
  - Etkilenen ekran/dosya kapsamı → `ds-impact-analysis`
  - Token değeri değiştiyse kod tarafı senkronu → `design-token-pipeline`
  - Bileşen API'si (prop/varyant) değiştiyse güncel spec → `extract-contract`

## İki yöntem — ne neyi verebilir?

| Yöntem | Token değer farkı | Bileşen/varyant farkı | Geçmişe dönük | Gereken |
|---|---|---|---|---|
| **Snapshot karşılaştırma** (plugin) | ✅ | ✅ | ❌ — yalnızca ilk bazdan sonrası | İlk koşuda baz kaydı |
| **Sürüm geçmişi** (REST) | ❌ | ✅ | ✅ | REST token |

**Önemli sınır:** Geçmişe dönük **token değeri** farkı alınamaz:
- Plugin API yalnızca dosyanın **şu anki** halini okur.
- REST variables endpoint'i (`/v1/files/:key/variables/local`) Enterprise planına özeldir ve `version` parametresi almaz.
- `GET /v1/files/:key?version=<id>` eski sürümün **node ağacını** verir — bileşen/varyant/ikon farkı buradan çıkar, variable değerleri çıkmaz.

Kullanıcı "X kararından önce token neydi?" diye sorarsa bunu açıkça söyle; o andan önce alınmış bir snapshot yoksa token farkı verilemez. Bu yüzden takibe başlarken **ilk iş baz snapshot almak**tır.

## Snapshot konumu

Snapshot'lar kurum verisi içerir; repoya **asla** yazılmaz. Kullanıcı-yerel dizin:

```
~/.claude/data/fcm-ds/<fileKey>/change-snapshots/<ISO-tarih>.json
```

Her dosya: `{ fileKey, fileName, takenAt, variables: { <collection>: { modes, groups: { <grupYolu>: { hash, count } } } }, components: { <setAdı>: { variantCount, properties } }, icons: { count, names } }`. Grup içi detay yalnızca fark çıkan gruplar için ayrı okunur.

## Akış

1. **Bağlantı:** `figma_get_status`. Plugin bağlı değilse kullanıcıdan plugin'i açmasını iste ve dur.
2. **Yöntem seçimi:**
   - Snapshot dizini boşsa → baz snapshot al, "baz oluşturuldu, bir sonraki koşuda fark raporlanır" de. Token varsa 3b ile bileşen geçmişi de sunulabilir.
   - Snapshot varsa → 3a.
   - Kullanıcı belirli bir geçmiş an istiyorsa → 3b (yalnızca bileşen/yapı).
3. **Veriyi çıkar** (salt okunur):
   - **3a — Snapshot:**
     - Variable koleksiyonları: ad, mod'lar, her değişkenin mod başına değeri ve alias hedefi (`figma_get_variables`). Grup yolu (`Component/button` gibi) başına özet hash üret; 800+ değişkenli koleksiyonlarda tüm listeyi context'e dökme.
     - Bileşenler: component set adı, varyant sayısı, property tanımları (`figma_search_components` veya salt okunur `figma_execute`).
     - İkon/asset: ad ve sayı.
   - **3b — Sürüm geçmişi (REST):**
     - `figma_rest_api GET /v1/files/:fileKey/versions` → sürüm listesi. Kullanıcıdan karşılaştırılacak iki anı al ya da en son iki adlandırılmış sürümü öner.
     - Her sürüm için `figma_rest_api GET /v1/files/:fileKey?version=<id>&depth=2` ile sayfa/üst düzey yapıyı, gerekirse `&ids=<nodeId,...>` ile yalnızca ilgili component set'leri çek. Tam dosyayı derinlik sınırı olmadan çekme (yanıt çok büyük olabilir).
     - `GET /v1/files/:fileKey/components` ve `/component_sets` güncel yayınlanmış listeyi verir (sürümsüz); karşılaştırmada "şu an" tarafı için kullanılabilir.
4. **Karşılaştır:** ekleme / silme / yeniden adlandırma / değer değişikliği. Önce grup hash'lerini karşılaştır, yalnızca farklı gruplara in. Yeniden adlandırmayı ID (variable id / node id) eşleşmesiyle tespit et, ad eşleşmesiyle değil.
5. **Rapor** (aşağıdaki biçim).
6. **Snapshot'ı kaydet** (3a koşularında): yeni dosya olarak yaz; eskileri silme.

## Rapor biçimi

```
## <Dosya adı> — <tarih/sürüm aralığı> (<yöntem: snapshot | sürüm geçmişi>)
### Token değişiklikleri
- <Grup/token> (<mod>): <eski değer/alias> → <yeni değer/alias>
### Bileşenler
- <Bileşen>: +1 varyant (<Property>: <Değer>)
### İkon/asset
- +2 / -1 (<adlar>)
### Gözlemler
- <değişiklik olmayan ama dikkat çeken durum>
### Etkilenen platform
- iOS, Android, Web (kullanıcı/takım bilgisinden; bilinmiyorsa "belirlenmedi")
```

Değişiklik yoksa tek satır: "değişiklik yok". Sürüm geçmişi yöntemiyle çalışıldıysa raporun başına "token değer farkı bu yöntemle kapsanmaz" notunu ekle.

## İş taslağı (Jira vb.)

Her mantıklı değişiklik grubu için bir taslak üret; **kullanıcı onaylamadan iş açma**.

Taslak alanları: başlık (`[Platform] Bileşen / token değişikliği`), açıklama (eski → yeni değer, etkilenen varyantlar, kabul kriteri, Figma linki), platform, tür (Story/Bug). Kurumsal alan eşlemeleri (proje, etiketler, atanan kişi, zorunlu özel alanlar) takıma özeldir; bunları kendi iş takibi skill'inde tanımla ve bu skill'in çıktısını ona ver.

## Hata Yonetimi

| Durum | Davranış |
|---|---|
| Plugin bağlı değil | Kullanıcıdan Figma'da plugin'i açmasını iste, dur |
| REST token yok | Snapshot yöntemiyle devam et; "sürüm geçmişi için REST token gerekir" notu düş |
| REST 403 / 404 | Token'ın dosyaya erişimi yok veya fileKey hatalı — kullanıcıya bildir, snapshot'a düş |
| REST 429 | `figma_rest_api` kendi retry'ını yapar; yine başarısızsa koşuyu snapshot ile tamamla |
| Sürüm yanıtı çok büyük | `depth` düşür veya `ids` ile ilgili node'lara daralt |
| İlk koşu (snapshot yok) | Yalnızca baz kaydet; fark raporu verme |

## Kurallar

- Yalnızca **okuma** yap: `figma_execute` ile node/değişken **değiştirme**.
- Token ve gizli bilgileri çıktıya yazma.
- Snapshot'ları repo içine değil `~/.claude/data/fcm-ds/` altına yaz.
- Büyük koleksiyonlarda grup bazlı hash kullan, tüm listeyi context'e dökme.
- Bulgu bir "değişiklik" değilse (ör. eski adlı bir token'a bağlı kalmış alan) bunu **gözlem** olarak etiketle, değişiklik gibi sunma.
- REST sınırını (geçmişe dönük token farkı yok) kullanıcıdan gizleme; snapshot olmadan token farkı uydurma.
