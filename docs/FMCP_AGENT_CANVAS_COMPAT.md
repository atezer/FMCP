# FMCP × Agent Canvas Compatibility Notes

Bu dokuman, Agent Canvas planindaki kritik varsayimlari teknik olarak netlestirir.

## 1) claude.ai ile MCP baglantisi

- `claude.ai` custom connector destegi sunar.
- Bu entegrasyon modeli **remote MCP URL** (HTTP/SSE) tabanlidir.
- FMCP'nin mevcut mimarisi ise local stdio MCP + local WebSocket plugin bridge (`ws://127.0.0.1:5454`) seklindedir.

Sonuc:

- `claude.ai` uzerinden FMCP kullanimi dogrudan "local bridge" modeliyle bire bir ayni degildir.
- FMCP bugun en net sekilde MCP-destekli istemcilerde calisir: Cursor ve Claude Desktop.
- `claude.ai` hedefi icin ekstra bir remote wrapper/host katmani gerekir.

## 2) Bu repoda bulunan kanitlar

- MCP kurulum ornegi: `.mcp.json` dosyasi, `npx -y @atezer/figma-mcp-bridge@latest figma-mcp-bridge-plugin` ile plugin-only stdio server baslatir.
- Kurulum akisi: `KURULUM.md`, plugin-only ve local server akisini anlatir.
- Planlanan Agent Canvas akisi: `FMCP-Agent-Canvas-Plan.md`.

## 3) Bridge API — guncel durum (FCM repo)

`f-mcp-bridge/dist/local-plugin-only.js` ve plugin (`f-mcp-plugin`) tarafinda asagidakiler **eklendi**:

- **`figma_search_assets`**: `figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync` + `getVariablesInLibraryCollectionAsync` (etkin kutuphaneler); ayrica dosya icindeki bilesenler. Manifest: `permissions: ["teamlibrary"]`.
- **`figma_get_code_connect`**: Node bazli `documentationLinks`, `description`, `componentKey` (tam Code Connect CLI haritasi degil).
- **`figma_use`**: Yapilandirilmis intent → mevcut bridge cagrilarina yonlendirme; bkz. [FIGMA_USE_STRUCTURED_INTENT.md](./FIGMA_USE_STRUCTURED_INTENT.md).

Tam envanter: [TOOLS.md](./TOOLS.md).

**Henuz yok:** Published library bilesenlerinin tek cagrida tam REST kotasiz katalogu (plugin API sinirli); `create_file` (Drafts) MCP araci.

## 3b) Resmi `use_figma` (Figma MCP) — Desktop / Remote ozeti

Figma MCP sunucusu **Desktop** ve **Remote** modlarda calisabilir; canvas yazma ve bazi araclar icin hangi modda hangi yetenegin acik oldugu **Figma Help / MCP dokumanlari** ile degisebilir. FMCP icin pratik cizgi: **yerel stdio MCP + WebSocket plugin** her zaman acik dosyada Plugin API yolunu kullanir; resmi `use_figma` ile **isim ve host** farklidir — ikisini ayni “claude.ai tek tik” vaadinde karistirmayin.

## 4) Uygulama hedefinin net ifadesi

Pazarlama / dokumantasyon dilinde su ifade daha guvenli:

- "FMCP, Figma plugin bridge modeliyle Cursor ve Claude Desktop gibi MCP istemcilerinde Agent Canvas benzeri workflow'u calistirir."

Asagidaki ifade kosullu olmalidir:

- "claude.ai uzerinden calisir" (yalnizca remote MCP host kati eklenirse).
