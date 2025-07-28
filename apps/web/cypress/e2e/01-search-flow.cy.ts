describe("Artist Search Flow", () => {
  beforeEach(() => {
    cy.visit("/")
  })

  it("should display search input on homepage", () => {
    cy.get("[data-cy=search-input]").should("be.visible")
    cy.get("[data-cy=search-input]").should("have.attr", "placeholder")
  })

  it("should search for an artist and display results", () => {
    const searchTerm = "Taylor Swift"

    // Type in search
    cy.get("[data-cy=search-input]").type(searchTerm)

    // Wait for search results
    cy.get("[data-cy=search-results]", { timeout: 10000 }).should("be.visible")

    // Verify results contain artist
    cy.get("[data-cy=search-result-item]").should("have.length.greaterThan", 0)
    cy.get("[data-cy=search-result-item]")
      .first()
      .should("contain.text", "Taylor")
  })

  it("should navigate to artist page when clicking search result", () => {
    const searchTerm = "Radiohead"

    // Search for artist
    cy.get("[data-cy=search-input]").type(searchTerm)
    cy.get("[data-cy=search-results]", { timeout: 10000 }).should("be.visible")

    // Click first result
    cy.get("[data-cy=search-result-item]").first().click()

    // Verify navigation to artist page
    cy.url().should("include", "/artists/")
    cy.get("[data-cy=artist-page]").should("be.visible")
    cy.get("[data-cy=artist-name]").should("contain.text", "Radiohead")
  })

  it("should handle empty search results gracefully", () => {
    const searchTerm = "xyznonexistentartist123"

    cy.get("[data-cy=search-input]").type(searchTerm)
    cy.get("[data-cy=search-results]", { timeout: 10000 }).should("be.visible")
    cy.get("[data-cy=no-results]").should("be.visible")
    cy.get("[data-cy=no-results]").should("contain.text", "No artists found")
  })

  it("should clear search results when input is cleared", () => {
    // Type and clear
    cy.get("[data-cy=search-input]").type("Beatles")
    cy.get("[data-cy=search-results]").should("be.visible")

    cy.get("[data-cy=search-input]").clear()
    cy.get("[data-cy=search-results]").should("not.exist")
  })

  it("should handle API errors gracefully", () => {
    // Mock API error
    cy.intercept("GET", "/api/search/artists*", {
      statusCode: 500,
      body: { error: "Internal Server Error" },
    }).as("searchError")

    cy.get("[data-cy=search-input]").type("Artist")

    cy.wait("@searchError")
    cy.get("[data-cy=search-error]").should("be.visible")
    cy.get("[data-cy=search-error]").should("contain.text", "Error searching")
  })
})
