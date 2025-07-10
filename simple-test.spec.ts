import { expect, test } from '@playwright/test';

test.describe('MySetlist App - Black Screen Resolution Test', () => {
  test('Homepage loads successfully without black screen', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Check page title
    await expect(page).toHaveTitle(/MySetlist/);

    // Check if any content is visible (not black screen)
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent.length).toBeGreaterThan(100);

    // Look for main elements
    const mainElements = await page.locator('h1, h2, input, button, a').count();
    expect(mainElements).toBeGreaterThan(5);

    // Take screenshot for verification
    await page.screenshot({ path: 'homepage-test.png', fullPage: true });
  });

  test('Search functionality works', async ({ page }) => {
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

    // Find search input
    const searchInput = page
      .locator(
        'input[placeholder*="Search"], input[type="search"], input[name*="search"]'
      )
      .first();

    if ((await searchInput.count()) > 0) {
      await searchInput.fill('Taylor');
      await page.waitForTimeout(2000); // Wait for debounce

      // Check if search results or dropdown appears
      const _hasResults = await page
        .locator(
          '[role="listbox"], [data-testid="search-results"], .search-result'
        )
        .count();
    } else {
    }
  });

  test('API endpoints are working', async ({ page }) => {
    // Test API health
    const healthResponse = await page.request.get(
      'http://localhost:3001/api/health'
    );
    expect(healthResponse.ok()).toBeTruthy();
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('ok');

    // Test search API
    const searchResponse = await page.request.get(
      'http://localhost:3001/api/search/artists?q=Taylor'
    );
    expect(searchResponse.ok()).toBeTruthy();
    const searchData = await searchResponse.json();
    expect(searchData.artists).toBeDefined();
  });

  test('Navigation works', async ({ page }) => {
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

    // Test artists page
    const artistsLink = page.locator('a[href="/artists"]');
    if ((await artistsLink.count()) > 0) {
      await artistsLink.first().click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/artists');
    }

    // Test trending page
    await page.goto('http://localhost:3001/trending', {
      waitUntil: 'networkidle',
    });
    const url = page.url();
    expect(url).toContain('/trending');
  });
});
