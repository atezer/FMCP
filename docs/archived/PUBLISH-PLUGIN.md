# Figma: Publish Plugin Rehberi

Bu doküman, F-MCP Bridge (veya fork’u) plugin’ini Figma’da **Publish plugin** akışıyla yayınlayacak kişi için adım adım rehberdir. Organization / Community fark etmeksizin aynı formlar kullanılır.

---

## 1. Yayın akışı (sol menü)

1. **Describe your resource** — İsim, açıklama, kategori vb.
2. **Choose some images** — Önizleme görselleri, ikon.
3. **Data security** — Veri ve ağ ile ilgili sorular (aşağıda cevaplar).
4. **Add the final details** — Organizasyon, destek e-posta, Plugin ID, uyumluluk, ağ.

---

## 2. Data security — Nasıl işaretlenmeli?

Formda “Share how your plugin handles data” bölümünde aşağıdaki seçenekler F-MCP mimarisine uygundur.

| Soru | Seçim |
|------|--------|
| **Do you host a backend service for your plugin/widget?** | **No, I do not host a backend service for my plugin/widget.** (Backend kullanıcının kendi makinesinde çalışır; siz host etmiyorsunuz.) |
| **Does your plugin/widget make any network requests with services you do not host?** | **My plugin/widget makes network requests not captured by the above:** |
| | *Açıklama kutusuna yazılacak (örnek):* “The plugin connects only to the user's local MCP server (localhost, e.g. port 5454) that the user runs on their own machine. No data is sent to the developer or any third-party service. All Figma data stays on the user's device.” |
| **Does your plugin/widget use any user authentication?** | **No, my plugin/widget does not require or use any user authentication.** |
| **Do you store any data read/derived from Figma's plugin API?** | **No, my plugin/widget does not store any data read/derived from Figma's plugin API.** |
| **How do you manage updates to your plugin/widget?** | **I am a solo developer. I manage and update my plugin/widget myself.** veya **I work on a team and code changes are reviewed by a separate person before publishing.** |

İlk soruda “I agree to share this information” kutusu işaretlenmiş olmalı.

---

## 3. Add the final details

- **Organization:** Plugin’i hangi Figma organizasyonuna yayınlayacaksanız onu seçin (Organization/Enterprise plan gerekir).
- **Comments:** “Allow comments from Community members” — İsterseniz işaretleyin.
- **Support contact (\*):** Destek için kullanılacak e-posta (zorunlu). Örn. `destek@sirket.com`.
- **Plugin ID:**  
  Figma bu adımda size bir **Plugin ID** (sayısal) gösterir ve **“Add this ID to your manifest.json file”** der.
  - `f-mcp-plugin/manifest.json` dosyasını açın.
  - `"id"` alanını Figma’nın verdiği ID ile değiştirin:
    ```json
    "id": "FİGMA_NIN_VERDİĞİ_SAYI"
    ```
  - Örnek: `"id": "1608016072388581583"` (sizin yayında Figma’nın vereceği ID farklı olabilir).
- **Compatibility:**  
  - **For Figma** ve **For Figma: Dev Mode** ikisi de uyumlu; manifest’te `editorType: ["figma", "dev"]` olduğu için genelde ikisi de işaretli gelir.
- **Network:** “Restricted network access” uygundur; manifest’teki `networkAccess.allowedDomains` sadece localhost (5454–5470) içerir.

---

## 4. Yayın sonrası

- **Publish to:** Organization seçiliyse plugin organizasyonun plugin listesinde görünür; Community seçiliyse Figma Community’de listelenir.
- Kullanıcılar plugin’i **Plugins** (veya Resources → Plugins) üzerinden ekleyip çalıştırır; MCP bridge’i kendi makinede (Claude config veya `npm run dev:local`) kurmaları gerekir.

Detaylı kurulum: [ONBOARDING.md](ONBOARDING.md). Organization plugin avantajları: [README.md](../README.md#yaygınlaştırma-organization-private-plugin).
