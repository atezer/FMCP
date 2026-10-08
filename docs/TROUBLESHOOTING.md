# Troubleshooting Guide

## Common Issues and Solutions

### "Yeni araçlar entegre değil" / Araçlar listesinde görünmüyor

Aşağıdaki araçlar **sadece plugin-only giriş noktasında** tanımlıdır:  
`figma_get_component_for_development`, `figma_get_component_image`, `figma_set_description`, `figma_batch_create_variables`, `figma_batch_update_variables`, `figma_setup_design_tokens`, `figma_arrange_component_set`, `figma_get_console_logs`, `figma_watch_console`, `figma_clear_console`.

**Olası nedenler ve çözümler:**

1. **Yanlış MCP giriş noktası**  
   Claude config’te **mutlaka** `dist/local-plugin-only.js` kullanılmalı.  
   Örnek:
   ```json
   "figma-mcp-bridge": {
     "command": "node",
     "args": ["<PROJE-YOLU>/dist/local-plugin-only.js"]
   }
   ```
   `<PROJE-YOLU>` yerine FMCP klasörünün tam yolunu yazın (örn. `/Users/.../FMCP`).

2. **Eski build**  
   Araçlar eklendikten sonra build alınmamış olabilir. Proje kökünde:
   ```bash
   npm run build
   ```
   Ardından Claude Desktop’u **tamamen kapatıp** tekrar açın.

3. **Claude eski tool listesini kullanıyor**  
   MCP sunucusu Claude açıldığında başlar; sunucu yeniden başlamazsa tool listesi güncellenmez.  
   **Çözüm:** Claude Desktop’u tamamen kapatın, tekrar açın (ve gerekirse önce `npm run build` yapın).

**Kontrol:** Claude’a “Figma MCP’de hangi araçlar var?” veya “figma_get_status çağır” dediğinizde bağlantı geliyorsa, aynı config’teki sunucu çalışıyordur. Araç listesinde yukarıdaki isimler yoksa config’te `local-plugin-only.js` kullanıldığını ve build’in güncel olduğunu tekrar kontrol edin.

### Plugin Dev Mode'da görünmüyor

**Dikkat:** Plugin'in **Dev Mode**'da da listelenmesi için `f-mcp-plugin/manifest.json` içinde şu tanım olmalı:

```json
"editorType": ["figma", "dev"]
```

Sadece `"figma"` yazıyorsa plugin Dev Mode'da görünmeyebilir. Bu repodaki manifest'te `["figma", "dev"]` tanımlı; fork veya kendi plugin'inizde Dev Mode kullanacaksanız kontrol edin.

### "Claude's response could not be fully generated"

Bu mesaj Claude Desktop’un yanıtı tamamlayamadığını gösterir. Sıklıkla MCP’den dönen **çok büyük** veya **çok uzun süren** yanıtlar tetikler.

**Yapılacaklar:**

1. **Önce hafif bir araçla deneyin** — Örn. sadece `figma_get_status` veya `figma_get_design_system_summary`. Kısa yanıt döner; hata devam ediyorsa sorun büyük ihtimalle başka (ağ, bellek, Claude limiti).
2. **Büyük yanıt veren araçlar:** `figma_get_component_for_development` / `figma_get_component_image` base64 screenshot ile context’i şişirir. Önce `figma_get_component` (görsel olmadan) kullanın; gerekirse screenshot için `scale: 1` veya `format: "JPG"` deneyin. `figma_get_file_data` için `depth: 1`, `verbosity: "summary"` ile başlayın. Ana-DS gibi çok büyük dosyalarda "Plugin bridge request timed out" alırsanız: bridge 2 dk, getDocumentStructure/getLocalComponents 90 sn; variable adı sadece `verbosity: "full"` ile çözülür, `summary`/`standard` hızlı döner. **getLocalComponents timeout** (figma_get_design_system_summary, figma_search_components): Varsayılan olarak `currentPageOnly: true` kullanılır — sadece aktif sayfa taranır, timeout riski azalır; tüm dosyayı taramak için `currentPageOnly: false` verin. `figma_watch_console` için `timeoutSeconds: 5` veya 10 deneyin.
3. **Yeni konuşma açın** — Eski konuşmada context çok dolmuş olabilir.
4. **Claude / internet** — Geçici sunucu veya ağ sorunları da bu hataya yol açabilir; bir süre sonra tekrar deneyin.

**Özet:** Önce `figma_get_status` ile kısa yanıt alıp almadığınızı kontrol edin; hata orada da oluyorsa büyük/uzun yanıt vermeyen basit bir istekle (ve mümkünse yeni konuşmada) tekrar deneyin.

### "Birden fazla Figma dosyası bağlı" / `TARGET_REQUIRED` (v1.10.0+)

Plugin birden fazla dosyada açıkken, yazma yapan araçlar hangi dosyaya yazılacağını bilmek ister. Hata mesajı bağlı dosyaları `fileKey` ile listeler; çağrıyı `fileKey` (veya `figmaUrl`) ile tekrarlayın. `figma_list_connected_files` da aynı listeyi verir. Okuma araçları hedef verilmezse en son bağlanan dosyayı kullanır. Kuralı kapatmak için (önerilmez): `FMCP_REQUIRE_TARGET=0`.

### `EXECUTION_STATE_UNKNOWN` veya `TIMEOUT` (figma_execute)

Kod plugin'e ulaştı ama yanıt gelmeden bağlantı koptu ya da süre doldu — değişiklik **uygulanmış olabilir**. F-MCP bu durumda kodu kendiliğinden tekrar göndermez (kopya node oluşmasın diye). Tekrar çalıştırmadan önce ilgili node'ları okuyup durumu doğrulayın.

### Plugin "no server" / bağlanmıyor

1. MCP istemcisi (Claude/Cursor) sunucuyu başlatıyor olmalı — config'teki `dist/local-plugin-only.js` yolunu ve dosyanın var olduğunu kontrol edin (`npm run build`).
2. Sunucu 5454 doluysa otomatik olarak 5455–5470 aralığında boş bir porta geçer; plugin bu aralığı tarar.
3. Plugin'i Figma'da kapatıp yeniden açın.
4. Hâlâ bağlanmıyorsa terminalde portları görün: `lsof -nP -iTCP:5454-5470 -sTCP:LISTEN`

### Konsol logları

`figma_get_console_logs`, `figma_watch_console` ve `figma_clear_console` plugin'in kendi log tamponunu kullanır (son 200 kayıt). Debug portu veya Figma'yı özel bayrakla başlatmak **gerekmez**.

---

## Yardım

- Hata mesajlarındaki `hint` alanı çoğu zaman bir sonraki adımı söyler.
- Sorun bildirimi: https://github.com/atezer/FMCP/issues — hata mesajını, adımları ve `figma_get_status` çıktısını ekleyin.

---

## Ortam değişkenleri

Tam liste: [SETUP.md → Environment variables](SETUP.md#environment-variables). Hata ayıklama için `LOG_LEVEL=debug` (trace, debug, info, warn, error, fatal).

---


## DevTools Console'da WebSocket hataları görüyorum

Plugin DevTools'u açtığınızda şu tarzda hatalar görebilirsiniz:

```
WebSocket connection to 'ws://localhost:5458/' failed: Error in connection establishment: net::ERR_CONNECTION_REFUSED
```

### v1.9.1+ ile çözüldü

**v1.9.1 sürümünden itibaren bu hatalar tamamen giderildi.** Plugin artık 5454-5470 aralığını blind scan etmiyor — server kendi startup'ında probe yapıp aktif bridge'leri tespit ediyor ve welcome mesajında plugin'e bildiriyor. Plugin sadece bilinen aktif portlara bağlanıyor, kullanılmayan portlara WebSocket denemesi yapmıyor.

Eğer hâlâ görüyorsanız:

1. **Plugin sürümünü kontrol edin:** DevTools Console'da `console.log(FMCP_PLUGIN_VERSION)` → `"1.9.1"` veya daha yeni olmalı
2. **MCP server sürümünü kontrol edin:** Plugin console log'larından "Handshake OK — bridge v?.?.?" mesajına bakın. Eski sürüm ise `npm install -g @atezer/figma-mcp-bridge@latest`
3. **Figma'da plugin'i tamamen kapatın ve tekrar açın** (sayfa refresh yeterli değil — plugin iframe yeniden yüklenmeli)

### v1.9.0 veya eski sürümleri kullanıyorsanız

Yukarı upgrade edemiyorsanız, DevTools Console'da filtreleme ile bu hataları gizleyebilirsiniz:

- **Chrome:** Console filtresine `-WebSocket` yazın (tire ile exclude filter)
- **Firefox:** Console Filter kısmını sağ tıklayın → "Hide WebSocket messages"

Bu hatalar plugin fonksiyonelliğini etkilemez, sadece DevTools'ta görseldir.
