#!/usr/bin/env tsx
/**
 * Comprehensive environment configuration validation
 * Tests all package environment requirements and configurations
 */

import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

interface ValidationResult {
  package: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

const results: ValidationResult[] = [];

function validatePackage(
  packageName: string,
  validationFn: () => { errors: string[]; warnings: string[] },
) {
  console.log(`\n🔍 Validating ${packageName}...`);

  try {
    const { errors, warnings } = validationFn();

    results.push({
      package: packageName,
      passed: errors.length === 0,
      errors,
      warnings,
    });

    if (errors.length === 0) {
      console.log(`✅ ${packageName}: All validations passed`);
    } else {
      console.log(`❌ ${packageName}: ${errors.length} error(s)`);
      errors.forEach((error) => console.log(`   - ${error}`));
    }

    if (warnings.length > 0) {
      console.log(`⚠️  ${packageName}: ${warnings.length} warning(s)`);
      warnings.forEach((warning) => console.log(`   - ${warning}`));
    }
  } catch (error) {
    results.push({
      package: packageName,
      passed: false,
      errors: [`Validation failed: ${error.message}`],
      warnings: [],
    });
    console.log(`❌ ${packageName}: Validation failed - ${error.message}`);
  }
}

// Validate Core App Environment
validatePackage("@repo/next-config", () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    errors.push("NEXT_PUBLIC_APP_URL is required");
  }
  if (!process.env.NEXT_PUBLIC_WEB_URL) {
    errors.push("NEXT_PUBLIC_WEB_URL is required");
  }

  return { errors, warnings };
});

// Validate Database Package
validatePackage("@repo/database", () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is required for database connections");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL is required for Supabase client");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY is required for Supabase client",
    );
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push(
      "SUPABASE_SERVICE_ROLE_KEY is required for server-side operations",
    );
  }

  return { errors, warnings };
});

// Validate Auth Package
validatePackage("@repo/auth", () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is required for auth");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push("NEXT_PUBLIC_SUPABASE_URL is required for auth client");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push("SUPABASE_SERVICE_ROLE_KEY is required for auth operations");
  }

  if (!process.env.SPOTIFY_CLIENT_SECRET) {
    warnings.push(
      "SPOTIFY_CLIENT_SECRET not set - Spotify OAuth will not work",
    );
  }
  if (!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID) {
    warnings.push(
      "NEXT_PUBLIC_SPOTIFY_CLIENT_ID not set - Spotify OAuth will not work",
    );
  }

  return { errors, warnings };
});

// Validate External APIs Package
validatePackage("@repo/external-apis", () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.SPOTIFY_CLIENT_SECRET) {
    warnings.push("SPOTIFY_CLIENT_SECRET not set - Spotify API will not work");
  }
  if (!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID) {
    warnings.push(
      "NEXT_PUBLIC_SPOTIFY_CLIENT_ID not set - Spotify API will not work",
    );
  }
  if (!process.env.TICKETMASTER_API_KEY) {
    warnings.push(
      "TICKETMASTER_API_KEY not set - Ticketmaster API will not work",
    );
  }
  if (!process.env.SETLIST_FM_API_KEY) {
    warnings.push("SETLIST_FM_API_KEY not set - SetlistFM API will not work");
  }

  return { errors, warnings };
});

// Validate Observability Package
validatePackage("@repo/observability", () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.NEXT_PUBLIC_SENTRY_DSN && !process.env.SENTRY_DSN) {
    warnings.push("NEXT_PUBLIC_SENTRY_DSN not set - Error monitoring disabled");
  }
  if (!process.env.BETTERSTACK_API_KEY) {
    warnings.push(
      "BETTERSTACK_API_KEY not set - BetterStack monitoring disabled",
    );
  }

  return { errors, warnings };
});

// Validate Email Package
validatePackage("@repo/email", () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.RESEND_API_KEY) {
    warnings.push("RESEND_API_KEY not set - Email functionality disabled");
  }

  return { errors, warnings };
});

// Validate Feature Flags Package
validatePackage("@repo/feature-flags", () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.FLAGSMITH_ENVIRONMENT_KEY) {
    warnings.push(
      "FLAGSMITH_ENVIRONMENT_KEY not set - Feature flags will use defaults",
    );
  }

  return { errors, warnings };
});

// Validate Rate Limit Package
validatePackage("@repo/rate-limit", () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.REDIS_URL && !process.env.UPSTASH_REDIS_REST_URL) {
    warnings.push(
      "Redis configuration missing - Rate limiting will use memory store",
    );
  }

  return { errors, warnings };
});

// Validate Security Package
validatePackage("@repo/security", () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.NEXTAUTH_SECRET) {
    errors.push("NEXTAUTH_SECRET is required for session encryption");
  } else if (process.env.NEXTAUTH_SECRET.length < 32) {
    errors.push("NEXTAUTH_SECRET must be at least 32 characters");
  }

  return { errors, warnings };
});

// Validate Storage Package
validatePackage("@repo/storage", () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Storage is optional, no required variables
  return { errors, warnings };
});

// Validate Webhooks Package
validatePackage("@repo/webhooks", () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!process.env.TICKETMASTER_WEBHOOK_SECRET) {
    warnings.push(
      "TICKETMASTER_WEBHOOK_SECRET not set - Ticketmaster webhooks disabled",
    );
  }

  return { errors, warnings };
});

// Summary
console.log("\n" + "=".repeat(80));
console.log("📊 ENVIRONMENT VALIDATION SUMMARY");
console.log("=".repeat(80));

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

console.log(`\n✅ Passed: ${passed}/${results.length} packages`);
console.log(`❌ Failed: ${failed}/${results.length} packages`);
console.log(`⚠️  Warnings: ${totalWarnings} total`);

if (failed > 0) {
  console.log("\n❌ FAILED PACKAGES:");
  results
    .filter((r) => !r.passed)
    .forEach((r) => {
      console.log(`\n${r.package}:`);
      r.errors.forEach((error) => console.log(`  - ${error}`));
    });
}

if (totalWarnings > 0) {
  console.log("\n⚠️  ALL WARNINGS:");
  results.forEach((r) => {
    if (r.warnings.length > 0) {
      console.log(`\n${r.package}:`);
      r.warnings.forEach((warning) => console.log(`  - ${warning}`));
    }
  });
}

console.log("\n" + "=".repeat(80));

if (failed > 0) {
  console.log("❌ Environment validation failed. Please fix the errors above.");
  process.exit(1);
} else {
  console.log("✅ Environment validation passed!");
  if (totalWarnings > 0) {
    console.log(
      "⚠️  Some optional features may not work due to missing configuration.",
    );
  }
  process.exit(0);
}
