#!/bin/bash

# Figma Desktop Bridge Autorun Installer
# This script sets up the Desktop Bridge plugin to run automatically when Figma opens

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_NAME="com.figma.desktop-bridge.plist"
PLIST_SOURCE="$SCRIPT_DIR/$PLIST_NAME"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "🚀 Installing Figma Desktop Bridge Autorun..."
echo ""

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$HOME/Library/LaunchAgents"

# Make scripts executable
echo "📝 Making scripts executable..."
chmod +x "$SCRIPT_DIR/autorun-bridge.sh"
echo "✅ Scripts are executable"
echo ""

# Copy plist file
echo "📋 Installing Launch Agent..."
cp "$PLIST_SOURCE" "$PLIST_DEST"
echo "✅ Launch Agent installed at: $PLIST_DEST"
echo ""

# Load the Launch Agent
echo "⚡ Loading Launch Agent..."
launchctl unload "$PLIST_DEST" 2>/dev/null || true  # Unload if already loaded
launchctl load "$PLIST_DEST"
echo "✅ Launch Agent loaded and running"
echo ""

# Verify it's loaded
if launchctl list | grep -q "com.figma.desktop-bridge"; then
    echo "✅ Launch Agent is active!"
else
    echo "⚠️  Launch Agent may not be active. Check logs for errors."
fi

echo ""
echo "📁 Log files:"
echo "   - Monitor log: ~/Library/Logs/figma-bridge-autorun.log"
echo "   - Stdout: ~/Library/Logs/figma-bridge-stdout.log"
echo "   - Stderr: ~/Library/Logs/figma-bridge-stderr.log"
echo ""
echo "🎉 Installation complete!"
echo ""
echo "ℹ️  The Desktop Bridge plugin will now automatically run when:"
echo "   1. You log in to macOS (if Figma is already running)"
echo "   2. You open Figma Desktop"
echo ""
echo "⚠️  IMPORTANT: Make sure you've installed the plugin first:"
echo "   Figma → Plugins → Development → Import plugin from manifest"
echo "   Path: $SCRIPT_DIR/../figma-desktop-bridge/manifest.json"
echo ""
echo "🛠️  To uninstall autorun, run: ./uninstall-autorun.sh"
