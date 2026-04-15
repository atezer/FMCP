# Deferred: figma-mcp-bridge Cloud Hosting

Bu dosya Claude Web için bridge cloud hosting ihtiyacının roadmap'idir. Kullanıcı kararıyla (Part 2 planlaması) **ertelendi**. Şu an Claude Web plan-only modda çalışır. Bu dosya ileri dönemde çözüm seçeneklerini özetler.

## Sorun

`figma-mcp-bridge` şu an local WebSocket server olarak çalışıyor:
- Port: `localhost:5454`
- Protokol: WebSocket
- Kullanım: Claude Code, Cursor, Claude Desktop — hepsi local erişim

Claude Web (claude.ai) **browser** uygulaması. Browser'ın security model'i `localhost:5454`'e doğrudan erişmesine izin vermez — bu yüzden MCP Connector olarak `figma-mcp-bridge` eklenemez.

**Sonuç:** Claude Web'de `figma_get_status()`, `figma_execute()`, `figma_search_assets()` vb. tool'lar erişilemez. Orchestrator skill'leri plan-only modda çalışır.

## Çözüm Seçenekleri

### Seçenek 1 — Cloud Tunnel (ngrok / cloudflared)

**Yaklaşım:**
- Kullanıcı local bridge'i çalıştırır (her zamanki gibi)
- `ngrok http 5454` veya `cloudflared tunnel --url http://localhost:5454` ile public URL açar
- Claude Web'de "Custom MCP Server" olarak `wss://xxx.ngrok-free.app` eklenir

**Artılar:**
- Bridge kodu değişmez
- Her kullanıcı kendi tunnel'ını kontrol eder
- Küçük ekipler için basit

**Eksiler:**
- Kullanıcının her oturumda tunnel çalıştırması gerekir
- Ücretsiz ngrok hesabında URL değişiyor (paid plan ile sabit)
- Auth katmanı yok (public URL → herkes bağlanabilir, token güvenliği yok)
- Cloudflare Zero Trust ile auth eklenebilir ama ek kurulum

**Efor:** ~1 gün (kurulum rehberi + Claude Web MCP Connector config + auth layer)

### Seçenek 2 — Cloudflare Workers (Serverless)

**Yaklaşım:**
- Bridge mantığını Cloudflare Workers'a port et
- Workers WebSocket Hibernation API ile persistent connection tutar
- Figma Desktop plugin Worker'a WebSocket üzerinden bağlanır (tersine tunnel)
- Claude Web → Workers URL (`wss://fcm-bridge.<username>.workers.dev`)

**Artılar:**
- Serverless, kullanıcı tunnel çalıştırmak zorunda değil
- Cloudflare Access ile OAuth/SSO auth hazır
- Free tier cömert (her kullanıcı 100K request/gün)
- Global edge network → düşük latency

**Eksiler:**
- Bridge kodu refactor gerektirir (WebSocket client/server logic değişir)
- Figma plugin tarafında reverse-connection mantığı (plugin önce Worker'a bağlanır)
- Cloudflare Account gerekir (ücretsiz)
- Orta seviye karmaşıklık

**Efor:** ~3-5 gün (refactor + test + deployment + auth)

### Seçenek 3 — Dedicated VPS

**Yaklaşım:**
- Bridge binary'sini küçük bir VPS'e deploy et (DigitalOcean / Hetzner / Linode — $5/ay)
- Nginx reverse proxy ile HTTPS + WebSocket
- API key auth
- Figma plugin VPS URL'ine bağlanır
- Claude Web MCP Connector olarak VPS URL

**Artılar:**
- Tam kontrol, değiştirmeden bridge kullanılır
- Auth layer istediğin gibi
- Predictable cost

**Eksiler:**
- Aylık maliyet
- Maintenance (OS updates, SSL renewal, monitoring)
- Tek nokta kırılganlığı (VPS down → Claude Web çalışmaz)

**Efor:** ~2 gün (VPS setup + Nginx + plugin host + SSL)

## Tercih Edilen Seçenek (Taslak)

**Kısa vadede (MVP):** Seçenek 1 (ngrok tunnel) — en hızlı implement, single developer için yeterli.

**Orta vadede (production):** Seçenek 2 (Cloudflare Workers) — serverless, ölçeklenebilir, auth hazır.

**Büyük ekipler / enterprise:** Seçenek 3 (VPS) — regulation gereksinimi varsa (on-premise, veri lokalizasyonu).

## Yan Konular

1. **Auth modeli:** Bridge'e kim erişebilir? Figma plugin yüklü olan? Belirli API key'e sahip kullanıcılar? OAuth/SSO ile organization? Bu kararlar auth layer'ı belirler.

2. **Multi-user isolation:** Tek bridge birden fazla kullanıcıya hizmet ederse state çakışır (figma_execute'u A kullanıcısı çağırdı, sonuç B'ye gitti). Workers stateless olduğu için oraya geçişte session/room concept gerekir.

3. **Data residency:** Figma tasarım içeriği bridge üzerinden geçer. Cloud hosting durumunda bu içerik geçici olarak cloud'a kaydedilir mi? Compliance için dikkat.

4. **Rate limiting:** Claude Web'den gelen çağrıları Figma rate limit'ine nasıl uyarlı göndeririz?

5. **Monitoring:** Bridge uptime, request latency, error rate — hangi tool'larla izlenir?

## Karar Noktası

Bu çözümlerin hangisi uygulanacak? Kararlar:

- [ ] Seçim (1 / 2 / 3)
- [ ] Auth modeli
- [ ] Maliyet bütçesi
- [ ] Implementation timeline
- [ ] Maintenance sorumlusu

Bu karar FCM projesinin **Part 3 Milestone** kapsamında olacak. Şu an (Part 2) kapsamında değil.

## Referans Linkler

- ngrok: https://ngrok.com/docs
- Cloudflare Workers WebSocket: https://developers.cloudflare.com/workers/runtime-apis/websockets/
- MCP Specification: https://modelcontextprotocol.io
- Claude Web MCP Connectors: https://docs.claude.com/en/docs/mcp (2026 sürümü)

## Ne Zaman Bu Dosya Aktif Olur?

- Part 2 tamamlandığında (bu milestone'un verifikasyonu ve commit'i)
- Ekip Claude Web kullanımına öncelik vermeye karar verdiğinde
- Budget/effort onayı alındığında

O zamana kadar bu dosya **roadmap referansı**, implementation değil.
