import type { NextRequest } from "next/server"
import { createSimpleRateLimiter } from "./simple-rate-limit"

// Try to use the database rate limiter, fall back to in-memory if not available
let createRateLimiter: (props: {
  limit: number
  window: string
  prefix?: string
}) => ReturnType<typeof createSimpleRateLimiter>

try {
  const rateLimit = require("@repo/rate-limit")
  createRateLimiter = rateLimit.createRateLimiter
} catch {
  // Fallback to simple in-memory rate limiter
  console.warn(
    "Database rate limiter not available, using in-memory rate limiter"
  )
  createRateLimiter = (props: {
    limit: number
    window: string
    prefix?: string
  }) => {
    // Convert window string to milliseconds
    const parts = props.window.split(" ")
    const value = parts[0] || "1"
    const unit = parts[1] || "s"
    const num = Number.parseFloat(value)
    let windowMs = num * 1000 // default to seconds

    switch (unit) {
      case "m":
        windowMs = num * 60000
        break
      case "h":
        windowMs = num * 3600000
        break
      case "d":
        windowMs = num * 86400000
        break
    }

    return createSimpleRateLimiter({
      limit: props.limit,
      windowMs,
      ...(props.prefix && { prefix: props.prefix }),
    })
  }
}

// Rate limiters for external API operations
export const ticketmasterRateLimiter = createRateLimiter({
  limit: 5,
  window: "1 s", // 5 requests per second as per Ticketmaster limits
  prefix: "api:ticketmaster",
})

export const setlistFmRateLimiter = createRateLimiter({
  limit: 10,
  window: "1 m", // 10 requests per minute as per setlist.fm limits
  prefix: "api:setlistfm",
})

export const musicBrainzRateLimiter = createRateLimiter({
  limit: 1,
  window: "1 s", // 1 request per second as per MusicBrainz limits
  prefix: "api:musicbrainz",
})

// General API rate limiters
export const searchRateLimiter = createRateLimiter({
  limit: 30,
  window: "1 m", // 30 searches per minute per user
  prefix: "api:search",
})

export const ingestRateLimiter = createRateLimiter({
  limit: 10,
  window: "5 m", // 10 ingestion requests per 5 minutes
  prefix: "api:ingest",
})

export const voteRateLimiter = createRateLimiter({
  limit: 60,
  window: "1 m", // 60 votes per minute
  prefix: "api:vote",
})

// Helper to get identifier from request (user ID or IP)
export function getApiIdentifier(
  request: NextRequest,
  userId?: string
): string {
  // Prefer user ID if available
  if (userId) {
    return userId
  }

  // Fallback to IP address
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const cfConnectingIp = request.headers.get("cf-connecting-ip")

  const ip =
    forwardedFor?.split(",")[0] || realIp || cfConnectingIp || "unknown"

  return ip.trim()
}

// Rate limit response helper
export function createRateLimitResponse(
  limit: number,
  remaining: number,
  reset: Date,
  message?: string
): Response {
  return new Response(
    JSON.stringify({
      error: message || "Rate limit exceeded. Please try again later.",
      retryAfter: Math.ceil((reset.getTime() - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toISOString(),
        "Retry-After": Math.ceil(
          (reset.getTime() - Date.now()) / 1000
        ).toString(),
      },
    }
  )
}

// Middleware helper for API routes
export async function apiRateLimitMiddleware(
  request: NextRequest,
  rateLimiter: ReturnType<typeof createRateLimiter>,
  identifier?: string
): Promise<Response | null> {
  const id = identifier || getApiIdentifier(request)
  const result = await rateLimiter.limit(id)

  if (!result.success) {
    return createRateLimitResponse(result.limit, result.remaining, result.reset)
  }

  return null
}
