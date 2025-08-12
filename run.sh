#!/bin/bash

# TheSet - Start Development Server

echo "🎵 TheSet - Concert Setlist Voting App"
echo "========================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your configuration"
    exit 1
fi

# Start the development server
echo "🚀 Starting development server..."
echo "📍 Web app will be available at: http://localhost:3001"
echo ""

# Run the web app
pnpm --filter=web dev