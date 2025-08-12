#!/bin/bash

echo "Testing TheSet Scripts"
echo "========================="
echo ""

# Test build command
echo "1. Testing build..."
cd /root/repo
npx turbo build --filter=web --dry-run

echo ""
echo "2. Testing typecheck..."
cd /root/repo/apps/web
npx tsc --noEmit

echo ""
echo "3. Testing lint..."
cd /root/repo
npx biome check --diagnostic-level=error apps/web/app

echo ""
echo "Done!"