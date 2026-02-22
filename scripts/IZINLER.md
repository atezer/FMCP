# F-MCP ATezer Bridge – Otomatik Açılma İzinleri

Plugin’in Figma açıldığında otomatik çalışması için macOS’ta **erişim izni** vermeniz gerekir.

## 1. İzin penceresi çıktıysa

- **“Figma Bridge Launcher”** veya **“System Events”** ile ilgili bir izin penceresi gördüyseniz:
  - **Aç** / **Allow** / **İzin Ver** deyin.
- Bu izin bir kez verildikten sonra tekrar sorulmaz.

## 2. İzin verme adımları (manuel)

### 2.1 Accessibility (Erişilebilirlik)

1. **System Settings** (Sistem Ayarları) → **Privacy & Security** (Gizlilik ve Güvenlik) → **Privacy** (Gizlilik)
2. Solda **Accessibility** (Erişilebilirlik) seçin
3. Altta **+** ile uygulama ekleyin
4. Şu konuma gidin ve **“Figma Bridge Launcher”** uygulamasını seçin:
   ```
   /Users/abdussamed.tezer/FCM/f-mcp-bridge/scripts/Figma Bridge Launcher.app
   ```
5. Listede **Figma Bridge Launcher**’ın yanındaki kutu **işaretli** olsun

### 2.2 Automation (Otomasyon) – gerekirse

1. Aynı **Privacy** ekranında **Automation** (Otomasyon) bölümüne girin
2. **Figma Bridge Launcher** listede varsa:
   - **Figma** ve **System Events** için izin verin (kutucukları işaretleyin)

## 3. Test

1. Figma’yı kapatın
2. Figma’yı tekrar açın (tercihen remote debugging ile):
   ```bash
   open -a "Figma" --args --remote-debugging-port=9222
   ```
3. **15–20 saniye** bekleyin (Figma yüklensin + autorun tetiklensin)
4. Figma’da **F-MCP ATezer Bridge** plugin’inin otomatik açıldığını kontrol edin

## 4. Hâlâ açılmıyorsa

- **System Settings → Privacy & Security → Accessibility** içinde **Figma Bridge Launcher**’ı kapatıp tekrar açın
- Figma’yı tamamen kapatıp yeniden başlatın
- Log’a bakın:
  ```bash
  tail -20 ~/Library/Logs/figma-bridge-autorun.log
  ```

## 5. Manuel çalıştırma

Plugin’i elle açmak için:

1. **Figma’yı** açın ve bir dosyayı açın
2. Terminal’de:
   ```bash
   open "/Users/abdussamed.tezer/FCM/f-mcp-bridge/scripts/Figma Bridge Launcher.app"
   ```
3. İzin penceresi çıkarsa **Allow** deyin
4. Birkaç saniye içinde plugin Figma’da açılmalı
