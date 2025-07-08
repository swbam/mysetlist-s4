#!/bin/bash

# Fix environment variable access issues
echo "Fixing environment variable access issues..."

# Fix all process.env.KEY to process.env['KEY'] pattern
find apps/web -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' "s/process\.env\.\([A-Z_]*\)/process.env['\1']/g" {} +

# Fix packages
find packages -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' "s/process\.env\.\([A-Z_]*\)/process.env['\1']/g" {} +

echo "Environment variable fixes completed."