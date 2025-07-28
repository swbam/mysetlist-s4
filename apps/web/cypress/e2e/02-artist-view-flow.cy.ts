describe("Artist View Flow", () => {
  beforeEach(() => {
    // Mock artist data
    cy.intercept("GET", "/api/artists/*", {
      statusCode: 200,
      body: {
        artist: {
          id: "test-artist-1",
          name: "Test Artist",
          genres: ["rock", "alternative"],
          imageUrl: "https://example.com/artist.jpg",
          bio: "Test artist bio",
          stats: {
            totalShows: 150,
            totalSongs: 45,
            avgSetlistLength: 18,
          },
        },
      },
    }).as("getArtist")

    // Mock shows data
    cy.intercept("GET", "/api/artists/*/shows*", {
      statusCode: 200,
      body: {
        shows: [
          {
            id: "show-1",
            date: "2024-03-15",
            venue: {
              name: "Madison Square Garden",
              city: "New York",
              country: "USA",
            },
            setlistCount: 1,
          },
          {
            id: "show-2",
            date: "2024-03-10",
            venue: {
              name: "The Forum",
              city: "Los Angeles",
              country: "USA",
            },
            setlistCount: 1,
          },
        ],
      },
    }).as("getShows")
  })

  it("should display artist information", () => {
    cy.visit("/artists/test-artist-1")

    cy.wait("@getArtist")

    // Check artist details
    cy.get("[data-cy=artist-name]").should("contain.text", "Test Artist")
    cy.get("[data-cy=artist-genres]").should("contain.text", "rock")
    cy.get("[data-cy=artist-bio]").should("contain.text", "Test artist bio")

    // Check stats
    cy.get("[data-cy=artist-stats]").within(() => {
      cy.get("[data-cy=total-shows]").should("contain.text", "150")
      cy.get("[data-cy=total-songs]").should("contain.text", "45")
      cy.get("[data-cy=avg-setlist-length]").should("contain.text", "18")
    })
  })

  it("should display artist shows", () => {
    cy.visit("/artists/test-artist-1")

    cy.wait(["@getArtist", "@getShows"])

    // Check shows section
    cy.get("[data-cy=shows-section]").should("be.visible")
    cy.get("[data-cy=show-item]").should("have.length", 2)

    // Check first show details
    cy.get("[data-cy=show-item]")
      .first()
      .within(() => {
        cy.get("[data-cy=show-date]").should("contain.text", "2024-03-15")
        cy.get("[data-cy=show-venue]").should(
          "contain.text",
          "Madison Square Garden"
        )
        cy.get("[data-cy=show-location]").should(
          "contain.text",
          "New York, USA"
        )
      })
  })

  it("should navigate to show details", () => {
    cy.visit("/artists/test-artist-1")

    cy.wait(["@getArtist", "@getShows"])

    // Click on first show
    cy.get("[data-cy=show-item]").first().click()

    // Verify navigation
    cy.url().should("include", "/shows/show-1")
    cy.get("[data-cy=show-page]").should("be.visible")
  })

  it("should trigger data sync when artist has no data", () => {
    // Mock empty response
    cy.intercept("GET", "/api/artists/*/shows*", {
      statusCode: 200,
      body: { shows: [] },
    }).as("getEmptyShows")

    // Mock sync endpoint
    cy.intercept("POST", "/api/sync/artist", {
      statusCode: 200,
      body: { message: "Sync started" },
    }).as("syncArtist")

    cy.visit("/artists/test-artist-1")

    cy.wait(["@getArtist", "@getEmptyShows"])

    // Should show sync button
    cy.get("[data-cy=sync-data-button]").should("be.visible")
    cy.get("[data-cy=sync-data-button]").click()

    cy.wait("@syncArtist")

    // Should show sync indicator
    cy.get("[data-cy=sync-indicator]").should("be.visible")
    cy.get("[data-cy=sync-indicator]").should("contain.text", "Syncing")
  })

  it("should handle artist not found", () => {
    cy.intercept("GET", "/api/artists/*", {
      statusCode: 404,
      body: { error: "Artist not found" },
    }).as("artistNotFound")

    cy.visit("/artists/nonexistent-artist")

    cy.wait("@artistNotFound")

    cy.get("[data-cy=error-message]").should("be.visible")
    cy.get("[data-cy=error-message]").should("contain.text", "Artist not found")
    cy.get("[data-cy=back-to-search]").should("be.visible")
  })
})
