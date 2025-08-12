#!/bin/bash

# Deployment script for TheSet
# This script runs all necessary deployment commands with error handling

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log file
LOG_FILE="deployment-$(date +%Y%m%d-%H%M%S).log"
ERROR_COUNT=0

# Function to log messages
log() {
    echo -e "${1}" | tee -a "$LOG_FILE"
}

# Function to run command with error handling
run_command() {
    local cmd="$1"
    local description="$2"
    
    log "${BLUE}>>> ${description}...${NC}"
    log "Command: $cmd"
    
    # Execute command and capture output
    if eval "$cmd" >> "$LOG_FILE" 2>&1; then
        log "${GREEN}✓ ${description} completed successfully${NC}\n"
        return 0
    else
        ERROR_COUNT=$((ERROR_COUNT + 1))
        log "${RED}✗ ${description} failed${NC}"
        log "${YELLOW}  Continuing with next step...${NC}\n"
        return 1
    fi
}

# Start deployment
log "${BLUE}========================================${NC}"
log "${BLUE}Starting TheSet Deployment${NC}"
log "${BLUE}Log file: $LOG_FILE${NC}"
log "${BLUE}========================================${NC}\n"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log "${RED}Error: Not in project root directory${NC}"
    exit 1
fi

# 1. Install dependencies
run_command "pnpm install" "Installing dependencies"

# 2. Generate database types
run_command "pnpm db:generate" "Generating database types"

# 3. Push database schema changes (if any) - Skip interactive prompts for now
log "${YELLOW}Skipping database push - requires manual intervention for table constraints${NC}"

# 4. Build the project
run_command "pnpm build" "Building project"

# 5. Deploy Supabase Edge Functions
log "${BLUE}>>> Deploying Edge Functions...${NC}"

# Deploy each edge function (only deploy functions that exist)
EDGE_FUNCTIONS=(
    "scheduled-sync"
    "sync-artists"
    "sync-setlists"
    "sync-shows"
)

for func in "${EDGE_FUNCTIONS[@]}"; do
    run_command "supabase functions deploy $func --no-verify-jwt" "Deploying $func function"
done

# 6. Set up Edge Function secrets
if [ -f ".env.local" ]; then
    log "${BLUE}>>> Setting Edge Function secrets...${NC}"
    
    # Extract environment variables
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        if [[ ! "$key" =~ ^# ]] && [[ -n "$key" ]]; then
            # Remove quotes from value
            value="${value%\"}"
            value="${value#\"}"
            value="${value%\'}"
            value="${value#\'}"
            
            # Set secret in Supabase
            run_command "supabase secrets set $key=\"$value\" --env-file /dev/null" "Setting secret $key"
        fi
    done < .env.local
else
    log "${YELLOW}Warning: .env.local not found, skipping Edge Function secrets${NC}"
fi

# 7. Set up scheduled functions (cron jobs)
log "${BLUE}>>> Setting up scheduled functions...${NC}"

# Get Supabase project details
if command -v supabase &> /dev/null; then
    PROJECT_REF=$(supabase status 2>/dev/null | grep "API URL" | awk -F'https://' '{print $2}' | awk -F'.supabase.co' '{print $1}')
    ANON_KEY=$(supabase status 2>/dev/null | grep "anon key" | awk '{print $3}')
    
    if [ -n "$PROJECT_REF" ] && [ -n "$ANON_KEY" ]; then
        # Use the existing migration file that has been fixed
        run_command "supabase db push --include-all" "Setting up cron jobs via migrations"
    else
        log "${YELLOW}Warning: Could not get Supabase project details for cron setup${NC}"
    fi
else
    log "${YELLOW}Warning: Supabase CLI not found, skipping cron setup${NC}"
fi

# 8. Run type checking
run_command "pnpm typecheck" "Running type check"

# 9. Run linting
run_command "pnpm lint" "Running linter"

# 10. Run tests
run_command "pnpm test" "Running tests"

# 11. Deploy to Vercel (if configured)
if command -v vercel &> /dev/null; then
    run_command "vercel --prod --yes" "Deploying to Vercel"
else
    log "${YELLOW}Vercel CLI not found, skipping Vercel deployment${NC}"
fi

# Summary
log "\n${BLUE}========================================${NC}"
log "${BLUE}Deployment Summary${NC}"
log "${BLUE}========================================${NC}"

if [ $ERROR_COUNT -eq 0 ]; then
    log "${GREEN}✓ All deployment steps completed successfully!${NC}"
else
    log "${YELLOW}⚠ Deployment completed with $ERROR_COUNT errors${NC}"
    log "${YELLOW}  Check the log file for details: $LOG_FILE${NC}"
fi

log "\n${BLUE}Next steps:${NC}"
log "1. Verify the deployment at your production URL"
log "2. Check Supabase dashboard for Edge Functions status"
log "3. Monitor logs for any runtime errors"
log "4. Test email notifications and sync functions"

# Exit with appropriate code
if [ $ERROR_COUNT -eq 0 ]; then
    exit 0
else
    exit 1
fi