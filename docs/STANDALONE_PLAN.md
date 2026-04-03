# Node.js Bağımlılığını Kaldırma — Analiz ve Plan

> Durum: BEKLEMEDE — Değerlendirme aşamasında
> İlgili: [FUTURE.md](../FUTURE.md)

## Sorun

F-MCP Bridge kullanmak için Node.js kurulumu gerekiyor. Tasarımcılar, kurumsal Windows kullanıcıları ve hızlı deneyecek kişiler için engel.

## Mevcut Seçenekler

| Yol | Araç | Gereksinim | Durum |
|-----|------|-----------|-------|
| Node.js (npx) | 46 araç | Node.js | Çalışıyor |
| Python bridge | ~10 araç | Python | Çalışıyor ama eksik |
| Standalone binary | 46 araç | Hiçbir şey | YOK |

## Binary Derleme (pkg) Riskleri

| Risk | Seviye | Açıklama |
|------|--------|----------|
| pino transport | KRİTİK | Dinamik modül yükleme, bundling bozuyor |
| ESM format | KRİTİK | pkg ESM ile zayıf, CJS'e çevirmek lazım |
| macOS imzalama | KRİTİK | Gatekeeper imzasız binary'yi engelliyor |
| Windows SmartScreen | YÜKSEK | İmzasız .exe uyarı veriyor |
| Config dosya yolları | YÜKSEK | process.cwd() binary'de bozuk çalışıyor |

## Python Bridge Genişletme (Alternatif)

| Kriter | pkg Binary | Python Genişletme |
|--------|-----------|-------------------|
| Efor | 3-4 hafta | 2-3 gün |
| Risk | Yüksek | Düşük |
| Kullanıcı gereksinimi | Hiçbir şey | Python 3.10+ |
| Platform sorunları | macOS imza, Windows SmartScreen | Yok |

## Önerilen Yaklaşım

**Faz 1:** Python bridge'i 10→46 araca genişlet (düşük risk, 2-3 gün)
**Faz 2:** Standalone binary (opsiyonel, pkg ile, yüksek risk, 3-4 hafta)

Detaylı implementasyon planı hazır — onay bekliyor.
