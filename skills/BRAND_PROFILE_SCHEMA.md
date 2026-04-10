# Marka Profili (`.fmcp-brand-profile.json`)

## Ne İçin?

Tüm F-MCP skill'lerinin kişiselleştirilebilmesi için **merkezi** bir yapılandırma dosyası. Bir kez tanımlanır, tüm skill'ler otomatik okur.

Dosya **proje kökünde** (workspace root) oluşturulmalı: `.fmcp-brand-profile.json`

## Şema

```json
{
  "$schema": "https://json-schemastore.org/fmcp-brand-profile.json",
  "brand": {
    "name": "Marka Adı",
    "language": "tr",
    "voiceTone": {
      "personality": ["samimi", "profesyonel", "cesur"],
      "formality": "semi-formal",
      "humor": "subtle",
      "examples": {
        "success": "Harika! İşlem tamamlandı.",
        "error": "Bir sorun oluştu. Tekrar deneyebilirsin.",
        "warning": "Dikkat! Bu işlem geri alınamaz.",
        "empty": "Henüz burada bir şey yok. Hadi başlayalım!",
        "loading": "Hazırlanıyor..."
      }
    },
    "copyRules": {
      "maxCTALength": 24,
      "avoidWords": ["tıklayın", "lütfen", "basınız"],
      "preferWords": ["keşfet", "başla", "oluştur", "dene"],
      "ctaStyle": "verb-first",
      "errorTone": "empathetic-actionable",
      "truncation": "ellipsis"
    },
    "typography": {
      "displayFont": "Satoshi",
      "bodyFont": "Inter",
      "monoFont": "JetBrains Mono",
      "rationale": "Satoshi display için cesur/modern, Inter body için okunaklı"
    },
    "aestheticDirection": "minimal-bold",
    "targetPlatforms": ["ios", "android", "web"],
    "designSystemName": "Acme DS",
    "i18n": {
      "supportedLocales": ["tr", "en"],
      "rtlSupport": false,
      "longestLocale": "de"
    }
  }
}
```

## Alan Açıklamaları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `brand.name` | string | Evet | Marka / proje adı |
| `brand.language` | string | Evet | Birincil dil (ISO 639-1: tr, en, de vb.) |
| `brand.voiceTone.personality` | string[] | Hayır | Markanın 3 sıfatı (ör. samimi, cesur, güvenilir) |
| `brand.voiceTone.formality` | enum | Hayır | `formal` / `semi-formal` / `casual` |
| `brand.voiceTone.humor` | enum | Hayır | `none` / `subtle` / `playful` |
| `brand.voiceTone.examples` | object | Hayır | Bağlam bazlı örnek mesajlar (success, error, warning, empty, loading) |
| `brand.copyRules.maxCTALength` | number | Hayır | CTA buton metninde max karakter |
| `brand.copyRules.avoidWords` | string[] | Hayır | Kullanılmaması gereken kelimeler |
| `brand.copyRules.preferWords` | string[] | Hayır | Tercih edilen kelimeler |
| `brand.copyRules.ctaStyle` | enum | Hayır | `verb-first` / `noun-first` / `question` |
| `brand.copyRules.errorTone` | enum | Hayır | `empathetic-actionable` / `technical` / `minimal` |
| `brand.copyRules.truncation` | enum | Hayır | `ellipsis` / `fade` / `wrap` |
| `brand.typography.displayFont` | string | Hayır | Başlık / display font ailesi |
| `brand.typography.bodyFont` | string | Hayır | Gövde metin font ailesi |
| `brand.typography.monoFont` | string | Hayır | Kod / mono font ailesi |
| `brand.typography.rationale` | string | Hayır | Font seçim gerekçesi |
| `brand.aestheticDirection` | string | Hayır | Estetik yön (ör. minimal-bold, editorial, brutalist) |
| `brand.targetPlatforms` | string[] | Hayır | Hedef platformlar (ios, android, web, flutter) |
| `brand.designSystemName` | string | Hayır | DS kütüphane adı |
| `brand.i18n.supportedLocales` | string[] | Hayır | Desteklenen diller |
| `brand.i18n.rtlSupport` | boolean | Hayır | Sağdan sola dil desteği |
| `brand.i18n.longestLocale` | string | Hayır | En uzun metin üreten dil (truncation planlaması) |

## Skill'lerde Nasıl Kullanılır?

Her skill'in başında şu kontrol yapılır:

```
Proje kökünde .fmcp-brand-profile.json dosyasını ara.
- Varsa: oku ve ilgili alanları workflow'a uygula.
- Yoksa: varsayılan davranış. Kişiselleştirme gereken adımlarda kullanıcıya sor.
```

### Profil Yoksa Otomatik Oluşturma

`ux-copy-guidance` skill'i profil olmadığını tespit ederse kullanıcıya 3 soru sorar:

1. Markanız bir insan olsa nasıl konuşurdu? (3 sıfat)
2. Formallik seviyesi? (formal / yarı-formal / casual)
3. Bir başarı mesajı örneği verin

Cevaplardan minimal `.fmcp-brand-profile.json` oluşturur.

## Hangi Skill Hangi Alanı Kullanır?

| Skill | Okunan Alan |
|-------|-------------|
| `ux-copy-guidance` | `voiceTone`, `copyRules`, `i18n` |
| `generate-figma-screen` | `aestheticDirection`, `typography`, `targetPlatforms` |
| `figma-screen-analyzer` | `aestheticDirection`, `typography` |
| `ai-handoff-export` | `voiceTone`, `copyRules`, `targetPlatforms`, `i18n` |
| `component-documentation` | `voiceTone`, `copyRules` |
| `implement-design` | `targetPlatforms`, `typography` |
| `design-token-pipeline` | `targetPlatforms` |
| `generate-figma-library` | `typography`, `aestheticDirection` |
