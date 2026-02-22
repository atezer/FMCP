#!/bin/bash

# Test script to verify autorun setup

echo "🧪 Testing F-MCP ATezer Bridge Autorun Setup..."
echo ""

PLIST_NAME="com.figma.desktop-bridge.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if plist exists
echo "1️⃣ Checking Launch Agent file..."
if [ -f "$PLIST_DEST" ]; then
    echo "   ✅ Launch Agent installed: $PLIST_DEST"
else
    echo "   ❌ Launch Agent NOT found!"
    echo "   Run: ./install-autorun.sh"
    exit 1
fi
echo ""

# Check if loaded
echo "2️⃣ Checking if Launch Agent is loaded..."
if launchctl list | grep -q "com.figma.desktop-bridge"; then
    echo "   ✅ Launch Agent is loaded and running"
else
    echo "   ⚠️  Launch Agent is NOT loaded!"
    echo "   Run: launchctl load $PLIST_DEST"
fi
echo ""

# Check if scripts are executable
echo "3️⃣ Checking script permissions..."
if [ -x "$SCRIPT_DIR/autorun-bridge.sh" ]; then
    echo "   ✅ autorun-bridge.sh is executable"
else
    echo "   ⚠️  autorun-bridge.sh is NOT executable"
    echo "   Run: chmod +x $SCRIPT_DIR/autorun-bridge.sh"
fi
echo ""

# Check if Figma is running
echo "4️⃣ Checking Figma status..."
if pgrep -x "Figma" > /dev/null; then
    echo "   ✅ Figma is currently running"
    echo "   PID: $(pgrep -x "Figma")"
else
    echo "   ℹ️  Figma is not running"
    echo "   Launch Figma to test autorun"
fi
echo ""

# Check log files
echo "5️⃣ Checking log files..."
LOG_FILE="$HOME/Library/Logs/figma-bridge-autorun.log"
if [ -f "$LOG_FILE" ]; then
    echo "   ✅ Log file exists"
    echo "   Last 5 lines:"
    tail -5 "$LOG_FILE" | sed 's/^/      /'
else
    echo "   ℹ️  No log file yet (will be created on first run)"
fi
echo ""

# Check AppleScript
echo "6️⃣ Checking AppleScript..."
APPLESCRIPT_PATH="$SCRIPT_DIR/autorun-bridge.applescript"
if [ -f "$APPLESCRIPT_PATH" ]; then
    echo "   ✅ AppleScript exists: $APPLESCRIPT_PATH"
else
    echo "   ❌ AppleScript NOT found!"
fi
echo ""

echo "✨ Test complete!"
echo ""
echo "📝 To manually test the AppleScript:"
echo "   osascript $APPLESCRIPT_PATH"
echo ""
echo "📋 To view live logs:"
echo "   tail -f $LOG_FILE"
