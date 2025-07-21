#!/usr/bin/env node
/**
 * Navigation System Test
 * Tests all navigation components and links
 */

const { chromium } = require('playwright');

async function testNavigation() {
  console.log('🚀 Starting Navigation System Tests...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Test results
  const results = {
    logo: { status: 'PENDING', message: '' },
    desktopNav: { status: 'PENDING', message: '' },
    mobileNav: { status: 'PENDING', message: '' },
    routes: { status: 'PENDING', message: '' },
    errorBoundaries: { status: 'PENDING', message: '' }
  };

  try {
    // Determine the correct URL
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3001';

    console.log(`🔍 Testing navigation on: ${baseUrl}\n`);

    // 1. Test Logo Navigation
    console.log('1. Testing Logo Navigation...');
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      
      // Check if logo exists and is clickable
      const logo = await page.$('a[href="/"]');
      if (logo) {
        await logo.click();
        await page.waitForTimeout(1000);
        
        const currentUrl = page.url();
        if (currentUrl === baseUrl || currentUrl === `${baseUrl}/`) {
          results.logo.status = 'PASS';
          results.logo.message = 'Logo properly links to homepage';
        } else {
          results.logo.status = 'FAIL';
          results.logo.message = `Logo click redirected to ${currentUrl} instead of homepage`;
        }
      } else {
        results.logo.status = 'FAIL';
        results.logo.message = 'Logo link not found';
      }
    } catch (error) {
      results.logo.status = 'FAIL';
      results.logo.message = `Logo test failed: ${error.message}`;
    }

    // 2. Test Desktop Navigation
    console.log('2. Testing Desktop Navigation...');
    try {
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      
      // Test main navigation links
      const navLinks = [
        { text: 'Home', href: '/' },
        { text: 'Artists', href: '/artists' },
        { text: 'Shows', href: '/shows' },
        { text: 'Venues', href: '/venues' },
        { text: 'Trending', href: '/trending' }
      ];

      let passedLinks = 0;
      for (const link of navLinks) {
        try {
          const navLink = await page.$(`a[href="${link.href}"]`);
          if (navLink) {
            await navLink.click();
            await page.waitForTimeout(1000);
            
            const currentUrl = page.url();
            if (currentUrl.includes(link.href) || (link.href === '/' && currentUrl === baseUrl)) {
              passedLinks++;
            }
          }
        } catch (error) {
          console.log(`  ❌ ${link.text} navigation failed: ${error.message}`);
        }
      }

      results.desktopNav.status = passedLinks === navLinks.length ? 'PASS' : 'PARTIAL';
      results.desktopNav.message = `${passedLinks}/${navLinks.length} navigation links working`;
    } catch (error) {
      results.desktopNav.status = 'FAIL';
      results.desktopNav.message = `Desktop navigation test failed: ${error.message}`;
    }

    // 3. Test Mobile Navigation
    console.log('3. Testing Mobile Navigation...');
    try {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      
      // Look for mobile menu button
      const mobileMenuButton = await page.$('[data-testid="mobile-menu"]');
      if (mobileMenuButton) {
        await mobileMenuButton.click();
        await page.waitForTimeout(500);
        
        // Check if mobile navigation opened
        const mobileNav = await page.$('[data-testid="mobile-nav"]');
        if (mobileNav) {
          results.mobileNav.status = 'PASS';
          results.mobileNav.message = 'Mobile navigation opens and closes properly';
        } else {
          results.mobileNav.status = 'FAIL';
          results.mobileNav.message = 'Mobile navigation panel not found';
        }
      } else {
        results.mobileNav.status = 'FAIL';
        results.mobileNav.message = 'Mobile menu button not found';
      }
    } catch (error) {
      results.mobileNav.status = 'FAIL';
      results.mobileNav.message = `Mobile navigation test failed: ${error.message}`;
    }

    // 4. Test Route Accessibility
    console.log('4. Testing Route Accessibility...');
    try {
      const routes = ['/artists', '/shows', '/venues', '/trending'];
      let accessibleRoutes = 0;

      for (const route of routes) {
        try {
          const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
          if (response && response.status() === 200) {
            accessibleRoutes++;
          }
        } catch (error) {
          console.log(`  ❌ Route ${route} failed: ${error.message}`);
        }
      }

      results.routes.status = accessibleRoutes === routes.length ? 'PASS' : 'PARTIAL';
      results.routes.message = `${accessibleRoutes}/${routes.length} routes accessible`;
    } catch (error) {
      results.routes.status = 'FAIL';
      results.routes.message = `Route accessibility test failed: ${error.message}`;
    }

    // 5. Test Error Boundaries
    console.log('5. Testing Error Boundaries...');
    try {
      // Test a non-existent route
      await page.goto(`${baseUrl}/non-existent-route`, { waitUntil: 'networkidle' });
      
      // Check if proper error handling is in place
      const errorContent = await page.textContent('body');
      if (errorContent && (errorContent.includes('404') || errorContent.includes('Not Found'))) {
        results.errorBoundaries.status = 'PASS';
        results.errorBoundaries.message = 'Error boundaries handling 404s properly';
      } else {
        results.errorBoundaries.status = 'PARTIAL';
        results.errorBoundaries.message = 'Error handling present but may need improvement';
      }
    } catch (error) {
      results.errorBoundaries.status = 'FAIL';
      results.errorBoundaries.message = `Error boundary test failed: ${error.message}`;
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    await browser.close();
  }

  // Print Results
  console.log('\n📊 NAVIGATION TEST RESULTS');
  console.log('=' .repeat(50));
  
  Object.entries(results).forEach(([test, result]) => {
    const icon = result.status === 'PASS' ? '✅' : 
                 result.status === 'PARTIAL' ? '⚠️' : '❌';
    const testName = test.charAt(0).toUpperCase() + test.slice(1);
    console.log(`${icon} ${testName}: ${result.message}`);
  });

  // Overall Status
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r.status === 'PASS').length;
  const partialTests = Object.values(results).filter(r => r.status === 'PARTIAL').length;
  
  console.log('\n🎯 OVERALL STATUS');
  console.log(`Passed: ${passedTests}/${totalTests}`);
  console.log(`Partial: ${partialTests}/${totalTests}`);
  console.log(`Failed: ${totalTests - passedTests - partialTests}/${totalTests}`);
  
  return results;
}

// Run if called directly
if (require.main === module) {
  testNavigation().catch(console.error);
}

module.exports = { testNavigation };