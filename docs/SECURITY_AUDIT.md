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
| K4 | WebSocket — eşleştirme kodu (**varsayılan açık**; yalnızca `FMCP_PAIRING=off` geçiş anahtarı) + Origin denetimi — **uygulandı** | `src/core/pairing.ts`, `src/core/plugin-bridge-server.ts`, `python-bridge/fmcp_bridge/pairing.py`, `f-mcp-plugin/ui.html` |

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
| D1 | CORS `*` — **kaldırıldı** (`/status` ve işaret yanıtı; plugin bu uçları hiç okumuyordu, yalnızca web sayfalarına durum okutuyordu) | `plugin-bridge-server.ts` |
| D2 | `wrangler.jsonc` — id’lerin repo sızdırması riski (gizli tut / örnek şablon) | `wrangler.jsonc` |
| D3 | TMPDIR / geçici yol | `config.ts` |
| D4 | Debug host/port SSRF sınırı | `src/browser/local.ts` |

---

### K4 kararı: neden OPT-IN değil de varsayılan açık?

İlk plan (`docs/archived/WEBSOCKET-AUTH-K4-ANALYSIS.md`) sırrı isteğe bağlı tutuyordu: tanımlanmazsa her şey eskisi gibi. Ama saldırı — kullanıcının tarayıcısında açık bir web sayfasının `ws://localhost:5454`'e bağlanması — **herkese** açıktı; isteğe bağlı bir sır, onu bilerek açmayan kimseyi korumaz. Uygulanan hâl:

- Kod ilk çalıştırmada `~/.config/fmcp/pairing` dosyasında üretilir (0600, dizin 0700; `FMCP_PAIRING_FILE` ile taşınabilir); aynı makinedeki tüm Node/Python bridge'leri aynı dosyayı okur. Kullanıcı kodu plugin'e **bir kez** girer (`figma.clientStorage`).
- Kod URL'de değil, `ready` el sıkışmasında gider (URL'ler loglara düşer). Eşleşmeyen bağlantı istemci sayılmaz: istek almaz, token ayarlayamaz, başka istemcinin yanıtını veremez; 10 sn içinde eşleşmezse kapatılır.
- `/shutdown` yalnızca `X-FMCP-Pairing` başlığıyla ve `Origin` taşımayan isteklerde çalışır (tarayıcıdan gelen her POST Origin taşır).
- Kırılma yalnızca **eski plugin + yeni bridge** birleşiminde olur; **yeni plugin + eski bridge** çalışır (eski bridge alanı yok sayar). Geçiş için `FMCP_PAIRING=off` vardır ve bridge her başlangıçta uyarır. OPT-IN'e dönmek istenirse değişecek tek yer `pairingRequired()` varsayılanıdır.

## Uygulama sırası (özet)

1. K1 + K2 + K3 + K4 (OPT-IN kırılmaması).
2. Y1, Y3; sonra O2, O3 (Worker dahil), O5, O6, O7.
3. Y2, dokümantasyon O1/O4; D1–D4.

## İlgili dokümanlar

- [ENTERPRISE.md](ENTERPRISE.md) — audit log, air-gap
- [PRIVACY.md](../PRIVACY.md) — veri akışı
