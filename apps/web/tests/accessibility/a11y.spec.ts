import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Helper function to check accessibility
async function checkAccessibility(page: any, pageName: string) {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
}

test.describe('Accessibility Tests', () => {
  test('Homepage should have no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await checkAccessibility(page, 'Homepage');
  });

  test('Trending page should have no accessibility violations', async ({
    page,
  }) => {
    await page.goto('/trending');
    await page.waitForLoadState('networkidle');

    await checkAccessibility(page, 'Trending');
  });

  test('Search functionality should be accessible', async ({ page }) => {
    await page.goto('/');

    // Check search input has proper label
    const searchInput = page.locator('[data-cy=search-input]');
    await expect(searchInput).toHaveAttribute('aria-label');

    // Check search results are announced
    await searchInput.fill('Taylor Swift');
    await page.waitForSelector('[data-cy=search-results]');

    const searchResults = page.locator('[data-cy=search-results]');
    await expect(searchResults).toHaveAttribute('role', 'listbox');

    await checkAccessibility(page, 'Search Results');
  });

  test('Navigation should be keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Tab through navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Check focus is visible
    const activeElement = page.locator(':focus');
    await expect(activeElement).toBeVisible();
    await expect(activeElement).toHaveCSS('outline-style', /solid|auto/);

    // Navigate with keyboard
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/trending|artists/);
  });

  test('Forms should have proper labels', async ({ page }) => {
    await page.goto('/');

    // Check all form inputs have labels
    const inputs = await page.locator('input:not([type="hidden"])').all();
    for (const input of inputs) {
      const inputId = await input.getAttribute('id');
      if (inputId) {
        const label = page.locator(`label[for="${inputId}"]`);
        const hasLabel = (await label.count()) > 0;
        const hasAriaLabel = await input.getAttribute('aria-label');

        expect(hasLabel || hasAriaLabel).toBeTruthy();
      }
    }
  });

  test('Images should have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check all images have alt text
    const images = await page.locator('img').all();
    for (const image of images) {
      const altText = await image.getAttribute('alt');
      expect(altText).toBeTruthy();
    }
  });

  test('Color contrast should meet WCAG standards', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include(['color-contrast'])
      .analyze();

    expect(results.violations.filter((v) => v.id === 'color-contrast')).toEqual(
      []
    );
  });

  test('Focus management in modals', async ({ page }) => {
    await page.goto('/');

    // Trigger a modal (if any)
    const modalTrigger = page.locator('[data-cy=open-modal]');
    if ((await modalTrigger.count()) > 0) {
      await modalTrigger.click();

      // Check focus is trapped in modal
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Check modal has proper ARIA attributes
      await expect(modal).toHaveAttribute('aria-modal', 'true');
      await expect(modal).toHaveAttribute('aria-labelledby');

      // Check escape key closes modal
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
    }
  });

  test('Responsive design maintains accessibility', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await checkAccessibility(page, 'Mobile Homepage');

    // Check mobile menu is accessible
    const mobileMenuButton = page.locator('[data-cy=mobile-menu-toggle]');
    if ((await mobileMenuButton.count()) > 0) {
      await expect(mobileMenuButton).toHaveAttribute('aria-label');
      await expect(mobileMenuButton).toHaveAttribute('aria-expanded');

      await mobileMenuButton.click();
      const mobileMenu = page.locator('[data-cy=mobile-menu]');
      await expect(mobileMenu).toBeVisible();

      await checkAccessibility(page, 'Mobile Menu');
    }
  });

  test('Error messages are accessible', async ({ page }) => {
    await page.goto('/');

    // Trigger an error (e.g., empty search)
    const searchInput = page.locator('[data-cy=search-input]');
    await searchInput.fill('');
    await searchInput.press('Enter');

    const errorMessage = page.locator('[role="alert"]');
    if ((await errorMessage.count()) > 0) {
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toHaveAttribute('aria-live', 'polite');
    }
  });
});
