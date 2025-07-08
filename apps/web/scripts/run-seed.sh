#!/bin/bash

# Load environment variables
if [ -f ../../.env.local ]; then
    source ../../.env.local
fi

if [ -f .env.local ]; then
    source .env.local
fi

echo "🌱 Seeding database with test data..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found. Please check your .env.local file."
    exit 1
fi

# Run the SQL file
if command -v psql &> /dev/null; then
    echo "📊 Running SQL seed file..."
    psql "$DATABASE_URL" -f scripts/quick-seed.sql
    echo "✅ Database seeded successfully!"
else
    echo "❌ psql not found. Please install PostgreSQL client."
    echo "   On macOS: brew install postgresql"
    echo "   On Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi 