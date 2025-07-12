#!/bin/bash

# MySetlist CI/CD Setup Script
# Helps configure GitHub repository secrets and validate CI/CD pipeline setup

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_OWNER=""
REPO_NAME=""
GITHUB_TOKEN=""

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[ℹ]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1 ${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Function to check if required tools are installed
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_tools=()
    
    if ! command -v gh &> /dev/null; then
        missing_tools+=("gh (GitHub CLI)")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_tools+=("jq")
    fi
    
    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi
    
    if [ ${#missing_tools[@]} -eq 0 ]; then
        print_status "All required tools are installed"
    else
        print_error "Missing required tools: ${missing_tools[*]}"
        echo ""
        echo "Please install the missing tools:"
        echo "  - GitHub CLI: https://cli.github.com/"
        echo "  - jq: https://stedolan.github.io/jq/"
        echo "  - curl: usually pre-installed"
        exit 1
    fi
    
    # Check GitHub authentication
    if gh auth status &> /dev/null; then
        print_status "GitHub CLI authenticated"
        REPO_INFO=$(gh repo view --json owner,name)
        REPO_OWNER=$(echo "$REPO_INFO" | jq -r '.owner.login')
        REPO_NAME=$(echo "$REPO_INFO" | jq -r '.name')
        print_info "Repository: $REPO_OWNER/$REPO_NAME"
    else
        print_error "GitHub CLI not authenticated"
        echo "Please run: gh auth login"
        exit 1
    fi
}

# Function to check if secret exists
secret_exists() {
    local secret_name="$1"
    gh secret list | grep -q "^$secret_name"
}

# Function to set repository secret
set_secret() {
    local secret_name="$1"
    local secret_description="$2"
    local is_required="$3"
    
    if secret_exists "$secret_name"; then
        print_info "$secret_name already exists"
        read -p "Update $secret_name? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 0
        fi
    fi
    
    echo ""
    print_info "Setting up: $secret_name"
    echo "Description: $secret_description"
    
    if [ "$is_required" = "true" ]; then
        echo -e "${RED}Required for CI/CD pipeline${NC}"
    else
        echo -e "${YELLOW}Optional (some features may not work)${NC}"
    fi
    
    read -p "Enter value for $secret_name (or press Enter to skip): " -s secret_value
    echo
    
    if [ -n "$secret_value" ]; then
        if echo "$secret_value" | gh secret set "$secret_name"; then
            print_status "$secret_name set successfully"
        else
            print_error "Failed to set $secret_name"
        fi
    else
        if [ "$is_required" = "true" ]; then
            print_warning "$secret_name skipped but is required for CI/CD"
        else
            print_info "$secret_name skipped"
        fi
    fi
}

# Function to configure repository secrets
configure_secrets() {
    print_header "Configuring Repository Secrets"
    
    echo "This will help you set up the required secrets for the CI/CD pipeline."
    echo "You can skip optional secrets, but some features may not work."
    echo ""
    
    # Vercel secrets (required)
    set_secret "VERCEL_TOKEN" "Vercel deployment token from vercel.com/account/tokens" "true"
    set_secret "VERCEL_ORG_ID" "Vercel organization ID from project settings" "true" 
    set_secret "VERCEL_PROJECT_ID" "Vercel project ID from project settings" "true"
    
    # Database secrets (required)
    set_secret "DATABASE_URL" "Production database connection string" "true"
    set_secret "TEST_DATABASE_URL" "Test database connection string" "false"
    
    # Supabase secrets (required)
    set_secret "NEXT_PUBLIC_SUPABASE_URL" "Supabase project URL" "true"
    set_secret "NEXT_PUBLIC_SUPABASE_ANON_KEY" "Supabase anonymous key" "true"
    set_secret "SUPABASE_SERVICE_ROLE_KEY" "Supabase service role key" "true"
    
    # External API secrets (optional)
    set_secret "SPOTIFY_CLIENT_ID" "Spotify API client ID" "false"
    set_secret "SPOTIFY_CLIENT_SECRET" "Spotify API client secret" "false"
    set_secret "TICKETMASTER_API_KEY" "Ticketmaster API key" "false"
    set_secret "SETLISTFM_API_KEY" "Setlist.fm API key" "false"
    
    # Monitoring secrets (optional)
    set_secret "SENTRY_AUTH_TOKEN" "Sentry authentication token" "false"
    set_secret "SLACK_WEBHOOK_URL" "Slack webhook URL for notifications" "false"
    set_secret "CODECOV_TOKEN" "Codecov token for coverage reports" "false"
    
    # Performance secrets (optional)
    set_secret "TURBO_TOKEN" "Turborepo token for caching" "false"
    
    print_status "Secret configuration completed"
}

# Function to configure repository variables
configure_variables() {
    print_header "Configuring Repository Variables"
    
    echo "Setting up repository variables..."
    
    # Check if TURBO_TEAM variable exists
    if gh variable list | grep -q "^TURBO_TEAM"; then
        print_info "TURBO_TEAM already exists"
    else
        read -p "Enter Turbo team name (optional): " turbo_team
        if [ -n "$turbo_team" ]; then
            if echo "$turbo_team" | gh variable set TURBO_TEAM; then
                print_status "TURBO_TEAM set successfully"
            else
                print_error "Failed to set TURBO_TEAM"
            fi
        else
            print_info "TURBO_TEAM skipped"
        fi
    fi
}

# Function to setup branch protection
setup_branch_protection() {
    print_header "Setting Up Branch Protection"
    
    echo "This will configure branch protection rules for main and production branches."
    read -p "Setup branch protection rules? (Y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        print_info "Branch protection setup skipped"
        return 0
    fi
    
    print_info "Triggering branch protection setup workflow..."
    
    if gh workflow run setup-branch-protection.yml --field apply_changes=true; then
        print_status "Branch protection setup workflow triggered"
        print_info "Check the Actions tab to monitor progress"
    else
        print_error "Failed to trigger branch protection setup"
    fi
}

# Function to validate CI/CD setup
validate_setup() {
    print_header "Validating CI/CD Setup"
    
    local validation_passed=true
    
    # Check required secrets
    print_info "Checking required secrets..."
    
    local required_secrets=(
        "VERCEL_TOKEN"
        "VERCEL_ORG_ID" 
        "VERCEL_PROJECT_ID"
        "DATABASE_URL"
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
    )
    
    for secret in "${required_secrets[@]}"; do
        if secret_exists "$secret"; then
            print_status "$secret configured"
        else
            print_error "$secret missing (required)"
            validation_passed=false
        fi
    done
    
    # Check workflows exist
    print_info "Checking workflow files..."
    
    local workflows=(
        ".github/workflows/ci-cd-production.yml"
        ".github/workflows/pr-validation.yml"
        ".github/workflows/hotfix-deployment.yml"
        ".github/workflows/scheduled-maintenance.yml"
    )
    
    for workflow in "${workflows[@]}"; do
        if [ -f "$workflow" ]; then
            print_status "$(basename "$workflow") exists"
        else
            print_error "$(basename "$workflow") missing"
            validation_passed=false
        fi
    done
    
    # Check Lighthouse config
    if [ -f ".lighthouserc.json" ]; then
        print_status "Lighthouse configuration exists"
    else
        print_warning "Lighthouse configuration missing"
    fi
    
    # Check if repository has required permissions
    print_info "Checking repository permissions..."
    
    REPO_PERMISSIONS=$(gh api repos/$REPO_OWNER/$REPO_NAME --jq '.permissions')
    if echo "$REPO_PERMISSIONS" | jq -e '.admin == true' > /dev/null; then
        print_status "Admin permissions confirmed"
    else
        print_warning "Admin permissions may be required for full setup"
    fi
    
    echo ""
    if [ "$validation_passed" = true ]; then
        print_status "CI/CD setup validation passed!"
        echo ""
        echo "Next steps:"
        echo "1. Create a test pull request to validate the pipeline"
        echo "2. Check the Actions tab for workflow runs"
        echo "3. Review the deployment guide: DEPLOYMENT-PIPELINE-GUIDE.md"
    else
        print_error "CI/CD setup validation failed"
        echo ""
        echo "Please address the missing components and run this script again."
    fi
}

# Function to create test PR
create_test_pr() {
    print_header "Creating Test Pull Request"
    
    read -p "Create a test PR to validate the CI/CD pipeline? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Test PR creation skipped"
        return 0
    fi
    
    # Create test branch
    local test_branch="test/ci-cd-validation-$(date +%s)"
    
    print_info "Creating test branch: $test_branch"
    git checkout -b "$test_branch"
    
    # Create a small test change
    echo "# CI/CD Pipeline Test" > CI_CD_TEST.md
    echo "" >> CI_CD_TEST.md
    echo "This file was created to test the CI/CD pipeline." >> CI_CD_TEST.md
    echo "Created at: $(date)" >> CI_CD_TEST.md
    
    git add CI_CD_TEST.md
    git commit -m "test: add CI/CD pipeline validation file"
    git push origin "$test_branch"
    
    # Create pull request
    if gh pr create --title "Test: CI/CD Pipeline Validation" --body "This PR tests the CI/CD pipeline setup. It should trigger all validation workflows and create a preview deployment."; then
        print_status "Test PR created successfully"
        print_info "Check the PR for validation results and preview deployment"
        print_info "You can close and delete this PR once validation is complete"
    else
        print_error "Failed to create test PR"
    fi
}

# Function to display summary and next steps
display_summary() {
    print_header "Setup Complete"
    
    echo "🎉 CI/CD pipeline setup completed!"
    echo ""
    echo "📋 Summary:"
    echo "  ✅ Prerequisites checked"
    echo "  ✅ Repository secrets configured"
    echo "  ✅ Repository variables set"
    echo "  ✅ Branch protection setup initiated"
    echo "  ✅ Setup validation completed"
    echo ""
    echo "📚 Documentation:"
    echo "  • CI/CD Pipeline Guide: .github/README.md"
    echo "  • Deployment Guide: DEPLOYMENT-PIPELINE-GUIDE.md"
    echo "  • Operational Runbooks: infrastructure/operational-runbooks.md"
    echo ""
    echo "🚀 Next Steps:"
    echo "  1. Check the Actions tab for running workflows"
    echo "  2. Review and merge the test PR (if created)"
    echo "  3. Set up monitoring dashboards"
    echo "  4. Train team on deployment procedures"
    echo ""
    echo "🆘 Support:"
    echo "  • Issues: Create GitHub issue in repository"
    echo "  • Documentation: Check .github/README.md"
    echo "  • Emergency: Follow procedures in DEPLOYMENT-PIPELINE-GUIDE.md"
    echo ""
    print_status "Setup script completed successfully!"
}

# Main execution
main() {
    print_header "MySetlist CI/CD Pipeline Setup"
    
    echo "This script will help you configure the CI/CD pipeline for MySetlist."
    echo "It will set up repository secrets, configure branch protection, and validate the setup."
    echo ""
    
    read -p "Continue with CI/CD setup? (Y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
    
    check_prerequisites
    configure_secrets
    configure_variables
    setup_branch_protection
    validate_setup
    create_test_pr
    display_summary
}

# Handle script interruption
trap 'echo -e "\n${RED}Setup interrupted.${NC} Run script again to continue."; exit 1' INT TERM

# Run main function
main "$@"