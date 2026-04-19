# figma_get_code_connect + figma_use — Dogrulanmis Plan

> Durum: **TAMAMLANDI (v1.9.8)** — 2 tool kayitli, connector metodu ve ui.html extra-port route eklendi.
> Ilgili: [FUTURE.md](../FUTURE.md) P0 — Asset Search ve Code Connect
> Sapma notu: Plan'da "extra port handler 1 satir" tespiti dogruydu; kod taramasi sonrasi v1.9.8'de uygulandi.

## Context

Design-to-code ve token mapping akisi eksik. Iki yeni tool eklenecek:
- **figma_get_code_connect**: Bilesenin kod eslemesini getir (documentationLinks, componentKey, props)
- **figma_use**: Yuksek seviye orchestrator — bilesen + token + kod bilgisi tek cagri

**Branch:** `feature/code-connect-use`

## Mevcut Altyapi (3. dogrulama turu ile kesinlestirildi)

| Ne | Durum | Satir |
|----|-------|-------|
| `window.getCodeConnectHints()` | VAR | ui.html:429-436 |
| `GET_CODE_CONNECT_HINTS` handler (code.js) | VAR | code.js:1343-1404 |
| `GET_CODE_CONNECT_HINTS_RESULT` case | VAR | ui.html:760 |
| Ana port handler route | VAR | ui.html:1395 |
| Extra port handler route | EKSIK | ui.html:~1645 (1 satir eklenecek) |
| Connector method | EKSIK | connector.ts:316 (5 satir eklenecek) |
| Tool kaydi | EKSIK | local-plugin-only.ts:1654 |

## Riskler ve Cozumleri

| # | Risk | Cozum |
|---|------|-------|
| 1 | Extra port handler'da route yok | 1 satir ekle |
| 2 | Connector method yok | 5 satir ekle (signature code.js ile uyumlu) |
| 3 | figma_use MCP tool cagiramaz | Connector method'larini direkt cagir (Promise.all guvenli) |
| 4 | INSTANCE'da documentationLinks yok | executeCodeViaUI ile main component resolve |
| 5 | Variable → CSS name mapping yok | Basit toCSSVar transformer |
| 6 | Tam Code Connect dosya yollari yok | Dokumanlama (plugin API siniri) |

## Sinirlamalar

- Tam Code Connect dosya yollari plugin API'den erisilemez — sadece hint'ler (documentationLinks)
- Variable binding (hangi bilesen hangi token'i kullaniyor) otomatik tespit edilemez
- Tam esleme icin Figma'nin resmi Code Connect CLI veya figma.config gerekir

## Plan (4 Adim)

### Adim 1 — figma_get_code_connect (altyapi)
- plugin-bridge-connector.ts: `getCodeConnectHints()` method
- local-plugin-only.ts: `figma_get_code_connect` tool kaydi
- ui.html: extra port handler'a 1 satir route

### Adim 2 — figma_use (orchestrator)
- local-plugin-only.ts: `figma_use` tool kaydi
- Intent tipleri: component, token, design_context
- Connector method'larini dogrudan cagirir

### Adim 3 — INSTANCE → COMPONENT resolve
- INSTANCE node gelirse main component'e otomatik resolve

### Adim 4 — Test + dogrulama
- Build + 36/36 test + Figma'da test

## Dosya Degisim Haritasi

| Dosya | Degisiklik |
|-------|-----------|
| plugin-bridge-connector.ts | +method (5 satir) |
| local-plugin-only.ts | +2 tool |
| ui.html (extra port) | +1 satir route |
| code.js | DEGISMEZ |
