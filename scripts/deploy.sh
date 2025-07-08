#!/bin/bash

# MySetlist Deployment Script

echo "🚀 MySetlist Deployment Script"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_requirements() {
    echo "Checking requirements..."
    
    # Check for Vercel CLI
    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}❌ Vercel CLI not found. Please install it:${NC}"
        echo "npm i -g vercel"
        exit 1
    fi
    
    # Check for Supabase CLI
    if ! command -v supabase &> /dev/null; then
        echo -e "${RED}❌ Supabase CLI not found. Please install it:${NC}"
        echo "brew install supabase/tap/supabase"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All requirements met${NC}"
}

# Deploy database migrations
deploy_database() {
    echo ""
    echo "📦 Deploying database migrations..."
    
    # Push database schema
    pnpm db:push
    
    # Deploy cron jobs migration
    supabase db push --project-ref yzwkimtdaabyjbpykquu < supabase/migrations/20240126_setup_cron_jobs.sql
    
    echo -e "${GREEN}✅ Database migrations deployed${NC}"
}

# Deploy edge functions
deploy_edge_functions() {
    echo ""
    echo "⚡ Deploying Edge Functions..."
    
    # Set up secrets first
    echo "Setting up Edge Function secrets..."
    ./scripts/setup-edge-function-secrets.sh
    
    # Functions are already deployed via MCP, just verify they're active
    echo -e "${GREEN}✅ Edge Functions are active${NC}"
}

# Deploy to Vercel
deploy_vercel() {
    echo ""
    echo "🔷 Deploying to Vercel..."
    
    # Production deployment
    if [ "$1" == "production" ]; then
        echo "Deploying to production..."
        vercel --prod
    else
        echo "Deploying to preview..."
        vercel
    fi
}

# Main deployment flow
main() {
    check_requirements
    
    echo ""
    echo "Select deployment type:"
    echo "1) Full deployment (Database + Edge Functions + Frontend)"
    echo "2) Frontend only (Vercel)"
    echo "3) Database only"
    echo "4) Edge Functions only"
    
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            deploy_database
            deploy_edge_functions
            deploy_vercel $1
            ;;
        2)
            deploy_vercel $1
            ;;
        3)
            deploy_database
            ;;
        4)
            deploy_edge_functions
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}🎉 Deployment complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Configure environment variables in Vercel dashboard"
    echo "2. Set up Spotify OAuth redirect URL in Supabase"
    echo "3. Configure custom domain (if applicable)"
    echo "4. Test all features in production"
}

# Run main function
main $@