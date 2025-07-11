#!/bin/bash

# Check which lucide-react icons are actually used in the advanced analytics dashboard
file="/Users/seth/mysetlist-s4-1/apps/web/components/analytics/advanced-analytics-dashboard.tsx"

echo "Checking icon usage in advanced analytics dashboard..."

icons=(
  "TrendingUp"
  "TrendingDown"
  "Users"
  "Target"
  "AlertTriangle"
  "CheckCircle"
  "XCircle"
  "BarChart3"
  "PieChart"
  "Activity"
  "Zap"
  "Brain"
  "Filter"
  "RefreshCw"
  "Calendar"
  "ArrowUp"
  "ArrowDown"
  "Minus"
  "Star"
  "Shield"
  "DollarSign"
)

for icon in "${icons[@]}"; do
  # Count occurrences excluding the import line
  count=$(grep -c "<${icon}" "$file" || echo 0)
  if [ "$count" -eq 0 ]; then
    echo "❌ $icon - Not used"
  else
    echo "✅ $icon - Used $count times"
  fi
done