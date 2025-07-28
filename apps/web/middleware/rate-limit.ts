import { type NextRequest, NextResponse } from "next/server"
import { RedisRateLimiter } from "~/lib/cache/redis"

export interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
  keyGenerator?: (req: NextRequest) => string
  skipAuth?: boolean
  customHeaders?: boolean
}

const defaultConfigs: Record<string, RateLimitConfig> = {
  // Public endpoints
  "/api/trending": { maxRequests: 100, windowSeconds: 60 },
  "/api/artists/search": { maxRequests: 50, windowSeconds: 60 },
  "/api/shows/search": { maxRequests: 50, windowSeconds: 60 },
  "/api/venues/search": { maxRequests: 50, windowSeconds: 60 },

  // Auth endpoints - stricter limits
  "/api/auth/sign-in": { maxRequests: 5, windowSeconds: 300 }, // 5 per 5 min
  "/api/auth/sign-up": { maxRequests: 3, windowSeconds: 600 }, // 3 per 10 min
  "/api/auth/reset-password": { maxRequests: 3, windowSeconds: 900 }, // 3 per 15 min

  // Sync endpoints - very limited
  "/api/sync": { maxRequests: 10, windowSeconds: 3600 }, // 10 per hour
  "/api/admin": { maxRequests: 20, windowSeconds: 60, skipAuth: false },

  // Default for unspecified endpoints
  default: { maxRequests: 60, windowSeconds: 60 },
}

export async function rateLimitMiddleware(
  request: NextRequest,
  config?: RateLimitConfig
): Promise<NextResponse | null> {
  // Skip rate limiting in development
  if (process.env.NODE_ENV === "development") {
    return null
  }

  const pathname = request.nextUrl.pathname

  // Find matching config
  const matchingConfig = Object.entries(defaultConfigs).find(([path]) =>
    pathname.startsWith(path)
  )

  const finalConfig =
    config || matchingConfig?.[1] || defaultConfigs["default"]!

  // Generate rate limit key
  const keyGenerator =
    finalConfig.keyGenerator ||
    ((req) => {
      // Try to get user ID from various sources
      const userId =
        req.headers.get("x-user-id") || req.cookies.get("user-id")?.value

      if (userId && !finalConfig.skipAuth) {
        return `rate:user:${userId}:${pathname}`
      }

      // Fall back to IP address
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0] ||
        req.headers.get("x-real-ip") ||
        "unknown"

      return `rate:ip:${ip}:${pathname}`
    })

  const key = keyGenerator(request)
  const rateLimiter = new RedisRateLimiter()

  try {
    const result = await rateLimiter.checkLimit(
      key,
      finalConfig.maxRequests,
      finalConfig.windowSeconds
    )

    // Create response with rate limit headers
    const headers = new Headers({
      "X-RateLimit-Limit": finalConfig.maxRequests.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
    })

    if (!result.allowed) {
      // Calculate retry after
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
      headers.set("Retry-After", retryAfter.toString())

      return NextResponse.json(
        {
          error: "Too Many Requests",
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          retryAfter,
          reset: new Date(result.resetAt).toISOString(),
        },
        {
          status: 429,
          headers,
        }
      )
    }

    // Add rate limit headers to successful requests if configured
    if (finalConfig.customHeaders) {
      return NextResponse.next({
        headers,
      })
    }

    return null // Continue to endpoint
  } catch (_error) {
    return null
  }
}

// Helper function for API routes
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await rateLimitMiddleware(req, config)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    return handler(req)
  }
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
          "unknown"
        return `rate:ip:${ip}:${req.nextUrl.pathname}`
      },
    })
  }
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
          "anonymous"
        return `rate:user:${userId}:${req.nextUrl.pathname}`
      },
    })
  }
}

// API key rate limiting for external integrations
export function apiKeyRateLimit(maxRequests: number, windowSeconds: number) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return withRateLimit(handler, {
      maxRequests,
      windowSeconds,
      keyGenerator: (req) => {
        const apiKey = req.headers.get("x-api-key")
        if (!apiKey) {
          return `rate:nokey:${req.nextUrl.pathname}`
        }
        return `rate:apikey:${apiKey}:${req.nextUrl.pathname}`
      },
    })
  }
}
