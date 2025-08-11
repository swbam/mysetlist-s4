#!/bin/bash

echo "📦 Installing Veraticus Claude Code Setup..."

# Create directories
mkdir -p ~/.claude/hooks
mkdir -p ~/.claude/commands
mkdir -p /tmp/claude-setup

# Clone the repo temporarily
cd /tmp/claude-setup
git clone --depth 1 https://github.com/Veraticus/nix-config.git

# Copy all hooks
echo "📋 Copying hooks..."
cp nix-config/home-manager/claude-code/hooks/*.sh ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh

# Copy all commands
echo "📝 Copying commands..."
cp nix-config/home-manager/claude-code/commands/*.md ~/.claude/commands/ 2>/dev/null || echo "No command files found"

# Copy settings.json
echo "⚙️ Installing settings..."
cp nix-config/home-manager/claude-code/settings.json ~/.claude/settings.json

# Copy CLAUDE.md if it exists
if [ -f "nix-config/home-manager/claude-code/CLAUDE.md" ]; then
  cp nix-config/home-manager/claude-code/CLAUDE.md ~/.claude/CLAUDE.md
fi

# Clean up
cd ~
rm -rf /tmp/claude-setup

echo "✅ Installation complete!"
echo ""
echo "📂 Installed files:"
echo "  Hooks: $(ls ~/.claude/hooks/*.sh 2>/dev/null | wc -l) files"
echo "  Commands: $(ls ~/.claude/commands/*.md 2>/dev/null | wc -l) files"
echo ""
echo "🚀 Next steps:"
echo "1. Create a Makefile in your project (see below)"
echo "2. Restart Claude Code"
echo "3. Test with /hooks and /"