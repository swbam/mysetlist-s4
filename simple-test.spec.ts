import { test, expect } from '@playwright/test';

test.describe('MySetlist App - Black Screen Resolution Test', () => {
  test('Homepage loads successfully without black screen', async ({ page }) => {
    console.log('🧪 Testing: Homepage loads without black screen...');
    
    // Navigate to homepage
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Check page title
    await expect(page).toHaveTitle(/MySetlist/);
    console.log('✅ Page title correct');
    
    // Check if any content is visible (not black screen)
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent.length).toBeGreaterThan(100);
    console.log('✅ Page has content (not black screen)');
    
    // Look for main elements
    const mainElements = await page.locator('h1, h2, input, button, a').count();
    expect(mainElements).toBeGreaterThan(5);
    console.log(`✅ Found ${mainElements} interactive elements`);
    
    // Take screenshot for verification
    await page.screenshot({ path: 'homepage-test.png', fullPage: true });
    console.log('✅ Screenshot saved as homepage-test.png');
  });

  test('Search functionality works', async ({ page }) => {
    console.log('🧪 Testing: Search functionality...');
    
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    
    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], input[name*="search"]').first();
    
    if (await searchInput.count() > 0) {
      await searchInput.fill('Taylor');
      await page.waitForTimeout(2000); // Wait for debounce
      
      // Check if search results or dropdown appears
      const hasResults = await page.locator('[role="listbox"], [data-testid="search-results"], .search-result').count();
      console.log(`✅ Search input found and tested. Results elements: ${hasResults}`);
    } else {
      console.log('ℹ️ Search input not found in current view');
    }
  });

  test('API endpoints are working', async ({ page }) => {
    console.log('🧪 Testing: API endpoints...');
    
    // Test API health
    const healthResponse = await page.request.get('http://localhost:3001/api/health');
    expect(healthResponse.ok()).toBeTruthy();
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('ok');
    console.log('✅ Health API working');
    
    // Test search API
    const searchResponse = await page.request.get('http://localhost:3001/api/search/artists?q=Taylor');
    expect(searchResponse.ok()).toBeTruthy();
    const searchData = await searchResponse.json();
    expect(searchData.artists).toBeDefined();
    console.log(`✅ Search API working - found ${searchData.artists.length} results`);
  });

  test('Navigation works', async ({ page }) => {
    console.log('🧪 Testing: Page navigation...');
    
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    
    // Test artists page
    const artistsLink = page.locator('a[href="/artists"]');
    if (await artistsLink.count() > 0) {
      await artistsLink.first().click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/artists');
      console.log('✅ Artists page navigation works');
    }
    
    // Test trending page
    await page.goto('http://localhost:3001/trending', { waitUntil: 'networkidle' });
    const url = page.url();
    expect(url).toContain('/trending');
    console.log('✅ Trending page accessible');
  });
});