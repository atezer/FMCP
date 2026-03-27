# Güvenlik denetimi — izleme listesi

**Son tarama referansı:** Yerel Cursor planı `security_audit_fixes_f803037b.plan.md` (özet: 2025-03-27 kod yolları repo köküne göre). Bu dosya repoda kalıcı checklist sağlar; plan ile çelişirse **kod** doğruluk kaynağıdır.

**Genel durum:** Çoğu önerilen düzeltme **henüz uygulanmadı** (doğrudan kaynak kontrolü).

---

## Kritik

| ID | Konu | Konum özeti |
|----|------|-------------|
| K1 | `figma_execute` — `eval` sınırı (tip, ~50KB) | `f-mcp-plugin/code.js` (~415) |
| K2 | Bridge katmanı — `code` uzunluk: Zod `.max(51200)` + Python `len` | `src/local-plugin-only.ts`, `src/local.ts`, `python-bridge/fmcp_bridge/__main__.py` |
| K3 | `nodeId` template injection | `src/core/figma-desktop-connector.ts` — `JSON.stringify(nodeId)` |
| K4 | WebSocket — OPT-IN `FIGMA_BRIDGE_SECRET` + `verifyClient` | `src/core/plugin-bridge-server.ts` |

## Yüksek

| ID | Konu | Konum özeti |
|----|------|-------------|
| Y1 | Token önizlemesi / hassas log azaltma | `src/core/figma-api.ts`, `src/local.ts`, `src/index.ts` (Worker) |
| Y2 | `FIGMA_BRIDGE_HOST=0.0.0.0` uyarısı | `plugin-bridge-server.ts`, `python-bridge/fmcp_bridge/bridge.py` |
| Y3 | Audit log / config path — `..` reddi, güvenli path | `src/core/audit-log.ts`, `src/core/config.ts` |
| Y4 | `postMessage` `'*'` | **İptal** — Figma sandbox gereği zorunlu; dokümanda not |

## Orta

| ID | Konu | Konum özeti |
|----|------|-------------|
| O1 | `ws://` / TLS — dokümantasyon | `docs/` (Zero Trust / uzak erişim) |
| O2 | WebSocket `maxPayload` + rate limit | `plugin-bridge-server.ts` |
| O3 | Hata mesajı sanitize (+ Worker OAuth `errorData`) | `figma-api.ts`, `code.js`, `src/index.ts` |
| O4 | `code.js` debug `console.log` maskeleme | `f-mcp-plugin/code.js` |
| O5 | Audit `error` alanı sanitize | `audit-log.ts` |
| O6 | Console monitor — secret pattern / `location` sınırlama | `console-monitor.ts` |
| O7 | Config yükleme hatasında tam path sızdırmama | `config.ts` |

## Düşük

| ID | Konu | Konum özeti |
|----|------|-------------|
| D1 | CORS `*` bilinçli kullanım | `plugin-bridge-server.ts` |
| D2 | `wrangler.jsonc` — id’lerin repo sızdırması riski (gizli tut / örnek şablon) | `wrangler.jsonc` |
| D3 | TMPDIR / geçici yol | `config.ts` |
| D4 | Debug host/port SSRF sınırı | `src/browser/local.ts` |

---

## Uygulama sırası (özet)

1. K1 + K2 + K3 + K4 (OPT-IN kırılmaması).
2. Y1, Y3; sonra O2, O3 (Worker dahil), O5, O6, O7.
3. Y2, dokümantasyon O1/O4; D1–D4.

## İlgili dokümanlar

- [ENTERPRISE.md](ENTERPRISE.md) — audit log, air-gap
- [PRIVACY.md](../PRIVACY.md) — veri akışı
