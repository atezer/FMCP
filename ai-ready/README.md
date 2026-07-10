# AI-Ready Design System — v2 (Geliştirici Tarafı)

Figma tasarımlarının AI araçları (Cursor, Claude Code, v0 vb.) tarafından doğru
okunmasını güvence altına alan sistemin geliştirici tarafı bileşenleri.

## Sistem Mimarisi

```
┌─────────────────────────────┐      ┌──────────────────────────────────┐
│ v1 — Figma içi              │      │ v2 — Geliştirici tarafı          │
│ /ai-ready-check skill       │      │                                  │
│ (tasarımcı çalıştırır)      │      │ A) rules/ai-ready.rules.md       │
│                             │      │    → CLAUDE.md / .cursorrules    │
│ 9 kategori denetim +        │─────▶│                                  │
│ otomatik düzeltme +         │ köprü│ B) cli/audit.mjs                 │
│ manifest üretimi            │      │    → REST + PAT, JSON rapor, CI  │
└─────────────────────────────┘      └──────────────────────────────────┘
              │                                      ▲
              │  manifests/*.json                    │
              └──────────────────────────────────────┘
        (component key + token haritaları — iki tarafın ortak sözlüğü)
```

**Köprü ilkesi:** v1 skill'i kütüphane dosyalarından component key manifest'leri
üretir (`manifests/` altına kaydedilir). CLI aynı manifest'leri kullanır. Böylece
"bu instance ikon kütüphanesinden mi geliyor?" sorusu iki tarafta da aynı
kesinlikle, isimden bağımsız olarak cevaplanır.

## Kütüphaneler

> Aşağıdaki tablo ŞABLONDUR — kendi design system kütüphanelerinizi yazın.
> File key, kütüphane URL'inden alınır: `figma.com/design/<FILE_KEY>/...`

| Kütüphane | File Key | Rol |
|---|---|---|
| Ana DS *(örnek)* | `<ANA_DS_FILE_KEY>` | Ortak bileşenler + tüm token/stil kaynağı (SSOT) |
| Mobil DS *(örnek)* | `<MOBIL_DS_FILE_KEY>` | Mobil'e özel bileşenler |
| Icons *(örnek)* | `<ICONS_FILE_KEY>` | İkon kütüphanesi |
| Assets *(örnek)* | `<ASSETS_FILE_KEY>` | Görsel asset kütüphanesi |

## REST API Yetenek Haritası (neden A+B, C sonra)

v1 skill'in 9 kategorisinin REST + personal token ile karşılanma durumu:

| Kategori | REST ile | Not |
|---|---|---|
| 1. İsimlendirme | ✅ Tam | |
| 2. Hiyerarşi | ✅ Tam | |
| 3. Auto-layout | ✅ Tam | `layoutMode`, `layoutPositioning`, `textAutoResize` REST'te var |
| 4a. Token bağlama (bound/unbound) | ✅ Tam | `boundVariables` node verisinde mevcut |
| 4b. Semantic vs Primitive | ⚠️ Kısmi | Koleksiyon adı çözümlemesi Enterprise variables endpoint'i ister → **v1'in sorumluluğunda kalır** |
| 4c. Scope kontrolü | ⚠️ Kısmi | Variable detayı (scopes) Enterprise ister |
| 4d. Kullanılmayan token | ❌ Yok | Enterprise + cross-file bilgisi gerekir → v1'de kalır |
| 5a. Detach tespiti | ⚠️ Heuristik | `detachedInfo` REST'te YOK → isim/yapı heuristiği |
| 5b. Kırık instance | ✅ | componentId → components map eşlemesi ile |
| 5g. Kütüphane kaynağı | ✅ Tam | manifest köprüsü sayesinde (key karşılaştırma) |
| 6. Gizli katmanlar | ✅ Tam | |
| 7. Metin içerik | ✅ Tam | |
| 8. İkon hijyeni | ✅ Tam | manifest ile |
| 9. Asset hijyeni | ✅ Tam | `imageRef` hash karşılaştırması dahil |

Sonuç: **A+B kombinasyonu doğru karar.** Kapanamayan 4 boşluk (4b, 4c, 4d, 5a-kesin)
zaten v1 skill'inin Figma içinde Plugin API ile kesin çözdüğü kontroller — iş bölümü
şöyle: *tasarımcı v1 ile temizler ve onaylar, geliştirici B ile doğrular, A ile AI
asistanının kod üretim davranışı şekillenir.* C (custom MCP server) gerekirse
`cli/audit.mjs` içindeki denetim motorunu sarmalayarak yazılır — motor bu yüzden
tek dosyada, bağımlılıksız tutuldu.

## Kullanım

### A) Kurallar

`rules/ai-ready.rules.md` içeriğini geliştirici reposunun `CLAUDE.md` dosyasına
(veya Cursor için `.cursorrules`'a) ekle.

### B) CLI audit

```bash
export FIGMA_TOKEN=figd_...        # personal access token (FIGMA_REST_TOKEN da kabul edilir)

node cli/audit.mjs \
  --file  <FILE_KEY> \
  --node  4:37 \                   # opsiyonel: tek frame'e daralt (önerilen)
  --manifests ./manifests \
  --json  ./ai-ready-report.json \
  --min-score 80                   # skor altındaysa exit 1 (CI gate)
```

### CI örneği (GitHub Actions)

```yaml
- name: AI-Ready design audit
  env:
    FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
  run: node ai-ready/cli/audit.mjs --file $FILE_KEY --node $NODE_ID --manifests ai-ready/manifests --min-score 80
```

### Manifest üretimi

`manifests/figma-export-manifest.js` script'ini her kütüphane dosyasında
(Figma agent'ına yapıştırarak veya v1 skill'in manifest adımıyla) çalıştır,
çıktıyı `manifests/<kütüphane>.json` olarak kaydet. Detay: `manifests/README.md`.

## Skorlama

v1 skill ile birebir aynı model (raporlar karşılaştırılabilir):
`max_puan = max(node_sayısı × 0.3, 60)`, critical=3 / warning=1 / info=0.5,
`skor = max(0, 100 − puan/max_puan × 100)`. Eşikler: 80+ hazır, 50–79 kısmen, <50 değil.
