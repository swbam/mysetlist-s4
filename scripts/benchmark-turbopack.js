#!/usr/bin/env node

/**
 * Turbopack Performance Benchmark Script
 * Compares development server startup times and build performance
 */

const { spawn } = require('child_process');
const { performance } = require('perf_hooks');

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      // Look for dev server ready indicators
      if (stdout.includes('Ready in') || stdout.includes('Local:') || stdout.includes('started server on')) {
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        child.kill();
        resolve({
          duration: parseFloat(duration),
          stdout,
          stderr
        });
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', reject);
    
    // Timeout after 60 seconds
    setTimeout(() => {
      child.kill();
      reject(new Error('Command timed out after 60 seconds'));
    }, 60000);
  });
}

async function benchmarkTurbopack() {
  console.log('🚀 Turbopack Performance Benchmark\n');
  
  try {
    // Test with Turbopack
    console.log('⚡ Testing with Turbopack...');
    const turbopackResult = await runCommand('pnpm', ['dev'], {
      cwd: process.cwd()
    });
    
    console.log(`✅ Turbopack startup time: ${turbopackResult.duration}s\n`);
    
    // Wait a moment between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test with Webpack (fallback)
    console.log('🐌 Testing with Webpack (fallback)...');
    const webpackResult = await runCommand('pnpm', ['run', 'dev:webpack'], {
      cwd: process.cwd()
    });
    
    console.log(`✅ Webpack startup time: ${webpackResult.duration}s\n`);
    
    // Calculate improvement
    const improvement = ((webpackResult.duration - turbopackResult.duration) / webpackResult.duration * 100).toFixed(1);
    
    console.log('📊 Performance Comparison:');
    console.log(`   Turbopack: ${turbopackResult.duration}s`);
    console.log(`   Webpack:   ${webpackResult.duration}s`);
    console.log(`   Improvement: ${improvement}% faster with Turbopack`);
    
    if (improvement > 0) {
      console.log(`\n🎉 Turbopack is ${improvement}% faster!`);
    } else {
      console.log(`\n⚠️  Webpack performed better by ${Math.abs(improvement)}%`);
      console.log('   This may indicate Turbopack configuration needs optimization');
    }
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error.message);
  }
}

async function checkTurbopackStatus() {
  console.log('🔍 Checking Turbopack configuration...\n');
  
  // Check if Turbopack is enabled in package.json
  const packageJson = require('../apps/web/package.json');
  const devScript = packageJson.scripts.dev;
  
  if (devScript.includes('--turbo')) {
    console.log('✅ Turbopack is enabled in dev script');
  } else {
    console.log('❌ Turbopack is NOT enabled in dev script');
  }
  
  // Check Next.js version (Turbopack requires Next.js 13+)
  const nextVersion = packageJson.dependencies.next;
  console.log(`📦 Next.js version: ${nextVersion}`);
  
  // Check for Turbopack configuration
  try {
    const nextConfig = require('../apps/web/next.config.ts');
    if (nextConfig.default?.turbopack || nextConfig.turbopack) {
      console.log('✅ Turbopack configuration found in next.config.ts');
    } else {
      console.log('⚠️  No Turbopack configuration in next.config.ts');
    }
  } catch (error) {
    console.log('❌ Could not read next.config.ts');
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
}

async function main() {
  await checkTurbopackStatus();
  
  if (process.argv.includes('--benchmark')) {
    await benchmarkTurbopack();
  } else {
    console.log('To run performance benchmark, use: node scripts/benchmark-turbopack.js --benchmark');
    console.log('Note: This will restart the dev server twice for comparison');
  }
}

main().catch(console.error);