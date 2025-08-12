#!/bin/bash

# Vercel Deployment Script (Sonnet Project)

echo "🚀 Deploying MySetlist (sonnet) to Vercel"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

PROJECT_NAME="mysetlist-sonnet"

echo "📦 Project: $PROJECT_NAME"

echo "OPTION: Deploy via Vercel CLI"
echo "--------------------------------"
echo "Commands:"
echo "  npm i -g vercel"
echo "  vercel link --project $PROJECT_NAME"
echo "  vercel --prod --yes --name $PROJECT_NAME"

echo "Ensure your Vercel project is set to use:"
echo "  - Build: turbo build --filter=web"
echo "  - Install: pnpm install --frozen-lockfile"
echo "  - Output: apps/web/.next"