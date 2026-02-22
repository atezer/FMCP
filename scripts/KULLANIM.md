# F-MCP ATezer Bridge – Nasıl Açılır?

## Yöntem A: Otomatik (Figma her açıldığında)

**Şart:** **Figma Bridge Launcher** uygulamasına **Accessibility** izni verilmiş olmalı.

1. **System Settings** → **Privacy & Security** → **Privacy** → **Accessibility**
2. **+** → Git: `/Users/abdussamed.tezer/FCM/f-mcp-bridge/scripts`
3. **Figma Bridge Launcher.app** seç → Aç
4. Listede **Figma Bridge Launcher** yanındaki kutu **işaretli** olsun
5. Figma’yı kapatıp tekrar aç:  
   `open -a "Figma" --args --remote-debugging-port=9222`
6. **En az 25–30 saniye** bekle (Figma yüklensin + script çalışsın)

---

## Yöntem B: Manuel – Çift tıkla (her seferinde çalışır)

Figma **zaten açıkken**:

1. Finder’da şu dosyaya **çift tıkla**:  
   `FCM/f-mcp-bridge/scripts/Plugin Ac.command`
2. Terminal açılır, script çalışır, plugin açılır.

**İlk seferde:** macOS “Terminal bu uygulamayı kontrol etmek istiyor” derse **Aç** de.  
Sonra **System Settings** → **Privacy** → **Accessibility** → **Terminal**’i ekleyip işaretle.

---

## Log kontrolü

```bash
tail -20 ~/Library/Logs/figma-bridge-autorun.log
```

- **OK: Plugin açıldı** → Başarılı
- **HATA: ... yardımcı erişime izin verilmiyor** → Accessibility izni verilmemiş
- **HATA: Figma öne getirilemedi** → Figma penceresi kapalı veya başka uygulama önde

---

## Özet

| Ne istiyorsun?        | Ne yap?                                                                 |
|-----------------------|-------------------------------------------------------------------------|
| Her Figma açılışında açılsın | Yöntem A – Figma Bridge Launcher’a Accessibility ver, 25–30 sn bekle   |
| Ben açayım, tek tık   | Yöntem B – Figma açıkken **Plugin Ac.command**’a çift tıkla             |
| Hiç otomatik istemiyorum | Figma’da **Plugins → Development → F-MCP ATezer Bridge** elle çalıştır |
