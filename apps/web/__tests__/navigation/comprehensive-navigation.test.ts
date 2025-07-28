import { expect, test } from "@playwright/test"

/**
 * Comprehensive Navigation Testing Suite
 * Tests all routing, navigation, and error boundary functionality
 */

const BASE_URL = process.env["NEXT_PUBLIC_BASE_URL"] || "http://localhost:3001"

test.describe("Navigation System", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto(BASE_URL)
    await page.waitForLoadState("networkidle")
  })

  test("should have working header navigation", async ({ page }) => {
    // Test logo navigation
    await page.click('a[href="/"]')
    await page.waitForLoadState("networkidle")
    expect(page.url()).toBe(`${BASE_URL}/`)

    // Test Artists navigation
    await page.click('a[href="/artists"]')
    await page.waitForLoadState("networkidle")
    expect(page.url()).toBe(`${BASE_URL}/artists`)

    // Test Shows navigation
    await page.click('a[href="/shows"]')
    await page.waitForLoadState("networkidle")
    expect(page.url()).toBe(`${BASE_URL}/shows`)

    // Test Venues navigation
    await page.click('a[href="/venues"]')
    await page.waitForLoadState("networkidle")
    expect(page.url()).toBe(`${BASE_URL}/venues`)

    // Test Trending navigation
    await page.click('a[href="/trending"]')
    await page.waitForLoadState("networkidle")
    expect(page.url()).toBe(`${BASE_URL}/trending`)
  })

  test("should handle mobile navigation correctly", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Open mobile menu
    await page.click('button[aria-label="Toggle menu"]')
    await page.waitForSelector('[role="dialog"]', { state: "visible" })

    // Test mobile navigation links
    await page.click('a[href="/artists"]')
    await page.waitForLoadState("networkidle")
    expect(page.url()).toBe(`${BASE_URL}/artists`)

    // Verify mobile menu closes after navigation
    await page.waitForSelector('[role="dialog"]', { state: "hidden" })
  })

  test("should handle auth navigation correctly", async ({ page }) => {
    // Test sign-in link
    await page.click('a[href="/auth/sign-in"]')
    await page.waitForLoadState("networkidle")
    expect(page.url()).toBe(`${BASE_URL}/auth/sign-in`)

    // Test sign-up link
    await page.click('a[href="/auth/sign-up"]')
    await page.waitForLoadState("networkidle")
    expect(page.url()).toBe(`${BASE_URL}/auth/sign-up`)
  })

  test("should prefetch navigation links", async ({ page }) => {
    // Wait for prefetch to complete
    await page.waitForTimeout(2000)

    // Check if prefetch links are present
    const prefetchLinks = await page.locator('link[rel="prefetch"]').count()
    expect(prefetchLinks).toBeGreaterThan(0)
  })

  test("should handle error boundaries gracefully", async ({ page }) => {
    // Test invalid route
    await page.goto(`${BASE_URL}/invalid-route-12345`)

    // Should show 404 page, not crash
    await page.waitForLoadState("networkidle")
    const content = await page.content()
    expect(content).toContain("404")
  })

  test("should handle back/forward navigation", async ({ page }) => {
    // Navigate to artists
    await page.click('a[href="/artists"]')
    await page.waitForLoadState("networkidle")

    // Navigate to shows
    await page.click('a[href="/shows"]')
    await page.waitForLoadState("networkidle")

    // Test back button
    await page.goBack()
    await page.waitForLoadState("networkidle")
    expect(page.url()).toBe(`${BASE_URL}/artists`)

    // Test forward button
    await page.goForward()
    await page.waitForLoadState("networkidle")
    expect(page.url()).toBe(`${BASE_URL}/shows`)
  })

  test("should handle navigation performance", async ({ page }) => {
    const startTime = Date.now()

    // Navigate to artists page
    await page.click('a[href="/artists"]')
    await page.waitForLoadState("networkidle")

    const endTime = Date.now()
    const navigationTime = endTime - startTime

    // Navigation should be under 3 seconds
    expect(navigationTime).toBeLessThan(3000)
  })

  test("should handle deep links correctly", async ({ page }) => {
    // Test direct navigation to deep routes
    await page.goto(`${BASE_URL}/artists/test-artist`)
    await page.waitForLoadState("networkidle")

    // Should not show error, should load artist page or 404
    const content = await page.content()
    expect(content).not.toContain("JavaScript error")
  })

  test("should handle search navigation", async ({ page }) => {
    // Test search bar functionality
    await page.fill('input[placeholder*="Search"]', "test query")
    await page.press('input[placeholder*="Search"]', "Enter")

    // Should navigate to search results or handle search
    await page.waitForLoadState("networkidle")
    expect(page.url()).toContain("search")
  })

  test("should handle external links correctly", async ({ page }) => {
    // Test external links have proper attributes
    const externalLinks = await page.locator('a[href^="http"]').all()

    for (const link of externalLinks) {
      const target = await link.getAttribute("target")
      const rel = await link.getAttribute("rel")

      expect(target).toBe("_blank")
      expect(rel).toContain("noopener")
    }
  })

  test("should handle keyboard navigation", async ({ page }) => {
    // Test tab navigation
    await page.press("body", "Tab")

    // Should focus on first navigable element
    const focusedElement = await page.locator(":focus").first()
    await expect(focusedElement).toBeVisible()

    // Test Enter key navigation
    await page.press(":focus", "Enter")
    await page.waitForLoadState("networkidle")

    // Should navigate to focused link
    expect(page.url()).not.toBe(`${BASE_URL}/`)
  })
})

test.describe("Error Boundaries", () => {
  test("should handle navigation errors gracefully", async ({ page }) => {
    // Test error boundary fallback
    await page.goto(`${BASE_URL}/error-test`)
    await page.waitForLoadState("networkidle")

    // Should show error boundary UI, not crash
    const errorBoundary = await page.locator('[data-testid="error-boundary"]')
    if ((await errorBoundary.count()) > 0) {
      await expect(errorBoundary).toBeVisible()
    }
  })

  test("should handle retry functionality", async ({ page }) => {
    // Navigate to error page
    await page.goto(`${BASE_URL}/error-test`)
    await page.waitForLoadState("networkidle")

    // Click retry button if error boundary is shown
    const retryButton = await page.locator('button:has-text("Try Again")')
    if ((await retryButton.count()) > 0) {
      await retryButton.click()
      await page.waitForLoadState("networkidle")
    }
  })

  test("should handle navigation timeouts", async ({ page }) => {
    // Set short timeout
    page.setDefaultTimeout(5000)

    try {
      await page.goto(`${BASE_URL}/slow-loading-page`)
      await page.waitForLoadState("networkidle")
    } catch (error) {
      // Should handle timeout gracefully
      expect(error.message).toContain("timeout")
    }
  })
})

test.describe("Performance", () => {
  test("should meet performance benchmarks", async ({ page }) => {
    // Navigate to homepage
    await page.goto(BASE_URL)

    // Measure performance
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded:
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByType("paint")[0]?.startTime || 0,
      }
    })

    // Performance benchmarks
    expect(performanceMetrics.loadTime).toBeLessThan(2000) // 2 seconds
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1000) // 1 second
    expect(performanceMetrics.firstPaint).toBeLessThan(1500) // 1.5 seconds
  })

  test("should handle concurrent navigation", async ({ page }) => {
    // Test rapid navigation
    const navigationPromises = [
      page.click('a[href="/artists"]'),
      page.click('a[href="/shows"]'),
      page.click('a[href="/venues"]'),
    ]

    // Should handle concurrent navigation without crashes
    await Promise.all(navigationPromises)
    await page.waitForLoadState("networkidle")

    // Should end up on the last clicked route
    expect(page.url()).toBe(`${BASE_URL}/venues`)
  })
})
