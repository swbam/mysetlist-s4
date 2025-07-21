#!/usr/bin/env node

const { chromium } = require('playwright');
const { AxePuppeteer } = require('@axe-core/playwright');

async function runAccessibilityAudit() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Test pages
  const pages = [
    { name: 'Homepage', url: 'http://localhost:3001' },
    { name: 'Artists', url: 'http://localhost:3001/artists' },
    { name: 'Shows', url: 'http://localhost:3001/shows' },
    { name: 'Trending', url: 'http://localhost:3001/trending' },
    { name: 'Auth Sign In', url: 'http://localhost:3001/auth/sign-in' },
    { name: 'Search', url: 'http://localhost:3001/search' },
  ];

  const results = [];

  for (const testPage of pages) {
    try {
      console.log(`Testing ${testPage.name}...`);
      
      // Navigate to page
      await page.goto(testPage.url, { waitUntil: 'networkidle' });
      
      // Test desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      const axeDesktop = new AxePuppeteer(page);
      const desktopResults = await axeDesktop.analyze();
      
      // Test mobile
      await page.setViewportSize({ width: 375, height: 667 });
      const axeMobile = new AxePuppeteer(page);
      const mobileResults = await axeMobile.analyze();
      
      // Test tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      const axeTablet = new AxePuppeteer(page);
      const tabletResults = await axeTablet.analyze();
      
      results.push({
        page: testPage.name,
        url: testPage.url,
        desktop: {
          violations: desktopResults.violations.length,
          details: desktopResults.violations.map(v => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length
          }))
        },
        mobile: {
          violations: mobileResults.violations.length,
          details: mobileResults.violations.map(v => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length
          }))
        },
        tablet: {
          violations: tabletResults.violations.length,
          details: tabletResults.violations.map(v => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.length
          }))
        }
      });
      
      console.log(`✓ ${testPage.name} tested`);
    } catch (error) {
      console.error(`✗ Error testing ${testPage.name}:`, error.message);
      results.push({
        page: testPage.name,
        url: testPage.url,
        error: error.message
      });
    }
  }

  await browser.close();

  // Generate report
  console.log('\n=== ACCESSIBILITY AUDIT RESULTS ===\n');
  
  let totalViolations = 0;
  const criticalIssues = [];
  
  results.forEach(result => {
    if (result.error) {
      console.log(`❌ ${result.page}: ${result.error}`);
      return;
    }
    
    const desktopViolations = result.desktop.violations;
    const mobileViolations = result.mobile.violations;
    const tabletViolations = result.tablet.violations;
    
    totalViolations += desktopViolations + mobileViolations + tabletViolations;
    
    console.log(`📱 ${result.page}:`);
    console.log(`   Desktop: ${desktopViolations} violations`);
    console.log(`   Mobile: ${mobileViolations} violations`);
    console.log(`   Tablet: ${tabletViolations} violations`);
    
    // Collect critical issues
    [result.desktop, result.mobile, result.tablet].forEach((deviceResults, idx) => {
      const deviceName = ['Desktop', 'Mobile', 'Tablet'][idx];
      deviceResults.details.forEach(violation => {
        if (violation.impact === 'critical' || violation.impact === 'serious') {
          criticalIssues.push({
            page: result.page,
            device: deviceName,
            ...violation
          });
        }
      });
    });
    
    console.log('');
  });

  console.log(`\n📊 SUMMARY:`);
  console.log(`Total violations: ${totalViolations}`);
  console.log(`Critical/Serious issues: ${criticalIssues.length}`);
  
  if (criticalIssues.length > 0) {
    console.log(`\n🚨 CRITICAL ISSUES TO FIX:`);
    criticalIssues.forEach((issue, idx) => {
      console.log(`${idx + 1}. [${issue.page} - ${issue.device}] ${issue.id}`);
      console.log(`   Impact: ${issue.impact}`);
      console.log(`   Description: ${issue.description}`);
      console.log(`   Affected nodes: ${issue.nodes}`);
      console.log('');
    });
  }
  
  // WCAG 2.1 AA compliance status
  const isCompliant = totalViolations === 0;
  console.log(`\n🎯 WCAG 2.1 AA Compliance: ${isCompliant ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (!isCompliant) {
    console.log(`\n📝 NEXT STEPS:`);
    console.log(`1. Fix critical and serious violations first`);
    console.log(`2. Test mobile touch interactions`);
    console.log(`3. Verify keyboard navigation on all pages`);
    console.log(`4. Test with screen readers`);
    console.log(`5. Check color contrast ratios`);
  }
  
  // Save detailed results
  require('fs').writeFileSync(
    'accessibility-audit-results.json',
    JSON.stringify(results, null, 2)
  );
  
  console.log(`\n📄 Detailed results saved to: accessibility-audit-results.json`);
  
  return isCompliant;
}

module.exports = { runAccessibilityAudit };

// Run if called directly
if (require.main === module) {
  runAccessibilityAudit()
    .then(isCompliant => {
      process.exit(isCompliant ? 0 : 1);
    })
    .catch(error => {
      console.error('Audit failed:', error);
      process.exit(1);
    });
}