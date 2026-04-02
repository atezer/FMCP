# Figma REST API Rehberi (F-MCP Bridge)

F-MCP Bridge v1.4.0+ ile Figma REST API'yi dogrudan kullanabilirsiniz. Bu rehber kurulum, ornek kullanim ve limit yonetimini kapsar.

## Kurulum

### 1. Token alin

1. [Figma Settings](https://www.figma.com/settings) → **Personal access tokens**
2. **Generate new token** → Sure secin (max 90 gun)
3. Token'i kopyalayin (`figd_...` formati)

### 2. Token'i girin (2 yontem)

**Yontem A — Plugin UI (onerilen):**
1. Figma'da F-MCP Bridge plugin'ini acin
2. **Advanced** panelini acin
3. **API Token** alanina token'i yapistirin
4. Sure secin (1g / 7g / 30g / 90g)
5. Token kalici olarak saklanir — plugin kapatilip acilsa bile kalir

**Yontem B — AI araci ile:**
```
figma_set_rest_token ile token'i girin
```
Token bellekte saklanir, bridge restart edilince silinir (Plugin UI'dan girilen kalici kalir).

## Kullanim Ornekleri

### Kullanici bilgisi
```
figma_rest_api endpoint="/v1/me"
```

### Dosya yapisi
```
figma_rest_api endpoint="/v1/files/DOSYA_KEY?depth=1"
```

### Yorumlar
```
figma_rest_api endpoint="/v1/files/DOSYA_KEY/comments"
→ 200KB ustu otomatik kirpilir (son 20 yorum gosterilir)
```

### Versiyon gecmisi
```
figma_rest_api endpoint="/v1/files/DOSYA_KEY/versions"
→ 200KB ustu otomatik kirpilir (son 10 versiyon gosterilir)
```

### Gorsel export (PNG)
```
figma_rest_api endpoint="/v1/images/DOSYA_KEY?ids=NODE_ID&format=png&scale=2"
→ Download URL'leri doner
```

### Gorsel export (SVG)
```
figma_rest_api endpoint="/v1/images/DOSYA_KEY?ids=NODE_ID&format=svg"
```

## Hibrit Akis (Plugin + REST)

En verimli kullanim: plugin ile oku, REST ile export et.

```
1. figma_get_file_data → dosya yapisi (plugin, token gereksiz)
2. figma_search_components → bilesen bul (plugin)
3. figma_get_design_context → tasarim detayi (plugin)
4. figma_rest_api → gorsel export (REST, token gerekli)
```

## Rate Limit Yonetimi

### Figma API limitleri
- Plan bazli (Free/Pro/Org/Enterprise farkli)
- Dakika bazli istek limiti
- 429 durumunda otomatik retry (3 deneme, 5s→10s→20s backoff)

### Limit kontrolu
```
figma_get_rest_token_status
→ { rateLimit: { remaining: 450, limit: 500, resetAt: ... } }
```

### Otomatik korumalar
- **remaining = 0** → cagri yapilmaz, hata mesaji
- **remaining < 10** → uyari mesaji eklenir
- **429 yanit** → otomatik 3 retry (max 45 saniye)
- **200KB+ cevap** → otomatik kirpma (context korumasi)

## Token Guvenligi

- Token sadece bellekte tutulur (bridge tarafinda)
- Plugin UI'da `figma.clientStorage` ile sifrelenmis saklanir
- Diske yazilmaz, log'a yazilmaz
- Bridge kapaninca bellekten silinir
- localhost disina cikmaz (Zero Trust)

## Token Suresi

| Sure | Ne zaman kullan |
|------|----------------|
| 1 gun | Tek seferlik test |
| 7 gun | Kisa proje |
| 30 gun | Sprint suresi |
| 90 gun | Uzun sureli kullanim |

Plugin UI'da kalan gun sayaci goruntulenir. Sure dolunca token otomatik temizlenir.
