#!/bin/bash

# Deploy script for MySetlist monorepo to Vercel

echo "🚀 Deploying MySetlist to Vercel..."

# Check if we're in the root directory
if [ ! -f "package.json" ] || [ ! -d "apps/web" ]; then
  echo "❌ Error: This script must be run from the root of the monorepo"
  exit 1
fi

# Deploy using a simpler approach
echo "📂 Creating deployment package..."

# Change to the web app directory
cd apps/web

# Create temporary .vercelignore to ignore workspace dependencies
cat > .vercelignore << 'EOF'
node_modules
.git
.next/cache
*.log
EOF

# Deploy directly from web directory
echo "🌐 Deploying to Vercel..."
vercel --prod --yes

# Clean up
rm .vercelignore
cd ../..

echo "✅ Deployment complete!"