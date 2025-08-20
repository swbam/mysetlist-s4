import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter } from "@repo/rate-limit";

// Simple rate limiter instance (60 req/min per IP by default)
const limiter = createRateLimiter({ limit: 60, window: "1 m" });

export async function rateLimitMiddleware(
  request: NextRequest,
  opts?: { maxRequests?: number; windowSeconds?: number },
) {
  const ip =
    request.ip ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous";

  const { limit, success, remaining, reset } = await limiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        limit,
        remaining,
        reset,
      },
      { status: 429 },
    );
  }

  return null; // continue
}

// Helper function for API routes
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: { maxRequests?: number; windowSeconds?: number },
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await rateLimitMiddleware(req, config);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return handler(req);
  };
}

// IP-based rate limiting for anonymous users
export function ipRateLimit(maxRequests: number, windowSeconds: number) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return withRateLimit(handler, {
      maxRequests,
      windowSeconds,
      keyGenerator: (req) => {
        const ip =
          req.headers.get("x-forwarded-for")?.split(",")[0] ||
          req.headers.get("x-real-ip") ||
          "unknown";
        return `rate:ip:${ip}:${req.nextUrl.pathname}`;
      },
    });
  };
}

// User-based rate limiting for authenticated users
export function userRateLimit(maxRequests: number, windowSeconds: number) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return withRateLimit(handler, {
      maxRequests,
      windowSeconds,
      keyGenerator: (req) => {
        const userId =
          req.headers.get("x-user-id") ||
          req.cookies.get("user-id")?.value ||
          "anonymous";
        return `rate:user:${userId}:${req.nextUrl.pathname}`;
      },
    });
  };
}

// API key rate limiting for external integrations
export function apiKeyRateLimit(maxRequests: number, windowSeconds: number) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return withRateLimit(handler, {
      maxRequests,
      windowSeconds,
      keyGenerator: (req) => {
        const apiKey = req.headers.get("x-api-key");
        if (!apiKey) {
          return `rate:nokey:${req.nextUrl.pathname}`;
        }
        return `rate:apikey:${apiKey}:${req.nextUrl.pathname}`;
      },
    });
  };
}
