#!/bin/bash

# TheSet - Vercel Environment Variables Setup Script
# This script adds all required environment variables to your Vercel project

echo "🚀 TheSet - Vercel Environment Setup"
echo "======================================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed!"
    echo "Please install it with: npm i -g vercel"
    exit 1
fi

echo "📝 This script will add all required environment variables to your Vercel project."
echo "Make sure you're in the project directory and have run 'vercel link' first."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Function to add environment variable to all environments
add_env_var() {
    local key=$1
    local value=$2
    local sensitive=$3
    
    echo -n "Adding $key... "
    
    # Add to production, preview, and development
    echo "$value" | vercel env add "$key" production 2>/dev/null
    echo "$value" | vercel env add "$key" preview 2>/dev/null
    echo "$value" | vercel env add "$key" development 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✓"
    else
        echo "✗ (may already exist)"
    fi
}

echo ""
echo "🔐 Adding Database Configuration..."
echo "=================================="
add_env_var "DATABASE_URL" "postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:6543/postgres" true
add_env_var "DIRECT_URL" "postgresql://postgres.yzwkimtdaabyjbpykquu:Bambseth1590@aws-0-us-east-1.pooler.supabase.com:5432/postgres" true

echo ""
echo "🔐 Adding Supabase Configuration..."
echo "==================================="
add_env_var "NEXT_PUBLIC_SUPABASE_URL" "https://yzwkimtdaabyjbpykquu.supabase.co"
add_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM"
add_env_var "SUPABASE_URL" "https://yzwkimtdaabyjbpykquu.supabase.co"
add_env_var "SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM"
add_env_var "SUPABASE_SERVICE_ROLE_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY5MjMxNiwiZXhwIjoyMDY2MjY4MzE2fQ.ZMorLC_eZke3bvBAF0zyzqUONxpomfTN2RpE_mLjz18" true
add_env_var "SUPABASE_JWT_SECRET" "8yUxq3AqzLiPV9mdG5jZk38ZonG5nXVUVgq6zlQKCKHcdLcee3Ssg62/8cATrxBC2uvBqFXAIQUjHLMz3Q45rg==" true

echo ""
echo "🎵 Adding External API Keys..."
echo "=============================="
add_env_var "SPOTIFY_CLIENT_ID" "2946864dc822469b9c672292ead45f43"
add_env_var "SPOTIFY_CLIENT_SECRET" "feaf0fc901124b839b11e02f97d18a8d" true
add_env_var "NEXT_PUBLIC_SPOTIFY_CLIENT_ID" "2946864dc822469b9c672292ead45f43"
add_env_var "TICKETMASTER_API_KEY" "k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b" true
add_env_var "SETLISTFM_API_KEY" "xkutflW-aRy_Df9rF4OkJyCsHBYN88V37EBL" true
add_env_var "SETLIST_FM_API_KEY" "xkutflW-aRy_Df9rF4OkJyCsHBYN88V37EBL" true

echo ""
echo "🔒 Adding Security Configuration..."
echo "==================================="
add_env_var "CRON_SECRET" "6155002300" true

# Generate a secure NEXTAUTH_SECRET if not provided
NEXTAUTH_SECRET=$(openssl rand -base64 32)
add_env_var "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET" true

echo ""
echo "🌐 Adding Application URLs..."
echo "============================="
echo ""
echo "Please enter your Vercel deployment URL"
echo "(e.g., theset.live or your custom domain)"
read -p "Deployment URL: " DEPLOYMENT_URL

# Clean up the URL (remove protocol if included)
DEPLOYMENT_URL=${DEPLOYMENT_URL#https://}
DEPLOYMENT_URL=${DEPLOYMENT_URL#http://}
DEPLOYMENT_URL=${DEPLOYMENT_URL%/}

FULL_URL="https://$DEPLOYMENT_URL"

add_env_var "NEXT_PUBLIC_URL" "$FULL_URL"
add_env_var "NEXT_PUBLIC_APP_URL" "$FULL_URL"
add_env_var "NEXT_PUBLIC_WEB_URL" "$FULL_URL"
add_env_var "NEXT_PUBLIC_API_URL" "$FULL_URL/api"
add_env_var "NEXTAUTH_URL" "$FULL_URL"
add_env_var "NODE_ENV" "production"
add_env_var "NEXT_PUBLIC_APP_ENV" "production"

echo ""
echo "⚡ Adding Feature Flags..."
echo "========================="
add_env_var "NEXT_PUBLIC_VERCEL_ANALYTICS" "true"
add_env_var "NEXT_PUBLIC_ENABLE_SPOTIFY" "true"
add_env_var "NEXT_PUBLIC_ENABLE_REALTIME" "true"
add_env_var "NEXT_PUBLIC_ENABLE_ANALYTICS" "true"
add_env_var "NEXT_PUBLIC_ENABLE_PUSH_NOTIFICATIONS" "true"
add_env_var "NEXT_PUBLIC_ENABLE_ADVANCED_SEARCH" "true"
add_env_var "NEXT_PUBLIC_ENABLE_USER_GENERATED_CONTENT" "true"
add_env_var "NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING" "true"

echo ""
echo "======================================"
echo "✅ Environment setup complete!"
echo ""
echo "Generated NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
echo "(Save this securely for reference)"
echo ""
echo "Next steps:"
echo "1. Run 'vercel' to deploy your application"
echo "2. Check the deployment logs for any issues"
echo "3. Run 'node scripts/verify-vercel-env.js' to verify setup"
echo ""
echo "To view your environment variables:"
echo "vercel env ls"
echo ""
echo "🚀 Happy deploying!"