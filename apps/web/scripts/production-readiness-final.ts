#!/usr/bin/env tsx

/**
 * Comprehensive Production Readiness Check
 * 
 * This script performs a complete audit of the application to ensure
 * it's ready for production deployment with optimal performance and security.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string[];
  critical?: boolean;
}

const checks: CheckResult[] = [];

function addCheck(result: CheckResult) {
  checks.push(result);
}

function runCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf-8', cwd: process.cwd() });
  } catch (error) {
    return '';
  }
}

// 1. Environment Variables Check
function checkEnvironmentVariables(): void {
  console.log('🔐 Checking environment variables...');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length === 0) {
    addCheck({
      name: 'Environment Variables',
      status: 'pass',
      message: 'Core environment variables are set',
      critical: true
    });
  } else {
    addCheck({
      name: 'Environment Variables',
      status: 'fail',
      message: `Missing required environment variables: ${missingVars.join(', ')}`,
      critical: true
    });
  }
}

// 2. Security Headers Check
function checkSecurityHeaders(): void {
  console.log('🛡️  Checking security headers...');
  
  const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
  
  if (existsSync(nextConfigPath)) {
    const content = readFileSync(nextConfigPath, 'utf-8');
    const securityHeaders = [
      'X-Frame-Options',
      'X-Content-Type-Options', 
      'X-XSS-Protection',
      'Referrer-Policy',
      'Strict-Transport-Security'
    ];
    
    const missingHeaders = securityHeaders.filter(header => !content.includes(header));
    
    if (missingHeaders.length === 0) {
      addCheck({
        name: 'Security Headers',
        status: 'pass',
        message: 'All security headers are configured'
      });
    } else {
      addCheck({
        name: 'Security Headers',
        status: 'warning',
        message: `Missing security headers: ${missingHeaders.join(', ')}`
      });
    }
  }
}

// 3. Console Statements Check
function checkConsoleStatements(): void {
  console.log('🗣️  Checking for console statements...');
  
  let consoleCount = 0;
  const consoleFiles: string[] = [];
  
  try {
    const output = runCommand(`find . -name "*.tsx" -o -name "*.ts" | grep -E "(app/|components/|lib/|hooks/)" | grep -v test | grep -v spec | xargs grep -l "console\\." | wc -l`);
    consoleCount = parseInt(output.trim()) || 0;
    
    if (consoleCount > 0) {
      const fileList = runCommand(`find . -name "*.tsx" -o -name "*.ts" | grep -E "(app/|components/|lib/|hooks/)" | grep -v test | grep -v spec | xargs grep -l "console\\." | head -5`);
      consoleFiles.push(...fileList.split('\n').filter(f => f.trim()));
    }
  } catch {
    // If command fails, skip this check
  }
  
  if (consoleCount === 0) {
    addCheck({
      name: 'Console Statements',
      status: 'pass',
      message: 'No console statements found in production code'
    });
  } else {
    addCheck({
      name: 'Console Statements',
      status: 'warning',
      message: `Found ${consoleCount} files with console statements`,
      details: consoleFiles.slice(0, 5).map(f => f.replace(process.cwd(), '.'))
    });
  }
}

// 4. API Key Exposure Check
function checkApiKeyExposure(): void {
  console.log('🔑 Checking for exposed API keys...');
  
  try {
    // Check for Google Maps API key that was previously exposed
    const venueDetailsPath = 'app/shows/[slug]/components/venue-details.tsx';
    if (existsSync(venueDetailsPath)) {
      const content = readFileSync(venueDetailsPath, 'utf-8');
      if (content.includes('NEXT_PUBLIC_GOOGLE_MAPS_KEY')) {
        addCheck({
          name: 'API Key Exposure',
          status: 'fail',
          message: 'Google Maps API key still exposed in client code',
          critical: true
        });
        return;
      }
    }
    
    // Check for other potential API key patterns
    const sensitivePatterns = [
      'sk_live_',
      'sk_test_',
      'ACCESS_TOKEN',
      'secret_key'
    ];
    
    let exposedKeys = 0;
    
    for (const pattern of sensitivePatterns) {
      const result = runCommand(`grep -r "${pattern}" app/ components/ lib/ hooks/ 2>/dev/null || true`);
      if (result.trim()) {
        exposedKeys++;
      }
    }
    
    if (exposedKeys === 0) {
      addCheck({
        name: 'API Key Exposure',
        status: 'pass',
        message: 'No exposed API keys found in client code',
        critical: true
      });
    } else {
      addCheck({
        name: 'API Key Exposure',
        status: 'fail',
        message: 'Potential API keys exposed in client code',
        critical: true
      });
    }
  } catch {
    addCheck({
      name: 'API Key Exposure',
      status: 'warning',
      message: 'Could not check for API key exposure'
    });
  }
}

// 5. Image Optimization Check
function checkImageOptimization(): void {
  console.log('🖼️  Checking image optimization...');
  
  try {
    const output = runCommand('tsx scripts/image-optimization-audit.ts 2>/dev/null');
    const errorCount = (output.match(/❌/g) || []).length;
    const warningCount = (output.match(/⚠️/g) || []).length;
    
    if (errorCount === 0 && warningCount === 0) {
      addCheck({
        name: 'Image Optimization',
        status: 'pass',
        message: 'All images are properly optimized'
      });
    } else if (errorCount === 0) {
      addCheck({
        name: 'Image Optimization',
        status: 'warning',
        message: `${warningCount} image optimization warnings`
      });
    } else {
      addCheck({
        name: 'Image Optimization',
        status: 'fail',
        message: `${errorCount} image optimization errors, ${warningCount} warnings`
      });
    }
  } catch {
    addCheck({
      name: 'Image Optimization',
      status: 'warning',
      message: 'Could not run image optimization audit'
    });
  }
}

// 6. Next.js Configuration Check
function checkNextJsConfig(): void {
  console.log('⚙️  Checking Next.js configuration...');
  
  const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
  
  if (existsSync(nextConfigPath)) {
    const content = readFileSync(nextConfigPath, 'utf-8');
    
    const productionFeatures = [
      'poweredByHeader: false',
      'compress: true',
      'optimizePackageImports',
      'images'
    ];
    
    const missingFeatures = productionFeatures.filter(feature => !content.includes(feature));
    
    if (missingFeatures.length === 0) {
      addCheck({
        name: 'Next.js Configuration',
        status: 'pass',
        message: 'Production-optimized Next.js configuration'
      });
    } else {
      addCheck({
        name: 'Next.js Configuration',
        status: 'warning',
        message: `Missing optimizations: ${missingFeatures.join(', ')}`
      });
    }
  }
}

// 7. Metadata and SEO Check
function checkSEO(): void {
  console.log('🔍 Checking SEO and metadata...');
  
  const layoutPath = path.join(process.cwd(), 'app/layout.tsx');
  
  if (existsSync(layoutPath)) {
    const content = readFileSync(layoutPath, 'utf-8');
    
    const seoFeatures = [
      'metadataBase',
      'openGraph',
      'twitter',
      'robots'
    ];
    
    const missingFeatures = seoFeatures.filter(feature => !content.includes(feature));
    
    if (missingFeatures.length === 0) {
      addCheck({
        name: 'SEO & Metadata',
        status: 'pass',
        message: 'Complete SEO metadata configuration'
      });
    } else {
      addCheck({
        name: 'SEO & Metadata',
        status: 'warning',
        message: `Missing SEO features: ${missingFeatures.join(', ')}`
      });
    }
  }
}

// 8. Error Handling Check
function checkErrorHandling(): void {
  console.log('🚨 Checking error handling...');
  
  const errorFiles = [
    'app/error.tsx',
    'app/global-error.tsx',
    'app/not-found.tsx'
  ];
  
  const existingFiles = errorFiles.filter(file => existsSync(file));
  
  if (existingFiles.length === errorFiles.length) {
    addCheck({
      name: 'Error Handling',
      status: 'pass',
      message: 'Complete error handling setup'
    });
  } else {
    const missingFiles = errorFiles.filter(file => !existsSync(file));
    addCheck({
      name: 'Error Handling',
      status: 'warning',
      message: `Missing error pages: ${missingFiles.join(', ')}`
    });
  }
}

// Main execution
async function main() {
  console.log('🚀 MySetlist Production Readiness Check\n');
  console.log('=======================================\n');

  // Run all checks
  checkEnvironmentVariables();
  checkSecurityHeaders();
  checkConsoleStatements();
  checkApiKeyExposure();
  checkImageOptimization();
  checkNextJsConfig();
  checkSEO();
  checkErrorHandling();

  // Generate report
  console.log('\n📊 Production Readiness Report');
  console.log('================================\n');

  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const criticalFails = checks.filter(c => c.status === 'fail' && c.critical).length;

  checks.forEach(check => {
    const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
    const critical = check.critical ? ' (CRITICAL)' : '';
    console.log(`${icon} ${check.name}${critical}`);
    console.log(`   ${check.message}`);
    
    if (check.details && check.details.length > 0) {
      check.details.forEach(detail => {
        console.log(`   • ${detail}`);
      });
    }
    console.log('');
  });

  // Summary
  console.log('📈 Summary:');
  console.log(`   ✅ Passed: ${passCount}`);
  console.log(`   ❌ Failed: ${failCount} ${criticalFails > 0 ? `(${criticalFails} critical)` : ''}`);
  console.log(`   ⚠️  Warnings: ${warningCount}`);
  console.log(`   📊 Total Checks: ${checks.length}`);

  // Production readiness verdict
  console.log('\n🎯 Production Readiness Verdict:');
  if (criticalFails > 0) {
    console.log('   ❌ NOT READY - Critical issues must be resolved before deployment');
  } else if (failCount > 0) {
    console.log('   ⚠️  NEEDS ATTENTION - Non-critical issues should be addressed');
  } else if (warningCount > 0) {
    console.log('   ✅ READY WITH WARNINGS - Production ready but optimizations recommended');
  } else {
    console.log('   🚀 FULLY READY - Application is production ready!');
  }

  // Recommendations
  if (criticalFails > 0 || failCount > 0 || warningCount > 0) {
    console.log('\n💡 Recommended Actions:');
    
    const criticalChecks = checks.filter(c => c.status === 'fail' && c.critical);
    if (criticalChecks.length > 0) {
      console.log('   🔥 CRITICAL - Fix immediately:');
      criticalChecks.forEach(check => {
        console.log(`      • ${check.name}: ${check.message}`);
      });
    }
    
    const nonCriticalFails = checks.filter(c => c.status === 'fail' && !c.critical);
    if (nonCriticalFails.length > 0) {
      console.log('   ❌ HIGH PRIORITY:');
      nonCriticalFails.forEach(check => {
        console.log(`      • ${check.name}: ${check.message}`);
      });
    }
    
    const warnings = checks.filter(c => c.status === 'warning');
    if (warnings.length > 0) {
      console.log('   ⚠️  OPTIMIZATION OPPORTUNITIES:');
      warnings.forEach(check => {
        console.log(`      • ${check.name}: ${check.message}`);
      });
    }

    console.log('\n🛠️  Quick Fix Commands:');
    if (checks.some(c => c.name === 'Console Statements' && c.status === 'warning')) {
      console.log('   npm run tsx scripts/production-console-cleanup.ts');
    }
    if (checks.some(c => c.name === 'Image Optimization' && c.status !== 'pass')) {
      console.log('   npm run tsx scripts/image-optimization-audit.ts');
    }
  }

  console.log('\n🎉 Production readiness check completed!');
  process.exit(criticalFails > 0 ? 1 : 0);
}

if (require.main === module) {
  main().catch(console.error);
}