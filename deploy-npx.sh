#!/bin/bash

echo "🔥 FINAL DEPLOYMENT USING NPX VERCEL"

# Clean up everything
rm -rf .vercel apps/web/.vercel

# Go to web directory
cd apps/web

# Use npx to ensure we have the latest Vercel CLI
echo "📦 Deploying with npx vercel..."
npx vercel@latest --prod --yes --name mysetlist-s4-production

cd ..

echo "✅ Deployment complete!"