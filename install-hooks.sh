#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Installing Claude Code Hooks for TheSet${NC}"
echo "================================================"

# Get project root
PROJECT_ROOT=$(pwd)
PROJECT_NAME=$(basename "$PROJECT_ROOT")

# Check if we're in the right place
if [[ ! -f "pnpm-workspace.yaml" ]]; then
  echo -e "${YELLOW}⚠️  Warning: No pnpm-workspace.yaml found.${NC}"
  echo "Are you in the mysetlist-s4 root directory?"
  read -p "Continue anyway? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Create directories
echo -e "${BLUE}📁 Creating directories...${NC}"
mkdir -p ~/.claude/hooks
mkdir -p ~/.claude/commands

# ============================================
# CREATE HOOK FILES
# ============================================

echo -e "${BLUE}📝 Creating hook files...${NC}"

# 1. Common Helpers
cat > ~/.claude/hooks/common-helpers.sh << 'EOF'
#!/usr/bin/env bash

# Color codes for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export MAGENTA='\033[0;35m'
export CYAN='\033[0;36m'
export NC='\033[0m' # No Color

# Debug logging
debug_log() {
  if [[ "${CLAUDE_HOOKS_DEBUG:-0}" == "1" ]]; then
    echo -e "${CYAN}[DEBUG]${NC} $*" >&2
  fi
}

# Info logging
info_log() {
  echo -e "${BLUE}[INFO]${NC} $*" >&2
}

# Success logging
success_log() {
  echo -e "${GREEN}✅ $*${NC}" >&2
}

# Error logging
error_log() {
  echo -e "${RED}❌ $*${NC}" >&2
}

# Warning logging
warn_log() {
  echo -e "${YELLOW}⚠️  $*${NC}" >&2
}

# Find project root by searching upward for markers
find_project_root() {
  local dir="${1:-$(pwd)}"
  
  while [[ "$dir" != "/" ]]; do
    # Check for project markers
    if [[ -f "$dir/pnpm-workspace.yaml" ]] || \
       [[ -f "$dir/package.json" ]] || \
       [[ -f "$dir/Makefile" ]] || \
       [[ -d "$dir/.git" ]]; then
      echo "$dir"
      return 0
    fi
    dir=$(dirname "$dir")
  done
  
  echo "$(pwd)"
}

# Detect project type
detect_project_type() {
  local root="$1"
  
  if [[ -f "$root/pnpm-workspace.yaml" ]]; then
    echo "pnpm-monorepo"
  elif [[ -f "$root/yarn.lock" ]] && [[ -f "$root/package.json" ]]; then
    echo "yarn"
  elif [[ -f "$root/package-lock.json" ]] && [[ -f "$root/package.json" ]]; then
    echo "npm"
  elif [[ -f "$root/package.json" ]]; then
    echo "node"
  elif [[ -f "$root/go.mod" ]]; then
    echo "go"
  elif [[ -f "$root/Cargo.toml" ]]; then
    echo "rust"
  elif [[ -f "$root/pyproject.toml" ]] || [[ -f "$root/setup.py" ]]; then
    echo "python"
  else
    echo "unknown"
  fi
}

# Load configuration files
load_config() {
  local root="$1"
  
  # Load global config
  if [[ -f "$HOME/.claude-hooks-config.sh" ]]; then
    debug_log "Loading global config"
    source "$HOME/.claude-hooks-config.sh"
  fi
  
  # Load project config (overrides global)
  if [[ -f "$root/.claude-hooks-config.sh" ]]; then
    debug_log "Loading project config from $root"
    source "$root/.claude-hooks-config.sh"
  fi
}

# Check if file should be ignored
should_ignore() {
  local file="$1"
  local root="$2"
  
  # Check .claude-hooks-ignore file
  if [[ -f "$root/.claude-hooks-ignore" ]]; then
    while IFS= read -r pattern; do
      [[ -z "$pattern" ]] && continue
      [[ "$pattern" =~ ^# ]] && continue
      
      if [[ "$file" == *"$pattern"* ]]; then
        debug_log "File ignored by pattern: $pattern"
        return 0
      fi
    done < "$root/.claude-hooks-ignore"
  fi
  
  # Default ignores
  local default_ignores=(
    "node_modules/"
    ".next/"
    "dist/"
    "build/"
    ".git/"
    "*.min.js"
    "*.map"
  )
  
  for pattern in "${default_ignores[@]}"; do
    if [[ "$file" == *"$pattern"* ]]; then
      debug_log "File ignored by default pattern: $pattern"
      return 0
    fi
  done
  
  return 1
}

# Find which package a file belongs to in a monorepo
find_package_for_file() {
  local file="$1"
  local root="$2"
  
  # For pnpm monorepo, usually apps/* or packages/*
  if [[ "$file" =~ ^apps/([^/]+)/ ]]; then
    echo "apps/${BASH_REMATCH[1]}"
  elif [[ "$file" =~ ^packages/([^/]+)/ ]]; then
    echo "packages/${BASH_REMATCH[1]}"
  else
    echo "."
  fi
}

# Check if Makefile exists and has target
has_make_target() {
  local target="$1"
  local root="${2:-$(pwd)}"
  
  if [[ -f "$root/Makefile" ]] || [[ -f "$root/makefile" ]]; then
    make -n "$target" &>/dev/null
    return $?
  fi
  
  return 1
}

# Check if npm/pnpm script exists
has_npm_script() {
  local script="$1"
  local root="${2:-$(pwd)}"
  
  if [[ -f "$root/package.json" ]]; then
    grep -q "\"$script\"" "$root/package.json"
    return $?
  fi
  
  return 1
}
EOF

# 2. Smart Lint Hook
cat > ~/.claude/hooks/smart-lint.sh << 'EOF'
#!/usr/bin/env bash

# Source common helpers
HOOKS_DIR="$(dirname "$0")"
source "$HOOKS_DIR/common-helpers.sh"

# Parse Claude input
input_json=$(cat)
tool_name=$(echo "$input_json" | jq -r '.tool_name // ""')
tool_input=$(echo "$input_json" | jq -r '.tool_input // {}')

# Extract file paths based on tool type
file_paths=""
if [[ "$tool_name" == "Edit" ]] || [[ "$tool_name" == "Write" ]]; then
  file_paths=$(echo "$tool_input" | jq -r '.file_path // ""')
elif [[ "$tool_name" == "MultiEdit" ]]; then
  file_paths=$(echo "$tool_input" | jq -r '.edits[]?.file_path // ""' | tr '\n' ' ')
fi

[[ -z "$file_paths" ]] && exit 0

# Use first file to determine context
first_file=$(echo "$file_paths" | awk '{print $1}')
[[ -z "$first_file" ]] && exit 0

# Find project root and load configuration
PROJECT_ROOT=$(find_project_root "$(dirname "$first_file")")
PROJECT_TYPE=$(detect_project_type "$PROJECT_ROOT")
load_config "$PROJECT_ROOT"

# Check if hooks are enabled
if [[ "${CLAUDE_HOOKS_ENABLED:-true}" == "false" ]]; then
  debug_log "Hooks disabled by configuration"
  exit 0
fi

# Check if linting is enabled
if [[ "${CLAUDE_HOOKS_LINT_ENABLED:-true}" == "false" ]]; then
  debug_log "Linting disabled by configuration"
  exit 0
fi

echo -e "${BLUE}🔍 Style Check${NC} - Validating code formatting..." >&2
echo "────────────────────────────────────────────" >&2
info_log "Project type: $PROJECT_TYPE"
info_log "Project root: $PROJECT_ROOT"
debug_log "Files to check: $file_paths"

cd "$PROJECT_ROOT" || exit 1

# Initialize status
lint_failed=false
format_failed=false

# Process each file
for file in $file_paths; do
  # Skip if file should be ignored
  if should_ignore "$file" "$PROJECT_ROOT"; then
    info_log "Skipping ignored file: $file"
    continue
  fi
  
  info_log "Checking: $file"
  
  # Run appropriate linter based on project type
  case "$PROJECT_TYPE" in
    "pnpm-monorepo")
      package_dir=$(find_package_for_file "$file" "$PROJECT_ROOT")
      
      if [[ -n "$package_dir" ]] && [[ "$package_dir" != "." ]]; then
        debug_log "File belongs to package: $package_dir"
        
        # Try Makefile first
        if has_make_target "lint" "$PROJECT_ROOT"; then
          info_log "Using make lint for $file"
          if ! make lint FILE="$file" 2>&1; then
            lint_failed=true
          fi
        # Then try pnpm scripts
        elif has_npm_script "lint" "$PROJECT_ROOT/$package_dir"; then
          info_log "Using pnpm lint for $package_dir"
          if ! pnpm --filter "$package_dir" lint 2>&1; then
            lint_failed=true
          fi
        fi
        
        # Check formatting
        if has_npm_script "format:check" "$PROJECT_ROOT/$package_dir"; then
          if ! pnpm --filter "$package_dir" format:check 2>&1; then
            format_failed=true
          fi
        fi
      fi
      ;;
      
    "node"|"npm"|"yarn")
      if has_make_target "lint"; then
        if ! make lint FILE="$file" 2>&1; then
          lint_failed=true
        fi
      elif has_npm_script "lint"; then
        if ! npm run lint -- "$file" 2>&1; then
          lint_failed=true
        fi
      fi
      ;;
      
    *)
      debug_log "No project-specific linting for type: $PROJECT_TYPE"
      ;;
  esac
done

# Report results
echo "────────────────────────────────────────────" >&2
if [[ "$lint_failed" == "true" ]] || [[ "$format_failed" == "true" ]]; then
  error_log "Style check failed!"
  
  if [[ "$lint_failed" == "true" ]]; then
    error_log "Fix linting errors above"
  fi
  
  if [[ "$format_failed" == "true" ]]; then
    warn_log "Formatting issues detected"
    info_log "Run: pnpm format"
  fi
  
  echo -e "${RED}═══════════════════════════════════════════${NC}" >&2
  echo -e "${RED}❌ ALL ISSUES ARE BLOCKING ❌${NC}" >&2
  echo -e "${RED}═══════════════════════════════════════════${NC}" >&2
  exit 2
else
  success_log "All style checks passed!"
fi

exit 0
EOF

# 3. Smart Test Hook
cat > ~/.claude/hooks/smart-test.sh << 'EOF'
#!/usr/bin/env bash

# Source common helpers
HOOKS_DIR="$(dirname "$0")"
source "$HOOKS_DIR/common-helpers.sh"

# Parse Claude input
input_json=$(cat)
tool_name=$(echo "$input_json" | jq -r '.tool_name // ""')
tool_input=$(echo "$input_json" | jq -r '.tool_input // {}')

# Extract file paths
file_paths=""
if [[ "$tool_name" == "Edit" ]] || [[ "$tool_name" == "Write" ]]; then
  file_paths=$(echo "$tool_input" | jq -r '.file_path // ""')
elif [[ "$tool_name" == "MultiEdit" ]]; then
  file_paths=$(echo "$tool_input" | jq -r '.edits[]?.file_path // ""' | tr '\n' ' ')
fi

[[ -z "$file_paths" ]] && exit 0

# Filter for testable files
testable_files=""
for file in $file_paths; do
  if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]] && [[ ! "$file" =~ \.(test|spec)\. ]]; then
    testable_files="$testable_files $file"
  fi
done

[[ -z "$testable_files" ]] && exit 0

# Setup
first_file=$(echo "$testable_files" | awk '{print $1}')
PROJECT_ROOT=$(find_project_root "$(dirname "$first_file")")
PROJECT_TYPE=$(detect_project_type "$PROJECT_ROOT")
load_config "$PROJECT_ROOT"

# Check if testing is enabled
if [[ "${CLAUDE_HOOKS_TEST_ENABLED:-true}" == "false" ]]; then
  debug_log "Testing disabled by configuration"
  exit 0
fi

echo -e "${BLUE}🧪 Running Tests${NC} - Validating changes..." >&2
echo "────────────────────────────────────────────" >&2
info_log "Project type: $PROJECT_TYPE"

cd "$PROJECT_ROOT" || exit 1

test_failed=false

for file in $testable_files; do
  # Skip ignored files
  if should_ignore "$file" "$PROJECT_ROOT"; then
    continue
  fi
  
  # Look for test files
  test_file=""
  base_name="${file%.*}"
  ext="${file##*.}"
  
  # Check for various test file patterns
  for pattern in ".test.$ext" ".spec.$ext" "_test.$ext" "_spec.$ext"; do
    potential_test="${base_name}${pattern}"
    if [[ -f "$potential_test" ]]; then
      test_file="$potential_test"
      break
    fi
  done
  
  # Also check in __tests__ directory
  if [[ -z "$test_file" ]]; then
    test_dir="$(dirname "$file")/__tests__/$(basename "$file")"
    if [[ -f "$test_dir" ]]; then
      test_file="$test_dir"
    fi
  fi
  
  if [[ -n "$test_file" ]]; then
    info_log "Found test: $test_file"
    
    package_dir=$(find_package_for_file "$file" "$PROJECT_ROOT")
    
    # Run tests
    if has_make_target "test"; then
      if ! make test FILE="$test_file" 2>&1; then
        test_failed=true
      fi
    elif [[ -n "$package_dir" ]] && has_npm_script "test" "$PROJECT_ROOT/$package_dir"; then
      if ! pnpm --filter "$package_dir" test -- "$test_file" 2>&1; then
        test_failed=true
      fi
    fi
  else
    debug_log "No test file found for: $file"
  fi
done

# Report results
echo "────────────────────────────────────────────" >&2
if [[ "$test_failed" == "true" ]]; then
  error_log "Tests failed! Fix failing tests before continuing."
  exit 2
else
  success_log "All tests passed!"
fi

exit 0
EOF

# 4. Status Line Hook
cat > ~/.claude/hooks/statusline.sh << 'EOF'
#!/usr/bin/env bash

# Get current directory name
dir_name=$(basename "$(pwd)")

# Git information
if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
  branch=$(git branch --show-current 2>/dev/null || echo "detached")
  
  # Count changes
  staged=$(git diff --cached --numstat 2>/dev/null | wc -l | tr -d ' ')
  unstaged=$(git diff --numstat 2>/dev/null | wc -l | tr -d ' ')
  untracked=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
  
  # Build status
  status="📁 $dir_name | 🌿 $branch"
  
  if [[ $staged -gt 0 ]] || [[ $unstaged -gt 0 ]] || [[ $untracked -gt 0 ]]; then
    status="$status |"
    [[ $staged -gt 0 ]] && status="$status +$staged"
    [[ $unstaged -gt 0 ]] && status="$status ~$unstaged"
    [[ $untracked -gt 0 ]] && status="$status ?$untracked"
  fi
  
  # Add project type indicator
  if [[ -f "pnpm-workspace.yaml" ]]; then
    status="$status | 📦 pnpm"
  elif [[ -f "package.json" ]]; then
    status="$status | 📦 npm"
  fi
  
  echo "$status"
else
  echo "📁 $dir_name"
fi
EOF

# 5. Notification Hook
cat > ~/.claude/hooks/ntfy-notifier.sh << 'EOF'
#!/usr/bin/env bash

# Parse input for session info
input_json=$(cat)
session_id="${CLAUDE_SESSION_ID:-unknown}"

# Create notification message
message="Claude Code session completed"

# Add session duration if available
if [[ -n "${CLAUDE_SESSION_DURATION}" ]]; then
  duration_min=$((CLAUDE_SESSION_DURATION / 60))
  if [[ $duration_min -gt 0 ]]; then
    message="$message after ${duration_min} minutes"
  fi
fi

# Try different notification methods
notify_sent=false

# macOS notification
if command -v osascript >/dev/null 2>&1 && [[ "$OSTYPE" == "darwin"* ]]; then
  osascript -e "display notification \"$message\" with title \"Claude Code\" sound name \"Glass\""
  notify_sent=true
fi

# Linux desktop notification
if [[ "$notify_sent" == "false" ]] && command -v notify-send >/dev/null 2>&1; then
  notify-send -i terminal "Claude Code" "$message"
  notify_sent=true
fi

# ntfy.sh service (if configured)
if [[ "$notify_sent" == "false" ]] && command -v curl >/dev/null 2>&1 && [[ -n "${NTFY_TOPIC}" ]]; then
  curl -s -X POST "https://ntfy.sh/${NTFY_TOPIC}" \
    -H "Title: Claude Code" \
    -d "$message" >/dev/null 2>&1
  notify_sent=true
fi

exit 0
EOF

# 6. Session Start Hook
cat > ~/.claude/hooks/session-start.sh << 'EOF'
#!/usr/bin/env bash

# Find project root
PROJECT_ROOT=$(pwd)
while [[ "$PROJECT_ROOT" != "/" ]]; do
  if [[ -f "$PROJECT_ROOT/.git/config" ]] || [[ -f "$PROJECT_ROOT/package.json" ]]; then
    break
  fi
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

echo "🎵 TheSet Development Session Started"
echo "========================================"
echo ""

# Show git status
if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
  echo "📊 Git Status:"
  git status --short --branch
  echo ""
fi

# Show recent commits
if command -v git >/dev/null 2>&1; then
  echo "📝 Recent Commits:"
  git log --oneline -5 2>/dev/null || echo "No commits yet"
  echo ""
fi

# Check for TODO comments
echo "📋 TODOs in codebase:"
grep -r "TODO\|FIXME\|HACK" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | head -5 || echo "No TODOs found"
echo ""

# Show available commands
echo "🛠️  Available Commands:"
echo "  pnpm dev       - Start development server"
echo "  pnpm build     - Build for production"
echo "  pnpm test      - Run tests"
echo "  pnpm lint      - Run linter"
echo "  pnpm format    - Format code"
echo "  pnpm db:push   - Push database schema"
echo ""

# Show environment status
echo "⚙️  Environment:"
if [[ -f ".env.local" ]]; then
  echo "  ✅ .env.local found"
else
  echo "  ⚠️  No .env.local file"
fi

if command -v pnpm >/dev/null 2>&1; then
  echo "  ✅ pnpm $(pnpm --version)"
else
  echo "  ❌ pnpm not found"
fi

if command -v node >/dev/null 2>&1; then
  echo "  ✅ node $(node --version)"
else
  echo "  ❌ node not found"
fi

echo ""
echo "Ready to code! 🚀"
EOF

# Make all hooks executable
chmod +x ~/.claude/hooks/*.sh

# ============================================
# CREATE SETTINGS.JSON
# ============================================

echo -e "${BLUE}⚙️  Creating Claude settings...${NC}"

cat > ~/.claude/settings.json << 'EOF'
{
  "env": {
    "BASH_DEFAULT_TIMEOUT_MS": "300000",
    "BASH_MAX_TIMEOUT_MS": "600000"
  },
  "statusLine": {
    "type": "command",
    "command": "~/.claude/hooks/statusline.sh",
    "padding": 0
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/session-start.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/smart-lint.sh",
            "timeout": 30
          },
          {
            "type": "command",
            "command": "~/.claude/hooks/smart-test.sh",
            "timeout": 60
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/ntfy-notifier.sh"
          }
        ]
      }
    ]
  }
}
EOF

# ============================================
# CREATE CUSTOM COMMANDS
# ============================================

echo -e "${BLUE}📝 Creating custom commands...${NC}"

# Test API Command
cat > ~/.claude/commands/test-api.md << 'EOF'
# Test API Integration

Test the specified API integration: $ARGUMENTS

Steps:
1. Check environment variables are configured
2. Create test file if it doesn't exist
3. Run integration tests for the specified API
4. Verify response schemas match expectations
5. Test error handling and edge cases
6. Check rate limiting compliance

For TheSet APIs:
- Spotify: Test artist search, artist details, top tracks
- Ticketmaster: Test event search, venue details
- Setlist.fm: Test setlist retrieval, artist setlists
- Supabase: Test database connections, realtime subscriptions

Ensure all API keys are present in .env.local
EOF

# Deploy Check Command
cat > ~/.claude/commands/deploy-check.md << 'EOF'
# Pre-deployment Checklist

Run comprehensive checks before deployment:

## Required Checks
1. **Tests**: Run `pnpm test` and ensure all pass
2. **Type Check**: Run `pnpm type-check` for TypeScript errors
3. **Build**: Run `pnpm build` and verify success
4. **Bundle Size**: Run `pnpm analyze` and check size limits
5. **Lint**: Run `pnpm lint` and fix any issues

## Database Checks
- Verify migrations are up to date: `pnpm db:push --dry-run`
- Check for pending migrations
- Validate Edge Functions compile

## Environment
- Verify all required env variables are set
- Check API keys are valid (not expired)
- Ensure production URLs are configured

## Security
- No hardcoded secrets in code
- API routes have proper authentication
- CORS settings are correct

Report any issues found with severity level.
EOF

# Fix Performance Command
cat > ~/.claude/commands/fix-perf.md << 'EOF'
# Fix Performance Issues

Analyze and fix performance issues in: $ARGUMENTS

Steps:
1. Run Lighthouse audit if it's a page component
2. Check for unnecessary re-renders
3. Analyze bundle size impact
4. Look for missing memoization
5. Check for large dependencies
6. Optimize images and assets
7. Add lazy loading where appropriate
8. Check for memory leaks
9. Optimize database queries
10. Add appropriate caching

Tools to use:
- `pnpm analyze` - Bundle analysis
- React DevTools Profiler
- Chrome DevTools Performance tab
EOF

# Create Component Command
cat > ~/.claude/commands/create-component.md << 'EOF'
# Create New Component

Create a new React component: $ARGUMENTS

Requirements:
1. Use TypeScript with proper types
2. Follow project naming conventions
3. Create the component file
4. Add Storybook story if in design-system
5. Create test file with basic tests
6. Export from package index if needed
7. Use existing design system components
8. Follow accessibility best practices
9. Add proper props documentation
10. Make it responsive by default

Component structure:
- Functional component with hooks
- Props interface clearly defined
- JSDoc comments for complex props
- Error boundaries where appropriate
- Loading and error states handled
EOF

# Database Migration Command
cat > ~/.claude/commands/db-migration.md << 'EOF'
# Create Database Migration

Create a new database migration for: $ARGUMENTS

Steps:
1. Analyze the required schema changes
2. Create migration SQL in supabase/migrations/
3. Name with timestamp: `YYYYMMDDHHMMSS_description.sql`
4. Include both up and down migrations if reversible
5. Test locally with `supabase db reset`
6. Update TypeScript types if needed
7. Document any breaking changes
8. Update seed data if required

Consider:
- Index requirements for new columns
- Data migration for existing records
- Performance impact of migrations
- Backward compatibility
EOF

# ============================================
# CREATE PROJECT FILES
# ============================================

echo -e "${BLUE}📁 Creating project files...${NC}"

# Create Makefile in project root
cat > "$PROJECT_ROOT/Makefile" << 'EOF'
# Makefile for TheSet pnpm monorepo
.PHONY: help lint format test build dev clean

help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

lint: ## Run linting (optionally for specific file with FILE=path/to/file)
	@if [ -n "$(FILE)" ]; then \
		package=$$(echo $(FILE) | sed 's|/.*||'); \
		if [ -d "$$package" ]; then \
			echo "Linting package: $$package"; \
			pnpm --filter "./$$package" lint; \
		else \
			echo "Linting all packages"; \
			pnpm lint; \
		fi; \
	else \
		pnpm lint; \
	fi

format: ## Format code (optionally for specific file with FILE=path/to/file)
	@if [ -n "$(FILE)" ]; then \
		package=$$(echo $(FILE) | sed 's|/.*||'); \
		if [ -d "$$package" ]; then \
			echo "Formatting package: $$package"; \
			pnpm --filter "./$$package" format; \
		else \
			echo "Formatting all packages"; \
			pnpm format; \
		fi; \
	else \
		pnpm format; \
	fi

test: ## Run tests (optionally for specific file with FILE=path/to/file)
	@if [ -n "$(FILE)" ]; then \
		package=$$(echo $(FILE) | sed 's|/.*||'); \
		if [ -d "$$package" ]; then \
			echo "Testing package: $$package"; \
			pnpm --filter "./$$package" test; \
		else \
			echo "Running all tests"; \
			pnpm test; \
		fi; \
	else \
		pnpm test; \
	fi

build: ## Build all packages
	pnpm build

dev: ## Start development server
	pnpm dev

clean: ## Clean build artifacts
	rm -rf apps/*/dist apps/*/.next packages/*/dist
	pnpm clean

check: lint test ## Run lint and test
EOF

# Create project hook configuration
cat > "$PROJECT_ROOT/.claude-hooks-config.sh" << 'EOF'
#!/usr/bin/env bash

# TheSet Claude Hooks Configuration
# This file customizes hook behavior for this project

# Enable/disable hooks
CLAUDE_HOOKS_ENABLED=true
CLAUDE_HOOKS_DEBUG=0  # Set to 1 for verbose output

# Enable specific hook types
CLAUDE_HOOKS_LINT_ENABLED=true
CLAUDE_HOOKS_TEST_ENABLED=true
CLAUDE_HOOKS_FORMAT_ENABLED=true

# Use project commands (Makefile/package.json scripts)
CLAUDE_HOOKS_USE_PROJECT_COMMANDS=true

# Timeouts (in seconds)
CLAUDE_HOOKS_LINT_TIMEOUT=30
CLAUDE_HOOKS_TEST_TIMEOUT=60
CLAUDE_HOOKS_FORMAT_TIMEOUT=20

# Test configuration
CLAUDE_HOOKS_TEST_ON_SAVE=true
CLAUDE_HOOKS_TEST_RELATED_ONLY=true  # Only run tests for changed files

# Notifications
NTFY_TOPIC=""  # Set to your ntfy.sh topic for notifications

# Performance thresholds
CLAUDE_HOOKS_BUNDLE_SIZE_LIMIT=500  # KB
CLAUDE_HOOKS_TEST_COVERAGE_THRESHOLD=70  # Percentage

# Supabase specific
CLAUDE_HOOKS_CHECK_MIGRATIONS=true
CLAUDE_HOOKS_VALIDATE_EDGE_FUNCTIONS=true

# Project-specific patterns to always ignore
CLAUDE_HOOKS_EXTRA_IGNORE_PATTERNS="
*.generated.ts
*.generated.js
supabase/.temp/
"
EOF

# Create ignore file
cat > "$PROJECT_ROOT/.claude-hooks-ignore" << 'EOF'
# Files and patterns to ignore for Claude hooks
# One pattern per line, supports wildcards

# Dependencies
node_modules/
.pnpm-store/

# Build outputs
.next/
dist/
build/
out/

# Generated files
*.generated.ts
*.generated.js
*.d.ts
tsconfig.tsbuildinfo

# Minified files
*.min.js
*.min.css

# Source maps
*.map

# Test coverage
coverage/
.nyc_output/

# Temporary files
*.tmp
*.temp
.cache/

# Supabase
supabase/.temp/
supabase/.branches/

# Environment files
.env*

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Git
.git/
.gitignore

# Documentation
*.md
docs/

# Config files that shouldn't be linted
*.json
*.yaml
*.yml
*.toml
EOF

# Create CLAUDE.md for project context
cat > "$PROJECT_ROOT/CLAUDE.md" << 'EOF'
# TheSet Project Context

## Project Overview
TheSet is a concert setlist platform built with Next.js 14, Supabase, and TypeScript.

## Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Edge Functions)
- **UI Components**: Shadcn/ui, Radix UI
- **APIs**: Spotify, Ticketmaster, Setlist.fm
- **Package Manager**: pnpm (monorepo)

## Project Structure