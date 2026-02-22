#!/usr/bin/env python3
"""
F-MCP ATezer Bridge - Manuel plugin açıcı (izin testi için)
Bu script'i çalıştırdığınızda:
1. Figma öne getirilir
2. Plugins → Development → F-MCP ATezer Bridge menüsü tıklanır
3. İzin penceresi çıkarsa "Aç" / "Allow" deyin

Kullanım: python3 plugin-ac.py
veya:    open "Figma Bridge Launcher.app"   (scripts klasöründe)
"""

import subprocess
import time

APPLESCRIPT = r'''
tell application "Figma" to activate
delay 2
tell application "System Events"
    tell process "Figma"
        set frontmost to true
    end tell
    delay 0.5
    tell process "Figma"
        try
            click menu bar item "Plugins" of menu bar 1
            delay 0.8
            click menu item "F-MCP ATezer Bridge" of menu "Development" of menu item "Development" of menu "Plugins" of menu bar 1
        on error
            click menu bar item "Eklentiler" of menu bar 1
            delay 0.8
            click menu item "F-MCP ATezer Bridge" of menu "Geliştirme" of menu item "Geliştirme" of menu "Eklentiler" of menu bar 1
        end try
    end tell
end tell
'''

def main():
    print("Figma öne getiriliyor ve plugin açılıyor...")
    print("İzin penceresi çıkarsa 'Aç' / 'Allow' deyin.\n")
    try:
        subprocess.run(["osascript", "-e", APPLESCRIPT], check=True, timeout=15)
        print("Tamamlandı. Plugin penceresini kontrol edin.")
    except subprocess.CalledProcessError as e:
        print("Hata:", e)
        if e.returncode != 0:
            print("\nÇözüm: System Settings → Privacy & Security → Accessibility")
            print("        'Figma Bridge Launcher' veya 'Terminal' ekleyin ve izin verin.")
    except subprocess.TimeoutExpired:
        print("Zaman aşımı.")

if __name__ == "__main__":
    main()
