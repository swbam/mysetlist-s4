describe("Voting Flow", () => {
  beforeEach(() => {
    // Mock setlist data
    cy.intercept("GET", "/api/shows/*/setlists*", {
      statusCode: 200,
      body: {
        setlist: {
          id: "setlist-1",
          showId: "show-1",
          artistId: "artist-1",
          date: "2024-03-15",
          venue: {
            name: "Madison Square Garden",
            city: "New York",
          },
          sets: [
            {
              name: "Main Set",
              songs: [
                {
                  id: "song-1",
                  name: "Song One",
                  position: 1,
                  votes: { up: 10, down: 2 },
                },
                {
                  id: "song-2",
                  name: "Song Two",
                  position: 2,
                  votes: { up: 5, down: 1 },
                },
              ],
            },
            {
              name: "Encore",
              songs: [
                {
                  id: "song-3",
                  name: "Encore Song",
                  position: 1,
                  votes: { up: 15, down: 0 },
                },
              ],
            },
          ],
        },
      },
    }).as("getSetlist");

    // Mock vote endpoints
    cy.intercept("POST", "/api/votes", {
      statusCode: 200,
      body: { success: true },
    }).as("submitVote");
  });

  it("should display setlist with songs", () => {
    cy.visit("/shows/show-1/setlists/setlist-1");

    cy.wait("@getSetlist");

    // Check setlist structure
    cy.get("[data-cy=setlist-page]").should("be.visible");
    cy.get("[data-cy=set-section]").should("have.length", 2);

    // Check main set
    cy.get("[data-cy=set-section]")
      .first()
      .within(() => {
        cy.get("[data-cy=set-name]").should("contain.text", "Main Set");
        cy.get("[data-cy=song-item]").should("have.length", 2);
      });

    // Check encore
    cy.get("[data-cy=set-section]")
      .last()
      .within(() => {
        cy.get("[data-cy=set-name]").should("contain.text", "Encore");
        cy.get("[data-cy=song-item]").should("have.length", 1);
      });
  });

  it("should display vote counts for each song", () => {
    cy.visit("/shows/show-1/setlists/setlist-1");

    cy.wait("@getSetlist");

    // Check first song votes
    cy.get("[data-cy=song-item]")
      .first()
      .within(() => {
        cy.get("[data-cy=song-name]").should("contain.text", "Song One");
        cy.get("[data-cy=upvote-count]").should("contain.text", "10");
        cy.get("[data-cy=downvote-count]").should("contain.text", "2");
      });
  });

  it("should allow upvoting a song", () => {
    cy.visit("/shows/show-1/setlists/setlist-1");

    cy.wait("@getSetlist");

    // Click upvote on first song
    cy.get("[data-cy=song-item]")
      .first()
      .within(() => {
        cy.get("[data-cy=upvote-button]").click();
      });

    cy.wait("@submitVote");

    // Check optimistic update
    cy.get("[data-cy=song-item]")
      .first()
      .within(() => {
        cy.get("[data-cy=upvote-count]").should("contain.text", "11");
        cy.get("[data-cy=upvote-button]").should("have.class", "voted");
      });
  });

  it("should allow downvoting a song", () => {
    cy.visit("/shows/show-1/setlists/setlist-1");

    cy.wait("@getSetlist");

    // Click downvote on second song
    cy.get("[data-cy=song-item]")
      .eq(1)
      .within(() => {
        cy.get("[data-cy=downvote-button]").click();
      });

    cy.wait("@submitVote");

    // Check optimistic update
    cy.get("[data-cy=song-item]")
      .eq(1)
      .within(() => {
        cy.get("[data-cy=downvote-count]").should("contain.text", "2");
        cy.get("[data-cy=downvote-button]").should("have.class", "voted");
      });
  });

  it("should prevent multiple votes on same song", () => {
    cy.visit("/shows/show-1/setlists/setlist-1");

    cy.wait("@getSetlist");

    // First vote
    cy.get("[data-cy=song-item]")
      .first()
      .within(() => {
        cy.get("[data-cy=upvote-button]").click();
      });

    cy.wait("@submitVote");

    // Try to vote again - should be disabled
    cy.get("[data-cy=song-item]")
      .first()
      .within(() => {
        cy.get("[data-cy=upvote-button]").should("be.disabled");
        cy.get("[data-cy=downvote-button]").should("be.disabled");
      });
  });

  it("should handle vote errors gracefully", () => {
    // Mock vote error
    cy.intercept("POST", "/api/votes", {
      statusCode: 500,
      body: { error: "Vote failed" },
    }).as("voteError");

    cy.visit("/shows/show-1/setlists/setlist-1");

    cy.wait("@getSetlist");

    // Attempt vote
    cy.get("[data-cy=song-item]")
      .first()
      .within(() => {
        cy.get("[data-cy=upvote-button]").click();
      });

    cy.wait("@voteError");

    // Should show error and revert
    cy.get("[data-cy=vote-error]").should("be.visible");
    cy.get("[data-cy=vote-error]").should("contain.text", "Vote failed");

    // Vote count should not change
    cy.get("[data-cy=song-item]")
      .first()
      .within(() => {
        cy.get("[data-cy=upvote-count]").should("contain.text", "10");
        cy.get("[data-cy=upvote-button]").should("not.have.class", "voted");
      });
  });

  it("should show authentication prompt for unauthenticated users", () => {
    // Visit without auth
    cy.window().then((win) => {
      win.localStorage.removeItem("auth");
    });

    cy.visit("/shows/show-1/setlists/setlist-1");

    cy.wait("@getSetlist");

    // Try to vote
    cy.get("[data-cy=song-item]")
      .first()
      .within(() => {
        cy.get("[data-cy=upvote-button]").click();
      });

    // Should show auth prompt
    cy.get("[data-cy=auth-prompt]").should("be.visible");
    cy.get("[data-cy=auth-prompt]").should("contain.text", "Sign in to vote");
  });
});
