#!/bin/bash

# F-MCP ATezer Bridge Autorun Uninstaller

set -e

PLIST_NAME="com.figma.desktop-bridge.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "🗑️  Uninstalling F-MCP ATezer Bridge Autorun..."
echo ""

# Unload the Launch Agent
if [ -f "$PLIST_DEST" ]; then
    echo "⚡ Unloading Launch Agent..."
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
    echo "✅ Launch Agent unloaded"
    echo ""
    
    # Remove plist file
    echo "📋 Removing Launch Agent file..."
    rm -f "$PLIST_DEST"
    echo "✅ Launch Agent file removed"
else
    echo "ℹ️  Launch Agent not found, nothing to uninstall"
fi

echo ""
echo "🎉 Uninstallation complete!"
echo ""
echo "ℹ️  The F-MCP ATezer Bridge plugin will no longer auto-run"
echo "   You can still run it manually from Figma's plugin menu"
