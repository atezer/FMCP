# F-MCP ATezer Bridge Autorun Scripts

Bu klasör, F-MCP ATezer Bridge plugin'inin Figma açıldığında otomatik çalışmasını sağlayan scriptleri içerir.

## 📋 İçerik

| Dosya | Açıklama |
|-------|----------|
| `install-autorun.sh` | Autorun sistemini kurar |
| `uninstall-autorun.sh` | Autorun sistemini kaldırır |
| `test-autorun.sh` | Kurulumu test eder |
| `autorun-bridge.sh` | Figma'yı izleyen ana script |
| `autorun-bridge.applescript` | Plugin'i çalıştıran AppleScript |
| `com.figma.desktop-bridge.plist` | macOS Launch Agent yapılandırması |

## 🚀 Kurulum

### 1. Plugin'i Figma'ya Yükleyin (İlk Kez)

```bash
# Figma Desktop → Plugins → Development → Import plugin from manifest
# Dosya: /Users/abdussamed.tezer/FCM/f-mcp-plugin/manifest.json
```

### 2. Autorun'ı Kurun

```bash
cd /Users/abdussamed.tezer/FCM/scripts
./install-autorun.sh
```

### 3. Test Edin

```bash
./test-autorun.sh
```

## ✅ Kurulum Sonrası

Artık F-MCP ATezer Bridge plugin'i:
- ✅ macOS'a her login yaptığınızda otomatik başlar
- ✅ Figma açıldığında 10 saniye bekler (yüklenme için)
- ✅ Otomatik olarak plugin'i çalıştırır
- ✅ Figma kapanınca bekler, tekrar açılınca yeniden çalışır

## 📊 Logları İzleme

### Monitor Logu (Ana İşlemler)
```bash
tail -f ~/Library/Logs/figma-bridge-autorun.log
```

### Stdout (Çıktılar)
```bash
tail -f ~/Library/Logs/figma-bridge-stdout.log
```

### Stderr (Hatalar)
```bash
tail -f ~/Library/Logs/figma-bridge-stderr.log
```

## 🔧 Manuel Kontrol

### Launch Agent Durumunu Kontrol Et
```bash
launchctl list | grep figma
```

### Launch Agent'ı Yeniden Başlat
```bash
launchctl unload ~/Library/LaunchAgents/com.figma.desktop-bridge.plist
launchctl load ~/Library/LaunchAgents/com.figma.desktop-bridge.plist
```

### Manuel Olarak Çalıştır (Test)
```bash
osascript autorun-bridge.applescript
```

## ❌ Kaldırma

```bash
./uninstall-autorun.sh
```

## 🐛 Sorun Giderme

### Problem: Plugin otomatik açılmıyor
**Çözüm:**
1. Test scripti çalıştırın: `./test-autorun.sh`
2. Logları kontrol edin: `tail -f ~/Library/Logs/figma-bridge-autorun.log`
3. Plugin'in Figma'da kurulu olduğundan emin olun
4. Figma'yı remote debugging ile başlatın: `--remote-debugging-port=9222`

### Problem: "Operation not permitted" hatası
**Çözüm:**
macOS System Preferences → Security & Privacy → Privacy → Accessibility
→ Terminal veya iTerminal uygulamasına izin verin

### Problem: AppleScript çalışmıyor
**Çözüm:**
1. System Preferences → Security & Privacy → Privacy → Automation
2. Terminal/iTerm'e Figma kontrolüne izin verin

### Problem: Launch Agent yüklenmiyor
**Çözüm:**
```bash
# Plist dosyasının syntax'ını kontrol et
plutil ~/Library/LaunchAgents/com.figma.desktop-bridge.plist

# Manuel yükle
launchctl load -w ~/Library/LaunchAgents/com.figma.desktop-bridge.plist
```

## ⚙️ Özelleştirme

### Bekleme Süresini Değiştir
`autorun-bridge.sh` dosyasında:
```bash
# Figma yüklenmesi için bekleme (varsayılan: 10 saniye)
sleep 10
```

### Plugin Arama Süresini Ayarla
`autorun-bridge.applescript` dosyasında:
```applescript
-- Arama sonrası bekleme (varsayılan: 0.5 saniye)
delay 0.5
```

## 📝 Notlar

- ⚠️ AppleScript yöntemi Figma UI değişikliklerinden etkilenebilir
- ⚠️ Accessibility ve Automation izinleri gerektirir
- ✅ Plugin manuel açılabilir (autorun devre dışı olsa bile)
- ✅ Her Figma restart'ında çalışır
- ✅ Background'da çalışır, kullanıcıyı rahatsız etmez

## 🔐 Güvenlik

- Script sadece lokal makinede çalışır
- Network erişimi gerektirmez
- Sadece Figma uygulamasına erişim ister
- Log dosyaları user klasöründe saklanır
- Herhangi bir hassas veri içermez

## 🆘 Destek

Sorun yaşarsanız:
1. `test-autorun.sh` çalıştırın
2. Log dosyalarını kontrol edin
3. Plugin'i manuel çalıştırıp çalıştırmadığını test edin
4. macOS izinlerini kontrol edin

---

**Son Güncelleme:** $(date +"%Y-%m-%d")
**Sürüm:** 1.0.0
