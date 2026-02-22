-- F-MCP ATezer Bridge - Tek yöntem: arama (Cmd+/) ile plugin aç
-- Figma'nın kesinlikle önde (frontmost) olmasını bekler

on appendLog(msg)
	try
		do shell script "echo \"$(date '+%H:%M:%S'): " & msg & "\" >> ~/Library/Logs/figma-bridge-autorun.log"
	end try
end appendLog

-- 1) Figma process var mı bekle
tell application "System Events"
	repeat 30 times
		if exists (process "Figma") then exit repeat
		delay 1
	end repeat
	if not (exists (process "Figma")) then
		appendLog("HATA: Figma process bulunamadı")
		return
	end if
end tell

delay 3

-- 2) Figma'yı öne getir ve frontmost olana kadar bekle (max 20 sn)
tell application "Figma" to activate

repeat 20 times
	delay 1
	tell application "System Events"
		if frontmost of process "Figma" then exit repeat
	end tell
	tell application "Figma" to activate
end repeat

tell application "System Events"
	if not (frontmost of process "Figma") then
		appendLog("HATA: Figma öne getirilemedi (frontmost değil)")
		return
	end if
end tell

delay 1

-- 3) Cmd+/ ile arama aç, plugin adını yaz, Enter
try
	tell application "System Events"
		tell process "Figma"
			keystroke "/" using {command down}
			delay 1.2
			keystroke "F-MCP ATezer Bridge"
			delay 0.8
			keystroke return
		end tell
	end tell
	appendLog("OK: Plugin açıldı (arama)")
on error errMsg number errNum
	appendLog("HATA: " & errMsg & " [" & (errNum as text) & "]")
end try
