#!/usr/bin/env node

/**
 * Quick deployment test for MySetlist
 * Tests core functionality without starting dev server
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('🚀 MySetlist Quick Deployment Test');
console.log('=' + '='.repeat(50));

/**
 * Test build process
 */
function testBuild() {
  console.log('\n🔨 Testing Build Process...');
  try {
    const startTime = Date.now();
    execSync('npm run build', { stdio: 'inherit' });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Build completed successfully in ${duration}s`);
    return true;
  } catch (error) {
    console.log('❌ Build failed:', error.message);
    return false;
  }
}

/**
 * Test TypeScript compilation
 */
function testTypeScript() {
  console.log('\n📝 Testing TypeScript Compilation...');
  try {
    execSync('npm run typecheck', { stdio: 'pipe' });
    console.log('✅ TypeScript compilation passed');
    return true;
  } catch (error) {
    console.log('❌ TypeScript errors found');
    console.log('  Use `npm run typecheck` to see details');
    return false;
  }
}

/**
 * Test file structure
 */
function testFileStructure() {
  console.log('\n📁 Testing File Structure...');
  
  const criticalFiles = [
    'apps/web/app/layout.tsx',
    'apps/web/app/(home)/page.tsx',
    'apps/web/app/artists/page.tsx',
    'apps/web/app/shows/page.tsx',
    'apps/web/app/trending/page.tsx',
    'apps/web/app/api/health/route.ts',
    'apps/web/app/api/sync/shows/route.ts',
    'apps/web/app/components/header/index.tsx',
    'packages/database/src/schema/index.ts'
  ];
  
  let missingFiles = [];
  
  for (const file of criticalFiles) {
    try {
      readFileSync(file);
      console.log(`✅ ${file}`);
    } catch {
      missingFiles.push(file);
      console.log(`❌ ${file} - MISSING`);
    }
  }
  
  return missingFiles.length === 0;
}

/**
 * Test package.json scripts
 */
function testPackageScripts() {
  console.log('\n📦 Testing Package Scripts...');
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const requiredScripts = ['build', 'dev', 'typecheck', 'lint'];
    
    let missingScripts = [];
    
    for (const script of requiredScripts) {
      if (packageJson.scripts[script]) {
        console.log(`✅ ${script} script exists`);
      } else {
        missingScripts.push(script);
        console.log(`❌ ${script} script missing`);
      }
    }
    
    return missingScripts.length === 0;
  } catch (error) {
    console.log('❌ Error reading package.json:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runQuickTest() {
  const results = {
    fileStructure: false,
    packageScripts: false,
    typeScript: false,
    build: false
  };
  
  // Run tests in order
  results.fileStructure = testFileStructure();
  results.packageScripts = testPackageScripts();
  
  // Only run TS and build if basic structure is correct
  if (results.fileStructure && results.packageScripts) {
    results.typeScript = testTypeScript();
    results.build = testBuild();
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DEPLOYMENT TEST SUMMARY');
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'File Structure', result: results.fileStructure },
    { name: 'Package Scripts', result: results.packageScripts },
    { name: 'TypeScript', result: results.typeScript },
    { name: 'Build Process', result: results.build }
  ];
  
  let passedCount = 0;
  tests.forEach(test => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test.name}`);
    if (test.result) passedCount++;
  });
  
  const successRate = ((passedCount / tests.length) * 100).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log(`🎯 DEPLOYMENT READINESS: ${passedCount}/${tests.length} checks passed (${successRate}%)`);
  
  if (successRate >= 90) {
    console.log('🎉 MySetlist is ready for deployment!');
  } else if (successRate >= 75) {
    console.log('⚠️  MySetlist is mostly ready - minor fixes needed');
  } else {
    console.log('🚨 MySetlist needs significant fixes before deployment');
  }
  
  console.log('='.repeat(60));
  
  return successRate >= 75;
}

// Execute the test
runQuickTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });