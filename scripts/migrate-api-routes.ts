#!/usr/bin/env node
import { exec } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

interface MigrationRoute {
  source: string;
  destination: string;
  priority: 'high' | 'medium' | 'low';
  type: 'move' | 'copy';
}

// Define routes to migrate with priorities
const ROUTES_TO_MIGRATE: MigrationRoute[] = [
  // High priority - Admin and system routes
  { source: 'admin', destination: 'admin', priority: 'high', type: 'move' },
  { source: 'cron', destination: 'cron', priority: 'high', type: 'move' },
  {
    source: 'database',
    destination: 'database',
    priority: 'high',
    type: 'move',
  },
  {
    source: 'external-apis',
    destination: 'external-apis',
    priority: 'high',
    type: 'move',
  },

  // Medium priority - Business logic
  {
    source: 'artists/sync',
    destination: 'artists/sync',
    priority: 'medium',
    type: 'move',
  },
  {
    source: 'artists/[id]/songs',
    destination: 'artists/[id]/songs',
    priority: 'medium',
    type: 'move',
  },
  {
    source: 'artists/[id]/top-tracks',
    destination: 'artists/[id]/top-tracks',
    priority: 'medium',
    type: 'move',
  },
  {
    source: 'trending',
    destination: 'trending',
    priority: 'medium',
    type: 'move',
  },
  { source: 'sync', destination: 'sync', priority: 'medium', type: 'move' },
  {
    source: 'webhooks',
    destination: 'webhooks',
    priority: 'medium',
    type: 'move',
  },

  // Low priority - Can stay in web for now
  { source: 'votes', destination: 'votes', priority: 'low', type: 'copy' },
  { source: 'search', destination: 'search', priority: 'low', type: 'copy' },
];

const WEB_API_DIR = path.join(process.cwd(), 'apps/web/app/api');
const API_APP_DIR = path.join(process.cwd(), 'apps/api/app');

async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (_error) {}
}

async function copyDirectory(src: string, dest: string) {
  await ensureDirectoryExists(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function updateImports(filePath: string) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');

    // Update imports from web app to use packages
    content = content.replace(/@\/lib\/supabase/g, '@repo/database/supabase');
    content = content.replace(/@\/lib\/logger/g, '@repo/observability/logger');
    content = content.replace(/@\/env/g, '@repo/api/env');

    // Update relative imports
    content = content.replace(/from ['"]@\//g, "from '@repo/api/");

    await fs.writeFile(filePath, content);
  } catch (_error) {}
}

async function processDirectory(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      await updateImports(fullPath);
    }
  }
}

async function createProxyRoute(routePath: string) {
  const proxyContent = `import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  const url = new URL(request.url);
  const apiPath = url.pathname.replace('/api', '');
  
  try {
    const response = await fetch(\`\${apiUrl}\${apiPath}\${url.search}\`, {
      method: 'GET',
      headers: Object.fromEntries(request.headers.entries()),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  const url = new URL(request.url);
  const apiPath = url.pathname.replace('/api', '');
  
  try {
    const body = await request.json();
    const response = await fetch(\`\${apiUrl}\${apiPath}\${url.search}\`, {
      method: 'POST',
      headers: Object.fromEntries(request.headers.entries()),
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}
`;

  const routeDir = path.dirname(routePath);
  await ensureDirectoryExists(routeDir);
  await fs.writeFile(routePath, proxyContent);
}

async function migrateRoute(route: MigrationRoute) {
  const sourcePath = path.join(WEB_API_DIR, route.source);
  const destPath = path.join(API_APP_DIR, route.destination);

  try {
    // Check if source exists
    await fs.access(sourcePath);

    // Copy to API app
    await copyDirectory(sourcePath, destPath);

    // Update imports in copied files
    await processDirectory(destPath);

    if (route.type === 'move') {
      // Create proxy in web app
      const proxyPath = path.join(sourcePath, 'route.ts');
      await createProxyRoute(proxyPath);

      // Remove original files (except the proxy)
      const files = await fs.readdir(sourcePath, { withFileTypes: true });
      for (const file of files) {
        if (file.name !== 'route.ts') {
          const filePath = path.join(sourcePath, file.name);
          if (file.isDirectory()) {
            await fs.rm(filePath, { recursive: true });
          } else {
            await fs.unlink(filePath);
          }
        }
      }
    }
  } catch (_error) {}
}

async function updateClientFetches() {
  const componentsDir = path.join(process.cwd(), 'apps/web/components');
  const appDir = path.join(process.cwd(), 'apps/web/app');
  const hooksDir = path.join(process.cwd(), 'apps/web/hooks');

  // Create a script to update fetch calls
  const updateScript = `
    find ${componentsDir} ${appDir} ${hooksDir} -type f \\( -name "*.ts" -o -name "*.tsx" \\) -exec sed -i '' \\
      -e "s|fetch('/api/admin|fetch(\\\`\\\${process.env.NEXT_PUBLIC_API_URL}/admin|g" \\
      -e "s|fetch('/api/cron|fetch(\\\`\\\${process.env.NEXT_PUBLIC_API_URL}/cron|g" \\
      -e "s|fetch('/api/external-apis|fetch(\\\`\\\${process.env.NEXT_PUBLIC_API_URL}/external-apis|g" \\
      -e "s|fetch('/api/database|fetch(\\\`\\\${process.env.NEXT_PUBLIC_API_URL}/database|g" \\
      {} +
  `;

  try {
    await execAsync(updateScript);
  } catch (_error) {}
}

async function removeHealthDuplicate() {
  try {
    const healthPath = path.join(WEB_API_DIR, 'health');
    await fs.rm(healthPath, { recursive: true });
  } catch (_error) {}
}

async function updateApiAppEnv() {
  const apiEnvContent = `import { keys as auth } from '@repo/auth/keys';
import { keys as database } from '@repo/database/keys';
import { keys as core } from '@repo/next-config/keys';
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  extends: [
    auth(),
    core(),
    database(),
  ],
  server: {
    // External APIs
    SPOTIFY_CLIENT_ID: z.string().min(1),
    SPOTIFY_CLIENT_SECRET: z.string().min(1),
    TICKETMASTER_API_KEY: z.string().min(1),
    SETLISTFM_API_KEY: z.string().min(1),
    
    // Cron
    CRON_SECRET: z.string().min(1),
    
    // Supabase
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_JWT_SECRET: z.string().min(1),
  },
  client: {},
  runtimeEnv: {
    SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET,
    TICKETMASTER_API_KEY: process.env.TICKETMASTER_API_KEY,
    SETLISTFM_API_KEY: process.env.SETLISTFM_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  },
});
`;

  await fs.writeFile(
    path.join(process.cwd(), 'apps/api/env.ts'),
    apiEnvContent
  );
}

async function main() {
  // Remove duplicate health endpoint first
  await removeHealthDuplicate();

  // Migrate high priority routes first
  const highPriorityRoutes = ROUTES_TO_MIGRATE.filter(
    (r) => r.priority === 'high'
  );
  for (const route of highPriorityRoutes) {
    await migrateRoute(route);
  }

  // Update API app environment
  await updateApiAppEnv();

  // Update client fetch calls
  await updateClientFetches();
}

// Run the migration
main().catch(console.error);
