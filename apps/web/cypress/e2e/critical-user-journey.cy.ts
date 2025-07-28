describe("Critical User Journey", () => {
  beforeEach(() => {
    cy.visit("/")
  })

  describe("Complete User Flow", () => {
    it("should complete full user journey from search to vote", () => {
      // 1. Homepage
      cy.get('[data-testid="hero-search"]').should("be.visible")
      cy.checkA11y()
      cy.measurePerformance("homepage")

      // 2. Search for artist
      cy.searchArtist("Dispatch")
      cy.get('[data-testid="search-results"]').within(() => {
        cy.contains("Dispatch").first().click()
      })

      // 3. Artist page loads with data
      cy.url().should("include", "/artists/dispatch")
      cy.get('[data-testid="artist-header"]').should("be.visible")
      cy.get('[data-testid="artist-bio"]').should("be.visible")
      cy.get('[data-testid="upcoming-shows"]').should("be.visible")
      cy.checkA11y()

      // 4. Navigate to show
      cy.get('[data-testid="upcoming-shows"]').within(() => {
        cy.get('[data-testid="show-card"]').first().click()
      })

      // 5. Show page with setlist
      cy.url().should("match", /\/shows\/[\w-]+/)
      cy.get('[data-testid="show-header"]').should("be.visible")
      cy.get('[data-testid="setlist-viewer"]').should("be.visible")
      cy.waitForSync()

      // 6. Vote on songs (anonymous)
      cy.get('[data-testid="setlist-songs"]').within(() => {
        cy.get('[data-testid^="song-"]').first().as("firstSong")
        cy.get("@firstSong").find('[data-testid="vote-up"]').click()
      })

      // Should prompt for auth
      cy.get('[data-testid="auth-prompt"]').should("be.visible")
      cy.get('[data-testid="sign-in-button"]').click()

      // 7. Sign in
      cy.login()

      // 8. Return to show and vote
      cy.go("back")
      cy.get('[data-testid="setlist-songs"]').within(() => {
        cy.get('[data-testid^="song-"]')
          .first()
          .find('[data-testid="vote-up"]')
          .click()
      })

      // Vote should be registered
      cy.get('[data-testid="vote-count"]').should("contain", "1")
    })
  })

  describe("Data Sync Flow", () => {
    it("should sync artist data when clicking from search", () => {
      cy.searchArtist("Our Last Night")

      cy.interceptAPI("artistSync", "/artists/sync")
      cy.interceptAPI("showsSync", "/shows/sync")

      cy.get('[data-testid="search-results"]').within(() => {
        cy.contains("Our Last Night").click()
      })

      cy.wait("@artistSync")
      cy.wait("@showsSync")

      cy.get('[data-testid="sync-indicator"]').should("be.visible")
      cy.waitForSync()

      cy.get('[data-testid="artist-shows-count"]').should("not.contain", "0")
      cy.get('[data-testid="song-catalog-count"]').should("not.contain", "0")
    })
  })

  describe("Trending Page", () => {
    it("should load trending data", () => {
      cy.visit("/trending")
      cy.checkA11y()
      cy.measurePerformance("trending")

      cy.get('[data-testid="trending-artists"]').should("be.visible")
      cy.get('[data-testid="trending-shows"]').should("be.visible")
      cy.get('[data-testid="trending-venues"]').should("be.visible")

      // Should have data
      cy.get('[data-testid="trending-artists"]').within(() => {
        cy.get('[data-testid="artist-card"]').should("have.length.at.least", 1)
      })
    })
  })

  describe("Mobile Experience", () => {
    beforeEach(() => {
      cy.viewport("iphone-x")
    })

    it("should work on mobile devices", () => {
      cy.get('[data-testid="mobile-menu-toggle"]').click()
      cy.get('[data-testid="mobile-navigation"]').should("be.visible")
      cy.checkA11y()

      // Search on mobile
      cy.get('[data-testid="mobile-search-toggle"]').click()
      cy.get('[data-testid="mobile-search-input"]').type("Dispatch")
      cy.get('[data-testid="mobile-search-results"]').should("be.visible")

      // Navigate to artist
      cy.get('[data-testid="mobile-search-results"]').within(() => {
        cy.contains("Dispatch").first().click()
      })

      cy.get('[data-testid="artist-header"]').should("be.visible")
      cy.measurePerformance("mobile-artist")
    })
  })

  describe("Performance Critical Paths", () => {
    it("should meet performance budgets for key pages", () => {
      const pages = [
        { path: "/", name: "homepage" },
        { path: "/artists", name: "artists" },
        { path: "/shows", name: "shows" },
        { path: "/trending", name: "trending" },
      ]

      pages.forEach(({ path, name }) => {
        cy.visit(path)
        cy.measurePerformance(name)

        // Visual regression test
        cy.compareSnapshot(name)
      })
    })
  })

  describe("Error Handling", () => {
    it("should handle API failures gracefully", () => {
      cy.intercept("GET", "/api/trending/**", { statusCode: 500 }).as(
        "trendingError"
      )

      cy.visit("/trending")
      cy.wait("@trendingError")

      cy.contains("Unable to load trending data").should("be.visible")
      cy.get('[data-testid="retry-button"]').should("be.visible")
    })

    it("should handle 404 pages", () => {
      cy.visit("/non-existent-page", { failOnStatusCode: false })
      cy.contains("Page not found").should("be.visible")
      cy.get('[data-testid="back-home"]').click()
      cy.url().should("eq", `${Cypress.config().baseUrl}/`)
    })
  })
})
