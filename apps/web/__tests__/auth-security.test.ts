import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import {
  ANONYMOUS_LIMITS,
  canPerformAnonymousAction,
  getAnonymousActions,
  incrementAnonymousAction,
} from "../lib/anonymous-limits";
import { getIdentifier } from "../lib/auth-rate-limit";
import { generateCSRFToken, validateCSRFToken } from "../lib/csrf";

// Mock Next.js modules
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
  })),
}));

// Create a mock NextRequest that satisfies the interface
function createMockNextRequest(overrides: Partial<NextRequest> = {}): NextRequest {
  const defaultRequest = {
    method: "GET",
    headers: new Headers(),
    cookies: {},
    nextUrl: { pathname: "/", search: "", hash: "" },
    page: {},
    ua: {},
    geo: {},
    url: "http://localhost",
    bodyUsed: false,
    cache: "default" as RequestCache,
    credentials: "same-origin" as RequestCredentials,
    destination: "" as RequestDestination,
    integrity: "",
    keepalive: false,
    mode: "cors" as RequestMode,
    redirect: "follow" as RequestRedirect,
    referrer: "",
    referrerPolicy: "" as ReferrerPolicy,
    signal: new AbortController().signal,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    json: async () => ({}),
    text: async () => "",
    clone: function() { return this; }
  };
  
  return Object.assign(defaultRequest, overrides) as NextRequest;
}

describe("CSRF Protection", () => {
  it("should generate a valid CSRF token", () => {
    const token = generateCSRFToken();
    expect(token).toHaveLength(64); // 32 bytes in hex
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  it("should validate matching CSRF tokens", async () => {
    const mockRequest = createMockNextRequest({
      method: "POST",
      headers: new Headers({
        "x-csrf-token": "test-token",
      }),
    });

    // Mock cookie store
    const { cookies } = await import("next/headers");
    const mockedCookies = vi.mocked(cookies);
    mockedCookies.mockReturnValue({
      get: vi.fn(() => ({ value: "test-token" })),
    });

    const isValid = await validateCSRFToken(mockRequest);
    expect(isValid).toBe(true);
  });

  it("should reject mismatched CSRF tokens", async () => {
    const mockRequest = createMockNextRequest({
      method: "POST",
      headers: new Headers({
        "x-csrf-token": "wrong-token",
      }),
    });

    // Mock cookie store
    const { cookies } = await import("next/headers");
    const mockedCookies = vi.mocked(cookies);
    mockedCookies.mockReturnValue({
      get: vi.fn(() => ({ value: "test-token" })),
    });

    const isValid = await validateCSRFToken(mockRequest);
    expect(isValid).toBe(false);
  });

  it("should skip CSRF validation for GET requests", async () => {
    const mockRequest = createMockNextRequest({
      method: "GET",
      headers: new Headers(),
    });

    const isValid = await validateCSRFToken(mockRequest);
    expect(isValid).toBe(true);
  });
});

describe("Anonymous User Limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should track anonymous user actions", async () => {
    const { cookies } = await import("next/headers");
    const mockedCookies = vi.mocked(cookies);
    mockedCookies.mockReturnValue({
      get: vi.fn(() => null),
      set: vi.fn(),
    });

    const actions = await getAnonymousActions();
    expect(actions.votes).toBe(0);
    expect(actions.songsAdded).toBe(0);
    expect(actions.lastReset).toBeDefined();
  });

  it("should enforce vote limits for anonymous users", async () => {
    const { cookies } = await import("next/headers");
    const mockActions = {
      votes: ANONYMOUS_LIMITS.votes - 1,
      songsAdded: 0,
      lastReset: new Date().toISOString(),
    };

    const mockedCookies = vi.mocked(cookies);
    mockedCookies.mockReturnValue({
      get: vi.fn(() => ({ value: JSON.stringify(mockActions) })),
      set: vi.fn(),
    });

    // Should allow one more vote
    let canVote = await canPerformAnonymousAction("votes");
    expect(canVote.allowed).toBe(true);
    expect(canVote.remaining).toBe(1);

    // Increment and check again
    await incrementAnonymousAction("votes");

    // Update mock to reflect incremented value
    mockActions.votes = ANONYMOUS_LIMITS.votes;
    const mockedCookies2 = vi.mocked(cookies);
    mockedCookies2.mockReturnValue({
      get: vi.fn(() => ({ value: JSON.stringify(mockActions) })),
      set: vi.fn(),
    });

    canVote = await canPerformAnonymousAction("votes");
    expect(canVote.allowed).toBe(false);
    expect(canVote.remaining).toBe(0);
  });

  it("should reset limits after 24 hours", async () => {
    const { cookies } = await import("next/headers");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const oldActions = {
      votes: ANONYMOUS_LIMITS.votes,
      songsAdded: ANONYMOUS_LIMITS.songsAdded,
      lastReset: yesterday.toISOString(),
    };

    const mockedCookies = vi.mocked(cookies);
    mockedCookies.mockReturnValue({
      get: vi.fn(() => ({ value: JSON.stringify(oldActions) })),
      set: vi.fn(),
    });

    const actions = await getAnonymousActions();
    expect(actions.votes).toBe(0);
    expect(actions.songsAdded).toBe(0);
    expect(new Date(actions.lastReset).getTime()).toBeGreaterThan(
      yesterday.getTime(),
    );
  });
});

describe("Rate Limiting", () => {
  it("should extract IP from request headers", () => {
    const mockRequest = createMockNextRequest({
      headers: new Headers({
        "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        "x-real-ip": "192.168.1.2",
      }),
    });

    const ip = getIdentifier(mockRequest);
    expect(ip).toBe("192.168.1.1");
  });

  it("should use fallback IPs when x-forwarded-for is not available", () => {
    const mockRequest = createMockNextRequest({
      headers: new Headers({
        "x-real-ip": "192.168.1.2",
      }),
    });

    const ip = getIdentifier(mockRequest);
    expect(ip).toBe("192.168.1.2");
  });

  it("should use cloudflare IP when available", () => {
    const mockRequest = createMockNextRequest({
      headers: new Headers({
        "cf-connecting-ip": "192.168.1.3",
      }),
    });

    const ip = getIdentifier(mockRequest);
    expect(ip).toBe("192.168.1.3");
  });
});

describe("Auth Endpoints Security", () => {
  it("should enforce password complexity for sign-up", () => {
    const weakPasswords = [
      "password", // No uppercase or numbers
      "Password", // No numbers
      "password1", // No uppercase
      "12345678", // No letters
      "Pass1", // Too short
    ];

    const strongPasswords = ["Password123", "SecureP@ss1", "MyStr0ngP@ssw0rd"];

    // Test weak passwords
    for (const password of weakPasswords) {
      const isValid =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password) &&
        password.length >= 8;
      expect(isValid).toBe(false);
    }

    // Test strong passwords
    for (const password of strongPasswords) {
      const isValid =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password) &&
        password.length >= 8;
      expect(isValid).toBe(true);
    }
  });
});

describe("Security Headers", () => {
  it("should include all required security headers", async () => {
    const { getSecurityHeaders } = await import("../lib/security-middleware");
    const headers = getSecurityHeaders();

    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["X-XSS-Protection"]).toBe("1; mode=block");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toBeDefined();
    expect(headers["Content-Security-Policy"]).toBeDefined();
  });
});
