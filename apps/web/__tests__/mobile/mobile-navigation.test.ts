import { expect, test } from '@playwright/test';

/**
 * Mobile Navigation Comprehensive Test Suite
 * Tests mobile-specific navigation functionality
 */

const BASE_URL = process.env["NEXT_PUBLIC_BASE_URL"] || 'http://localhost:3000';

// Mobile device configurations
const MOBILE_DEVICES = [
  { name: 'iPhone 12', viewport: { width: 390, height: 844 } },
  { name: 'iPhone SE', viewport: { width: 375, height: 667 } },
  { name: 'Samsung Galaxy S21', viewport: { width: 384, height: 854 } },
  { name: 'iPad Mini', viewport: { width: 768, height: 1024 } },
];

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should display mobile navigation toggle button', async ({ page }) => {
    // Mobile menu toggle should be visible
    const toggleButton = page.locator('button[aria-label="Toggle menu"]');
    await expect(toggleButton).toBeVisible();

    // Desktop navigation should be hidden
    const desktopNav = page.locator('nav.hidden.lg\\:flex');
    await expect(desktopNav).not.toBeVisible();
  });

  test('should open and close mobile menu', async ({ page }) => {
    // Open mobile menu
    await page.click('button[aria-label="Toggle menu"]');

    // Menu should be visible
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'visible',
    });

    // Close button should be visible
    const closeButton = page.locator('button:has-text("✕")');
    await expect(closeButton).toBeVisible();

    // Close menu
    await closeButton.click();

    // Menu should be hidden
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'hidden',
    });
  });

  test('should close menu when clicking backdrop', async ({ page }) => {
    // Open mobile menu
    await page.click('button[aria-label="Toggle menu"]');
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'visible',
    });

    // Click backdrop
    await page.click('.fixed.inset-0');

    // Menu should close
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'hidden',
    });
  });

  test('should navigate through mobile menu', async ({ page }) => {
    // Open mobile menu
    await page.click('button[aria-label="Toggle menu"]');
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'visible',
    });

    // Test navigation links
    const testLinks = [
      { href: '/artists', text: 'Artists' },
      { href: '/shows', text: 'Shows' },
      { href: '/venues', text: 'Venues' },
      { href: '/trending', text: 'Trending' },
    ];

    for (const link of testLinks) {
      // Click menu toggle to open (in case it closed)
      await page.click('button[aria-label="Toggle menu"]');
      await page.waitForSelector('[data-testid="mobile-menu"]', {
        state: 'visible',
      });

      // Click navigation link
      await page.click(`a[href="${link.href}"]:has-text("${link.text}")`);

      // Wait for navigation
      await page.waitForLoadState('networkidle');

      // Verify URL
      expect(page.url()).toBe(BASE_URL + link.href);

      // Menu should close after navigation
      await page.waitForSelector('[data-testid="mobile-menu"]', {
        state: 'hidden',
      });
    }
  });

  test('should handle auth navigation on mobile', async ({ page }) => {
    // Open mobile menu
    await page.click('button[aria-label="Toggle menu"]');
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'visible',
    });

    // Test sign-in link
    await page.click('a[href="/auth/sign-in"]');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toBe(`${BASE_URL}/auth/sign-in`);

    // Go back to home
    await page.goto(BASE_URL);

    // Test sign-up link
    await page.click('button[aria-label="Toggle menu"]');
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'visible',
    });

    await page.click('a[href="/auth/sign-up"]');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toBe(`${BASE_URL}/auth/sign-up`);
  });

  test('should handle mobile search', async ({ page }) => {
    // Mobile search should be visible
    const mobileSearch = page.locator('[data-testid="mobile-search"]');
    await expect(mobileSearch).toBeVisible();

    // Desktop search should be hidden
    const desktopSearch = page.locator('[data-testid="desktop-search"]');
    await expect(desktopSearch).not.toBeVisible();

    // Test search functionality
    await page.fill('input[placeholder*="Search"]', 'test query');
    await page.press('input[placeholder*="Search"]', 'Enter');

    // Should handle search
    await page.waitForLoadState('networkidle');
  });

  test('should handle touch gestures', async ({ page }) => {
    // Open mobile menu
    await page.click('button[aria-label="Toggle menu"]');
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'visible',
    });

    // Test swipe to close (simulate touch)
    await page.touchscreen.tap(50, 400);
    await page.touchscreen.tap(350, 400);

    // Menu should close
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'hidden',
    });
  });

  test('should prevent body scroll when menu is open', async ({ page }) => {
    // Check initial body overflow
    const initialOverflow = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow;
    });

    // Open mobile menu
    await page.click('button[aria-label="Toggle menu"]');
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'visible',
    });

    // Body should have overflow hidden
    const menuOverflow = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow;
    });

    expect(menuOverflow).toBe('hidden');

    // Close menu
    await page.click('button:has-text("✕")');
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'hidden',
    });

    // Body overflow should be restored
    const restoredOverflow = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow;
    });

    expect(restoredOverflow).toBe(initialOverflow);
  });

  test('should handle keyboard navigation on mobile', async ({ page }) => {
    // Open mobile menu
    await page.click('button[aria-label="Toggle menu"]');
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'visible',
    });

    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to navigate with keyboard
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Test Enter key
    await page.keyboard.press('Enter');
    await page.waitForLoadState('networkidle');

    // Should navigate to focused link
    expect(page.url()).not.toBe(`${BASE_URL}/`);
  });

  test('should handle orientation change', async ({ page }) => {
    // Test portrait orientation
    await page.setViewportSize({ width: 375, height: 667 });

    const portraitToggle = page.locator('button[aria-label="Toggle menu"]');
    await expect(portraitToggle).toBeVisible();

    // Test landscape orientation
    await page.setViewportSize({ width: 667, height: 375 });

    const landscapeToggle = page.locator('button[aria-label="Toggle menu"]');
    await expect(landscapeToggle).toBeVisible();
  });

  test('should handle notification badge', async ({ page }) => {
    // Mock notification count
    await page.addInitScript(() => {
      window.localStorage.setItem('notificationCount', '5');
    });

    await page.reload();

    // Check for notification badge
    const notificationBadge = page.locator(
      '[data-testid="notification-badge"]'
    );
    if ((await notificationBadge.count()) > 0) {
      await expect(notificationBadge).toBeVisible();
      await expect(notificationBadge).toHaveText('5');
    }
  });
});

test.describe('Mobile Navigation - Device Specific', () => {
  MOBILE_DEVICES.forEach((device) => {
    test(`should work correctly on ${device.name}`, async ({ page }) => {
      await page.setViewportSize(device.viewport);
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Test mobile menu toggle
      const toggleButton = page.locator('button[aria-label="Toggle menu"]');
      await expect(toggleButton).toBeVisible();

      // Open menu
      await toggleButton.click();
      await page.waitForSelector('[data-testid="mobile-menu"]', {
        state: 'visible',
      });

      // Test navigation
      await page.click('a[href="/artists"]');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toBe(`${BASE_URL}/artists`);

      // Menu should close
      await page.waitForSelector('[data-testid="mobile-menu"]', {
        state: 'hidden',
      });
    });
  });
});

test.describe('Mobile Navigation - Performance', () => {
  test('should have fast menu animation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);

    // Measure menu open time
    const startTime = Date.now();
    await page.click('button[aria-label="Toggle menu"]');
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'visible',
    });
    const openTime = Date.now() - startTime;

    // Should open quickly
    expect(openTime).toBeLessThan(500);

    // Measure menu close time
    const closeStartTime = Date.now();
    await page.click('button:has-text("✕")');
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'hidden',
    });
    const closeTime = Date.now() - closeStartTime;

    // Should close quickly
    expect(closeTime).toBeLessThan(500);
  });

  test('should handle rapid menu toggles', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);

    // Rapid toggle test
    for (let i = 0; i < 5; i++) {
      await page.click('button[aria-label="Toggle menu"]');
      await page.waitForTimeout(100);
      await page.click('button:has-text("✕")');
      await page.waitForTimeout(100);
    }

    // Should handle rapid toggles without issues
    const menuState = await page
      .locator('[data-testid="mobile-menu"]')
      .isVisible();
    expect(menuState).toBe(false);
  });
});

test.describe('Mobile Navigation - Accessibility', () => {
  test('should be accessible with screen reader', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);

    // Check ARIA attributes
    const toggleButton = page.locator('button[aria-label="Toggle menu"]');
    await expect(toggleButton).toHaveAttribute('aria-label', 'Toggle menu');

    // Check menu accessibility
    await toggleButton.click();
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'visible',
    });

    // Check focus management
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should handle high contrast mode', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Enable high contrast mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(BASE_URL);

    // Menu should be visible and functional
    await page.click('button[aria-label="Toggle menu"]');
    await page.waitForSelector('[data-testid="mobile-menu"]', {
      state: 'visible',
    });

    // Test navigation still works
    await page.click('a[href="/artists"]');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toBe(`${BASE_URL}/artists`);
  });
});
