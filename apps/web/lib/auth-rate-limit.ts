import { createRateLimiter } from "@repo/rate-limit";
import type { NextRequest } from "next/server";

// Rate limiters for different auth operations
export const signInRateLimiter = createRateLimiter({
  limit: 5,
  window: "15 m", // 5 attempts per 15 minutes
  prefix: "auth:signin",
});

export const signUpRateLimiter = createRateLimiter({
  limit: 3,
  window: "1 h", // 3 sign-ups per hour
  prefix: "auth:signup",
});

export const passwordResetRateLimiter = createRateLimiter({
  limit: 3,
  window: "1 h", // 3 reset attempts per hour
  prefix: "auth:reset",
});

export const emailVerificationRateLimiter = createRateLimiter({
  limit: 5,
  window: "1 h", // 5 verification emails per hour
  prefix: "auth:verify",
});

// Helper to get identifier from request
export function getIdentifier(request: NextRequest): string {
  // Try to get IP from various headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  // Use the first available IP
  const ip =
    forwardedFor?.split(",")[0] || realIp || cfConnectingIp || "unknown";

  return ip.trim();
}

// Generic rate limit check function
export async function checkRateLimit(
  rateLimiter: ReturnType<typeof createRateLimiter>,
  identifier: string,
): Promise<{ success: boolean; remaining: number; reset: Date }> {
  const result = await rateLimiter.limit(identifier);

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}

// Middleware helper for auth routes
export async function authRateLimitMiddleware(
 _request: NextRequest,
  rateLimiter: ReturnType<typeof createRateLimiter>,
): Promise<Response | null> {
  const identifier = getIdentifier(request);
  const { success, remaining, reset } = await checkRateLimit(
    rateLimiter,
    identifier,
  );

  if (!success) {
    return new Response(
      JSON.stringify({
        error: "Too many attempts. Please try again later.",
        retryAfter: Math.ceil((reset.getTime() - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toISOString(),
          "Retry-After": Math.ceil(
            (reset.getTime() - Date.now()) / 1000,
          ).toString(),
        },
      },
    );
  }

  return null;
}
