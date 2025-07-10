import { expect, test } from '@playwright/test';

test.describe('MySetlist Homepage Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the homepage
    await page.goto('http://localhost:3001');
  });

  test('Homepage loads without black screen', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the page title is correct
    await expect(page).toHaveTitle(/MySetlist/);

    // Verify hero section is visible (no black screen)
    const heroSection = page.locator('h1, [data-testid="hero"], .hero');
    await expect(heroSection.first()).toBeVisible({ timeout: 10000 });

    // Check that main content is loaded
    const mainContent = page.locator('main, [role="main"], body');
    await expect(mainContent.first()).toBeVisible();

    // Verify no error messages are displayed
    const errorMessages = page.locator('[data-testid="error"], .error');
    await expect(errorMessages).toHaveCount(0);
  });

  test('Search functionality works', async ({ page }) => {
    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Find and interact with search input
    const searchInput = page.locator(
      'input[placeholder*="Search"], input[type="search"], [data-testid="search-input"]'
    );
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });

    // Type in search query
    await searchInput.first().fill('Taylor Swift');
    await page.waitForTimeout(1000); // Wait for debounce

    // Check if search results appear
    const searchResults = page.locator(
      '[data-testid="search-results"], .search-results, [role="listbox"]'
    );
    await expect(searchResults.first()).toBeVisible({ timeout: 5000 });
  });

  test('Navigation links work', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Test navigation to artists page
    const artistsLink = page.locator(
      'a[href="/artists"], a:has-text("Artists")'
    );
    if ((await artistsLink.count()) > 0) {
      await artistsLink.first().click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/artists');

      // Go back to homepage
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');
    }

    // Test navigation to shows page
    const showsLink = page.locator('a[href="/shows"], a:has-text("Shows")');
    if ((await showsLink.count()) > 0) {
      await showsLink.first().click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/shows');

      // Go back to homepage
      await page.goto('http://localhost:3001');
      await page.waitForLoadState('networkidle');
    }

    // Test navigation to trending page
    const trendingLink = page.locator(
      'a[href="/trending"], a:has-text("Trending")'
    );
    if ((await trendingLink.count()) > 0) {
      await trendingLink.first().click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/trending');
    }
  });

  test('Mobile navigation works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');

    // Look for mobile menu button
    const mobileMenuButton = page.locator(
      '[data-testid="mobile-menu"], button[aria-label*="menu"], .mobile-menu-button'
    );

    if ((await mobileMenuButton.count()) > 0) {
      await mobileMenuButton.first().click();

      // Check if mobile menu opens
      const mobileMenu = page.locator(
        '[data-testid="mobile-nav"], .mobile-nav, [role="dialog"]'
      );
      await expect(mobileMenu.first()).toBeVisible({ timeout: 5000 });
    } else {
    }
  });

  test('Page performance check', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Check that page loads within reasonable time (10 seconds)
    expect(loadTime).toBeLessThan(10000);
  });

  test('Search to artist page flow', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Find search input
    const searchInput = page.locator(
      'input[placeholder*="Search"], input[type="search"], [data-testid="search-input"]'
    );
    await expect(searchInput.first()).toBeVisible({ timeout: 10000 });

    // Search for an artist
    await searchInput.first().fill('Taylor Swift');
    await page.waitForTimeout(1500); // Wait for debounce and results

    // Look for search result items
    const searchResultItem = page.locator(
      '[data-testid="search-result"], .search-result, [role="option"]'
    );

    if ((await searchResultItem.count()) > 0) {
      // Click on first search result
      await searchResultItem.first().click();
      await page.waitForLoadState('networkidle');

      // Verify we're on an artist page
      const currentUrl = page.url();
      const isArtistPage =
        currentUrl.includes('/artists/') || currentUrl.includes('taylor-swift');

      expect(isArtistPage).toBeTruthy();
    } else {
    }
  });
});
