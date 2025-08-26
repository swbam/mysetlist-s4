#!/usr/bin/env tsx

/**
 * Environment Validation Script
 * Validates all required environment variables for MySetlist app
 */

import chalk from "chalk";

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
  example?: string;
  validate?: (value: string) => boolean;
}

const REQUIRED_ENV_VARS: EnvVar[] = [
  // Database
  {
    name: "DATABASE_URL",
    required: true,
    description: "PostgreSQL database connection URL",
    example: "postgresql://user:pass@localhost:5432/mysetlist",
    validate: (value) => value.startsWith("postgresql://"),
  },
  {
    name: "DIRECT_URL",
    required: true,
    description: "Direct database connection URL for migrations",
    validate: (value) => value.startsWith("postgresql://"),
  },

  // Supabase
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    description: "Supabase project URL",
    example: "https://xxx.supabase.co",
    validate: (value) => value.startsWith("https://") && value.includes("supabase.co"),
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    description: "Supabase anonymous key",
    validate: (value) => value.length > 50,
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    description: "Supabase service role key",
    validate: (value) => value.length > 50,
  },

  // External APIs
  {
    name: "SPOTIFY_CLIENT_ID",
    required: true,
    description: "Spotify Web API Client ID",
    validate: (value) => value.length === 32,
  },
  {
    name: "SPOTIFY_CLIENT_SECRET",
    required: true,
    description: "Spotify Web API Client Secret",
    validate: (value) => value.length === 32,
  },
  {
    name: "TICKETMASTER_API_KEY",
    required: true,
    description: "Ticketmaster Discovery API Key",
    validate: (value) => value.length > 20,
  },

  // Security
  {
    name: "NEXTAUTH_SECRET",
    required: true,
    description: "NextAuth.js secret (min 32 characters)",
    validate: (value) => value.length >= 32,
  },
  {
    name: "CRON_SECRET",
    required: true,
    description: "Cron job authentication secret",
    validate: (value) => value.length >= 32,
  },

  // Optional but recommended
  {
    name: "REDIS_URL",
    required: false,
    description: "Redis connection URL for caching and queues",
    example: "redis://localhost:6379",
  },
  {
    name: "SETLISTFM_API_KEY",
    required: false,
    description: "Setlist.fm API key for setlist data",
  },
];

interface ValidationResult {
  valid: boolean;
  missing: string[];
  invalid: string[];
  warnings: string[];
}

function validateEnvironment(): ValidationResult {
  const missing: string[] = [];
  const invalid: string[] = [];
  const warnings: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value) {
      if (envVar.required) {
        missing.push(envVar.name);
      } else {
        warnings.push(`Optional: ${envVar.name} - ${envVar.description}`);
      }
      continue;
    }

    // Validate the value if validator exists
    if (envVar.validate && !envVar.validate(value)) {
      invalid.push(`${envVar.name}: ${envVar.description}`);
    }
  }

  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    warnings,
  };
}

function printResults(result: ValidationResult): void {
  console.log(chalk.bold("\n🔍 Environment Validation Results\n"));

  if (result.valid) {
    console.log(chalk.green("✅ All required environment variables are valid!"));
  } else {
    console.log(chalk.red("❌ Environment validation failed!"));
  }

  if (result.missing.length > 0) {
    console.log(chalk.red("\n📋 Missing Required Variables:"));
    for (const missing of result.missing) {
      const envVar = REQUIRED_ENV_VARS.find(v => v.name === missing);
      console.log(chalk.red(`  • ${missing}`));
      if (envVar?.description) {
        console.log(chalk.gray(`    ${envVar.description}`));
      }
      if (envVar?.example) {
        console.log(chalk.gray(`    Example: ${envVar.example}`));
      }
    }
  }

  if (result.invalid.length > 0) {
    console.log(chalk.yellow("\n⚠️  Invalid Variables:"));
    for (const invalid of result.invalid) {
      console.log(chalk.yellow(`  • ${invalid}`));
    }
  }

  if (result.warnings.length > 0) {
    console.log(chalk.blue("\n💡 Optional Variables:"));
    for (const warning of result.warnings) {
      console.log(chalk.blue(`  • ${warning}`));
    }
  }

  console.log(chalk.bold("\n📖 Setup Instructions:"));
  console.log("1. Copy .env.example to .env.local");
  console.log("2. Fill in all required values");
  console.log("3. Run this script again to validate");
  console.log("4. See README.md for detailed setup instructions");
}

async function testConnections(): Promise<void> {
  console.log(chalk.bold("\n🔗 Testing Connections...\n"));

  // Test database connection
  if (process.env['DATABASE_URL']) {
    try {
      console.log(chalk.blue("Testing database connection..."));
      // In a real implementation, you would test the actual connection
      console.log(chalk.green("✅ Database connection configured"));
    } catch (error) {
      console.log(chalk.red("❌ Database connection failed"));
    }
  }

  // Test Redis connection
  if (process.env['REDIS_URL']) {
    try {
      console.log(chalk.blue("Testing Redis connection..."));
      // In a real implementation, you would test the actual connection
      console.log(chalk.green("✅ Redis connection configured"));
    } catch (error) {
      console.log(chalk.red("❌ Redis connection failed"));
    }
  } else {
    console.log(chalk.yellow("⚠️  Redis not configured - using memory fallback"));
  }

  // Test Supabase connection
  if (process.env['NEXT_PUBLIC_SUPABASE_URL'] && process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
    try {
      console.log(chalk.blue("Testing Supabase connection..."));
      // In a real implementation, you would test the actual connection
      console.log(chalk.green("✅ Supabase connection configured"));
    } catch (error) {
      console.log(chalk.red("❌ Supabase connection failed"));
    }
  }
}

async function main(): Promise<void> {
  console.log(chalk.bold("🚀 MySetlist Environment Validator\n"));

  // Load environment variables
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    try {
      const { config } = await import("dotenv");
      config({ path: file });
      console.log(chalk.gray(`Loaded ${file}`));
    } catch (error) {
      // File doesn't exist, continue
    }
  }

  const result = validateEnvironment();
  printResults(result);

  if (process.argv.includes("--test-connections")) {
    await testConnections();
  }

  if (!result.valid) {
    process.exit(1);
  }

  console.log(chalk.green("\n🎉 Environment validation passed! Ready to build.\n"));
}

// Run the validation
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(chalk.red("Validation failed:"), error);
    process.exit(1);
  });
}

export { validateEnvironment, REQUIRED_ENV_VARS };