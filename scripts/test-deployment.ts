#!/usr/bin/env tsx
/**
 * Test deployment readiness without external dependencies
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const steps = [
  {
    name: 'Environment Validation',
    command: 'pnpm validate:deploy',
    critical: true,
  },
  {
    name: 'Database Connection',
    command: 'pnpm verify:db',
    critical: true,
  },
  {
    name: 'TypeScript Check',
    command: 'pnpm typecheck',
    critical: false,
  },
  {
    name: 'Build Test',
    command: 'cd apps/web && pnpm build',
    critical: true,
  },
];

console.log('🧪 Testing Deployment Readiness\n');

let allPassed = true;

for (const step of steps) {
  console.log(`📋 ${step.name}...`);
  
  try {
    execSync(step.command, { 
      stdio: 'inherit',
      encoding: 'utf8',
    });
    console.log(`✅ ${step.name} passed\n`);
  } catch (error) {
    console.log(`❌ ${step.name} failed\n`);
    if (step.critical) {
      allPassed = false;
      console.error('Critical step failed. Stopping tests.');
      break;
    }
  }
}

if (allPassed) {
  console.log('\n✅ All deployment tests passed!');
  console.log('\n📋 Next steps:');
  console.log('1. Install Supabase CLI: brew install supabase/tap/supabase');
  console.log('2. Deploy Supabase functions: pnpm deploy:functions');
  console.log('3. Deploy to Vercel: vercel --prod');
} else {
  console.log('\n❌ Deployment tests failed. Please fix the issues above.');
  process.exit(1);
}