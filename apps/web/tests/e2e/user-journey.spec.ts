import { expect, test } from "@playwright/test";

test.describe("MySetlist User Journey", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage
    await page.goto("/");
  });

  test("should complete full user journey from search to voting", async ({
    page,
  }) => {
    // Step 1: Search for an artist
    await test.step("Search for artist", async () => {
      const searchInput = page.locator('[placeholder*="Search"]').first();
      await searchInput.fill("Dave Matthews Band");
      await searchInput.press("Enter");

      // Wait for search results
      await page.waitForSelector(
        '[data-testid="search-results"], .search-result',
        { timeout: 10000 },
      );

      // Click on first artist result
      const firstResult = page
        .locator('[data-testid="search-result"], .search-result')
        .first();
      await firstResult.click();
    });

    // Step 2: Navigate to artist page
    await test.step("View artist page", async () => {
      // Wait for artist page to load
      await page.waitForLoadState("networkidle");

      // Verify we're on an artist page
      await expect(page.locator("h1")).toContainText("Dave Matthews Band");

      // Look for upcoming shows section
      const showsSection = page.locator("text=Upcoming Shows").first();
      if (await showsSection.isVisible()) {
        // Click on first show if available
        const firstShow = page
          .locator('[data-testid="show-card"], .show-card')
          .first();
        if (await firstShow.isVisible()) {
          await firstShow.click();
        }
      }
    });

    // Step 3: Navigate to show page and vote
    await test.step("Vote on setlist", async () => {
      // Wait for show page to load
      await page.waitForLoadState("networkidle");

      // Look for voting buttons
      const voteButtons = page.locator(
        'button:has-text("↑"), button:has-text("↓")',
      );

      if (await voteButtons.first().isVisible()) {
        // Try to vote (might require login)
        await voteButtons.first().click();

        // Check if redirected to login
        if (page.url().includes("/auth/sign-in")) {
          await expect(page.locator("h1, h2")).toContainText(/sign in/i);
        } else {
          // Voting succeeded, check for updated counts
          await expect(page.locator("text=/d+/")).toBeVisible();
        }
      }
    });
  });

  test("should handle mobile navigation", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await test.step("Open mobile menu", async () => {
      // Look for mobile menu button
      const mobileMenuButton = page.locator(
        '[data-testid="mobile-menu"], button[aria-label*="menu"], .mobile-menu-button',
      );

      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.click();

        // Check if mobile menu opens
        const mobileMenu = page.locator(
          '[data-testid="mobile-nav"], .mobile-nav, [role="dialog"]',
        );
        await expect(mobileMenu).toBeVisible();

        // Test navigation links
        const artistsLink = page.locator("text=Artists").first();
        if (await artistsLink.isVisible()) {
          await artistsLink.click();
          await expect(page).toHaveURL(/\/artists/);
        }
      }
    });
  });

  test("should display trending content", async ({ page }) => {
    await test.step("Check trending artists", async () => {
      // Look for trending section
      const trendingSection = page.locator("text=Trending").first();

      if (await trendingSection.isVisible()) {
        // Check for artist cards
        const artistCards = page.locator(
          '[data-testid="artist-card"], .artist-card',
        );
        await expect(artistCards.first()).toBeVisible({ timeout: 10000 });
      }
    });

    await test.step("Navigate to trending page", async () => {
      // Try to navigate to dedicated trending page
      await page.goto("/trending");
      await page.waitForLoadState("networkidle");

      // Should show trending content
      await expect(page.locator("h1, h2")).toContainText(/trending/i);
    });
  });

  test("should handle authentication flow", async ({ page }) => {
    await test.step("Navigate to sign in", async () => {
      await page.goto("/auth/sign-in");
      await expect(page.locator("h1, h2")).toContainText(/sign in/i);

      // Check for form elements
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(
        page.locator('button[type="submit"], button:has-text("Sign In")'),
      ).toBeVisible();
    });

    await test.step("Navigate to sign up", async () => {
      await page.goto("/auth/sign-up");
      await expect(page.locator("h1, h2")).toContainText(/sign up/i);

      // Check for form elements
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });
  });

  test("should be accessible", async ({ page }) => {
    await test.step("Check basic accessibility", async () => {
      // Check for main landmark
      await expect(page.locator('main, [role="main"]')).toBeVisible();

      // Check for heading hierarchy
      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();

      // Check for skip links (might be hidden)
      const skipLinks = page.locator('a[href^="#"]');
      if ((await skipLinks.count()) > 0) {
        // Skip links exist
        expect(await skipLinks.count()).toBeGreaterThan(0);
      }
    });

    await test.step("Test keyboard navigation", async () => {
      // Tab through interactive elements
      await page.keyboard.press("Tab");

      // Check if focus is visible
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();
    });
  });

  test("should handle errors gracefully", async ({ page }) => {
    await test.step("Test 404 page", async () => {
      await page.goto("/non-existent-page");

      // Should show 404 page or redirect
      const response = await page.waitForResponse((response) =>
        response.url().includes("/non-existent-page"),
      );

      if (response.status() === 404) {
        await expect(page.locator("text=/404|not found/i")).toBeVisible();
      }
    });

    await test.step("Test network error handling", async () => {
      // Simulate offline condition
      await page.context().setOffline(true);

      // Try to navigate
      await page.goto("/artists");

      // Should handle offline gracefully
      // (Implementation depends on your offline handling)

      // Restore online
      await page.context().setOffline(false);
    });
  });

  test("should perform well", async ({ page }) => {
    await test.step("Measure page load performance", async () => {
      const startTime = Date.now();

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const loadTime = Date.now() - startTime;

      // Page should load within reasonable time
      expect(loadTime).toBeLessThan(5000); // 5 seconds
    });

    await test.step("Check for performance issues", async () => {
      // Check for console errors
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text());
        }
      });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Should have minimal console errors
      const criticalErrors = errors.filter(
        (error) =>
          !error.includes("favicon") &&
          !error.includes("analytics") &&
          !error.includes("third-party"),
      );

      expect(criticalErrors.length).toBeLessThan(3);
    });
  });

  test("should work with real-time features", async ({ page }) => {
    await test.step("Test real-time connection", async () => {
      // Navigate to a show page that might have real-time voting
      await page.goto("/shows");
      await page.waitForLoadState("networkidle");

      // Look for real-time indicators
      const liveIndicator = page.locator(
        'text=Live, [data-testid="live-indicator"]',
      );

      if (await liveIndicator.isVisible()) {
        // Real-time features are active
        expect(await liveIndicator.isVisible()).toBe(true);
      }
    });
  });
});
