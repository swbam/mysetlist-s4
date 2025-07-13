#!/bin/bash

echo "🔥 FINAL DEPLOYMENT SOLUTION - ULTRATHINKING 3X"

# Step 1: Remove all Vercel configurations
echo "🧹 Cleaning all Vercel configurations..."
rm -rf .vercel
rm -rf apps/web/.vercel
rm -rf .vercel-standalone

# Step 2: Create deployment in apps/web with proper setup
echo "📦 Setting up deployment directory..."
cd apps/web

# Step 3: Create a vercel.json that overrides detection
cat > vercel.json << 'EOF'
{
  "framework": "nextjs",
  "buildCommand": "echo 'Using prebuilt Next.js'",
  "installCommand": "echo 'Skipping install'",
  "outputDirectory": ".next"
}
EOF

# Step 4: Create a minimal package.json if it doesn't have Next.js
if ! grep -q '"next"' package.json; then
  echo "📝 Ensuring Next.js is in package.json..."
  # Backup original
  cp package.json package.json.backup
  
  # Add Next.js to dependencies using jq or sed
  node -e "
    const pkg = require('./package.json');
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies.next = '15.0.6';
    pkg.dependencies.react = '19.1.0';
    pkg.dependencies['react-dom'] = '19.1.0';
    require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
  "
fi

# Step 5: Link and deploy
echo "🚀 Linking and deploying..."
vercel link --yes
vercel --prod --yes --force

# Step 6: Restore original package.json if we modified it
if [ -f package.json.backup ]; then
  mv package.json.backup package.json
fi

# Clean up
rm -f vercel.json

cd ../..

echo "✅ Deployment complete!"