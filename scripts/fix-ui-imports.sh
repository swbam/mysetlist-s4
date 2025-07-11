#!/bin/bash

# Fix UI component imports in web app
echo "🔧 Fixing UI component imports..."

# List of files to fix
files=(
  "/Users/seth/mysetlist-s4-1/apps/web/app/(home)/components/top-artists-slider.tsx"
  "/Users/seth/mysetlist-s4-1/apps/web/app/(home)/components/trending-shows-carousel.tsx"
  "/Users/seth/mysetlist-s4-1/apps/web/app/layout.tsx"
  "/Users/seth/mysetlist-s4-1/apps/web/app/artists/[slug]/components/similar-artists-carousel.tsx"
  "/Users/seth/mysetlist-s4-1/apps/web/components/layout/responsive-header.tsx"
  "/Users/seth/mysetlist-s4-1/apps/web/components/search/mobile-search-interface.tsx"
  "/Users/seth/mysetlist-s4-1/apps/web/components/scalability/scalability-planner.tsx"
  "/Users/seth/mysetlist-s4-1/apps/web/components/artist/sync-button.tsx"
  "/Users/seth/mysetlist-s4-1/apps/web/components/analytics/advanced-analytics-dashboard.tsx"
)

# Replace imports
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  Fixing: $file"
    # Replace UI imports
    sed -i.bak "s|from '~/components/ui/|from '@repo/design-system/components/ui/|g" "$file"
    # Remove backup
    rm -f "${file}.bak"
  fi
done

echo "✅ UI imports fixed!"