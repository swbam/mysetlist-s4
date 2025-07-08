/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// -- Custom Commands for MySetlist --

// Command to search for an artist
Cypress.Commands.add('searchArtist', (artistName: string) => {
  cy.get('[data-cy=search-input]').type(artistName);
  cy.get('[data-cy=search-results]').should('be.visible');
});

// Command to navigate to artist page
Cypress.Commands.add('visitArtist', (artistId: string) => {
  cy.visit(`/artists/${artistId}`);
  cy.get('[data-cy=artist-page]').should('be.visible');
});

// Command to vote on a song
Cypress.Commands.add(
  'voteForSong',
  (songId: string, voteType: 'up' | 'down') => {
    cy.get(`[data-cy=song-${songId}]`).within(() => {
      cy.get(`[data-cy=vote-${voteType}]`).click();
    });
  }
);

// Command to check authentication status
Cypress.Commands.add('checkAuth', () => {
  cy.window().its('localStorage.auth').should('exist');
});

// Command to mock API responses
Cypress.Commands.add('mockApiResponse', (endpoint: string, response: any) => {
  cy.intercept('GET', `/api/${endpoint}`, response).as(endpoint);
});

// Command to wait for data sync
Cypress.Commands.add('waitForSync', () => {
  cy.get('[data-cy=sync-indicator]').should('not.exist');
  cy.get('[data-cy=data-loaded]').should('be.visible');
});

// -- TypeScript declarations --
declare global {
  namespace Cypress {
    interface Chainable {
      searchArtist(artistName: string): Chainable<void>;
      visitArtist(artistId: string): Chainable<void>;
      voteForSong(songId: string, voteType: 'up' | 'down'): Chainable<void>;
      checkAuth(): Chainable<void>;
      mockApiResponse(endpoint: string, response: any): Chainable<void>;
      waitForSync(): Chainable<void>;
    }
  }
}

export {};
