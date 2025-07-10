#!/usr/bin/env node

/**
 * Performance Budget Checker
 * Validates build output against performance budgets
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Performance budgets (in KB)
const BUDGETS = {
  'First Load JS': {
    warning: 150,
    error: 200,
  },
  'Page JS': {
    warning: 100,
    error: 150,
  },
  CSS: {
    warning: 50,
    error: 75,
  },
  Total: {
    warning: 300,
    error: 400,
  },
};

// Image size budgets
const _IMAGE_BUDGETS = {
  hero: 200, // KB
  thumbnail: 50, // KB
  icon: 10, // KB
};

// Parse build output
function parseBuildOutput() {
  const buildOutputPath = join(
    __dirname,
    '../apps/web/.next/build-manifest.json'
  );

  if (!existsSync(buildOutputPath)) {
    process.exit(1);
  }

  const buildManifest = JSON.parse(readFileSync(buildOutputPath, 'utf-8'));
  return buildManifest;
}

// Calculate bundle sizes
function calculateBundleSizes() {
  const statsPath = join(__dirname, '../apps/web/.next/stats.json');

  if (!existsSync(statsPath)) {
    return null;
  }

  const stats = JSON.parse(readFileSync(statsPath, 'utf-8'));

  const results = {
    js: 0,
    css: 0,
    images: 0,
    fonts: 0,
    total: 0,
  };

  // Calculate sizes by type
  stats.assets.forEach((asset) => {
    const sizeInKB = asset.size / 1024;

    if (asset.name.endsWith('.js')) {
      results.js += sizeInKB;
    } else if (asset.name.endsWith('.css')) {
      results.css += sizeInKB;
    } else if (/\.(jpg|jpeg|png|gif|svg|webp|avif)$/.test(asset.name)) {
      results.images += sizeInKB;
    } else if (/\.(woff|woff2|ttf|eot)$/.test(asset.name)) {
      results.fonts += sizeInKB;
    }

    results.total += sizeInKB;
  });

  return results;
}

// Check against budgets
function checkBudgets(sizes) {
  const failures = [];
  const warnings = [];

  // Check JS budget
  if (sizes.js > BUDGETS['First Load JS'].error) {
    failures.push(
      `JS bundle size (${sizes.js.toFixed(2)}KB) exceeds error budget (${BUDGETS['First Load JS'].error}KB)`
    );
  } else if (sizes.js > BUDGETS['First Load JS'].warning) {
    warnings.push(
      `JS bundle size (${sizes.js.toFixed(2)}KB) exceeds warning budget (${BUDGETS['First Load JS'].warning}KB)`
    );
  }

  // Check CSS budget
  if (sizes.css > BUDGETS.CSS.error) {
    failures.push(
      `CSS size (${sizes.css.toFixed(2)}KB) exceeds error budget (${BUDGETS.CSS.error}KB)`
    );
  } else if (sizes.css > BUDGETS.CSS.warning) {
    warnings.push(
      `CSS size (${sizes.css.toFixed(2)}KB) exceeds warning budget (${BUDGETS.CSS.warning}KB)`
    );
  }

  // Check total budget
  if (sizes.total > BUDGETS.Total.error) {
    failures.push(
      `Total size (${sizes.total.toFixed(2)}KB) exceeds error budget (${BUDGETS.Total.error}KB)`
    );
  } else if (sizes.total > BUDGETS.Total.warning) {
    warnings.push(
      `Total size (${sizes.total.toFixed(2)}KB) exceeds warning budget (${BUDGETS.Total.warning}KB)`
    );
  }

  return { failures, warnings };
}

// Generate report
function generateReport(sizes, budgetCheck) {
  if (budgetCheck.warnings.length > 0) {
    budgetCheck.warnings.forEach((_warning) => );
  }

  if (budgetCheck.failures.length > 0) {
    budgetCheck.failures.forEach((_failure) => );
  }

  if (budgetCheck.failures.length === 0 && budgetCheck.warnings.length === 0) {
  }

  // Optimization suggestions
  if (
    sizes.js > BUDGETS['First Load JS'].warning ||
    sizes.total > BUDGETS.Total.warning
  ) {
    if (sizes.js > BUDGETS['First Load JS'].warning) {
    }

    if (sizes.css > BUDGETS.CSS.warning) {
    }

    if (sizes.images > 100) {
    }
  }
}

// Main execution
async function main() {
  try {
    // Parse build output
    const _buildManifest = parseBuildOutput();

    // Calculate sizes
    const sizes = calculateBundleSizes();

    if (!sizes) {
      return;
    }

    // Check budgets
    const budgetCheck = checkBudgets(sizes);

    // Generate report
    generateReport(sizes, budgetCheck);

    // Exit with error if budgets exceeded
    if (budgetCheck.failures.length > 0) {
      process.exit(1);
    }
  } catch (_error) {
    process.exit(1);
  }
}

// Run the checker
main();
