#!/bin/bash

# ========================================
# OwnInvoice Desktop Launcher (macOS)
# by Grit Software
# ========================================

echo ""
echo "  ╔═══════════════════════════════════╗"
echo "  ║     OwnInvoice Desktop v1.0.0     ║"
echo "  ║         by Grit Software          ║"
echo "  ╚═══════════════════════════════════╝"
echo ""

APP_DIR="/Users/jnicometo/Documents/GitHub/Invoicing_app"

cd "$APP_DIR" || { echo "Error: App directory not found at $APP_DIR"; exit 1; }

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed."
    echo "Please install it from https://nodejs.org"
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies (first time only)..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "Error: Failed to install dependencies."
        read -p "Press Enter to close..."
        exit 1
    fi
    echo ""
fi

# Rebuild native modules if needed (better-sqlite3)
if [ ! -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    echo "Building native modules..."
    npx electron-rebuild -f
    echo ""
fi

echo "Launching OwnInvoice Desktop..."
echo ""
echo "The app will open in a new window."
echo "To stop: Close this Terminal window or press Ctrl+C"
echo ""

npm run electron:dev
