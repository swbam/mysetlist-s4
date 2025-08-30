import type { Session, User, UserAppMetadata } from "@supabase/supabase-js";
import { vi } from "vitest";

export interface MockUser extends Partial<User> {
  id: string;
  email: string;
  role?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  /**
   * Additional app-specific metadata required by Supabase `User` type.
   * Added to satisfy `Partial<Session>` compatibility.
   */
  app_metadata?: Record<string, any>;
}

export interface MockSession extends Omit<Partial<Session>, "user"> {
  user: MockUser;
  access_token: string;
}

// Default mock user for tests
export const createMockUser = (
  overrides: Partial<MockUser> = {},
): MockUser => ({
  id: "test-user-id",
  email: "test@example.com",
  role: "authenticated",
  user_metadata: {
    full_name: "Test User",
  },
  app_metadata: {},
  aud: "authenticated",
  _creationTime: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Default mock session for tests
export const createMockSession = (
  userOverrides: Partial<MockUser> = {},
): MockSession => ({
  user: createMockUser(userOverrides),
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
});

// Mock admin user
export const createMockAdminUser = (
  overrides: Partial<MockUser> = {},
): MockUser =>
  createMockUser({
    role: "admin",
    user_metadata: {
      full_name: "Admin User",
      role: "admin",
    },
    ...overrides,
  });

// Mock moderator user
export const createMockModeratorUser = (
  overrides: Partial<MockUser> = {},
): MockUser =>
  createMockUser({
    role: "moderator",
    user_metadata: {
      full_name: "Moderator User",
      role: "moderator",
    },
    ...overrides,
  });

// Authentication state helpers
export const mockAuthenticatedState = (user: MockUser = createMockUser()) => {
  const session = createMockSession(user);

  return {
    user,
    session,
    isAuthenticated: true,
    isLoading: false,
  };
};

export const mockUnauthenticatedState = () => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
});

export const mockLoadingAuthState = () => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
});

// Supabase auth mock factories
export const createMockSupabaseAuth = (
  authState: "authenticated" | "unauthenticated" | "loading" = "authenticated",
) => {
  const states = {
    authenticated: mockAuthenticatedState(),
    unauthenticated: mockUnauthenticatedState(),
    loading: mockLoadingAuthState(),
  };

  const state = states[authState];

  return {
    getUser: vi.fn().mockResolvedValue({
      data: { user: state.user },
      error: null,
    }),
    getSession: vi.fn().mockResolvedValue({
      data: { session: state.session },
      error: null,
    }),
    onAuthStateChange: vi.fn((callback) => {
      // Simulate auth state change
      if (callback) {
        callback("SIGNED_IN", state.session);
      }
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    }),
    signInWithPassword: vi.fn().mockResolvedValue({
      data: { user: state.user, session: state.session },
      error: null,
    }),
    signInWithOAuth: vi.fn().mockResolvedValue({
      data: { provider: "spotify", url: "https://example.com/auth" },
      error: null,
    }),
    signUp: vi.fn().mockResolvedValue({
      data: { user: state.user, session: state.session },
      error: null,
    }),
    signOut: vi.fn().mockResolvedValue({
      error: null,
    }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({
      error: null,
    }),
    updateUser: vi.fn().mockResolvedValue({
      data: { user: state.user },
      error: null,
    }),
  };
};

// Mock authentication errors
export const mockAuthError = (
  type:
    | "invalid_credentials"
    | "email_not_confirmed"
    | "network_error" = "invalid_credentials",
) => {
  const errors = {
    invalid_credentials: {
      message: "Invalid login credentials",
      status: 400,
    },
    email_not_confirmed: {
      message: "Email not confirmed",
      status: 400,
    },
    network_error: {
      message: "Network error",
      status: 500,
    },
  };

  return errors[type];
};

// Mock auth provider for React components
export const mockAuthProvider = (
  authState: "authenticated" | "unauthenticated" | "loading" = "authenticated",
) => {
  const state = mockAuthenticatedState();

  return {
    ...state,
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    updateProfile: vi.fn().mockResolvedValue({ error: null }),
  };
};

// Test helpers for authentication flows
export const mockSuccessfulLogin = () => {
  const user = createMockUser();
  const session = createMockSession(user);

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ user, session }),
  });

  return { user, session };
};

export const mockFailedLogin = (
  errorType:
    | "invalid_credentials"
    | "email_not_confirmed" = "invalid_credentials",
) => {
  const error = mockAuthError(errorType);

  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: error.status,
    json: () => Promise.resolve({ error: error.message }),
  });

  return error;
};

// Role-based access control helpers
export const mockUserWithRole = (
  role: "user" | "admin" | "moderator" = "user",
) => {
  const roleConfigs = {
    user: createMockUser(),
    admin: createMockAdminUser(),
    moderator: createMockModeratorUser(),
  };

  return roleConfigs[role];
};

// Auth route testing helpers
export const mockAuthRequest = (
  method: "GET" | "POST" | "PUT" | "DELETE" = "POST",
  authenticated = true,
) => {
  const headers = new Headers({
    "content-type": "application/json",
  });

  if (authenticated) {
    headers.set("authorization", "Bearer test-token");
  }

  return new Request("http://localhost:3001/api/auth/test", {
    method,
    headers,
    body: method !== "GET" ? JSON.stringify({ test: "data" }) : undefined,
  });
};

// Mock middleware responses
export const mockAuthMiddleware = (
  authenticated = true,
  role: "user" | "admin" | "moderator" = "user",
) => {
  if (!authenticated) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const user = mockUserWithRole(role);

  return {
    user,
    isAuthenticated: true,
    hasRole: (requiredRole: string) => {
      const roleHierarchy = { admin: 3, moderator: 2, user: 1 };
      const userLevel = roleHierarchy[role as keyof typeof roleHierarchy] || 0;
      const requiredLevel =
        roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
      return userLevel >= requiredLevel;
    },
  };
};
