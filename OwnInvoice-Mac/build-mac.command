#!/bin/bash

# ========================================
# Build OwnInvoice macOS Installer
# One-click: creates the .dmg installer
# ========================================

echo ""
echo "  ╔═══════════════════════════════════╗"
echo "  ║  Building OwnInvoice Desktop      ║"
echo "  ║  macOS Installer (.dmg)           ║"
echo "  ╚═══════════════════════════════════╝"
echo ""

cd "$(dirname "$0")" || exit 1

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "   Install it from https://nodejs.org (LTS version)"
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

echo "Node.js version: $(node -v)"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1/3: Installing dependencies..."
npm ci
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies."
    read -p "Press Enter to close..."
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Step 2: Build React
echo "⚛️  Step 2/3: Building React app..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Failed to build React app."
    read -p "Press Enter to close..."
    exit 1
fi
echo "✅ React app built"
echo ""

# Step 3: Build DMG
echo "📀 Step 3/3: Building macOS installer..."
npx electron-builder --mac
if [ $? -ne 0 ]; then
    echo "❌ Failed to build installer."
    read -p "Press Enter to close..."
    exit 1
fi

echo ""
echo "  ╔═══════════════════════════════════╗"
echo "  ║  ✅ Build complete!               ║"
echo "  ║  Installer is in the dist/ folder ║"
echo "  ╚═══════════════════════════════════╝"
echo ""

# Open the dist folder
open dist/

read -p "Press Enter to close..."
