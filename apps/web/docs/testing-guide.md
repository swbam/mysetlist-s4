# Testing Guide for MySetlist

## Overview

This guide covers the testing infrastructure and best practices for the MySetlist application.

## Test Types

### 1. Unit Tests (Jest)
- Location: `*.test.ts`, `*.test.tsx` files
- Run: `pnpm test`
- Coverage: `pnpm test -- --coverage`

### 2. E2E Tests (Cypress)
- Location: `cypress/e2e/*.cy.ts`
- Run: `pnpm e2e` (headless) or `pnpm e2e:open` (interactive)
- Component tests: `cypress/component/*.cy.ts`

### 3. Accessibility Tests (Playwright + Axe)
- Location: `tests/accessibility/*.spec.ts`
- Run: `pnpm test:a11y`

## Data Attributes for Testing

Always add `data-cy` attributes to interactive elements for reliable E2E testing:

```tsx
// Good - Searchable and maintainable
<input data-cy="search-input" />
<button data-cy="submit-button">Submit</button>
<div data-cy="search-results">...</div>

// Bad - Fragile selectors
<input className="search-input" />
<button>Submit</button>
```

### Common Data Attributes

#### Navigation
- `data-cy="nav-home"` - Home navigation link
- `data-cy="nav-trending"` - Trending navigation link
- `data-cy="nav-artists"` - Artists navigation link
- `data-cy="mobile-menu-toggle"` - Mobile menu button
- `data-cy="mobile-menu"` - Mobile menu container

#### Search
- `data-cy="search-input"` - Main search input
- `data-cy="search-results"` - Search results container
- `data-cy="search-result-item"` - Individual search result
- `data-cy="no-results"` - No results message
- `data-cy="search-error"` - Search error message

#### Artist Pages
- `data-cy="artist-page"` - Artist page container
- `data-cy="artist-name"` - Artist name heading
- `data-cy="artist-genres"` - Genres list
- `data-cy="artist-bio"` - Artist biography
- `data-cy="artist-stats"` - Stats container
- `data-cy="sync-data-button"` - Sync data button
- `data-cy="sync-indicator"` - Sync in progress indicator

#### Shows
- `data-cy="shows-section"` - Shows section container
- `data-cy="show-item"` - Individual show item
- `data-cy="show-date"` - Show date
- `data-cy="show-venue"` - Venue name
- `data-cy="show-location"` - Venue location
- `data-cy="view-setlist"` - View setlist button

#### Setlists & Voting
- `data-cy="setlist-page"` - Setlist page container
- `data-cy="set-section"` - Set section (main, encore, etc.)
- `data-cy="set-name"` - Set name
- `data-cy="song-item"` - Individual song item
- `data-cy="song-{id}"` - Specific song by ID
- `data-cy="song-name"` - Song name
- `data-cy="upvote-button"` - Upvote button
- `data-cy="downvote-button"` - Downvote button
- `data-cy="upvote-count"` - Upvote count
- `data-cy="downvote-count"` - Downvote count
- `data-cy="vote-error"` - Vote error message

#### Loading & Error States
- `data-cy="loading-spinner"` - Loading indicator
- `data-cy="error-message"` - Error message
- `data-cy="404-page"` - 404 page
- `data-cy="back-home"` - Back to home link
- `data-cy="back-to-search"` - Back to search link

#### Authentication
- `data-cy="auth-prompt"` - Authentication prompt
- `data-cy="sign-in-button"` - Sign in button
- `data-cy="sign-out-button"` - Sign out button
- `data-cy="user-menu"` - User menu dropdown

## Writing Tests

### E2E Test Example

```typescript
describe('Artist Search Flow', () => {
  it('should search for an artist and navigate to their page', () => {
    // Visit homepage
    cy.visit('/')
    
    // Search for artist
    cy.get('[data-cy=search-input]').type('Radiohead')
    cy.get('[data-cy=search-results]').should('be.visible')
    
    // Click first result
    cy.get('[data-cy=search-result-item]').first().click()
    
    // Verify on artist page
    cy.get('[data-cy=artist-page]').should('be.visible')
    cy.get('[data-cy=artist-name]').should('contain', 'Radiohead')
  })
})
```

### Accessibility Test Example

```typescript
test('Homepage should have no accessibility violations', async ({ page }) => {
  await page.goto('/')
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  expect(accessibilityScanResults.violations).toEqual([])
})
```

## CI/CD Integration

Tests run automatically on:
- Every push to `main` branch
- Every pull request

### Test Jobs
1. **Unit Tests** - Jest tests with coverage
2. **E2E Tests** - Cypress tests on multiple browsers
3. **Accessibility Tests** - Playwright + Axe tests
4. **Lighthouse CI** - Performance metrics
5. **Bundle Analysis** - Size tracking

### Branch Protection

PRs must have:
- ✅ All tests passing
- ✅ Valid branch name (e.g., `feature/add-search`)
- ✅ Conventional commit PR title
- ✅ No TypeScript errors
- ✅ No linting errors

## Running All Tests Locally

```bash
# Run all test suites
pnpm test:all

# Individual test suites
pnpm test          # Unit tests
pnpm e2e           # E2E tests
pnpm test:a11y     # Accessibility tests
pnpm typecheck     # TypeScript check
pnpm lint          # Linting
```

## Test Reports

Test results are automatically:
- Posted as PR comments
- Uploaded as artifacts
- Tracked for trends

View reports:
- `test-report.md` - Markdown summary
- `test-report.json` - JSON data
- GitHub Actions summary - CI overview

## Best Practices

1. **Write tests first** - TDD approach
2. **Use data-cy attributes** - Reliable selectors
3. **Test user flows** - Not implementation
4. **Mock external APIs** - Consistent tests
5. **Check accessibility** - WCAG compliance
6. **Monitor performance** - Lighthouse scores
7. **Maintain high coverage** - 80%+ target

## Debugging Tests

### Cypress
```bash
# Interactive mode
pnpm e2e:open

# Debug specific test
pnpm cypress run --spec "cypress/e2e/01-search-flow.cy.ts"
```

### Jest
```bash
# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Watch mode
pnpm test:watch
```

## Resources

- [Cypress Documentation](https://docs.cypress.io)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev)
- [Testing Library](https://testing-library.com)
- [Axe Accessibility](https://www.deque.com/axe/)