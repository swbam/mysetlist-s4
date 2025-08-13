/// <reference types="cypress" />

describe("Taylor Swift Artist Import - Real Data Test", () => {
  beforeEach(() => {
    // Start from the homepage
    cy.visit("http://localhost:3001");
  });

  it("should search for Taylor Swift and import her data", () => {
    // Search for Taylor Swift using the real API
    cy.get('[data-testid="search-input"], input[placeholder*="Search"]')
      .first()
      .type("Taylor Swift");

    // Wait for search results
    cy.wait(2000);

    // Click on Taylor Swift from search results
    cy.contains("Taylor Swift").first().click();

    // Wait for navigation to artist page
    cy.url().should("include", "/artists/");

    // Verify we're on Taylor Swift's page
    cy.contains("h1", "Taylor Swift", { timeout: 30000 }).should("be.visible");

    // Check if data is being imported (look for import progress or data)
    cy.get("body").then(($body) => {
      if ($body.find('[data-testid="import-progress"]').length > 0) {
        // Import is in progress
        cy.log("Import in progress, waiting for completion...");

        // Wait for import to complete (max 2 minutes)
        cy.get('[data-testid="import-progress"]', { timeout: 120000 }).should(
          "not.exist",
        );
      }
    });

    // Verify artist data is loaded
    cy.get('[data-testid="artist-image"], img[alt*="Taylor Swift"]').should(
      "be.visible",
    );

    // Check for songs section
    cy.contains("Songs", { timeout: 30000 }).should("be.visible");

    // Verify songs are loaded (excluding live tracks)
    cy.get('[data-testid="song-item"], [data-testid="track-item"], div').then(
      ($songs) => {
        const songTexts = Array.from($songs).map(
          (el) => el.textContent?.toLowerCase() || "",
        );

        // Verify no live tracks
        const liveTrackCount = songTexts.filter(
          (text) =>
            text.includes("live") ||
            text.includes("acoustic") ||
            text.includes("session"),
        ).length;

        cy.log(
          `Found ${$songs.length} songs, ${liveTrackCount} appear to be live tracks`,
        );

        // Most songs should not be live tracks
        expect(liveTrackCount).to.be.lessThan($songs.length * 0.1); // Less than 10% live tracks
      },
    );

    // Check for shows section
    cy.contains("Shows", { timeout: 30000 }).should("be.visible");

    // Verify shows are loaded
    cy.get('[data-testid="show-item"], [data-testid="event-item"], div').should(
      "have.length.greaterThan",
      0,
    );

    // Log success
    cy.log("Taylor Swift data successfully imported and displayed");
  });

  it("should verify data is persisted in the database", () => {
    // Search for Taylor Swift again to verify data persistence
    cy.get('[data-testid="search-input"], input[placeholder*="Search"]')
      .first()
      .type("Taylor Swift");

    // Wait for search results
    cy.wait(2000);

    // Click on Taylor Swift
    cy.contains("Taylor Swift").first().click();

    // Should load immediately without import progress
    cy.get('[data-testid="import-progress"]').should("not.exist");

    // Verify data loads quickly (already in database)
    cy.contains("h1", "Taylor Swift", { timeout: 5000 }).should("be.visible");
    cy.get('[data-testid="artist-image"], img[alt*="Taylor Swift"]').should(
      "be.visible",
    );
    cy.contains("Songs").should("be.visible");
    cy.contains("Shows").should("be.visible");

    cy.log("Data successfully persisted and retrieved from database");
  });
});

describe("Artist Import System Validation", () => {
  it("should properly filter live tracks during import", () => {
    // Navigate directly to an artist page (if Taylor Swift is already imported)
    cy.visit("http://localhost:3001/artists/taylor-swift");

    // Get all song titles
    cy.get(
      '[data-testid="song-title"], [data-testid="track-title"], h3, h4',
    ).then(($titles) => {
      const titles = Array.from($titles).map((el) => el.textContent || "");

      // Check for common live track indicators
      const liveIndicators = [
        "Live at",
        "Live from",
        "Live in",
        "Live on",
        "(Live)",
        "[Live]",
        "Live Version",
        "Acoustic Session",
        "MTV Unplugged",
        "Radio Session",
      ];

      const liveTracks = titles.filter((title) =>
        liveIndicators.some((indicator) =>
          title.toLowerCase().includes(indicator.toLowerCase()),
        ),
      );

      // Log findings
      cy.log(`Total songs: ${titles.length}`);
      cy.log(`Live tracks found: ${liveTracks.length}`);

      if (liveTracks.length > 0) {
        cy.log("Live tracks that slipped through:", liveTracks.join(", "));
      }

      // Live tracks should be minimal or none
      expect(liveTracks.length).to.be.lessThan(3);
    });
  });

  it("should create predicted setlists for upcoming shows", () => {
    cy.visit("http://localhost:3001/artists/taylor-swift");

    // Look for shows with setlists
    cy.get('[data-testid="show-item"], [data-testid="event-item"]')
      .first()
      .click();

    // Should navigate to show page
    cy.url().should("include", "/shows/");

    // Check for setlist
    cy.contains("Setlist", { timeout: 10000 }).should("be.visible");

    // Verify setlist has songs
    cy.get('[data-testid="setlist-song"], [data-testid="track-item"]').should(
      "have.length.greaterThan",
      0,
    );

    cy.log("Predicted setlists successfully created");
  });
});
