#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';

const DIRECTORIES_TO_UPDATE = [
  'apps/web/components',
  'apps/web/app',
  'apps/web/hooks',
];

// Routes that have been migrated to API app
const MIGRATED_ROUTES = ['admin', 'cron', 'database', 'external-apis'];

async function updateFetchCalls(filePath: string) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    let updated = false;

    // Update fetch calls for migrated routes
    MIGRATED_ROUTES.forEach((route) => {
      // Match fetch('/api/route...')
      const fetchPattern = new RegExp(`fetch\\(['"\`]/api/${route}`, 'g');
      if (fetchPattern.test(content)) {
        content = content.replace(
          fetchPattern,
          `fetch(\`\${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/${route}`
        );
        updated = true;
      }

      // Match fetch(`/api/route...`)
      const templatePattern = new RegExp(`fetch\\(\\\`/api/${route}`, 'g');
      if (templatePattern.test(content)) {
        content = content.replace(
          templatePattern,
          `fetch(\`\${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/${route}`
        );
        updated = true;
      }

      // Match new URL('/api/route...', ...)
      const urlPattern = new RegExp(
        `new URL\\(['"\`]/api/${route}[^'"\`]*['"\`]`,
        'g'
      );
      if (urlPattern.test(content)) {
        content = content.replace(urlPattern, (match) => {
          const urlPath = match.match(/\/api\/[^'"`]*/)?.[0] || '';
          const apiPath = urlPath.replace('/api/', '');
          return `new URL(\`\${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/${apiPath}\``;
        });
        updated = true;
      }
    });

    if (updated) {
      await fs.writeFile(filePath, content);
      console.log(
        `  ✅ Updated fetch calls in ${path.relative(process.cwd(), filePath)}`
      );
    }
  } catch (error) {
    console.error(`  ❌ Error updating ${filePath}:`, error);
  }
}

async function processDirectory(dir: string) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip test directories
      if (entry.name === '__tests__' || entry.name === 'test') continue;
      await processDirectory(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      await updateFetchCalls(fullPath);
    }
  }
}

async function createApiUrlHelper() {
  console.log('\n📝 Creating API URL helper...');

  const helperContent = `export function getApiUrl(path: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  const cleanPath = path.startsWith('/') ? path : \`/\${path}\`;
  return \`\${apiUrl}\${cleanPath}\`;
}

export function apiUrl(path: string): string {
  return getApiUrl(path);
}
`;

  const helperPath = path.join(process.cwd(), 'apps/web/lib/api-url.ts');
  await fs.writeFile(helperPath, helperContent);
  console.log('  ✅ Created API URL helper at apps/web/lib/api-url.ts');
}

async function main() {
  console.log('🔄 Updating client-side fetch calls...\n');

  // Create API URL helper
  await createApiUrlHelper();

  // Update fetch calls in all directories
  for (const dir of DIRECTORIES_TO_UPDATE) {
    const fullPath = path.join(process.cwd(), dir);
    console.log(`\n📂 Processing ${dir}...`);
    await processDirectory(fullPath);
  }

  console.log('\n✨ Client fetch updates complete!');
  console.log('\nNext steps:');
  console.log('1. Import { apiUrl } from "@/lib/api-url" where needed');
  console.log('2. Use apiUrl("/admin/users") instead of hardcoded URLs');
  console.log('3. Test that API calls work correctly');
}

main().catch(console.error);
