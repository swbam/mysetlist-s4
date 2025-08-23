#!/usr/bin/env tsx
// MySetlist-S4 Environment Validation Script
// File: apps/web/scripts/validate-environment.ts
// Validates all required environment variables and services

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';
import { z } from 'zod';

// Environment schema based on the project requirements
const envSchema = z.object({
  // Core URLs
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_WEB_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_DOCS_URL: z.string().url().optional(),

  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  DATABASE_URL: z.string().startsWith('postgres://'),
  DIRECT_URL: z.string().startsWith('postgres://').optional(),

  // Authentication
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),

  // Spotify API
  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  NEXT_PUBLIC_SPOTIFY_CLIENT_ID: z.string().min(1),

  // External APIs
  TICKETMASTER_API_KEY: z.string().min(1),
  SETLISTFM_API_KEY: z.string().min(1),

  // Redis Configuration
  REDIS_URL: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Analytics
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),

  // Security
  CRON_SECRET: z.string().min(1),
  ADMIN_API_KEY: z.string().min(1).optional(),

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']),

  // Optional Features
  ENABLE_ANALYTICS: z.string().transform(v => v === 'true').optional(),
  ENABLE_CACHE_WARMING: z.string().transform(v => v === 'true').optional(),
  ENABLE_TRAFFIC_SCHEDULER: z.string().transform(v => v === 'true').optional(),
});

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

class EnvironmentValidator {
  private errors: string[] = [];
  private warnings: string[] = [];
  private info: string[] = [];

  async validate(): Promise<ValidationResult> {
    console.log(chalk.blue('🔍 Validating MySetlist-S4 Environment...\n'));

    // Check for .env files
    this.checkEnvFiles();

    // Validate environment variables
    this.validateEnvironmentVariables();

    // Check service connections
    await this.checkServices();

    // Check credentials directory
    this.checkCredentialsDirectory();

    // Generate report
    return this.generateReport();
  }

  private checkEnvFiles(): void {
    console.log(chalk.yellow('📁 Checking .env files...'));

    const envFiles = [
      { path: '.env.local', required: true },
      { path: '.env.production', required: false },
      { path: '.env.example', required: true },
    ];

    for (const file of envFiles) {
      const fullPath = join(process.cwd(), file.path);
      if (existsSync(fullPath)) {
        this.info.push(`✅ Found ${file.path}`);
      } else if (file.required) {
        this.errors.push(`❌ Missing required file: ${file.path}`);
      } else {
        this.warnings.push(`⚠️  Missing optional file: ${file.path}`);
      }
    }
  }

  private validateEnvironmentVariables(): void {
    console.log(chalk.yellow('\n🔐 Validating environment variables...'));

    try {
      const result = envSchema.safeParse(process.env);

      if (!result.success) {
        const issues = result.error.issues;
        
        for (const issue of issues) {
          const varName = issue.path.join('.');
          
          if (this.isOptionalVariable(varName)) {
            this.warnings.push(`⚠️  Optional variable not set: ${varName}`);
          } else {
            this.errors.push(`❌ ${issue.message} for ${varName}`);
          }
        }
      } else {
        this.info.push('✅ All required environment variables are set');
      }

      // Additional checks
      this.validateDatabaseUrls();
      this.validateRedisConfig();
      this.validateApiKeys();
      
    } catch (error) {
      this.errors.push(`❌ Failed to validate environment: ${error}`);
    }
  }

  private validateDatabaseUrls(): void {
    const dbUrl = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;

    if (dbUrl && directUrl) {
      // Extract database names
      const dbName1 = this.extractDbName(dbUrl);
      const dbName2 = this.extractDbName(directUrl);

      if (dbName1 !== dbName2) {
        this.warnings.push('⚠️  DATABASE_URL and DIRECT_URL point to different databases');
      }
    }

    // Check for Supabase pooler URL pattern
    if (dbUrl && dbUrl.includes('pooler') && !directUrl) {
      this.warnings.push('⚠️  Using pooled DATABASE_URL without DIRECT_URL for migrations');
    }
  }

  private validateRedisConfig(): void {
    const redisUrl = process.env.REDIS_URL;
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;

    if (!redisUrl && !upstashUrl) {
      this.errors.push('❌ No Redis configuration found (REDIS_URL or UPSTASH_REDIS_REST_URL)');
    }

    if (upstashUrl && !process.env.UPSTASH_REDIS_REST_TOKEN) {
      this.errors.push('❌ UPSTASH_REDIS_REST_URL set but UPSTASH_REDIS_REST_TOKEN missing');
    }
  }

  private validateApiKeys(): void {
    // Check Spotify configuration
    if (process.env.SPOTIFY_CLIENT_ID !== process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID) {
      this.warnings.push('⚠️  SPOTIFY_CLIENT_ID and NEXT_PUBLIC_SPOTIFY_CLIENT_ID should match');
    }

    // Validate key formats
    const spotifySecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (spotifySecret && spotifySecret.length < 20) {
      this.warnings.push('⚠️  SPOTIFY_CLIENT_SECRET seems unusually short');
    }

    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseAnon && !supabaseAnon.includes('.')) {
      this.warnings.push('⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY doesn\'t look like a JWT');
    }
  }

  private async checkServices(): Promise<void> {
    console.log(chalk.yellow('\n🔗 Checking service connections...'));

    // Check Supabase
    await this.checkSupabase();

    // Check Redis
    await this.checkRedis();

    // Check external APIs
    await this.checkExternalAPIs();
  }

  private async checkSupabase(): Promise<void> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
      });

      if (response.ok) {
        this.info.push('✅ Supabase URL is reachable');
      } else {
        this.warnings.push(`⚠️  Supabase returned status ${response.status}`);
      }
    } catch (error) {
      this.errors.push('❌ Cannot connect to Supabase');
    }
  }

  private async checkRedis(): Promise<void> {
    if (process.env.UPSTASH_REDIS_REST_URL) {
      try {
        const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
          headers: {
            Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          },
        });

        if (response.ok) {
          this.info.push('✅ Upstash Redis is reachable');
        } else {
          this.warnings.push('⚠️  Upstash Redis connection issue');
        }
      } catch (error) {
        this.warnings.push('⚠️  Cannot verify Upstash Redis connection');
      }
    }
  }

  private async checkExternalAPIs(): Promise<void> {
    // Check Spotify
    if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
      try {
        const auth = Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64');

        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials',
        });

        if (response.ok) {
          this.info.push('✅ Spotify credentials are valid');
        } else {
          this.errors.push('❌ Spotify credentials are invalid');
        }
      } catch (error) {
        this.warnings.push('⚠️  Cannot verify Spotify credentials');
      }
    }

    // Note: Ticketmaster and SetlistFM APIs require actual requests
    // which might count against rate limits, so we skip runtime checks
  }

  private checkCredentialsDirectory(): void {
    console.log(chalk.yellow('\n📂 Checking credentials directory...'));

    const credsPath = join(process.cwd(), 'creds');
    if (existsSync(credsPath)) {
      this.info.push('✅ Found ./creds directory');

      // Check for common credential files
      const expectedFiles = [
        'supabase-service-role.txt',
        'spotify-secrets.txt',
        'api-keys.txt',
      ];

      for (const file of expectedFiles) {
        const filePath = join(credsPath, file);
        if (existsSync(filePath)) {
          this.info.push(`✅ Found ${file}`);
        } else {
          this.warnings.push(`⚠️  Missing ${file} in ./creds`);
        }
      }
    } else {
      this.warnings.push('⚠️  No ./creds directory found');
    }
  }

  private isOptionalVariable(varName: string): boolean {
    const optionalVars = [
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_DOCS_URL',
      'DIRECT_URL',
      'REDIS_URL',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
      'NEXT_PUBLIC_POSTHOG_KEY',
      'NEXT_PUBLIC_POSTHOG_HOST',
      'ADMIN_API_KEY',
      'ENABLE_ANALYTICS',
      'ENABLE_CACHE_WARMING',
      'ENABLE_TRAFFIC_SCHEDULER',
    ];

    return optionalVars.includes(varName);
  }

  private extractDbName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.slice(1).split('?')[0];
    } catch {
      return '';
    }
  }

  private generateReport(): ValidationResult {
    console.log(chalk.blue('\n📊 Validation Report:\n'));

    // Display errors
    if (this.errors.length > 0) {
      console.log(chalk.red('Errors:'));
      this.errors.forEach(error => console.log(error));
    }

    // Display warnings
    if (this.warnings.length > 0) {
      console.log(chalk.yellow('\nWarnings:'));
      this.warnings.forEach(warning => console.log(warning));
    }

    // Display info
    if (this.info.length > 0) {
      console.log(chalk.green('\nInfo:'));
      this.info.forEach(info => console.log(info));
    }

    // Summary
    const valid = this.errors.length === 0;
    console.log('\n' + chalk.blue('═'.repeat(50)));
    
    if (valid) {
      console.log(chalk.green('✅ Environment validation PASSED'));
      if (this.warnings.length > 0) {
        console.log(chalk.yellow(`   with ${this.warnings.length} warnings`));
      }
    } else {
      console.log(chalk.red('❌ Environment validation FAILED'));
      console.log(chalk.red(`   ${this.errors.length} errors found`));
    }

    console.log(chalk.blue('═'.repeat(50)) + '\n');

    // Provide next steps
    if (!valid) {
      console.log(chalk.yellow('Next steps:'));
      console.log('1. Copy .env.example to .env.local');
      console.log('2. Fill in missing required variables');
      console.log('3. Check ./creds directory for secrets');
      console.log('4. Run this script again to verify\n');
    }

    return {
      valid,
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
    };
  }
}

// Run validation
async function main() {
  const validator = new EnvironmentValidator();
  const result = await validator.validate();

  // Exit with appropriate code
  process.exit(result.valid ? 0 : 1);
}

// Handle errors
main().catch(error => {
  console.error(chalk.red('Unexpected error:'), error);
  process.exit(1);
});
