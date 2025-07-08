#!/bin/bash

# Seed trending scores for MySetlist app
# Run this script to populate initial trending scores so the trending pages work

echo "🌱 Seeding trending scores..."

# Load environment variables
if [ -f .env.local ]; then
    source .env.local
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found. Please check your .env.local file."
    exit 1
fi

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Please install PostgreSQL client."
    echo "   On macOS: brew install postgresql"
    echo "   On Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# Run the trending scores seed SQL
echo "📊 Running trending scores seed..."
if psql "$DATABASE_URL" -f scripts/seed-trending-scores.sql; then
    echo "✅ Trending scores seeded successfully!"
    echo ""
    echo "🔥 Your app should now show trending data:"
    echo "   - Artists with popularity-based trending scores"
    echo "   - Shows with activity-based trending scores"
    echo "   - Venues with show count-based trending scores"
    echo ""
    echo "💡 To manually trigger trending updates in the future:"
    echo "   - Use the cron jobs (runs hourly/daily automatically)"
    echo "   - Or call the update-trending Supabase function directly"
else
    echo "❌ Failed to seed trending scores. Check your database connection."
    exit 1
fi 