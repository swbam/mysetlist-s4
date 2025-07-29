#!/bin/bash
# Script to delete all Supabase Edge Functions
# Run this script to remove all deployed edge functions from your Supabase project

echo "=== Supabase Edge Functions Deletion Script ==="
echo "This script will help you delete all edge functions from your Supabase project."
echo ""

# Set project ref from environment or use the one from your URL
PROJECT_REF="yzwkimtdaabyjbpykquu"

# Check if logged in to Supabase
if ! npx supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run: npx supabase login"
    exit 1
fi

echo "📋 Listing all edge functions..."
echo ""

# Get list of functions
FUNCTIONS=$(npx supabase functions list --project-ref "$PROJECT_REF" 2>/dev/null | grep -E '^\s*[a-zA-Z0-9_-]+\s*\|' | awk '{print $1}' | grep -v 'FUNCTION')

if [ -z "$FUNCTIONS" ]; then
    echo "✅ No edge functions found to delete."
    exit 0
fi

echo "Found the following edge functions:"
echo "$FUNCTIONS"
echo ""
echo "⚠️  WARNING: This will delete ALL edge functions listed above!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Deletion cancelled."
    exit 0
fi

# Delete each function
echo ""
echo "🗑️  Deleting edge functions..."
while IFS= read -r function; do
    if [ ! -z "$function" ]; then
        echo -n "Deleting $function... "
        if npx supabase functions delete "$function" --project-ref "$PROJECT_REF" 2>/dev/null; then
            echo "✅ deleted"
        else
            echo "❌ failed (may already be deleted)"
        fi
    fi
done <<< "$FUNCTIONS"

echo ""
echo "✅ Edge function deletion complete!"
echo ""
echo "📝 Note: If any functions failed to delete, you can remove them manually in the Supabase dashboard."