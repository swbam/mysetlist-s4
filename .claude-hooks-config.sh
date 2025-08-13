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
