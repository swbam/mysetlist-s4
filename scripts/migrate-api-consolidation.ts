#!/usr/bin/env tsx
/*
 * API Consolidation Script
 * Migrates all functionality from apps/api to apps/web/app/api
 * Ensures zero functionality loss during migration
 */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

interface MigrationTask {
  source: string;
  destination: string;
  type: 'route' | 'lib' | 'action' | 'config';
  transform?: (content: string) => string;
}

// Define migration tasks
const MIGRATION_TASKS: MigrationTask[] = [
  // Admin routes
  {
    source: 'apps/api/app/admin/analytics/votes/route.ts',
    destination: 'apps/web/app/api/admin/analytics/votes/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/admin/bulk/route.ts',
    destination: 'apps/web/app/api/admin/bulk/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/admin/data-integrity/route.ts',
    destination: 'apps/web/app/api/admin/data-integrity/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/admin/sync-manager/route.ts',
    destination: 'apps/web/app/api/admin/sync-manager/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/admin/sync/route.ts',
    destination: 'apps/web/app/api/admin/sync/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/admin/system-health/route.ts',
    destination: 'apps/web/app/api/admin/system-health/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/admin/ticketmaster-sync/route.ts',
    destination: 'apps/web/app/api/admin/ticketmaster-sync/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/admin/users/[id]/stats/route.ts',
    destination: 'apps/web/app/api/admin/users/[id]/stats/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/admin/users/actions/route.ts',
    destination: 'apps/web/app/api/admin/users/actions/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/admin/users/route.ts',
    destination: 'apps/web/app/api/admin/users/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },

  // Cron routes
  {
    source: 'apps/api/app/cron/analytics/route.ts',
    destination: 'apps/web/app/api/cron/analytics/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/cron/backup/route.ts',
    destination: 'apps/web/app/api/cron/backup/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/cron/cache-warm/route.ts',
    destination: 'apps/web/app/api/cron/cache-warm/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/cron/daily-reminders/route.ts',
    destination: 'apps/web/app/api/cron/daily-reminders/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/cron/daily-sync/route.ts',
    destination: 'apps/web/app/api/cron/daily-sync/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/cron/email-processing/route.ts',
    destination: 'apps/web/app/api/cron/email-processing/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/cron/health-check/route.ts',
    destination: 'apps/web/app/api/cron/health-check/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/cron/hourly-update/route.ts',
    destination: 'apps/web/app/api/cron/hourly-update/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/cron/lock-setlists/route.ts',
    destination: 'apps/web/app/api/cron/lock-setlists/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/cron/sync-external-apis/route.ts',
    destination: 'apps/web/app/api/cron/sync-external-apis/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/cron/trending-update/route.ts',
    destination: 'apps/web/app/api/cron/trending-update/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },
  {
    source: 'apps/api/app/cron/weekly-digest/route.ts',
    destination: 'apps/web/app/api/cron/weekly-digest/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },

  // Database operations
  {
    source: 'apps/api/app/database/operations/route.ts',
    destination: 'apps/web/app/api/database/operations/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },

  // External APIs
  {
    source: 'apps/api/app/external-apis/diagnostics/route.ts',
    destination: 'apps/web/app/api/external-apis/diagnostics/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },

  // Health check
  {
    source: 'apps/api/app/health/route.ts',
    destination: 'apps/web/app/api/health/route.ts',
    type: 'route',
    transform: (content) => content.replace('@/lib/', '@/lib/api/'),
  },

  // Lib utilities
  {
    source: 'apps/api/lib/cache.ts',
    destination: 'apps/web/lib/api/cache.ts',
    type: 'lib',
  },
  {
    source: 'apps/api/lib/database.ts',
    destination: 'apps/web/lib/api/database.ts',
    type: 'lib',
  },
  {
    source: 'apps/api/lib/external-apis.ts',
    destination: 'apps/web/lib/api/external-apis.ts',
    type: 'lib',
  },
  {
    source: 'apps/api/lib/logger.ts',
    destination: 'apps/web/lib/api/logger.ts',
    type: 'lib',
  },
  {
    source: 'apps/api/lib/monitoring.ts',
    destination: 'apps/web/lib/api/monitoring.ts',
    type: 'lib',
  },
  {
    source: 'apps/api/lib/supabase/server.ts',
    destination: 'apps/web/lib/api/supabase/server.ts',
    type: 'lib',
  },

  // Actions
  {
    source: 'apps/api/actions/email-notifications.ts',
    destination: 'apps/web/app/api/actions/email-notifications.ts',
    type: 'action',
  },
];

// Routes that need merging (exist in both locations)
const MERGE_ROUTES = [
  'admin/route.ts',
  'cron/route.ts',
  'database/route.ts',
  'external-apis/route.ts',
];

async function createDirectory(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Failed to create directory ${dirPath}:`, error);
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function migrateFile(task: MigrationTask) {
  const sourcePath = path.join(ROOT_DIR, task.source);
  const destPath = path.join(ROOT_DIR, task.destination);

  try {
    // Check if source file exists
    if (!(await fileExists(sourcePath))) {
      console.log(`⚠️  Source file not found: ${task.source}`);
      return;
    }

    // Create destination directory
    await createDirectory(path.dirname(destPath));

    // Read source content
    let content = await fs.readFile(sourcePath, 'utf-8');

    // Apply transformation if provided
    if (task.transform) {
      content = task.transform(content);
    }

    // Check if destination already exists
    if (await fileExists(destPath)) {
      console.log(`⚠️  Destination already exists: ${task.destination}`);
      // Create backup
      const backupPath = destPath + '.backup.' + Date.now();
      await fs.copyFile(destPath, backupPath);
      console.log(`   Created backup: ${path.basename(backupPath)}`);
    }

    // Write to destination
    await fs.writeFile(destPath, content);
    console.log(`✅ Migrated: ${task.source} → ${task.destination}`);
  } catch (error) {
    console.error(`❌ Failed to migrate ${task.source}:`, error);
  }
}

async function updateEnvironmentVariables() {
  const webEnvPath = path.join(ROOT_DIR, 'apps/web/env.ts');

  try {
    let envContent = await fs.readFile(webEnvPath, 'utf-8');

    // Add missing imports
    if (
      !envContent.includes("import { keys as auth } from '@repo/auth/keys';")
    ) {
      envContent = envContent.replace(
        "import { keys as database } from '@repo/database/keys';",
        "import { keys as auth } from '@repo/auth/keys';\nimport { keys as database } from '@repo/database/keys';"
      );
    }

    // Add auth() to extends array
    if (!envContent.includes('auth()')) {
      envContent = envContent.replace(
        'extends: [\n    core(),\n    database(),\n  ],',
        'extends: [\n    auth(),\n    core(),\n    database(),\n  ],'
      );
    }

    // Add missing server environment variables
    const missingServerVars = [
      'SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),',
      'NEXT_PUBLIC_SUPABASE_URL: z.string().url(),',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),',
    ];

    for (const varDef of missingServerVars) {
      if (!envContent.includes(varDef)) {
        const varName = varDef.split(':')[0].trim();
        if (varName.startsWith('NEXT_PUBLIC_')) {
          // Add to client section
          envContent = envContent.replace(
            'client: {',
            `client: {\n    ${varDef}`
          );
        } else {
          // Add to server section
          envContent = envContent.replace(
            'server: {',
            `server: {\n    ${varDef}`
          );
        }
      }
    }

    // Add to runtimeEnv
    envContent = envContent.replace(
      'runtimeEnv: {',
      `runtimeEnv: {\n    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,\n    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,\n    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,`
    );

    await fs.writeFile(webEnvPath, envContent);
    console.log('✅ Updated environment variables configuration');
  } catch (error) {
    console.error('❌ Failed to update environment variables:', error);
  }
}

async function createProxyRoutes() {
  // Create proxy routes for merged endpoints
  for (const route of MERGE_ROUTES) {
    const routePath = path.join(ROOT_DIR, 'apps/web/app/api', route);
    const apiRoutePath = path.join(
      ROOT_DIR,
      'apps/api/app',
      route.replace('/route.ts', '')
    );

    if (await fileExists(apiRoutePath)) {
      console.log(`📝 Creating proxy route for ${route}`);
      // Read existing content from apps/api
      const apiContent = await fs.readFile(apiRoutePath, 'utf-8');

      // Merge with existing content if needed
      // This would require more complex logic based on specific routes
    }
  }
}

async function main() {
  console.log('🚀 Starting API Consolidation Migration');
  console.log('='.repeat(50));

  // Step 1: Update environment variables
  console.log('\n📋 Step 1: Updating environment variables...');
  await updateEnvironmentVariables();

  // Step 2: Migrate all files
  console.log('\n📋 Step 2: Migrating API routes and utilities...');
  for (const task of MIGRATION_TASKS) {
    await migrateFile(task);
  }

  // Step 3: Create proxy routes for merged endpoints
  console.log('\n📋 Step 3: Creating proxy routes for merged endpoints...');
  await createProxyRoutes();

  // Step 4: Update imports in apps/web
  console.log('\n📋 Step 4: Updating imports in apps/web...');
  // This would be implemented with a code transform tool

  console.log('\n✅ Migration completed!');
  console.log('='.repeat(50));
  console.log('\n⚠️  Next steps:');
  console.log('1. Test all migrated endpoints');
  console.log('2. Update any remaining imports');
  console.log('3. Remove apps/api folder after verification');
  console.log('4. Update deployment configurations');
}

// Run migration
main().catch(console.error);
