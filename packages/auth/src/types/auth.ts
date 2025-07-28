import type {
  Session as SupabaseSession,
  User as SupabaseUser,
} from "@supabase/supabase-js"

export interface SpotifyTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
  scope: string[]
}

export interface SpotifyProfile {
  id: string
  displayName: string
  email: string
  images: Array<{ url: string; height: number; width: number }>
  followers: { total: number }
  country: string
  product: string // free, premium
}

export interface UserProfile {
  id: string
  userId: string
  displayName?: string
  bio?: string
  location?: string
  favoriteGenres?: string[]
  instagramUrl?: string
  twitterUrl?: string
  spotifyUrl?: string
  isPublic: boolean
  showAttendedShows: boolean
  showVotedSongs: boolean
  showsAttended: number
  songsVoted: number
  artistsFollowed: number
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface EmailPreferences {
  id: string
  userId: string
  emailEnabled: boolean
  showReminders: boolean
  showReminderFrequency: "immediately" | "daily" | "weekly" | "never"
  newShowNotifications: boolean
  newShowFrequency: "immediately" | "daily" | "weekly" | "never"
  setlistUpdates: boolean
  setlistUpdateFrequency: "immediately" | "daily" | "weekly" | "never"
  weeklyDigest: boolean
  marketingEmails: boolean
  securityEmails: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PrivacySettings {
  showProfile: boolean
  showVotingHistory: boolean
  showAttendanceHistory: boolean
  allowFollowing: boolean
  showOnlineStatus: boolean
}

export interface UserPreferences {
  emailPreferences: EmailPreferences
  privacySettings: PrivacySettings
  musicPreferences: {
    favoriteGenres: string[]
    preferredVenues: string[]
    notificationRadius: number // km for location-based notifications
  }
}

export interface AuthUser extends SupabaseUser {
  profile: UserProfile
  preferences: UserPreferences
  spotifyProfile?: SpotifyProfile
  spotifyTokens?: SpotifyTokens
  emailVerified: boolean
  spotifyConnected: boolean
}

export interface AuthSession extends SupabaseSession {
  user: AuthUser
  spotifyTokens?: SpotifyTokens
}

export interface AuthError {
  message: string
  code?: string
  details?: any
}

export interface SignUpData {
  email: string
  password: string
  displayName?: string
  metadata?: Record<string, any>
}

export interface SignInData {
  email: string
  password: string
}

export interface PasswordResetData {
  email: string
}

export interface UpdateProfileData {
  displayName?: string
  bio?: string
  location?: string
  favoriteGenres?: string[]
  instagramUrl?: string
  twitterUrl?: string
  isPublic?: boolean
  showAttendedShows?: boolean
  showVotedSongs?: boolean
  avatarUrl?: string
}

export interface UpdatePreferencesData {
  emailPreferences?: Partial<EmailPreferences>
  privacySettings?: Partial<PrivacySettings>
  musicPreferences?: {
    favoriteGenres?: string[]
    preferredVenues?: string[]
    notificationRadius?: number
  }
}

export type AuthProvider = "email" | "google" | "spotify"

// Interface for auth provider implementations
export interface IAuthProvider {
  signIn(email: string, password: string): Promise<AuthUser>
  signUp(
    email: string,
    password: string,
    metadata?: Record<string, any>
  ): Promise<AuthUser>
  signOut(): Promise<void>
  signInWithGoogle(config?: OAuthConfig): Promise<void>
  signInWithSpotify(config?: OAuthConfig): Promise<void>
  resetPassword(email: string): Promise<void>
  updateProfile(metadata: Record<string, any>): Promise<AuthUser>
  onAuthStateChange(
    callback: (event: string, session: AuthSession | null) => void
  ): () => void
}

export interface OAuthConfig {
  redirectTo?: string
  scopes?: string
  queryParams?: Record<string, string>
}

// Missing exports that were causing TypeScript errors
export type AuthState =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "error"

export type AuthEventType =
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED"
  | "PASSWORD_RECOVERY"
