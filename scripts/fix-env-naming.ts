#!/usr/bin/env tsx
/**
 * Fixes environment variable naming inconsistencies
 * Specifically handles SETLISTFM_API_KEY vs SETLIST_FM_API_KEY
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const files = [
  'apps/web/env.ts',
  'apps/web/lib/env.ts',
  'packages/external-apis/src/env.ts',
];

console.log('🔧 Fixing environment variable naming inconsistencies...\n');

files.forEach(file => {
  const filePath = join(process.cwd(), file);
  console.log(`📄 Processing ${file}...`);
  
  try {
    let content = readFileSync(filePath, 'utf-8');
    
    // Replace SETLIST_FM_API_KEY with SETLISTFM_API_KEY
    const oldContent = content;
    content = content.replace(/SETLIST_FM_API_KEY/g, 'SETLISTFM_API_KEY');
    
    if (content !== oldContent) {
      writeFileSync(filePath, content);
      console.log(`   ✅ Fixed naming inconsistency`);
    } else {
      console.log(`   ⏩ No changes needed`);
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error}`);
  }
});

console.log('\n✅ Environment variable naming fixed!');
console.log('💡 Remember to update your .env files to use SETLISTFM_API_KEY (no underscore)');