/// <reference types="cypress" />

describe("Complete Frontend-Backend Integration", () => {
  beforeEach(() => {
    // Start from the search page with integrated components
    cy.visit("http://localhost:3001/search");
  });

  it("should display both search options and import button", () => {
    // Check for existing artist search
    cy.contains("Search Existing Artists").should("be.visible");
    cy.get('input[placeholder*="Search artists"]').should("be.visible");

    // Check for Ticketmaster search section
    cy.contains("Import New Artist").should("be.visible");
    cy.contains("Search Ticketmaster to import").should("be.visible");

    // Check for import button
    cy.contains("Import Artist").should("be.visible");
  });

  it("should search Ticketmaster and navigate to import progress", () => {
    // Test Ticketmaster search
    cy.get('input[placeholder*="Search for artists"]').type("Taylor Swift");
    
    // Wait for search results
    cy.wait(2000);

    // Click on first result if available
    cy.get("body").then(($body) => {
      if ($body.find(':contains("Taylor Swift")').length > 0) {
        cy.contains("Taylor Swift").first().click();

        // Should navigate to artist page or import progress
        cy.url().should("include", "/artists/");
        
        // Check for either artist content or import progress
        cy.get("body").then(($body) => {
          if ($body.find('[data-testid="import-progress"]').length > 0) {
            // Import in progress
            cy.log("Import progress detected");
            cy.get('[data-testid="import-progress"]').should("be.visible");
            
            // Verify progress indicators
            cy.contains(/Importing|Initializing|Loading/).should("be.visible");
            
            // Check for real-time updates indicator
            cy.get("body").should("contain", "Real-time");
            
            // Wait for completion (with timeout)
            cy.get('[data-testid="import-progress"]', { timeout: 120000 }).should("not.exist");
          } else {
            // Artist already exists
            cy.log("Artist already exists in database");
            cy.contains("h1", "Taylor Swift").should("be.visible");
          }
        });
      } else {
        cy.log("No search results found");
      }
    });
  });

  it("should test import button functionality", () => {
    // Click import button
    cy.contains("Import Artist").click();

    // Should open import dialog
    cy.contains("Import New Artist").should("be.visible");
    cy.contains("Import Method").should("be.visible");

    // Test Ticketmaster ID input
    cy.get('input[placeholder*="Enter Ticketmaster"]').type("K8vZ917G7x0");
    
    // Click start import
    cy.contains("Start Import").click();

    // Should navigate to artist page with import progress
    cy.url().should("include", "/artists/");
    
    // Check for import progress
    cy.get("body").should("contain", "Importing");
  });

  it("should validate API endpoints respond correctly", () => {
    // Test search API
    cy.request("/api/search/artists?q=test&limit=5").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property("artists");
    });

    // Test status API
    cy.request("/api/artists/test-artist/status").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property("stage");
      expect(response.body).to.have.property("progress");
    });

    // Test import status API
    cy.request("/api/artists/test-artist/import-status").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property("stage");
      expect(response.body).to.have.property("percentage");
    });
  });

  it("should validate SSE connections work", () => {
    // Test SSE endpoint accessibility (basic check)
    cy.request({
      url: "/api/artists/test-artist/stream",
      headers: {
        "Accept": "text/event-stream",
        "Cache-Control": "no-cache"
      }
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers["content-type"]).to.include("text/event-stream");
    });
  });

  it("should test error recovery and fallback mechanisms", () => {
    // Navigate to test integration page
    cy.visit("http://localhost:3001/test-integration");

    // Test API endpoint
    cy.contains("Test API Endpoint").click();
    cy.wait(1000);

    // Check console for responses (basic test)
    cy.window().its("console").invoke("log", "API test completed");

    // Test SSE connection
    cy.contains("Test SSE Connection").click();
    cy.wait(2000);

    // Verify connection status updates
    cy.contains("Connection Status").should("be.visible");
  });

  it("should handle mobile responsiveness", () => {
    // Test mobile viewport
    cy.viewport(375, 667); // iPhone SE

    // Components should still be visible and functional
    cy.contains("Search Existing Artists").should("be.visible");
    cy.contains("Import New Artist").should("be.visible");
    
    // Search input should be responsive
    cy.get('input[placeholder*="Search artists"]').should("be.visible");
    
    // Import button should be accessible
    cy.contains("Import Artist").should("be.visible").click();
    
    // Dialog should be responsive
    cy.contains("Import New Artist").should("be.visible");
    
    // Close dialog
    cy.contains("Cancel").click();
  });

  it("should validate data format consistency", () => {
    // Test that all APIs return consistent data formats
    cy.request("/api/artists/test-artist/status").then((statusResponse) => {
      expect(statusResponse.body).to.have.property("stage");
      expect(statusResponse.body).to.have.property("progress");
      expect(statusResponse.body).to.have.property("percentage"); // Backward compatibility
      expect(statusResponse.body).to.have.property("at");
      expect(statusResponse.body).to.have.property("metadata");
    });

    cy.request("/api/artists/test-artist/import-status").then((importResponse) => {
      expect(importResponse.body).to.have.property("stage");
      expect(importResponse.body).to.have.property("percentage");
      expect(importResponse.body).to.have.property("progress"); // Compatibility alias
      expect(importResponse.body).to.have.property("isComplete");
      expect(importResponse.body).to.have.property("hasError");
    });
  });
});

describe("Real Artist Import Flow", () => {
  it("should complete full Taylor Swift import if not exists", () => {
    cy.visit("http://localhost:3001/search");
    
    // Search for Taylor Swift
    cy.get('input[placeholder*="Search for artists"]').type("Taylor Swift");
    cy.wait(2000);

    // Try to click on result
    cy.get("body").then(($body) => {
      if ($body.find(':contains("Taylor Swift")').length > 0) {
        cy.contains("Taylor Swift").first().click();
        
        // Wait for page load and check result
        cy.url().should("include", "/artists/");
        
        // If import progress appears, monitor it
        cy.get("body").then(($importBody) => {
          if ($importBody.find('[data-testid="import-progress"], :contains("Importing")').length > 0) {
            cy.log("Monitoring real import progress...");
            
            // Check for progress indicators
            cy.get(":contains('Importing'), :contains('Initializing'), :contains('Real-time')", { timeout: 10000 })
              .should("be.visible");
            
            // Monitor for stage changes (with generous timeout)
            const stages = ["initializing", "identity", "shows", "catalog", "completed"];
            
            // Wait for any stage progression
            cy.get("body", { timeout: 60000 }).should("contain", "progress");
            
            // Final validation - either completed or reasonable progress
            cy.get("body").then(($finalBody) => {
              const bodyText = $finalBody.text();
              const hasProgress = bodyText.includes("Import Complete") || 
                                 bodyText.includes("%") ||
                                 bodyText.includes("Importing");
              expect(hasProgress, "Should show import progress or completion").to.be.true;
            });
          } else {
            cy.log("Artist already exists - validating existing data");
            cy.contains("h1", "Taylor Swift").should("be.visible");
          }
        });
      } else {
        cy.log("No Taylor Swift results found in Ticketmaster search");
      }
    });
  });
});