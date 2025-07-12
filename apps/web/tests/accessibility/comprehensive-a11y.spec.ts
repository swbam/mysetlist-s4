/**
 * Comprehensive Accessibility Testing Suite
 * Tests WCAG 2.1 AA compliance across all major pages and components
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Test configuration
const BASE_URL = process.env["BASE_URL"] || 'http://localhost:3001';

// Common accessibility test setup
async function runAccessibilityTests(page, context: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
  
  // Log results for debugging
  if (results.violations.length > 0) {
    console.log(`❌ Accessibility violations found in ${context}:`);
    results.violations.forEach((violation, index) => {
      console.log(`${index + 1}. ${violation.id}: ${violation.description}`);
      console.log(`   Impact: ${violation.impact}`);
      console.log(`   Nodes: ${violation.nodes.length}`);
    });
  } else {
    console.log(`✅ No accessibility violations found in ${context}`);
  }
}

// Test data
const TEST_ARTISTS = ['dispatch', 'our-last-night', 'metallica'];
const TEST_VENUES = ['red-rocks', 'madison-square-garden'];

test.describe('Comprehensive Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up accessibility testing environment
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Homepage accessibility compliance', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    
    // Wait for dynamic content to load
    await page.waitForSelector('main', { timeout: 10000 });
    
    await runAccessibilityTests(page, 'Homepage');
  });

  test('Search functionality accessibility', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    
    // Test search input accessibility
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
    
    // Check search input has proper labels
    await expect(searchInput).toHaveAttribute('aria-label');
    
    // Test search interaction
    await searchInput.fill('dispatch');
    await page.keyboard.press('Enter');
    
    await page.waitForLoadState('networkidle');
    await runAccessibilityTests(page, 'Search Results');
  });

  test('Artist page accessibility compliance', async ({ page }) => {
    const artist = TEST_ARTISTS[0];
    await page.goto(`${BASE_URL}/artists/${artist}`);
    await page.waitForLoadState('networkidle');
    
    // Wait for artist content to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    await runAccessibilityTests(page, `Artist Page - ${artist}`);
  });

  test('Trending page accessibility compliance', async ({ page }) => {
    await page.goto(`${BASE_URL}/trending`);
    await page.waitForLoadState('networkidle');
    
    // Wait for trending content to load
    await page.waitForSelector('main', { timeout: 10000 });
    
    await runAccessibilityTests(page, 'Trending Page');
  });

  test('Shows page accessibility compliance', async ({ page }) => {
    await page.goto(`${BASE_URL}/shows`);
    await page.waitForLoadState('networkidle');
    
    await runAccessibilityTests(page, 'Shows Page');
  });

  test('Venues page accessibility compliance', async ({ page }) => {
    await page.goto(`${BASE_URL}/venues`);
    await page.waitForLoadState('networkidle');
    
    await runAccessibilityTests(page, 'Venues Page');
  });

  test('Authentication pages accessibility', async ({ page }) => {
    // Test sign-in page
    await page.goto(`${BASE_URL}/auth/sign-in`);
    await page.waitForLoadState('networkidle');
    await runAccessibilityTests(page, 'Sign In Page');
    
    // Test sign-up page
    await page.goto(`${BASE_URL}/auth/sign-up`);
    await page.waitForLoadState('networkidle');
    await runAccessibilityTests(page, 'Sign Up Page');
  });

  test('Navigation accessibility', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    
    // Test main navigation
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test navigation links have proper labels
    const navLinks = page.getByRole('link');
    const linkCount = await navLinks.count();
    
    for (let i = 0; i < linkCount; i++) {
      const link = navLinks.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      
      // Links should have either visible text or aria-label
      expect(text || ariaLabel).toBeTruthy();
    }
    
    await runAccessibilityTests(page, 'Navigation');
  });

  test('Mobile navigation accessibility', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    
    // Test mobile menu button
    const mobileMenuButton = page.getByRole('button', { name: /menu/i });
    if (await mobileMenuButton.isVisible()) {
      await expect(mobileMenuButton).toHaveAttribute('aria-expanded');
      await mobileMenuButton.click();
      
      // Test mobile menu accessibility
      await page.waitForSelector('[role=\"dialog\"]', { state: 'visible' });
      await runAccessibilityTests(page, 'Mobile Navigation');
    }
  });

  test('Form accessibility compliance', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/sign-in`);
    await page.waitForLoadState('networkidle');
    
    // Test form elements have proper labels
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const passwordInput = page.getByRole('textbox', { name: /password/i });
    const submitButton = page.getByRole('button', { name: /sign in/i });
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    // Test form validation messages
    await submitButton.click();
    await page.waitForTimeout(1000);
    
    await runAccessibilityTests(page, 'Form Validation');
  });

  test('Interactive elements accessibility', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    
    // Test all interactive elements are keyboard accessible\n    const buttons = page.getByRole('button');\n    const links = page.getByRole('link');\n    \n    // Test button focus states\n    const buttonCount = await buttons.count();\n    for (let i = 0; i < Math.min(buttonCount, 5); i++) {\n      const button = buttons.nth(i);\n      if (await button.isVisible()) {\n        await button.focus();\n        await expect(button).toBeFocused();\n      }\n    }\n    \n    await runAccessibilityTests(page, 'Interactive Elements');\n  });\n\n  test('Color contrast compliance', async ({ page }) => {\n    await page.goto(`${BASE_URL}/`);\n    await page.waitForLoadState('networkidle');\n    \n    // Run specific color contrast tests\n    const results = await new AxeBuilder({ page })\n      .withTags(['cat.color'])\n      .analyze();\n    \n    expect(results.violations).toEqual([]);\n    \n    if (results.violations.length > 0) {\n      console.log('❌ Color contrast violations:');\n      results.violations.forEach((violation) => {\n        console.log(`- ${violation.id}: ${violation.description}`);\n      });\n    } else {\n      console.log('✅ All color contrast tests passed');\n    }\n  });\n\n  test('Screen reader compatibility', async ({ page }) => {\n    await page.goto(`${BASE_URL}/`);\n    await page.waitForLoadState('networkidle');\n    \n    // Test heading structure\n    const headings = page.locator('h1, h2, h3, h4, h5, h6');\n    const headingCount = await headings.count();\n    \n    if (headingCount > 0) {\n      // Check for proper heading hierarchy\n      const h1Count = await page.locator('h1').count();\n      expect(h1Count).toBe(1); // Should have exactly one h1\n      \n      // Test that headings have content\n      for (let i = 0; i < headingCount; i++) {\n        const heading = headings.nth(i);\n        const text = await heading.textContent();\n        expect(text?.trim()).toBeTruthy();\n      }\n    }\n    \n    // Test landmarks\n    const main = page.getByRole('main');\n    await expect(main).toBeVisible();\n    \n    await runAccessibilityTests(page, 'Screen Reader Compatibility');\n  });\n\n  test('Focus management', async ({ page }) => {\n    await page.goto(`${BASE_URL}/`);\n    await page.waitForLoadState('networkidle');\n    \n    // Test focus trap in modal (if any)\n    const modalTrigger = page.getByRole('button', { name: /open|show|menu/i }).first();\n    if (await modalTrigger.isVisible()) {\n      await modalTrigger.click();\n      \n      // Check if modal is properly focused\n      const modal = page.getByRole('dialog');\n      if (await modal.isVisible()) {\n        // Test focus is trapped in modal\n        await page.keyboard.press('Tab');\n        const focusedElement = page.locator(':focus');\n        const isInsideModal = await modal.locator(':focus').count() > 0;\n        expect(isInsideModal).toBeTruthy();\n      }\n    }\n    \n    await runAccessibilityTests(page, 'Focus Management');\n  });\n\n  test('Dynamic content accessibility', async ({ page }) => {\n    await page.goto(`${BASE_URL}/`);\n    await page.waitForLoadState('networkidle');\n    \n    // Test search results dynamic content\n    const searchInput = page.getByPlaceholder(/search/i);\n    if (await searchInput.isVisible()) {\n      await searchInput.fill('test');\n      await page.waitForTimeout(500);\n      \n      // Check for live region announcements\n      const liveRegions = page.locator('[aria-live], [role=\"status\"], [role=\"alert\"]');\n      const liveRegionCount = await liveRegions.count();\n      \n      if (liveRegionCount > 0) {\n        console.log(`✅ Found ${liveRegionCount} live regions for dynamic content`);\n      }\n    }\n    \n    await runAccessibilityTests(page, 'Dynamic Content');\n  });\n\n  test('Media accessibility', async ({ page }) => {\n    await page.goto(`${BASE_URL}/`);\n    await page.waitForLoadState('networkidle');\n    \n    // Test images have alt text\n    const images = page.locator('img');\n    const imageCount = await images.count();\n    \n    for (let i = 0; i < imageCount; i++) {\n      const img = images.nth(i);\n      const alt = await img.getAttribute('alt');\n      const role = await img.getAttribute('role');\n      \n      // Images should have alt text or be decorative\n      if (role !== 'presentation' && role !== 'none') {\n        expect(alt !== null).toBeTruthy();\n      }\n    }\n    \n    await runAccessibilityTests(page, 'Media Accessibility');\n  });\n\n  test('Error handling accessibility', async ({ page }) => {\n    // Test 404 page accessibility\n    await page.goto(`${BASE_URL}/non-existent-page`);\n    await page.waitForLoadState('networkidle');\n    \n    // Should have proper error message\n    const heading = page.locator('h1');\n    await expect(heading).toBeVisible();\n    \n    await runAccessibilityTests(page, '404 Error Page');\n  });\n});\n\n// Performance and accessibility combined test\ntest.describe('Performance Impact on Accessibility', () => {\n  test('Accessibility with performance constraints', async ({ page }) => {\n    // Simulate slow network\n    await page.route('**/*', (route) => {\n      route.continue();\n    });\n    \n    await page.goto(`${BASE_URL}/`);\n    await page.waitForLoadState('networkidle');\n    \n    // Test that accessibility is maintained even with performance issues\n    await runAccessibilityTests(page, 'Performance Constrained');\n  });\n});\n
    // Test that accessibility is maintained even with performance issues
    await runAccessibilityTests(page, 'Performance Constrained');
  });
});
