import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test.describe("Accessibility Tests", () => {
  test("homepage should be accessible", async ({ page }) => {
    await page.goto("/")

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test("search functionality should be accessible", async ({ page }) => {
    await page.goto("/")

    // Test search input accessibility
    const searchInput = page.locator('[placeholder*="Search"]').first()
    await expect(searchInput).toHaveAttribute("aria-label")

    // Test keyboard navigation
    await searchInput.focus()
    await page.keyboard.type("test")

    // Check if search results are announced to screen readers
    const searchResults = page.locator('[role="listbox"], [aria-live]')
    if (await searchResults.isVisible()) {
      await expect(searchResults).toHaveAttribute("aria-live")
    }
  })

  test("artist page should be accessible", async ({ page }) => {
    await page.goto("/artists")

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])

    // Test heading hierarchy
    const headings = await page.locator("h1, h2, h3, h4, h5, h6").all()
    expect(headings.length).toBeGreaterThan(0)

    // First heading should be h1
    const firstHeading = headings[0]
    if (firstHeading) {
      expect(await firstHeading.evaluate((el) => el.tagName)).toBe("H1")
    }
  })

  test("voting interface should be accessible", async ({ page }) => {
    // Navigate to a show page with voting
    await page.goto("/shows")

    // Look for voting buttons
    const voteButtons = page.locator(
      'button[aria-label*="vote"], button[aria-label*="upvote"], button[aria-label*="downvote"]'
    )

    if ((await voteButtons.count()) > 0) {
      const firstVoteButton = voteButtons.first()

      // Check accessibility attributes
      await expect(firstVoteButton).toHaveAttribute("aria-label")
      await expect(firstVoteButton).toHaveAttribute("type", "button")

      // Test keyboard interaction
      await firstVoteButton.focus()
      await expect(firstVoteButton).toBeFocused()

      // Test that button is properly labeled
      const ariaLabel = await firstVoteButton.getAttribute("aria-label")
      expect(ariaLabel).toMatch(/vote|upvote|downvote/i)
    }
  })

  test("navigation should be accessible", async ({ page }) => {
    await page.goto("/")

    // Test main navigation
    const nav = page.locator('nav, [role="navigation"]').first()
    await expect(nav).toBeVisible()

    // Test skip links
    await page.keyboard.press("Tab")
    const skipLink = page.locator('a[href^="#"]:focus')
    if (await skipLink.isVisible()) {
      await expect(skipLink).toContainText(/skip/i)
    }

    // Test mobile navigation
    await page.setViewportSize({ width: 375, height: 667 })
    const mobileMenuButton = page.locator(
      '[aria-label*="menu"], [aria-expanded]'
    )

    if (await mobileMenuButton.isVisible()) {
      await expect(mobileMenuButton).toHaveAttribute("aria-expanded")

      // Open mobile menu
      await mobileMenuButton.click()
      await expect(mobileMenuButton).toHaveAttribute("aria-expanded", "true")

      // Check if menu is properly labeled
      const mobileMenu = page.locator('[role="dialog"], [role="menu"]')
      if (await mobileMenu.isVisible()) {
        await expect(mobileMenu).toHaveAttribute("role")
      }
    }
  })

  test("forms should be accessible", async ({ page }) => {
    await page.goto("/auth/sign-in")

    // Test form accessibility
    const form = page.locator("form").first()
    if (await form.isVisible()) {
      // Check for proper labels
      const inputs = form.locator("input")
      const inputCount = await inputs.count()

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i)
        const inputId = await input.getAttribute("id")

        if (inputId) {
          // Check for associated label
          const label = page.locator(`label[for="${inputId}"]`)
          if ((await label.count()) === 0) {
            // Check for aria-label or aria-labelledby
            const ariaLabel = await input.getAttribute("aria-label")
            const ariaLabelledBy = await input.getAttribute("aria-labelledby")
            expect(ariaLabel || ariaLabelledBy).toBeTruthy()
          }
        }
      }

      // Test form submission
      const submitButton = form
        .locator('button[type="submit"], input[type="submit"]')
        .first()
      if (await submitButton.isVisible()) {
        await expect(submitButton).toBeEnabled()

        // Check button text or aria-label
        const buttonText = await submitButton.textContent()
        const ariaLabel = await submitButton.getAttribute("aria-label")
        expect(buttonText || ariaLabel).toBeTruthy()
      }
    }
  })

  test("error states should be accessible", async ({ page }) => {
    await page.goto("/auth/sign-in")

    // Try to submit empty form to trigger validation
    const form = page.locator("form").first()
    if (await form.isVisible()) {
      const submitButton = form.locator('button[type="submit"]').first()
      if (await submitButton.isVisible()) {
        await submitButton.click()

        // Wait for potential error messages
        await page.waitForTimeout(1000)

        // Check for error messages
        const errorMessages = page.locator(
          '[role="alert"], .error, [aria-invalid="true"]'
        )
        if ((await errorMessages.count()) > 0) {
          const firstError = errorMessages.first()

          // Error should be announced to screen readers
          const role = await firstError.getAttribute("role")
          const ariaLive = await firstError.getAttribute("aria-live")
          expect(role === "alert" || ariaLive).toBeTruthy()
        }
      }
    }
  })

  test("dynamic content should be accessible", async ({ page }) => {
    await page.goto("/")

    // Test loading states
    const loadingElements = page.locator(
      '[aria-busy="true"], .loading, .spinner'
    )
    if ((await loadingElements.count()) > 0) {
      const firstLoader = loadingElements.first()

      // Loading state should be announced
      const ariaLabel = await firstLoader.getAttribute("aria-label")
      const ariaLive = await firstLoader.getAttribute("aria-live")
      expect(ariaLabel || ariaLive).toBeTruthy()
    }

    // Test live regions for real-time updates
    const liveRegions = page.locator("[aria-live]")
    if ((await liveRegions.count()) > 0) {
      const firstLiveRegion = liveRegions.first()
      const ariaLive = await firstLiveRegion.getAttribute("aria-live")
      expect(["polite", "assertive", "off"]).toContain(ariaLive)
    }
  })

  test("color contrast should meet WCAG standards", async ({ page }) => {
    await page.goto("/")

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2aa"])
      .include("body")
      .analyze()

    // Filter for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      (violation) => violation.id === "color-contrast"
    )

    expect(contrastViolations).toEqual([])
  })

  test("focus management should work correctly", async ({ page }) => {
    await page.goto("/")

    // Test focus trap in modals/dialogs
    const dialogTrigger = page
      .locator('button[aria-haspopup="dialog"], [data-testid="modal-trigger"]')
      .first()

    if (await dialogTrigger.isVisible()) {
      await dialogTrigger.click()

      const dialog = page.locator('[role="dialog"]').first()
      if (await dialog.isVisible()) {
        // Focus should be trapped within dialog
        await page.keyboard.press("Tab")
        const focusedElement = page.locator(":focus")

        // Focused element should be within dialog
        const isWithinDialog = (await dialog.locator(":focus").count()) > 0
        expect(isWithinDialog).toBe(true)

        // Test escape key
        await page.keyboard.press("Escape")
        await expect(dialog).not.toBeVisible()

        // Focus should return to trigger
        await expect(dialogTrigger).toBeFocused()
      }
    }
  })

  test("images should have appropriate alt text", async ({ page }) => {
    await page.goto("/")

    const images = page.locator("img")
    const imageCount = await images.count()

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute("alt")
      const role = await img.getAttribute("role")

      // Images should have alt text or be marked as decorative
      if (role !== "presentation" && role !== "none") {
        expect(alt).toBeDefined()

        // Alt text should not be redundant
        if (alt) {
          expect(alt.toLowerCase()).not.toContain("image")
          expect(alt.toLowerCase()).not.toContain("picture")
          expect(alt.toLowerCase()).not.toContain("photo")
        }
      }
    }
  })

  test("tables should be accessible", async ({ page }) => {
    // Navigate to a page that might have tables
    await page.goto("/admin")

    const tables = page.locator("table")
    const tableCount = await tables.count()

    for (let i = 0; i < tableCount; i++) {
      const table = tables.nth(i)

      // Tables should have captions or aria-label
      const caption = table.locator("caption")
      const ariaLabel = await table.getAttribute("aria-label")
      const ariaLabelledBy = await table.getAttribute("aria-labelledby")

      const hasAccessibleName =
        (await caption.count()) > 0 || ariaLabel || ariaLabelledBy

      expect(hasAccessibleName).toBe(true)

      // Check for proper header structure
      const headers = table.locator("th")
      if ((await headers.count()) > 0) {
        const firstHeader = headers.first()
        const scope = await firstHeader.getAttribute("scope")

        // Headers should have scope attribute
        expect(["col", "row", "colgroup", "rowgroup"]).toContain(scope)
      }
    }
  })
})
