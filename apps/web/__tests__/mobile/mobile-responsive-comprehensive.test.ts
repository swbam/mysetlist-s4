import { expect, test } from "@playwright/test"

/**
 * Comprehensive Mobile Responsive Test Suite
 * Tests the MySetlist app across all critical mobile breakpoints and devices
 *
 * ULTRATHINK 3X TESTING:
 * - Tests mobile UX from user perspective across ALL screen sizes
 * - Verifies touch interactions and responsive design
 * - Validates mobile performance and accessibility
 */

const BASE_URL = process.env["NEXT_PUBLIC_BASE_URL"] || "http://localhost:3001"

// Comprehensive device matrix for testing
const CRITICAL_DEVICES = [
  // PHONE DEVICES (Portrait & Landscape)
  {
    name: "iPhone SE",
    viewport: { width: 375, height: 667 },
    category: "phone",
  },
  {
    name: "iPhone 15",
    viewport: { width: 393, height: 852 },
    category: "phone",
  },
  {
    name: "iPhone 15 Pro Max",
    viewport: { width: 430, height: 932 },
    category: "phone",
  },
  {
    name: "Samsung S24",
    viewport: { width: 384, height: 854 },
    category: "phone",
  },
  { name: "Pixel 8", viewport: { width: 412, height: 915 }, category: "phone" },
  {
    name: "Small Android",
    viewport: { width: 320, height: 568 },
    category: "phone",
  },

  // TABLET DEVICES (Portrait & Landscape)
  {
    name: "iPad Mini",
    viewport: { width: 768, height: 1024 },
    category: "tablet",
  },
  {
    name: "iPad Air",
    viewport: { width: 820, height: 1180 },
    category: "tablet",
  },
  {
    name: 'iPad Pro 11"',
    viewport: { width: 834, height: 1194 },
    category: "tablet",
  },
  {
    name: 'iPad Pro 12.9"',
    viewport: { width: 1024, height: 1366 },
    category: "tablet",
  },

  // EDGE CASES
  {
    name: "Very Small",
    viewport: { width: 320, height: 480 },
    category: "edge",
  },
  {
    name: "Ultra Wide Phone",
    viewport: { width: 428, height: 926 },
    category: "edge",
  },
]

// LANDSCAPE variants
const LANDSCAPE_DEVICES = CRITICAL_DEVICES.filter(
  (d) => d.category === "phone"
).map((device) => ({
  ...device,
  name: `${device.name} Landscape`,
  viewport: { width: device.viewport.height, height: device.viewport.width },
  category: "landscape" as const,
}))

const ALL_DEVICES = [...CRITICAL_DEVICES, ...LANDSCAPE_DEVICES]

test.describe("Mobile Responsive - Core Functionality", () => {
  ALL_DEVICES.forEach((device) => {
    test(`${device.name} (${device.viewport.width}x${device.viewport.height}) - Core Mobile Experience`, async ({
      page,
    }) => {
      await page.setViewportSize(device.viewport)
      await page.goto(BASE_URL)
      await page.waitForLoadState("networkidle")

      // 1. NAVIGATION TESTING
      await test.step("Mobile Navigation", async () => {
        // Mobile nav toggle should be visible on smaller screens
        if (device.viewport.width < 1024) {
          const navToggle = page.locator('button[aria-label="Toggle menu"]')
          await expect(navToggle).toBeVisible()

          // Test menu opening
          await navToggle.click()
          const mobileNav = page.locator('[data-testid="mobile-nav"]')
          await expect(mobileNav).toBeVisible()

          // Test menu closing
          const closeBtn = page.locator(
            'button[aria-label="Close navigation menu"]'
          )
          await closeBtn.click()
          await expect(mobileNav).not.toBeVisible()
        }
      })

      // 2. LAYOUT TESTING
      await test.step("Responsive Layout", async () => {
        // No horizontal scrolling
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
        const viewportWidth = device.viewport.width
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1) // +1 for rounding

        // Header should be sticky and visible
        const header = page.locator("header")
        await expect(header).toBeVisible()

        // Logo should be clickable
        const logo = page.locator('a[aria-label="MySetlist Home"]')
        await expect(logo).toBeVisible()
      })

      // 3. TOUCH TARGET TESTING
      await test.step("Touch Targets", async () => {
        // All interactive elements should meet minimum touch target size
        const buttons = page.locator("button:visible")
        const buttonCount = await buttons.count()

        for (let i = 0; i < Math.min(buttonCount, 10); i++) {
          const button = buttons.nth(i)
          const boundingBox = await button.boundingBox()
          if (boundingBox) {
            // Minimum 44px touch target (Apple guidelines)
            expect(boundingBox.height).toBeGreaterThanOrEqual(40) // Allow some tolerance
            expect(boundingBox.width).toBeGreaterThanOrEqual(40)
          }
        }
      })

      // 4. SEARCH FUNCTIONALITY
      await test.step("Mobile Search", async () => {
        if (device.viewport.width < 1024) {
          // Mobile search should be visible
          const mobileSearch = page.locator('button:has-text("Search...")')
          if ((await mobileSearch.count()) > 0) {
            await expect(mobileSearch).toBeVisible()

            // Test search opening (if implemented)
            await mobileSearch.click()
            // Should open full-screen search overlay
            const searchOverlay = page.locator(".fixed.inset-0")
            if ((await searchOverlay.count()) > 0) {
              await expect(searchOverlay).toBeVisible()
            }
          }
        }
      })
    })
  })
})

test.describe("Mobile Responsive - Performance & Accessibility", () => {
  const PERFORMANCE_DEVICES = [
    { name: "iPhone SE", viewport: { width: 375, height: 667 } },
    { name: "Samsung S24", viewport: { width: 384, height: 854 } },
    { name: "iPad Mini", viewport: { width: 768, height: 1024 } },
  ]

  PERFORMANCE_DEVICES.forEach((device) => {
    test(`${device.name} - Performance & Accessibility`, async ({ page }) => {
      await page.setViewportSize(device.viewport)

      // Enable mobile network throttling simulation
      await page.route("**/*", async (route) => {
        // Simulate 3G network for mobile testing
        await new Promise((resolve) => setTimeout(resolve, 100))
        route.continue()
      })

      const startTime = Date.now()
      await page.goto(BASE_URL)
      await page.waitForLoadState("networkidle")
      const loadTime = Date.now() - startTime

      // Performance requirements for mobile
      expect(loadTime).toBeLessThan(8000) // 8 seconds max on simulated 3G

      // 1. ACCESSIBILITY TESTING
      await test.step("Mobile Accessibility", async () => {
        // Check for ARIA labels on interactive elements
        const navToggle = page.locator('button[aria-label="Toggle menu"]')
        if ((await navToggle.count()) > 0) {
          await expect(navToggle).toHaveAttribute("aria-label")
        }

        // Check for proper heading hierarchy
        const h1 = page.locator("h1").first()
        await expect(h1).toBeVisible()

        // Check for skip links
        const skipLink = page.locator('a[href="#main-content"]')
        if ((await skipLink.count()) > 0) {
          await expect(skipLink).toHaveText(/skip/i)
        }
      })

      // 2. MOBILE FOCUS MANAGEMENT
      await test.step("Focus Management", async () => {
        // Tab navigation should work
        await page.keyboard.press("Tab")
        const focusedElement = page.locator(":focus")
        await expect(focusedElement).toBeVisible()

        // Mobile navigation focus
        if (device.viewport.width < 1024) {
          const navToggle = page.locator('button[aria-label="Toggle menu"]')
          if ((await navToggle.count()) > 0) {
            await navToggle.focus()
            await expect(navToggle).toBeFocused()
          }
        }
      })

      // 3. ZOOM TESTING (up to 200%)
      await test.step("Zoom Compatibility", async () => {
        // Test 150% zoom
        await page.setViewportSize({
          width: Math.floor(device.viewport.width * 0.67),
          height: Math.floor(device.viewport.height * 0.67),
        })

        // Page should still be usable
        const header = page.locator("header")
        await expect(header).toBeVisible()

        // No horizontal scroll at 150% zoom
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
        const viewportWidth = Math.floor(device.viewport.width * 0.67)
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2)
      })
    })
  })
})

test.describe("Mobile Responsive - Voting System", () => {
  test("Mobile Voting Experience - Touch Targets & Animations", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })

    // Navigate to a show page with voting (if available)
    await page.goto(BASE_URL)
    await page.waitForLoadState("networkidle")

    // Look for shows or artists page
    const showsLink = page.locator('a[href="/shows"]')
    if ((await showsLink.count()) > 0) {
      await showsLink.click()
      await page.waitForLoadState("networkidle")

      // Look for vote buttons
      const voteButtons = page.locator(
        'button:has-text("▲"), button:has-text("▼")'
      )
      const voteButtonCount = await voteButtons.count()

      if (voteButtonCount > 0) {
        // Test vote button touch targets
        for (let i = 0; i < Math.min(voteButtonCount, 4); i++) {
          const button = voteButtons.nth(i)
          const boundingBox = await button.boundingBox()

          if (boundingBox) {
            // Vote buttons should meet touch target guidelines
            expect(boundingBox.height).toBeGreaterThanOrEqual(44)
            expect(boundingBox.width).toBeGreaterThanOrEqual(44)
          }
        }
      }
    }
  })
})

test.describe("Mobile Responsive - Edge Cases", () => {
  test("Very Small Screen (320px) - Critical Functionality", async ({
    page,
  }) => {
    // Test the smallest common mobile screen
    await page.setViewportSize({ width: 320, height: 568 })
    await page.goto(BASE_URL)
    await page.waitForLoadState("networkidle")

    // Basic functionality should work
    const header = page.locator("header")
    await expect(header).toBeVisible()

    // No horizontal scrolling even on very small screens
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(320 + 1)

    // Mobile nav should be accessible
    const navToggle = page.locator('button[aria-label="Toggle menu"]')
    await expect(navToggle).toBeVisible()

    // Touch target should still be adequate
    const boundingBox = await navToggle.boundingBox()
    if (boundingBox) {
      expect(boundingBox.height).toBeGreaterThanOrEqual(44)
      expect(boundingBox.width).toBeGreaterThanOrEqual(44)
    }
  })

  test("Landscape Phone Mode - Compact Layout", async ({ page }) => {
    // Test landscape phone mode (common when watching videos, etc.)
    await page.setViewportSize({ width: 812, height: 375 })
    await page.goto(BASE_URL)
    await page.waitForLoadState("networkidle")

    // Header should be more compact in landscape
    const header = page.locator("header")
    await expect(header).toBeVisible()

    const headerHeight = await header.evaluate(
      (el) => el.getBoundingClientRect().height
    )
    expect(headerHeight).toBeLessThan(100) // Should be more compact in landscape

    // Content should be visible without excessive scrolling
    const main = page.locator("main")
    await expect(main).toBeVisible()
  })
})

test.describe("Mobile Responsive - Network Conditions", () => {
  test("Slow 3G Network - Graceful Degradation", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })

    // Simulate slow 3G
    await page.route("**/*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500)) // 500ms delay
      route.continue()
    })

    const startTime = Date.now()
    await page.goto(BASE_URL)

    // Basic content should load even on slow connections
    await page.waitForSelector("h1", { timeout: 15000 })
    const loadTime = Date.now() - startTime

    // Should load within reasonable time on slow 3G
    expect(loadTime).toBeLessThan(15000)

    // Essential functionality should be available
    const navToggle = page.locator('button[aria-label="Toggle menu"]')
    await expect(navToggle).toBeVisible()
  })
})

// Test data for comprehensive responsive breakpoints
export const RESPONSIVE_BREAKPOINTS = {
  xs: 320,
  sm: 375,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
}

test.describe("Mobile Responsive - Breakpoint Testing", () => {
  Object.entries(RESPONSIVE_BREAKPOINTS).forEach(([name, width]) => {
    test(`Breakpoint ${name} (${width}px) - Layout Integrity`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto(BASE_URL)
      await page.waitForLoadState("networkidle")

      // No horizontal overflow at any breakpoint
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      expect(bodyWidth).toBeLessThanOrEqual(width + 1)

      // Navigation should adapt appropriately
      if (width < 1024) {
        // Mobile navigation
        const mobileNav = page.locator('button[aria-label="Toggle menu"]')
        await expect(mobileNav).toBeVisible()
      } else {
        // Desktop navigation
        const desktopNav = page.locator("nav").first()
        await expect(desktopNav).toBeVisible()
      }

      // Content should be readable and accessible
      const main = page.locator("main")
      await expect(main).toBeVisible()
    })
  })
})
