#!/bin/bash

echo "🚀 FRESH DEPLOYMENT WITH CORRECT SETTINGS"

# Clean everything
rm -rf .vercel
rm -rf apps/web/.vercel

# Go to the web directory
cd apps/web

# Deploy as a new project with correct settings
echo "📦 Deploying fresh..."
VERCEL_PROJECT_NAME="mysetlist-production" vercel --prod --yes

cd ..

echo "✅ Fresh deployment complete!"