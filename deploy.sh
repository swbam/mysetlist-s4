#!/bin/bash

# Build and deploy script for MySetlist

echo "Building MySetlist app..."

# Set environment for build
export SKIP_ENV_VALIDATION=1

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf apps/web/.next

# Install dependencies
echo "Installing dependencies..."
pnpm install --no-frozen-lockfile --prefer-offline

# Build the web app
echo "Building web app..."
cd apps/web
npm run build

echo "Build complete!"
echo "To deploy, run: vercel --prod"