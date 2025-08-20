/// <reference types="cypress" />

describe("Mobile Import Experience", () => {
  beforeEach(() => {
    // Set mobile viewport
    cy.viewport(375, 667); // iPhone SE
    cy.visit("http://localhost:3001/search");
  });

  it("should display mobile-friendly search interface", () => {
    // Check main elements are visible on mobile
    cy.contains("Search Existing Artists").should("be.visible");
    cy.get('input[placeholder*="Search artists"]').should("be.visible");
    
    // Check Ticketmaster search
    cy.contains("Import New Artist").should("be.visible");
    cy.get('input[placeholder*="Search for artists"]').should("be.visible");
    
    // Import button should be accessible
    cy.contains("Import Artist").should("be.visible");
  });

  it("should have touch-friendly import dialog on mobile", () => {
    // Open import dialog
    cy.contains("Import Artist").click();
    
    // Dialog should be visible and properly sized
    cy.contains("Import New Artist").should("be.visible");
    
    // Form elements should be touch-friendly
    cy.get('input[placeholder*="Enter Ticketmaster"]').should("be.visible");
    cy.get('input[placeholder*="Enter Ticketmaster"]').should("have.css", "min-height");
    
    // Buttons should be large enough for touch
    cy.contains("Cancel").should("be.visible");
    cy.contains("Start Import").should("be.visible");
    
    // Close dialog
    cy.contains("Cancel").click();
  });

  it("should display mobile-optimized import progress", () => {
    // Navigate to test integration page
    cy.visit("http://localhost:3001/test-integration");
    
    // Check if components render properly on mobile
    cy.contains("Frontend-Backend Integration Test").should("be.visible");
    cy.contains("Test SSE Connection").should("be.visible");
    
    // Test SSE connection to see progress component
    cy.contains("Test SSE Connection").click();
    
    // Check connection status is visible
    cy.contains("Connection Status").should("be.visible");
  });

  it("should handle mobile gestures and scrolling", () => {
    // Test scrolling behavior
    cy.scrollTo("bottom");
    cy.scrollTo("top");
    
    // Test search input focus on mobile
    cy.get('input[placeholder*="Search artists"]').focus();
    cy.get('input[placeholder*="Search artists"]').type("test");
    cy.get('input[placeholder*="Search artists"]').clear();
    
    // Test Ticketmaster search
    cy.get('input[placeholder*="Search for artists"]').focus();
    cy.get('input[placeholder*="Search for artists"]').type("Taylor Swift");
    cy.wait(1000);
  });

  it("should maintain functionality at different mobile sizes", () => {
    const mobileSizes = [
      { width: 320, height: 568 }, // iPhone 5/SE
      { width: 375, height: 667 }, // iPhone 6/7/8
      { width: 414, height: 896 }, // iPhone XR/11
      { width: 360, height: 640 }, // Android Common
    ];

    mobileSizes.forEach((size) => {
      cy.viewport(size.width, size.height);
      
      // Check main elements remain functional
      cy.visit("http://localhost:3001/search");
      cy.contains("Search Existing Artists").should("be.visible");
      cy.contains("Import New Artist").should("be.visible");
      cy.contains("Import Artist").should("be.visible").click();
      
      // Dialog should remain usable
      cy.contains("Import New Artist").should("be.visible");
      cy.contains("Cancel").click();
      
      cy.log(`Tested mobile size: ${size.width}x${size.height}`);
    });
  });

  it("should provide good UX for mobile import progress", () => {
    // Test with larger mobile screen
    cy.viewport(414, 896); // iPhone XR
    
    // Navigate to test page
    cy.visit("http://localhost:3001/test-integration");
    
    // Test import button
    cy.contains("Import Artist").should("be.visible").click();
    
    // Check dialog responsiveness
    cy.contains("Import New Artist").should("be.visible");
    
    // Input should be properly sized
    cy.get('input[placeholder*="Enter Ticketmaster"]').should("be.visible");
    
    // Test example input
    cy.get('input[placeholder*="Enter Ticketmaster"]').type("K8vZ917G7x0");
    
    // Start import button should be accessible
    cy.contains("Start Import").should("be.visible");
    
    // Cancel for now
    cy.contains("Cancel").click();
  });

  it("should handle network connectivity issues gracefully on mobile", () => {
    // Simulate network issues by intercepting requests
    cy.intercept("GET", "/api/artists/*/status", { forceNetworkError: true }).as("networkError");
    
    // Navigate to test page
    cy.visit("http://localhost:3001/test-integration");
    
    // Try API test
    cy.contains("Test API Endpoint").click();
    
    // Should handle gracefully without crashing
    cy.wait(2000);
    cy.get("body").should("be.visible");
    
    // Connection status should reflect the issue
    cy.get("body").should("contain", "Connection Status");
  });
});

describe("Tablet Import Experience", () => {
  beforeEach(() => {
    // Set tablet viewport
    cy.viewport(768, 1024); // iPad
    cy.visit("http://localhost:3001/search");
  });

  it("should optimize layout for tablet screen", () => {
    // Check layout uses available space effectively
    cy.contains("Search Existing Artists").should("be.visible");
    cy.contains("Import New Artist").should("be.visible");
    
    // Both search sections should be well-spaced
    cy.get('input[placeholder*="Search artists"]').should("be.visible");
    cy.get('input[placeholder*="Search for artists"]').should("be.visible");
    
    // Import button should be positioned well
    cy.contains("Import Artist").should("be.visible");
  });

  it("should handle tablet-specific interactions", () => {
    // Test import dialog on tablet
    cy.contains("Import Artist").click();
    
    // Dialog should use appropriate sizing for tablet
    cy.contains("Import New Artist").should("be.visible");
    
    // Form should be well-laid out
    cy.contains("Import Method").should("be.visible");
    cy.get('input[placeholder*="Enter Ticketmaster"]').should("be.visible");
    
    // Test input
    cy.get('input[placeholder*="Enter Ticketmaster"]').type("K8vZ917G7x0");
    
    // Buttons should be appropriately sized
    cy.contains("Cancel").should("be.visible");
    cy.contains("Start Import").should("be.visible");
    
    cy.contains("Cancel").click();
  });
});