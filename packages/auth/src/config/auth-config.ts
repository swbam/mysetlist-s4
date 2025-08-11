import { env } from "@repo/env";

export const authConfig = {
  // Supabase configuration
  supabase: {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Spotify OAuth configuration
  spotify: {
    clientId: env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
    clientSecret: env.SPOTIFY_CLIENT_SECRET,
    scopes: [
      "user-read-email",
      "user-read-private",
      "user-top-read",
      "user-read-recently-played",
      "user-library-read",
      "playlist-read-private",
    ],
    redirectUri: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  },

  // Email service configuration
  email: {
    resendApiKey: env.RESEND_API_KEY,
    fromAddresses: {
      welcome: "MySetlist <welcome@mysetlist.com>",
      security: "MySetlist <security@mysetlist.com>",
      verify: "MySetlist <verify@mysetlist.com>",
    },
  },

  // JWT configuration
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: "7d",
  },

  // App configuration
  app: {
    url: env.NEXT_PUBLIC_APP_URL,
    name: "MySetlist",
  },

  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%^&*(),.?":{}|<>',
  },

  // Session configuration
  session: {
    cookieName: "mysetlist-auth",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax" as const,
  },

  // Rate limiting
  rateLimit: {
    signIn: {
      max: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    },
    signUp: {
      max: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
    },
    passwordReset: {
      max: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
    },
  },

  // Redirect URLs
  redirects: {
    afterSignIn: "/dashboard",
    afterSignUp: "/auth/verify-email",
    afterSignOut: "/",
    afterPasswordReset: "/sign-in",
    unauthorized: "/unauthorized",
    emailVerification: "/auth/verify-email",
  },

  // Feature flags
  features: {
    enableGoogleAuth: true,
    enableSpotifyAuth: true,
    enableEmailVerification: true,
    enablePasswordReset: true,
    enableProfileSettings: true,
    enableMusicPreferences: true,
    enableArtistFollowing: true,
  },
} as const;

export type AuthConfig = typeof authConfig;
