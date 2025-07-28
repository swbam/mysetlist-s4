/// <reference types="cypress" />
/// <reference types="cypress-axe" />

// -- Custom Commands for MySetlist --

// Authentication commands
Cypress.Commands.add(
  "login",
  (email = "test@example.com", password = "password123") => {
    cy.session([email, password], () => {
      cy.visit("/auth/sign-in")
      cy.get('input[name="email"]').type(email)
      cy.get('input[name="password"]').type(password)
      cy.get('button[type="submit"]').click()
      cy.url().should("eq", `${Cypress.config().baseUrl}/`)
    })
  }
)

Cypress.Commands.add("logout", () => {
  cy.get('[data-testid="user-menu"]').click()
  cy.get('[data-testid="logout-button"]').click()
})

// Search and navigation
Cypress.Commands.add("searchArtist", (artistName: string) => {
  cy.get('[data-testid="search-input"]').clear().type(artistName)
  cy.get('[data-testid="search-results"]').should("be.visible")
  cy.waitForNetworkIdle()
})

Cypress.Commands.add("visitArtist", (artistSlug: string) => {
  cy.visit(`/artists/${artistSlug}`)
  cy.get('[data-testid="artist-page"]').should("be.visible")
  cy.measurePerformance(`artist-${artistSlug}`)
})

// Voting functionality
Cypress.Commands.add(
  "voteForSong",
  (songId: string, voteType: "up" | "down") => {
    cy.get(`[data-testid="song-${songId}"]`).within(() => {
      cy.get(`[data-testid="vote-${voteType}"]`).click()
    })
    cy.waitForNetworkIdle()
  }
)

// Data sync and loading
Cypress.Commands.add("waitForSync", () => {
  cy.get('[data-testid="sync-indicator"]', { timeout: 30000 }).should(
    "not.exist"
  )
  cy.get('[data-testid="data-loaded"]').should("be.visible")
})

// Accessibility testing
Cypress.Commands.add("checkA11y", (context?: any, options?: any) => {
  cy.injectAxe()
  cy.checkA11y(context, options)
})

// Performance monitoring
Cypress.Commands.add("measurePerformance", (name: string) => {
  cy.window().then((win) => {
    const perfData = win.performance.getEntriesByType(
      "navigation"
    )[0] as PerformanceNavigationTiming
    const paintEntries = win.performance.getEntriesByType("paint")

    const metrics = {
      domContentLoaded:
        perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
      loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
      firstPaint:
        paintEntries.find((e) => e.name === "first-paint")?.startTime || 0,
      firstContentfulPaint:
        paintEntries.find((e) => e.name === "first-contentful-paint")
          ?.startTime || 0,
    }

    cy.task("log", `Performance metrics for ${name}:`)
    cy.task("log", JSON.stringify(metrics, null, 2))

    // Assert performance thresholds
    expect(metrics.loadComplete).to.be.lessThan(3000)
    expect(metrics.firstContentfulPaint).to.be.lessThan(1500)
  })
})

// Network utilities
Cypress.Commands.add("waitForNetworkIdle", (timeout = 1000) => {
  let pendingRequests = 0

  cy.intercept("**", (req) => {
    pendingRequests++
    req.continue((_res) => {
      pendingRequests--
    })
  })

  cy.wait(timeout)
  cy.wrap(null).should(() => {
    expect(pendingRequests).to.equal(0)
  })
})

Cypress.Commands.add(
  "interceptAPI",
  (alias: string, path: string, fixture?: string) => {
    if (fixture) {
      cy.intercept("GET", `/api${path}`, { fixture }).as(alias)
    } else {
      cy.intercept("GET", `/api${path}`).as(alias)
    }
  }
)

// Mock API responses
Cypress.Commands.add("mockApiResponse", (endpoint: string, response: any) => {
  cy.intercept("GET", `/api/${endpoint}`, response).as(endpoint)
})

// Visual regression testing
Cypress.Commands.add("compareSnapshot", (name: string) => {
  cy.screenshot(name)
})

// TypeScript declarations
declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>
      logout(): Chainable<void>
      searchArtist(artistName: string): Chainable<void>
      visitArtist(artistSlug: string): Chainable<void>
      voteForSong(songId: string, voteType: "up" | "down"): Chainable<void>
      waitForSync(): Chainable<void>
      checkA11y(context?: any, options?: any): Chainable<void>
      measurePerformance(name: string): Chainable<void>
      waitForNetworkIdle(timeout?: number): Chainable<void>
      interceptAPI(
        alias: string,
        path: string,
        fixture?: string
      ): Chainable<void>
      mockApiResponse(endpoint: string, response: any): Chainable<void>
      compareSnapshot(name: string): Chainable<void>
    }
  }
}

export {}
