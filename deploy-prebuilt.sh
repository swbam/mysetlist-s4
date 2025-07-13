#!/bin/bash

echo "🚀 ULTRATHINKING DEPLOYMENT - PREBUILT STRATEGY"

# Clean up previous attempts
rm -rf .vercel apps/web/.vercel

# Create .vercel directory structure for build output
echo "📁 Creating Vercel build output structure..."
mkdir -p apps/web/.vercel/output/functions/index.func
mkdir -p apps/web/.vercel/output/static

# Copy the Next.js standalone build
echo "📦 Preparing standalone build..."
cd apps/web

# Create the function configuration
cat > .vercel/output/functions/index.func/.vc-config.json << 'EOF'
{
  "runtime": "nodejs22.x",
  "handler": "___next_launcher.cjs",
  "memory": 1024,
  "maxDuration": 10
}
EOF

# Copy Next.js build files
cp -r .next/standalone/* .vercel/output/functions/index.func/ 2>/dev/null || true
cp -r .next/static .vercel/output/static/_next/ 2>/dev/null || true
cp -r public/* .vercel/output/static/ 2>/dev/null || true

# Create config.json
cat > .vercel/output/config.json << 'EOF'
{
  "version": 3,
  "routes": [
    {
      "src": "/_next/static/(.+)",
      "headers": { "cache-control": "public,max-age=31536000,immutable" },
      "dest": "/_next/static/$1"
    },
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index"
    }
  ]
}
EOF

# Deploy with prebuilt
echo "🌐 Deploying to Vercel..."
vercel deploy --prebuilt --prod --yes

cd ..

echo "✅ Deployment attempted!"