#!/bin/bash

# Disable git hooks temporarily for deployment
echo "🔧 Disabling git hooks temporarily..."

# Method 1: Skip hooks via environment variable
export HUSKY=0
export HUSKY_SKIP_HOOKS=1
export GIT_HOOKS_DISABLED=1

# Method 2: Temporarily disable core.hooksPath
git config core.hooksPath /dev/null 2>/dev/null || true

# Method 3: Make hooks non-executable if they exist
if [ -d ".git/hooks" ]; then
  chmod -x .git/hooks/* 2>/dev/null || true
fi

# Method 4: Create no-verify file
touch .git/hooks/no-verify 2>/dev/null || true

echo "✅ Git hooks disabled"
echo ""
echo "To commit without hooks:"
echo "  git commit --no-verify -m 'your message'"
echo ""
echo "To re-enable hooks later:"
echo "  git config --unset core.hooksPath"
echo "  chmod +x .git/hooks/*"