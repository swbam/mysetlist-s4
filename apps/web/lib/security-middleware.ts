import type { NextRequest } from "next/server";
import {
  authRateLimitMiddleware,
  emailVerificationRateLimiter,
  passwordResetRateLimiter,
  signInRateLimiter,
  signUpRateLimiter,
} from "./auth-rate-limit";
import { csrfProtection } from "./csrf";

// Map of auth endpoints to their rate limiters
const authEndpointLimiters = new Map([
  ["/api/auth/sign-in", signInRateLimiter],
  ["/api/auth/sign-up", signUpRateLimiter],
  ["/api/auth/reset-password", passwordResetRateLimiter],
  ["/api/auth/verify-email", emailVerificationRateLimiter],
]);

/**
 * Apply security middleware to API routes
 */
export async function applySecurityMiddleware(
  request: NextRequest,
): Promise<Response | null> {
  const pathname = request.nextUrl.pathname;

  // Apply rate limiting to auth endpoints
  const rateLimiter = authEndpointLimiters.get(pathname);
  if (rateLimiter) {
    const rateLimitResponse = await authRateLimitMiddleware(
      request,
      rateLimiter,
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  // Apply CSRF protection to state-changing operations
  if (pathname.startsWith("/api/") && request.method !== "GET") {
    const csrfResponse = await csrfProtection(request);
    if (csrfResponse) {
      return csrfResponse;
    }
  }

  return null;
}

/**
 * Security headers to add to all responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent clickjacking
    "X-Frame-Options": "DENY",
    // Prevent MIME type sniffing
    "X-Content-Type-Options": "nosniff",
    // Enable XSS protection
    "X-XSS-Protection": "1; mode=block",
    // Referrer policy
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Permissions policy
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    // Content Security Policy
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.spotify.com",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  };
}
