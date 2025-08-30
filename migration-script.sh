#!/bin/bash

# Comprehensive Supabase to Convex + Clerk Migration Script
# This script systematically replaces patterns across the codebase

echo "🚀 Starting Supabase to Convex + Clerk migration..."

# Go to web app directory
cd apps/web

echo "📁 Phase 1: Replace import statements..."

# Replace Supabase imports with Convex/Clerk
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/@supabase\/supabase-js/convex\/react/g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/@supabase\/auth-helpers-nextjs/@clerk\/nextjs/g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/@supabase\/ssr/@clerk\/nextjs/g'

echo "📁 Phase 2: Replace auth patterns..."

# Replace Supabase auth with Clerk
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/createClient()/createConvexClient()/g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/supabase\.auth\.getUser()/auth()/g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/supabase\.auth/clerk/g'

echo "📁 Phase 3: Replace database query patterns..."

# Replace common Supabase query patterns
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.from("artists")/api.artists/g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.from("shows")/api.shows/g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.from("venues")/api.venues/g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.from("setlists")/api.setlists/g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.from("songs")/api.songs/g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.from("votes")/api.votes/g'

echo "📁 Phase 4: Replace specific method patterns..."

# Replace Supabase methods with Convex equivalents
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.select()/\.getAll()/g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.insert()/\.create()/g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.update()/\.update()/g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/\.delete()/\.delete()/g'

echo "📁 Phase 5: Update import paths..."

# Update import paths to point to Convex
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|~/lib/supabase/server|~/lib/database|g'
find . -type f -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|~/lib/supabase/client|~/lib/convex|g'

echo "✅ Migration script completed!"
echo "⚠️  Manual review and testing required for complex queries and edge cases"
