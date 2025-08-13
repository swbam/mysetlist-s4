#!/bin/bash

# Quick deployment script for TheSet
# This is a simplified wrapper around the main deployment script

set -e  # Exit on error

echo "🚀 TheSet Quick Deploy"
echo "========================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from the project root directory"
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  You have uncommitted changes. They will be included in the deployment."
    read -p "Continue? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
fi

# Run the main deployment script
echo "📦 Starting deployment process..."
pnpm deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Post-deployment checklist:"
echo "  1. Check your app at https://mysetlist.vercel.app"
echo "  2. Verify API endpoints are working"
echo "  3. Check Supabase dashboard for any issues"
echo "  4. Monitor error logs: vercel logs --follow"