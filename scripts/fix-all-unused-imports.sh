#!/bin/bash

echo "🔧 Fixing all unused imports in analytics components..."

# Fix analytics-table.tsx
file="/Users/seth/mysetlist-s4-1/apps/web/components/analytics/analytics-table.tsx"
echo "  Checking $file..."

# Check which icons are actually used
icons=("TrendingUp" "TrendingDown" "Music" "Calendar" "MapPin" "User" "Trophy" "Eye")
used_icons=""

for icon in "${icons[@]}"; do
  if grep -q "<${icon}" "$file"; then
    if [ -n "$used_icons" ]; then
      used_icons="$used_icons, $icon"
    else
      used_icons="$icon"
    fi
  fi
done

# Update the import
if [ -n "$used_icons" ]; then
  sed -i.bak "s/import { .* } from 'lucide-react';/import { $used_icons } from 'lucide-react';/" "$file"
  rm -f "${file}.bak"
fi

echo "✅ Fixed analytics-table.tsx"

# Continue fixing other files as errors appear
echo "🎯 Running build to find more unused imports..."