// Centralized environment variable access with proper typing

export const env = {
  // Public environment variables
  NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"] || "",
  NEXT_PUBLIC_WEB_URL: process.env["NEXT_PUBLIC_WEB_URL"] || "",
  NEXT_PUBLIC_API_URL: process.env["NEXT_PUBLIC_API_URL"] || "",
  NEXT_PUBLIC_DOCS_URL: process.env["NEXT_PUBLIC_DOCS_URL"] || "",
  NEXT_PUBLIC_ASSET_PREFIX: process.env["NEXT_PUBLIC_ASSET_PREFIX"] || "",
  NEXT_PUBLIC_CRON_SECRET: process.env["NEXT_PUBLIC_CRON_SECRET"] || "",

  // Server-side environment variables
  NODE_ENV: process.env["NODE_ENV"] || "development",
  ANALYZE: process.env["ANALYZE"] === "true",
  NEXT_RUNTIME: process.env["NEXT_RUNTIME"] || "nodejs",
  VERCEL_PROJECT_PRODUCTION_URL:
    process.env["VERCEL_PROJECT_PRODUCTION_URL"] || "",

  // Database
  DATABASE_URL: process.env["DATABASE_URL"] || "",

  // Authentication
  ADMIN_API_KEY: process.env["ADMIN_API_KEY"] || "",

  // External APIs
  SPOTIFY_CLIENT_ID: process.env["SPOTIFY_CLIENT_ID"] || "",
  SPOTIFY_CLIENT_SECRET: process.env["SPOTIFY_CLIENT_SECRET"] || "",
  TICKETMASTER_API_KEY: process.env["TICKETMASTER_API_KEY"] || "",
  SETLISTFM_API_KEY: process.env["SETLISTFM_API_KEY"] || "",

  // Redis/Upstash
  UPSTASH_REDIS_REST_URL: process.env["UPSTASH_REDIS_REST_URL"] || "",
  UPSTASH_REDIS_REST_TOKEN: process.env["UPSTASH_REDIS_REST_TOKEN"] || "",

  // Email
  RESEND_API_KEY: process.env["RESEND_API_KEY"] || "",

  // Feature flags
  POSTHOG_API_KEY: process.env["POSTHOG_API_KEY"] || "",
  POSTHOG_HOST: process.env["POSTHOG_HOST"] || "https://app.posthog.com",
} as const

export type Env = typeof env

// Helper to check if we're in production
export const isProduction = env["NODE_ENV"] === "production"

// Helper to check if we're in development
export const isDevelopment = env["NODE_ENV"] === "development"

// Helper to get required env variable with error handling
type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never
}[keyof T]

export function getRequiredEnv(key: StringKeys<Env>): string {
  const value = env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value as string
}

// Type-safe env variable access
export function getEnv<K extends keyof Env>(key: K): Env[K] {
  return env[key]
}
