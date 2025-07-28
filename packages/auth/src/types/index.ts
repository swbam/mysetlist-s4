// Export everything from auth except UserProfile and UserPreferences
export type {
  AuthProvider,
  AuthUser,
  AuthSession,
  AuthError,
  SignUpData,
  SignInData,
  SpotifyTokens,
  SpotifyProfile,
  EmailPreferences,
  PrivacySettings,
  IAuthProvider,
  OAuthConfig,
  AuthState,
  AuthEventType,
} from "./auth"

// Export UserProfile and UserPreferences from user module only
export type { UserProfile, UserPreferences } from "./user"

// Export everything from session
export * from "./session"
