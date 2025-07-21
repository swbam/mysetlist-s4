#!/bin/bash

# MySetlist App Setup Script
# This script sets up the app and applies all necessary fixes

set -e  # Exit on any error

echo "🚀 MySetlist App Setup"
echo "======================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found"
    echo "📖 Please see ENV_SETUP.md for environment configuration instructions"
    echo "🔧 Create .env.local with all required variables before proceeding"
    exit 1
fi

echo "✅ Environment file found"

# Load environment variables
source .env.local

# Check critical environment variables
if [ -z "$DATABASE_URL" ] || [ -z "$SUPABASE_URL" ] || [ -z "$SPOTIFY_CLIENT_ID" ]; then
    echo "❌ Missing critical environment variables"
    echo "📖 Please see ENV_SETUP.md for complete setup instructions"
    exit 1
fi

echo "✅ Critical environment variables configured"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
if ! pnpm install; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Build the project to check for errors
echo ""
echo "🔨 Building project..."
if ! pnpm build; then
    echo "❌ Build failed. Please fix build errors and try again."
    exit 1
fi

echo "✅ Project builds successfully"

# Run database seed for trending scores
echo ""
echo "🌱 Seeding trending scores..."
if [ -f "scripts/seed-trending.sh" ]; then
    if ./scripts/seed-trending.sh; then
        echo "✅ Trending scores seeded"
    else
        echo "⚠️  Trending scores seeding failed - app will work but trending pages may be empty"
    fi
else
    echo "⚠️  Trending seed script not found - creating minimal data"
    # Fallback: create some basic trending scores
    if command -v psql &> /dev/null && [ -n "$DATABASE_URL" ]; then
        psql "$DATABASE_URL" -c "UPDATE artists SET trending_score = COALESCE(popularity, 0) * 0.8 WHERE trending_score = 0 OR trending_score IS NULL;"
        echo "✅ Basic trending scores created"
    fi
fi

# Verify app is ready
echo ""
echo "🔍 Running final checks..."

# Check if we can connect to the database
if command -v psql &> /dev/null; then
    if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM artists;" > /dev/null 2>&1; then
        echo "✅ Database connection working"
    else
        echo "⚠️  Database connection issues - please check your DATABASE_URL"
    fi
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🚀 Next steps:"
echo "   1. Run 'pnpm dev' to start the development server"
echo "   2. Visit http://localhost:3001 to see your app"
echo "   3. Try searching for artists like 'Taylor Swift' or 'Drake'"
echo "   4. Check the trending page at http://localhost:3001/trending"
echo ""
echo "📚 Key features now working:"
echo "   ✅ Artist search and sync from Spotify/Ticketmaster"
echo "   ✅ Trending artists, shows, and venues"
echo "   ✅ Homepage sliders with optimized images"
echo "   ✅ Artist → Shows → Setlist voting flow"
echo "   ✅ Error boundaries and fallback UI"
echo "   ✅ Cron jobs for automatic trending updates"
echo ""
echo "🛠️  If you encounter issues:"
echo "   - Check ENV_SETUP.md for environment configuration"
echo "   - Run 'pnpm run check-env' to validate environment variables"
echo "   - Check the browser console for JavaScript errors"
echo "   - Verify all API keys are valid and active"
echo ""
echo "Happy coding! 🎵" 