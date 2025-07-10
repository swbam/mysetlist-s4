describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Sign Up', () => {
    it('should allow new users to sign up', () => {
      cy.visit('/auth/sign-up');
      cy.checkA11y();

      cy.get('input[name="email"]').type('newuser@example.com');
      cy.get('input[name="password"]').type('SecurePassword123!');
      cy.get('input[name="confirmPassword"]').type('SecurePassword123!');

      cy.interceptAPI('signUp', '/auth/sign-up');
      cy.get('button[type="submit"]').click();

      cy.wait('@signUp');
      cy.url().should('include', '/auth/verify-email');
      cy.contains('Please check your email').should('be.visible');
    });

    it('should validate password requirements', () => {
      cy.visit('/auth/sign-up');

      cy.get('input[name="password"]').type('weak');
      cy.get('input[name="password"]').blur();
      cy.contains('Password must be at least 8 characters').should(
        'be.visible'
      );
    });

    it('should prevent duplicate email registration', () => {
      cy.visit('/auth/sign-up');

      cy.get('input[name="email"]').type('existing@example.com');
      cy.get('input[name="password"]').type('SecurePassword123!');
      cy.get('input[name="confirmPassword"]').type('SecurePassword123!');

      cy.interceptAPI('signUpError', '/auth/sign-up', 'auth/signup-error.json');
      cy.get('button[type="submit"]').click();

      cy.contains('Email already registered').should('be.visible');
    });
  });

  describe('Sign In', () => {
    it('should allow users to sign in', () => {
      cy.visit('/auth/sign-in');
      cy.checkA11y();

      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="password"]').type('password123');

      cy.interceptAPI('signIn', '/auth/sign-in');
      cy.get('button[type="submit"]').click();

      cy.wait('@signIn');
      cy.url().should('eq', `${Cypress.config().baseUrl}/`);
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/auth/sign-in');

      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="password"]').type('wrongpassword');

      cy.get('button[type="submit"]').click();
      cy.contains('Invalid login credentials').should('be.visible');
    });

    it('should redirect to requested page after sign in', () => {
      cy.visit('/profile?redirect=/artists/dispatch');
      cy.url().should('include', '/auth/sign-in');

      cy.get('input[name="email"]').type('test@example.com');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      cy.url().should('include', '/artists/dispatch');
    });
  });

  describe('Password Reset', () => {
    it('should allow users to reset password', () => {
      cy.visit('/auth/sign-in');
      cy.contains('Forgot password?').click();

      cy.url().should('include', '/auth/reset-password');
      cy.checkA11y();

      cy.get('input[name="email"]').type('test@example.com');
      cy.interceptAPI('resetPassword', '/auth/reset-password');
      cy.get('button[type="submit"]').click();

      cy.wait('@resetPassword');
      cy.contains('Password reset email sent').should('be.visible');
    });
  });

  describe('OAuth Sign In', () => {
    it('should allow Spotify OAuth sign in', () => {
      cy.visit('/auth/sign-in');

      cy.get('[data-testid="spotify-signin"]').should('be.visible');
      cy.get('[data-testid="spotify-signin"]').click();

      // Note: Full OAuth flow testing requires more complex setup
      cy.url().should('include', 'accounts.spotify.com');
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      cy.login();
    });

    it('should maintain session across page refreshes', () => {
      cy.visit('/profile');
      cy.reload();
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should allow users to sign out', () => {
      cy.logout();
      cy.get('[data-testid="user-menu"]').should('not.exist');
      cy.visit('/profile');
      cy.url().should('include', '/auth/sign-in');
    });
  });

  describe('Performance', () => {
    it('should load sign-in page quickly', () => {
      cy.visit('/auth/sign-in');
      cy.measurePerformance('auth-sign-in');
    });
  });
});
