#!/bin/bash

echo "=== Cleaning up unnecessary cron endpoints ==="
echo ""

# Define endpoints to keep
KEEP_ENDPOINTS=(
  "master-sync"
  "calculate-trending"
  "test"  # Keep test endpoint for debugging
)

# Function to check if directory should be kept
should_keep() {
  local dir=$1
  for keep in "${KEEP_ENDPOINTS[@]}"; do
    if [[ "$dir" == *"$keep"* ]]; then
      return 0
    fi
  done
  return 1
}

# Create backup directory
mkdir -p /tmp/cron-endpoints-backup

echo "Backing up cron endpoints to /tmp/cron-endpoints-backup..."
cp -r apps/web/app/api/cron /tmp/cron-endpoints-backup/

echo ""
echo "Removing unnecessary endpoints:"
echo "==============================="

# Find all cron endpoint directories
for dir in apps/web/app/api/cron/*/; do
  if [ -d "$dir" ]; then
    dirname=$(basename "$dir")
    if should_keep "$dirname"; then
      echo "✓ Keeping: $dirname"
    else
      echo "✗ Removing: $dirname"
      rm -rf "$dir"
    fi
  fi
done

echo ""
echo "Cleanup complete!"
echo ""
echo "Remaining cron endpoints:"
echo "========================"
find apps/web/app/api/cron -name "route.ts" -type f | sort

echo ""
echo "If you need to restore, the backup is at: /tmp/cron-endpoints-backup/"