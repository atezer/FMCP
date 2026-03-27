#!/bin/bash

# F-MCP ATezer Bridge Auto-runner Script
# Monitors Figma and automatically runs the plugin when Figma opens

LOG_FILE="$HOME/Library/Logs/figma-bridge-autorun.log"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPLESCRIPT_PATH="$SCRIPT_DIR/autorun-bridge.applescript"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

echo "$(date): Starting F-MCP ATezer Bridge monitor..." >> "$LOG_FILE"

# Wait for Figma to start
while true; do
    if pgrep -x "Figma" > /dev/null; then
        echo "$(date): Figma detected, waiting for it to fully load..." >> "$LOG_FILE"
        
        # Wait for Figma to fully load (20 seconds - özellikle ilk açılışta gerekli)
        sleep 20
        
        # Run the Launcher app (Accessibility izni: Figma Bridge Launcher gerekli)
        # User must add "Figma Bridge Launcher" to System Settings > Privacy > Accessibility
        LAUNCHER_APP="$SCRIPT_DIR/Figma Bridge Launcher.app"
        if [ -d "$LAUNCHER_APP" ]; then
            echo "$(date): Running F-MCP ATezer Bridge plugin via Launcher app..." >> "$LOG_FILE"
            open "$LAUNCHER_APP" >> "$LOG_FILE" 2>&1
        else
            echo "$(date): Running F-MCP ATezer Bridge plugin via AppleScript..." >> "$LOG_FILE"
            osascript "$APPLESCRIPT_PATH" >> "$LOG_FILE" 2>&1
        fi
        
        # Wait for Figma to close before monitoring again
        while pgrep -x "Figma" > /dev/null; do
            sleep 30
        done
        
        echo "$(date): Figma closed, waiting for restart..." >> "$LOG_FILE"
    fi
    
    # Check every 5 seconds
    sleep 5
done
