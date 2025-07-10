#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const API_APP_DIR = path.join(process.cwd(), 'apps/api/app');

async function fixImports(filePath: string) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');

    // Fix Supabase imports
    content = content.replace(
      /@repo\/database\/supabase\/server/g,
      '@/lib/supabase/server'
    );
    content = content.replace(
      /@\/lib\/supabase\/server/g,
      '@/lib/supabase/server'
    );

    // Fix logger imports
    content = content.replace(/@repo\/observability\/logger/g, '@/lib/logger');
    content = content.replace(/@\/lib\/logger/g, '@/lib/logger');

    // Fix env imports
    content = content.replace(/@repo\/api\/env/g, '@/env');
    content = content.replace(/@\/env/g, '@/env');

    // Fix external API imports
    content = content.replace(/@repo\/external-apis/g, '@/lib/external-apis');

    // Fix database imports
    content = content.replace(/@repo\/database/g, '@/lib/database');

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
      await fixImports(fullPath);
    }
  }
}

async function createApiLibraries() {
  const libDir = path.join(process.cwd(), 'apps/api/lib');
  await fs.mkdir(libDir, { recursive: true });

  // Create Supabase server client
  const supabaseServerContent = `export { createClient } from '@/lib/supabase/server';
`;
  await fs.mkdir(path.join(libDir, 'supabase'), { recursive: true });
  await fs.writeFile(
    path.join(libDir, 'supabase/server.ts'),
    supabaseServerContent
  );

  // Create logger
  const loggerContent = `export { logger } from '@repo/observability';
`;
  await fs.writeFile(path.join(libDir, 'logger.ts'), loggerContent);

  // Create database export
  const databaseContent = `export * from '@repo/database';
`;
  await fs.writeFile(path.join(libDir, 'database.ts'), databaseContent);

  // Create external APIs export
  const externalApisContent = `export * from '@repo/external-apis';
`;
  await fs.writeFile(
    path.join(libDir, 'external-apis.ts'),
    externalApisContent
  );
}

async function main() {
  // Create library structure first
  await createApiLibraries();

  // Fix imports in all migrated files
  await processDirectory(API_APP_DIR);
}

main().catch(console.error);
