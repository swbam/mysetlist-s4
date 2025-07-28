describe("Navigation Flow", () => {
  beforeEach(() => {
    cy.visit("/")
  })

  it("should navigate through main navigation links", () => {
    // Check homepage
    cy.get("[data-cy=nav-home]").should("have.class", "active")

    // Navigate to trending
    cy.get("[data-cy=nav-trending]").click()
    cy.url().should("include", "/trending")
    cy.get("[data-cy=trending-page]").should("be.visible")
    cy.get("[data-cy=nav-trending]").should("have.class", "active")

    // Navigate back home
    cy.get("[data-cy=nav-home]").click()
    cy.url().should("eq", `${Cypress.config().baseUrl}/`)
    cy.get("[data-cy=homepage]").should("be.visible")
  })

  it("should handle breadcrumb navigation", () => {
    // Navigate to artist page
    cy.visit("/artists/test-artist-1")

    // Check breadcrumbs
    cy.get("[data-cy=breadcrumb]").should("be.visible")
    cy.get("[data-cy=breadcrumb-home]").should("contain.text", "Home")
    cy.get("[data-cy=breadcrumb-artists]").should("contain.text", "Artists")
    cy.get("[data-cy=breadcrumb-current]").should("contain.text", "Test Artist")

    // Click breadcrumb to go back
    cy.get("[data-cy=breadcrumb-artists]").click()
    cy.url().should("include", "/artists")
  })

  it("should handle deep navigation flow", () => {
    // Search -> Artist -> Show -> Setlist
    cy.get("[data-cy=search-input]").type("Test Artist")
    cy.get("[data-cy=search-result-item]").first().click()

    // On artist page
    cy.url().should("include", "/artists/")
    cy.get("[data-cy=show-item]").first().click()

    // On show page
    cy.url().should("include", "/shows/")
    cy.get("[data-cy=view-setlist]").click()

    // On setlist page
    cy.url().should("include", "/setlists/")
    cy.get("[data-cy=setlist-page]").should("be.visible")

    // Navigate back using browser
    cy.go("back")
    cy.get("[data-cy=show-page]").should("be.visible")

    cy.go("back")
    cy.get("[data-cy=artist-page]").should("be.visible")
  })

  it("should handle 404 pages gracefully", () => {
    cy.visit("/non-existent-page", { failOnStatusCode: false })

    cy.get("[data-cy=404-page]").should("be.visible")
    cy.get("[data-cy=404-message]").should("contain.text", "Page not found")
    cy.get("[data-cy=back-home]").should("be.visible")

    // Click back home
    cy.get("[data-cy=back-home]").click()
    cy.url().should("eq", `${Cypress.config().baseUrl}/`)
  })

  it("should maintain scroll position on navigation", () => {
    // Visit trending page with many items
    cy.visit("/trending")

    // Scroll down
    cy.scrollTo(0, 500)
    cy.window().its("scrollY").should("equal", 500)

    // Navigate away and back
    cy.get("[data-cy=nav-home]").click()
    cy.get("[data-cy=nav-trending]").click()

    // Should restore scroll position
    cy.window().its("scrollY").should("be.greaterThan", 400)
  })

  it("should handle mobile navigation", () => {
    // Set mobile viewport
    cy.viewport("iphone-x")

    // Mobile menu should be hidden initially
    cy.get("[data-cy=mobile-menu]").should("not.be.visible")

    // Click hamburger menu
    cy.get("[data-cy=mobile-menu-toggle]").click()
    cy.get("[data-cy=mobile-menu]").should("be.visible")

    // Navigate to trending
    cy.get("[data-cy=mobile-nav-trending]").click()
    cy.url().should("include", "/trending")

    // Menu should close after navigation
    cy.get("[data-cy=mobile-menu]").should("not.be.visible")
  })

  it("should show loading states during navigation", () => {
    // Slow down API response
    cy.intercept("GET", "/api/artists/*", (req) => {
      req.reply((res) => {
        if (res) {
          res.delay(1000)
          res.send({
            statusCode: 200,
            body: { artist: { id: "1", name: "Test" } },
          })
        }
      })
    }).as("slowArtist")

    cy.visit("/artists/test-1")

    // Should show loading state
    cy.get("[data-cy=loading-spinner]").should("be.visible")

    cy.wait("@slowArtist")

    // Loading should disappear
    cy.get("[data-cy=loading-spinner]").should("not.exist")
    cy.get("[data-cy=artist-page]").should("be.visible")
  })
})
