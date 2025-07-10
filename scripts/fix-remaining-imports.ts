#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const API_APP_DIR = path.join(process.cwd(), 'apps/api/app');

async function fixRemainingImports(filePath: string) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');

    // Fix monitoring imports
    content = content.replace(
      /@repo\/api\/lib\/monitoring/g,
      '@/lib/monitoring'
    );

    // Fix cache imports
    content = content.replace(/@repo\/api\/lib\/cache/g, '@/lib/cache');

    // Fix relative action imports
    content = content.replace(/\.\.\/\.\.\/\.\.\/actions\//g, '@/actions/');

    // Fix any remaining @repo/api imports
    content = content.replace(/@repo\/api\//g, '@/');

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
      await fixRemainingImports(fullPath);
    }
  }
}

async function createMissingLibraries() {
  const libDir = path.join(process.cwd(), 'apps/api/lib');

  // Create monitoring library
  const monitoringContent = `export const monitor = {
  log: (message: string, data?: any) => {
    console.log(\`[Monitor] \${message}\`, data);
  },
  error: (message: string, error: any) => {
    console.error(\`[Monitor Error] \${message}\`, error);
  },
  metric: (name: string, value: number) => {
    console.log(\`[Metric] \${name}: \${value}\`);
  }
};
`;
  await fs.writeFile(path.join(libDir, 'monitoring.ts'), monitoringContent);

  // Create cache library
  const cacheContent = `const cache = new Map<string, { value: any; expiry: number }>();

export const cacheManager = {
  get: async (key: string) => {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }
    return item.value;
  },
  set: async (key: string, value: any, ttl: number = 3600000) => {
    cache.set(key, { value, expiry: Date.now() + ttl });
  },
  delete: async (key: string) => {
    cache.delete(key);
  },
  clear: async () => {
    cache.clear();
  }
};

export const getCacheKey = (...parts: string[]) => parts.join(':');
`;
  await fs.writeFile(path.join(libDir, 'cache.ts'), cacheContent);

  // Create actions directory
  const actionsDir = path.join(process.cwd(), 'apps/api/actions');
  await fs.mkdir(actionsDir, { recursive: true });

  // Create email notifications action
  const emailNotificationsContent = `export async function sendShowReminders() {
  console.log('Sending show reminders...');
  // TODO: Implement email sending logic
  return { sent: 0 };
}

export async function sendDigestEmails() {
  console.log('Sending digest emails...');
  // TODO: Implement digest email logic
  return { sent: 0 };
}
`;
  await fs.writeFile(
    path.join(actionsDir, 'email-notifications.ts'),
    emailNotificationsContent
  );
}

async function main() {
  // Create missing libraries first
  await createMissingLibraries();

  // Fix imports in all files
  await processDirectory(API_APP_DIR);
}

main().catch(console.error);
