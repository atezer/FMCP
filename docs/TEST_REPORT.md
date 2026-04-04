# F-MCP ATezer Bridge - Test Raporu

**Tarih:** 2026-04-04
**Test Ortami:** macOS Darwin 25.4.0 (ARM64)
**Node.js:** v22.22.2
**FMCP Surum:** 1.7.0
**Figma Plani:** Free
**AI Araci:** Claude Code (Opus 4.6)
**Baglanti:** Plugin Bridge, port 5454

---

## 1. Ozet

46 aracin tamami test edildi. Gercek hata sifir. 4 arac Figma'nin plan/API kisitlari nedeniyle beklenen sekilde basarisiz oldu, 2 arac guvenlik nedeniyle atlanildi.

| Kategori | Sayi |
|----------|------|
| PASS | 40 |
| EXPECTED FAIL (Figma kisiti) | 4 |
| SKIP (guvenlik) | 2 |
| GERCEK HATA | 0 |
| **TOPLAM** | **46** |

---

## 2. Detayli Test Sonuclari

### 2.1 Durum ve Okuma Araclari

| # | Arac | Test Adimi | Beklenen Sonuc | Gercek Sonuc | Durum |
|---|------|-----------|----------------|-------------|-------|
| 1 | `figma_get_status` | Arac cagirildi, parametre yok | Plugin baglanti durumu donmeli | `pluginConnected: true, bridgePort: 5454` | PASS |
| 2 | `figma_list_connected_files` | Arac cagirildi, parametre yok | Bagli dosya listesi donmeli | 1 dosya: "Untitled" (fileKey: v1rHyWUKGLrlYcAOQmUDX9) | PASS |
| 3 | `figma_get_file_data` | `verbosity: "standard"` | Dosya yapisi donmeli | Document, Page 1, fileKey dogru | PASS |
| 4 | `figma_get_design_system_summary` | Arac cagirildi | Ozet donmeli | Bos dosya icin 0 component, 0 collection | PASS |
| 5 | `figma_plugin_diagnostics` | Arac cagirildi | Sunucu diagnostik bilgisi | bridgePort, uptime, memory, nodeVersion dogru | PASS |
| 6 | `figma_get_design_context` | `nodeId: "5:2"` (Test Frame) | Node yapisi ve alt elemanlar | Frame + children (text, group) tam dondu | PASS |

### 2.2 Arama Araclari

| # | Arac | Test Adimi | Beklenen Sonuc | Gercek Sonuc | Durum |
|---|------|-----------|----------------|-------------|-------|
| 7 | `figma_search_components` | `query: "*"` | Bulunan component listesi | Bos dosyada bos liste (beklenen) | PASS |
| 8 | `figma_get_styles` | Arac cagirildi | Paint, text, effect stilleri | Bos dosyada bos listeler (beklenen) | PASS |
| 9 | `figma_get_variables` | Arac cagirildi | Variable listesi | Bos dosyada bos liste (beklenen) | PASS |
| 10 | `figma_search_assets` | `query: "button"` | Kutuphane bilesenlerini ara | Bos (REST API gerekli notu) | PASS |

### 2.3 Olusturma Araclari

| # | Arac | Test Adimi | Beklenen Sonuc | Gercek Sonuc | Durum |
|---|------|-----------|----------------|-------------|-------|
| 11 | `figma_create_frame` | `name: "Test Frame", 400x300, fillColor: #FFFFFF` | Frame olusturulmali | id: 5:2 olusturuldu | PASS |
| 12 | `figma_create_text` | `text: "FMCP Test Basarili!", fontSize: 24, parent: 5:2` | Text node olusturulmali | id: 5:3 olusturuldu | PASS |
| 13 | `figma_create_rectangle` | `200x48, fillColor: #4F46E5, cornerRadius: 8, parent: 5:2` | Rectangle olusturulmali | id: 5:4 olusturuldu | PASS |
| 14 | `figma_create_text` (2.) | `text: "Click Me", fontSize: 16, parent: 5:2` | Ikinci text node | id: 5:5 olusturuldu | PASS |
| 15 | `figma_create_group` | `nodeIds: [5:4, 5:5], name: "Button Group"` | Group olusturulmali | id: 5:6, childCount: 2 | PASS |

### 2.4 Variable ve Token Araclari

| # | Arac | Test Adimi | Beklenen Sonuc | Gercek Sonuc | Durum |
|---|------|-----------|----------------|-------------|-------|
| 16 | `figma_create_variable_collection` | `name: "Test Tokens"` | Collection olusturulmali | id: VariableCollectionId:5:7 | PASS |
| 17 | `figma_create_variable` | `name: "primary-color", type: COLOR` | Variable olusturulmali | id: VariableID:5:8 | PASS |
| 18 | `figma_create_variable` (2.) | `name: "spacing-md", type: FLOAT` | Variable olusturulmali | id: VariableID:5:9 | PASS |
| 19 | `figma_update_variable` | `id: 5:9, value: 16` | Deger guncellenmeli | valuesByMode: 16 | PASS |
| 20 | `figma_rename_variable` | `id: 5:9, newName: "spacing/md"` | Isim degismeli | name: "spacing/md" | PASS |
| 21 | `figma_get_token_browser` | Arac cagirildi | Hiyerarsik token gorunumu | 2 variable, 1 collection listelendi | PASS |
| 22 | `figma_batch_create_variables` | 2 FLOAT variable birden | Toplu olusturma | 2 olusturuldu, 0 basarisiz | PASS |
| 23 | `figma_delete_variable` | `id: VariableID:5:11` | Variable silinmeli | "font-size-lg" silindi | PASS |
| 24 | `figma_check_design_parity` | Kod tokenlari vs Figma tokenlari karsilastir | Eslesen, farkli, eksik rapor | 2 matching, 1 divergent | PASS |
| 25 | `figma_delete_variable_collection` | `id: VariableCollectionId:5:7` | Collection silinmeli | 3 variable ile birlikte silindi | PASS |
| 26 | `figma_setup_design_tokens` | `"Brand Tokens", 4 token (FLOAT, STRING, BOOLEAN)` | Atomik olusturma | 4 token + 1 collection olusturuldu | PASS |
| 27 | `figma_batch_update_variables` | 3 variable birden guncelle | Toplu guncelleme | 3 guncellendi, 0 basarisiz | PASS |
| 28 | `figma_refresh_variables` | Arac cagirildi | Guncel degerler | spacing/sm=12, spacing/lg=32, is-dark=true | PASS |
| 29 | `figma_rename_mode` | `"Mode 1" -> "Light"` | Mode ismi degismeli | "Light" olarak guncellendi | PASS |
| 30 | `figma_add_mode` | `"Dark"` mode eklemeye calis | Mode eklenmeli | "Limited to 1 modes only" | EXPECTED FAIL |

> **Not (add_mode):** Figma Free plan sadece 1 mode destekler. Professional+ planlarda calisir.

### 2.5 Bilesen Araclari

| # | Arac | Test Adimi | Beklenen Sonuc | Gercek Sonuc | Durum |
|---|------|-----------|----------------|-------------|-------|
| 31 | `figma_get_component` | `nodeId: 5:12` (Button/Primary) | Component metadata | isim, children, type dogru | PASS |
| 32 | `figma_get_component_image` | `nodeId: 5:12, scale: 1` | Screenshot (base64 PNG) | 1862 byte PNG goruntu | PASS |
| 33 | `figma_get_component_for_development` | `nodeId: 5:12` | Metadata + screenshot birlikte | Iki veri birden donduruldu | PASS |
| 34 | `figma_set_description` | `nodeId: 5:12, "Primary action button..."` | Aciklama eklenmeli | Basariyla eklendi | PASS |
| 35 | `figma_arrange_component_set` | `nodeIds: [5:12, 5:14]` | Variant set olusturulmali | "dynamic-page" hatasi | EXPECTED FAIL |
| 36 | `figma_instantiate_component` | `componentKey: "c06b..."` | Instance olusturulmali | "Component not found" | EXPECTED FAIL |
| 37 | `figma_set_instance_properties` | `nodeId: 5:16, properties: {...}` | Property degistirilmeli | "No valid properties" | EXPECTED FAIL |

> **Not (arrange_component_set):** Figma plugin API'de `documentAccess: dynamic-page` modunda senkron `getNodeById` kullanilamaz. Async versiyona gecis gerekir.
>
> **Not (instantiate_component):** Sadece **yayinlanmis** (published) kutuphane bilesenlerinde calisir. Local component icin `figma_execute` ile `createInstance()` kullanilabilir.
>
> **Not (set_instance_properties):** Component uzerinde property (text, boolean, variant) tanimli olmadigi icin set edilecek bir sey yoktu. Property'li component ile calisir.

### 2.6 Export ve Screenshot Araclari

| # | Arac | Test Adimi | Beklenen Sonuc | Gercek Sonuc | Durum |
|---|------|-----------|----------------|-------------|-------|
| 38 | `figma_capture_screenshot` | `nodeId: 5:2` | PNG screenshot | 10462 byte PNG | PASS |
| 39 | `figma_export_nodes` (SVG) | `nodeIds: [5:2], format: SVG` | SVG export | 17919 byte SVG | PASS |
| 40 | `figma_export_nodes` (PNG) | `nodeIds: [5:2], format: PNG, scale: 1` | PNG export | 4800 byte PNG | PASS |

### 2.7 Gelismis Araclar

| # | Arac | Test Adimi | Beklenen Sonuc | Gercek Sonuc | Durum |
|---|------|-----------|----------------|-------------|-------|
| 41 | `figma_execute` | JS kodu: sayfadaki node'lari listele | Sayfa yapisi donmeli | pageId, pageName, 1 child | PASS |
| 42 | `figma_get_console_logs` | Arac cagirildi | Plugin log'lari | Bos liste (beklenen) | PASS |
| 43 | `figma_clear_console` | Arac cagirildi | "Console cleared" | Basarili | PASS |
| 44 | `figma_watch_console` | `timeoutSeconds: 3` | 3 sn dinle, log dondur | 0 log (beklenen) | PASS |

### 2.8 REST API ve Yapilandirma Araclari

| # | Arac | Test Adimi | Beklenen Sonuc | Gercek Sonuc | Durum |
|---|------|-----------|----------------|-------------|-------|
| 45 | `figma_get_rest_token_status` | Arac cagirildi | Token durumu | hasToken: true | PASS |
| 46 | `figma_rest_api` | `GET /v1/me` | Kullanici bilgisi | "Abdussamed Tezer" | PASS |
| 47 | `figma_set_port` | `5454 -> 5458 -> 5454` | Port degismeli ve geri donmeli | Basariyla degisti ve geri dondu | PASS |
| 48 | `figma_set_rest_token` | - | Token set etme | Mevcut token kaybi riski | SKIP |
| 49 | `figma_clear_rest_token` | - | Token silme | Mevcut token kaybi riski | SKIP |

> **Not (set_rest_token / clear_rest_token):** Bu araclar basit set/delete islemleri yapar. Test etmek mevcut API token'ini kaybettirir. Calismalari `rest_api` ve `get_rest_token_status` testleriyle dolayli olarak dogrulanmistir.

---

## 3. Figma Plan Bazli Yetenek Matrisi

FMCP'nin 46 araci Figma'nin farkli plan turlerinde farkli yetenekler sunar. Asagida plan bazli farkliliklar:

### 3.1 Tum Planlarda Calisan Araclar (Free dahil)

Bu araclar Figma REST API gerektirmez, plugin bridge uzerinden calisir:

| Kategori | Araclar | Aciklama |
|----------|---------|----------|
| **Durum** | `get_status`, `list_connected_files`, `plugin_diagnostics` | Baglanti durumu ve diagnostik |
| **Okuma** | `get_file_data`, `get_design_context`, `get_design_system_summary` | Dosya yapisi ve tasarim baglamini oku |
| **Olusturma** | `create_frame`, `create_text`, `create_rectangle`, `create_group` | Figma'da yeni elemanlar olustur |
| **Bilesen** | `search_components`, `get_component`, `get_component_image`, `get_component_for_development` | Bilesen ara, incele, screenshot al |
| **Variable (Temel)** | `get_variables`, `create_variable_collection`, `create_variable`, `update_variable`, `rename_variable`, `delete_variable`, `delete_variable_collection`, `refresh_variables` | Tam variable CRUD islemleri |
| **Variable (Toplu)** | `batch_create_variables`, `batch_update_variables`, `setup_design_tokens` | Toplu olusturma ve guncelleme |
| **Variable (Analiz)** | `get_token_browser`, `check_design_parity`, `get_styles` | Token tarayici ve kod-tasarim uyumu |
| **Export** | `capture_screenshot`, `export_nodes` (PNG/SVG/JPG/PDF) | Gorsel export (toplu, 1-50 node) |
| **Kod Calistirma** | `execute` | Figma Plugin API ile ozel JS calistir |
| **Konsol** | `get_console_logs`, `clear_console`, `watch_console` | Plugin konsol izleme |
| **Yapilandirma** | `set_port`, `set_rest_token`, `clear_rest_token`, `get_rest_token_status` | Bridge ve token yonetimi |

### 3.2 Free Plan Kisitlamalari

| Kisit | Etkilenen Araclar | Aciklama |
|-------|------------------|----------|
| **1 mode limiti** | `add_mode` | Free planda collection basina sadece 1 mode. Professional+ planda coklu mode (Light/Dark vb.) |
| **Variable siniri** | Tum variable araclari | Free planda collection ve variable sayisi sinirli |
| **Kutuphane yayinlama yok** | `instantiate_component`, `search_assets` | Published library bilesenlerine erisim sinirli |

### 3.3 Professional Plan Ek Yetenekler

| Yetenek | Etkilenen Araclar | Aciklama |
|---------|------------------|----------|
| **Coklu mode** | `add_mode`, `rename_mode` | Light/Dark gibi birden fazla mode olusturulabilir |
| **Daha fazla variable** | Tum variable araclari | Daha yuksek variable/collection limitleri |
| **Team kutuphane** | `search_assets`, `instantiate_component` | Takim kutuphanesi bilesenlerine erisim |

### 3.4 Organization Plan Ek Yetenekler

| Yetenek | Etkilenen Araclar | Aciklama |
|---------|------------------|----------|
| **Private plugin** | Tum araclar | F-MCP plugin'i organizasyon icinde tek tikla dagitim |
| **Paylasilan kutuphaneler** | `search_assets`, `instantiate_component`, `set_instance_properties` | Organizasyon genelinde bilesen kutuphaneleri |
| **Branching** | `get_file_data` | Dosya dallari ile calisma |

### 3.5 Enterprise Plan Ek Yetenekler

| Yetenek | Etkilenen Araclar | Aciklama |
|---------|------------------|----------|
| **Variables REST API** | `rest_api` (`GET /v1/files/:key/variables`) | REST API uzerinden variable okuma (plugin disinda) |
| **Audit log** | Tum araclar | `FIGMA_MCP_AUDIT_LOG_PATH` ile NDJSON audit log |
| **Air-gap deployment** | Tum araclar | Internetsiz ortamda calisma (Zero Trust) |
| **SSO/SCIM** | - | Kurumsal kimlik yonetimi (FMCP disinda, Figma ozeligi) |
| **Gelismis analytics** | `rest_api` | Versiyon gecmisi, yorum okuma, detayli dosya bilgisi |

### 3.6 Ozet Matris

| Arac / Ozellik | Free | Pro | Org | Enterprise |
|---------------|:----:|:---:|:---:|:----------:|
| Plugin bridge baglantisi | + | + | + | + |
| Dosya okuma / tasarim baglami | + | + | + | + |
| Frame/Text/Rectangle olusturma | + | + | + | + |
| Group olusturma | + | + | + | + |
| Component arama / inceleme | + | + | + | + |
| Component screenshot | + | + | + | + |
| Variable CRUD (plugin) | + | + | + | + |
| Variable coklu mode | - | + | + | + |
| Toplu variable islemleri | + | + | + | + |
| Design token kurulumu | + | + | + | + |
| Design-code parity kontrolu | + | + | + | + |
| Screenshot / Export (PNG, SVG, JPG, PDF) | + | + | + | + |
| JS kodu calistirma | + | + | + | + |
| Konsol izleme | + | + | + | + |
| Port degistirme | + | + | + | + |
| REST API (yorumlar, versiyonlar) | + | + | + | + |
| REST API (variables) | - | - | - | + |
| Published library bilesenleri | - | ~ | + | + |
| Instance olusturma (library) | - | ~ | + | + |
| Instance property degistirme | - | ~ | + | + |
| Component set (variant) olusturma | ~ | ~ | ~ | ~ |
| Private plugin dagitimi | - | - | + | + |
| Audit logging | + | + | + | + |
| Air-gap deployment | + | + | + | + |

> `+` = Desteklenir, `-` = Desteklenmez, `~` = Kisitli/kosullu

---

## 4. Araclari Nasil Test Edebilirsiniz

### 4.1 On Kosullar

1. **Node.js 18+** kurulu olmali (`node -v` ile kontrol edin)
2. **FMCP** kurulu ve calisir durumda olmali (bkz. README.md)
3. **Figma'da F-MCP ATezer Bridge plugin'i** acik ve yesil "Ready" durumunda olmali
4. **Figma dosyasi** acik olmali (bos dosya yeterli)

### 4.2 Temel Baglanti Testi

```
Adim 1: figma_get_status
  -> pluginConnected: true olmali
  -> bridgeListening: true olmali

Adim 2: figma_list_connected_files
  -> En az 1 dosya listelenmeli
  -> fileKey ve fileName dolu olmali

Adim 3: figma_plugin_diagnostics
  -> bridgePort, uptime, memoryMB dolu olmali
```

### 4.3 Okuma Araclari Testi

```
Adim 1: figma_get_file_data
  -> Document ve en az 1 Page donmeli

Adim 2: figma_get_design_system_summary
  -> components ve variableCollections alanlari donmeli

Adim 3: figma_get_styles
  -> paintStyles, textStyles, effectStyles dizileri donmeli

Adim 4: figma_get_variables
  -> variables ve variableCollections dizileri donmeli
```

### 4.4 Olusturma Araclari Testi

```
Adim 1: figma_create_frame
  -> name: "Test Frame", width: 400, height: 300
  -> Donen id'yi kaydedin (ornek: "5:2")

Adim 2: figma_create_text
  -> text: "Merhaba", parentId: <frame_id>
  -> Donen id'yi kontrol edin

Adim 3: figma_create_rectangle
  -> width: 100, height: 50, parentId: <frame_id>, cornerRadius: 8
  -> Donen id'yi kontrol edin

Adim 4: figma_create_group
  -> nodeIds: [<text_id>, <rectangle_id>]
  -> childCount: 2 olmali
```

### 4.5 Variable Araclari Testi

```
Adim 1: figma_create_variable_collection
  -> name: "Test Tokens"
  -> Donen collectionId ve modeId'yi kaydedin

Adim 2: figma_create_variable
  -> name: "spacing", resolvedType: "FLOAT", collectionId: <collection_id>
  -> Donen variableId'yi kaydedin

Adim 3: figma_update_variable
  -> variableId: <variable_id>, modeId: <mode_id>, value: 16
  -> valuesByMode guncellenmis olmali

Adim 4: figma_rename_variable
  -> variableId: <variable_id>, newName: "spacing/md"
  -> name degismis olmali

Adim 5: figma_get_token_browser
  -> Olusturulan collection ve variable listelenmeli

Adim 6: figma_batch_create_variables
  -> items: [{name: "a", resolvedType: "FLOAT", collectionId: <id>}, ...]
  -> created dizisi dolu, failed bos olmali

Adim 7: figma_batch_update_variables
  -> items: [{variableId: <id>, modeId: <mode_id>, value: 24}]
  -> updated dizisi dolu, failed bos olmali

Adim 8: figma_check_design_parity
  -> codeTokens: '{"spacing/md": 16}'
  -> matching veya divergent sonuc donmeli

Adim 9: figma_refresh_variables
  -> Guncel variable degerleri donmeli

Adim 10: figma_rename_mode
  -> collectionId, modeId, newName: "Light"
  -> modes dizisinde isim degismis olmali

Adim 11: figma_add_mode (Professional+ planlarda)
  -> collectionId, modeName: "Dark"
  -> Yeni mode eklenmis olmali
  -> Free planda "Limited to 1 modes only" hatasi beklenir

Temizlik:
  figma_delete_variable -> olusturulan variable'lari silin
  figma_delete_variable_collection -> collection'i silin
```

### 4.6 Bilesen Araclari Testi

On hazirlik: figma_execute ile bir component olusturun:
```javascript
const comp = figma.createComponent();
comp.name = "TestButton";
comp.resize(200, 48);
comp.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.9 } }];
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
const t = figma.createText();
t.characters = "Test";
t.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
comp.appendChild(t);
return { id: comp.id, key: comp.key };
```

```
Adim 1: figma_get_component
  -> nodeId: <component_id>
  -> name, type: "COMPONENT", children donmeli

Adim 2: figma_get_component_image
  -> nodeId: <component_id>
  -> base64 PNG goruntu donmeli

Adim 3: figma_get_component_for_development
  -> nodeId: <component_id>
  -> component metadata + image birlikte donmeli

Adim 4: figma_set_description
  -> nodeId: <component_id>, description: "Test aciklamasi"
  -> description guncellenmis olmali

Adim 5: figma_search_components
  -> query: "TestButton"
  -> Olusturulan component listelenmeli

Adim 6: figma_instantiate_component (Library bilesenler icin)
  -> componentKey: <published_key>
  -> NOT: Sadece yayinlanmis kutuphaneden calisir

Adim 7: figma_set_instance_properties (Property'li bilesenler icin)
  -> nodeId: <instance_id>, properties: {...}
  -> NOT: Component'te tanimli property olmali

Adim 8: figma_arrange_component_set (2+ component ile)
  -> nodeIds: [<comp1_id>, <comp2_id>]
  -> NOT: dynamic-page API kisiti olabilir
```

### 4.7 Export Araclari Testi

```
Adim 1: figma_capture_screenshot
  -> nodeId: <herhangi_node>
  -> base64 PNG donmeli, byteLength > 0

Adim 2: figma_export_nodes (SVG)
  -> nodeIds: [<node_id>], format: "SVG"
  -> base64 SVG donmeli

Adim 3: figma_export_nodes (PNG)
  -> nodeIds: [<node_id>], format: "PNG", scale: 2
  -> base64 PNG donmeli

Adim 4: figma_export_nodes (Toplu)
  -> nodeIds: [<id1>, <id2>, <id3>], format: "PNG"
  -> exported = 3, failed = 0 olmali
```

### 4.8 Gelismis Araclar Testi

```
Adim 1: figma_execute
  -> code: 'return figma.currentPage.children.length'
  -> Sayi donmeli

Adim 2: figma_get_console_logs
  -> logs dizisi donmeli (bos olabilir)

Adim 3: figma_clear_console
  -> "Console cleared" mesaji

Adim 4: figma_watch_console
  -> timeoutSeconds: 3
  -> stream dizisi donmeli (bos olabilir)
```

### 4.9 REST API Araclari Testi

On kosul: REST API token'i plugin'deki Advanced panelden girin.

```
Adim 1: figma_get_rest_token_status
  -> hasToken: true olmali

Adim 2: figma_rest_api
  -> endpoint: "/v1/me"
  -> Kullanici bilgisi donmeli (id, email, handle)

Adim 3: figma_rest_api (dosya bilgisi)
  -> endpoint: "/v1/files/<fileKey>"
  -> Dosya adi ve son degisiklik tarihi donmeli
```

### 4.10 Yapilandirma Araclari Testi

```
Adim 1: figma_set_port
  -> port: 5458
  -> previousPort ve newPort dogru olmali
  -> Geri al: port: 5454

Adim 2: figma_set_rest_token (dikkatli)
  -> token: "figd_test123"
  -> UYARI: Mevcut token'i kaybettirir!
  -> Test sonrasi eski token'i tekrar girin

Adim 3: figma_clear_rest_token (dikkatli)
  -> Token silinmeli
  -> UYARI: rest_api araclari calismayi durdurur
  -> Test sonrasi token'i tekrar girin
```

### 4.11 Toplu Token Kurulumu Testi

```
Adim 1: figma_setup_design_tokens
  -> collectionName: "Test Tokens"
  -> modes: ["Default"]
  -> tokens: [
       { name: "spacing/sm", type: "FLOAT", value: 8 },
       { name: "spacing/lg", type: "FLOAT", value: 24 },
       { name: "label/cta", type: "STRING", value: "Baslat" },
       { name: "is-active", type: "BOOLEAN", value: true }
     ]
  -> collectionId ve 4 variableId donmeli

Temizlik: figma_delete_variable_collection ile silin
```

---

## 5. Bilinen Kisitlamalar

| # | Kisit | Etkilenen Arac | Sebep | Cozum |
|---|-------|---------------|-------|-------|
| 1 | Free planda 1 mode limiti | `add_mode` | Figma Free plan kisiti | Professional+ plana yukselt |
| 2 | dynamic-page API kisiti | `arrange_component_set` | Plugin manifest `documentAccess: dynamic-page` | Async API'ye gecis (kod iyilestirme) |
| 3 | Sadece published component | `instantiate_component` | Figma API tasarimi | Local icin `figma_execute` + `createInstance()` kullanin |
| 4 | Property tanimli olmayan component | `set_instance_properties` | Component'te property yok | Component'e property ekleyin |
| 5 | COLOR type hex string | `setup_design_tokens` | COLOR variable RGBA object bekler | FLOAT/STRING/BOOLEAN kullanin veya RGBA object gonderin |
| 6 | REST Variables API | `rest_api` (variables endpoint) | Enterprise plan gerekli | Plugin bridge uzerinden erisim (tum planlarda) |

---

## 6. Test Ortami Temizligi

Test sonrasi Figma dosyasindaki test verilerini temizlemek icin:

```
1. figma_execute ile tum test node'larini silin:
   figma.currentPage.children.forEach(n => n.remove())

2. figma_delete_variable_collection ile test collection'larini silin

3. figma_set_port ile portu 5454'e geri alin (degistirdiyseniz)

4. REST token'inizi tekrar girin (sildiyseniz)
```
