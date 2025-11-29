#!/bin/bash

# PocketBase Setup Script
# This script automates the setup of PocketBase collections and data
# 
# Usage: ./setup-pocketbase.sh

echo "🚀 PocketBase Setup Script"
echo "=========================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo ""

# Install PocketBase SDK if not already installed
echo "📦 Installing PocketBase SDK..."
npm install pocketbase
echo ""

# Check if pocketbase-setup.js exists
if [ ! -f "pocketbase-setup.js" ]; then
    echo "❌ pocketbase-setup.js not found in current directory"
    exit 1
fi

# Check if pocketbase-seed.js exists
if [ ! -f "pocketbase-seed.js" ]; then
    echo "❌ pocketbase-seed.js not found in current directory"
    exit 1
fi

echo "⚠️  IMPORTANT: Before running this script, make sure you have:"
echo "   1. Updated POCKETBASE_URL in both scripts"
echo "   2. Updated ADMIN_EMAIL in both scripts"
echo "   3. Updated ADMIN_PASSWORD in both scripts"
echo ""
read -p "Have you updated the configuration? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please update the configuration in pocketbase-setup.js and pocketbase-seed.js first"
    echo ""
    echo "Edit these lines:"
    echo "  const POCKETBASE_URL = 'http://your-pocketbase-url';"
    echo "  const ADMIN_EMAIL = 'your-admin-email';"
    echo "  const ADMIN_PASSWORD = 'your-admin-password';"
    echo ""
    exit 1
fi

echo ""
echo "📦 Step 1: Creating collections..."
echo "=================================="
node pocketbase-setup.js

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Failed to create collections. Please check the error above."
    exit 1
fi

echo ""
echo "📦 Step 2: Seeding initial data..."
echo "=================================="
node pocketbase-seed.js

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Failed to seed data. Please check the error above."
    exit 1
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "✅ Collections created"
echo "✅ Initial data added"
echo ""
echo "⚠️  IMPORTANT: Don't forget to enable realtime!"
echo ""
echo "To enable realtime:"
echo "1. Go to: http://your-pocketbase-url/_/"
echo "2. For each collection (slots, registrations, users, settings):"
echo "   - Click on the collection"
echo "   - Go to 'Options' tab"
echo "   - Check 'Enable realtime'"
echo "   - Click 'Save'"
echo ""
echo "🚀 Next steps:"
echo "   1. Enable realtime (see above)"
echo "   2. Run: npm run dev"
echo "   3. Test your app!"
echo ""
