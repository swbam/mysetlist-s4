# @repo/auth

A comprehensive authentication package for TheSet, built on top of Supabase Auth with enhanced features for music applications.

## Features

- 🔐 **Email/Password Authentication** - Secure user registration and login
- 🎵 **Spotify OAuth Integration** - Connect with Spotify for music preferences
- 🌐 **Google OAuth** - Sign in with Google accounts
- 👤 **User Profiles** - Rich user profiles with music preferences
- 📧 **Email Services** - Welcome emails, password resets, and notifications
- 🔒 **Route Protection** - Components for protecting routes and conditional rendering
- 🎯 **Music Preferences** - Sync and manage user's music taste from Spotify
- 👥 **Artist Following** - Follow favorite artists and get notifications
- ⚙️ **Privacy Settings** - Granular privacy controls for user data

## Installation

This package is part of the TheSet monorepo and uses workspace dependencies.

```bash
# Install dependencies
pnpm install
```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Spotify OAuth
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001

# JWT (optional)
JWT_SECRET=your_jwt_secret
```

## Quick Start

### 1. Wrap your app with AuthProvider

```tsx
import { AuthProvider } from "@repo/auth";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

### 2. Use the useAuth hook

```tsx
import { useAuth } from "@repo/auth";

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      <h1>Welcome, {user.profile?.displayName || user.email}!</h1>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### 3. Protect routes

```tsx
import { ProtectedRoute } from "@repo/auth";

export default function ProtectedPage() {
  return (
    <ProtectedRoute requireEmailVerification>
      <div>This content is only visible to verified users</div>
    </ProtectedRoute>
  );
}
```

## Components

### Authentication Forms

```tsx
import { SignIn, SignUp, ResetPassword } from '@repo/auth';

// Sign in form with email/password and OAuth options
<SignIn />

// Sign up form with validation and terms acceptance
<SignUp />

// Password reset form with strength indicator
<ResetPassword />
```

### Profile Management

```tsx
import { ProfileSettings } from "@repo/auth";

// Comprehensive profile settings with tabs for:
// - Profile information
// - Email preferences
// - Spotify integration
<ProfileSettings />;
```

### Route Guards

```tsx
import { ProtectedRoute, PublicOnlyRoute, ConditionalAuth } from '@repo/auth';

// Only show to authenticated users
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// Only show to unauthenticated users (e.g., login page)
<PublicOnlyRoute>
  <SignIn />
</PublicOnlyRoute>

// Conditional rendering based on auth state
<ConditionalAuth
  requireAuth
  fallback={<SignInPrompt />}
>
  <UserContent />
</ConditionalAuth>
```

## Hooks

### useAuth

Main authentication hook with full functionality:

```tsx
const {
  user, // Current user with profile data
  session, // Current session
  loading, // Loading state

  // Auth methods
  signIn,
  signUp,
  signOut,
  signInWithGoogle,
  signInWithSpotify,

  // Profile management
  updateProfile,
  updatePreferences,

  // Spotify integration
  linkSpotify,
  refreshSpotifyTokens,

  // Utilities
  refreshSession,
} = useAuth();
```

### useAuthState

Lightweight hook for just auth state:

```tsx
const {
  user,
  session,
  loading,
  error,
  isAuthenticated,
  isEmailVerified,
  isSpotifyConnected,
  refreshSession,
} = useAuthState();
```

## Services

### UnifiedAuthProvider

Core authentication service that handles all auth operations:

```tsx
import { UnifiedAuthProvider } from "@repo/auth";

const authProvider = new UnifiedAuthProvider();

// Sign in
const session = await authProvider.signInWithEmail({ email, password });

// Spotify integration
await authProvider.linkSpotify(userId);
await authProvider.syncSpotifyMusicPreferences(userId);
```

### UserService

Manages user profiles, preferences, and music data:

```tsx
import { UserService } from "@repo/auth";

const userService = new UserService();

// Profile management
await userService.updateUserProfile(userId, profileData);
await userService.updateUserPreferences(userId, preferences);

// Artist following
await userService.followArtist(userId, artistId, artistName);
await userService.unfollowArtist(userId, artistId);
```

### SpotifyService

Handles Spotify API integration:

```tsx
import { SpotifyService } from "@repo/auth";

const spotifyService = new SpotifyService();

// Get user data
const profile = await spotifyService.getUserProfile(accessToken);
const topArtists = await spotifyService.getUserTopArtists(accessToken);
const topTracks = await spotifyService.getUserTopTracks(accessToken);

// Token management
const newTokens = await spotifyService.refreshTokens(refreshToken);
```

### EmailService

Handles transactional emails:

```tsx
import { EmailService } from "@repo/auth";

const emailService = new EmailService();

// Send emails
await emailService.sendWelcomeEmail(email, displayName);
await emailService.sendPasswordResetEmail(email);
await emailService.sendEmailVerificationEmail(email, verificationUrl);
```

## Database Schema

The auth package uses the following database tables:

- `users` - Core user data
- `user_profiles` - Extended user profiles
- `user_auth_tokens` - OAuth tokens (Spotify, Google)
- `user_followed_artists` - Artist following relationships
- `user_music_preferences` - Music taste and preferences
- `email_preferences` - Email notification settings

## Middleware

Add authentication middleware to your Next.js app:

```tsx
// middleware.ts
import { authMiddleware } from "@repo/auth";

export async function middleware(request: NextRequest) {
  return await authMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

## Type Safety

The package provides comprehensive TypeScript types:

```tsx
import type {
  AuthUser,
  AuthSession,
  UserProfile,
  EmailPreferences,
  SpotifyTokens,
  SpotifyProfile,
  UpdateProfileData,
  UpdatePreferencesData,
} from "@repo/auth";
```

## Error Handling

All authentication methods return structured errors:

```tsx
try {
  await signIn({ email, password });
} catch (error) {
  if (error.code === "invalid_credentials") {
    // Handle invalid credentials
  } else if (error.code === "email_not_confirmed") {
    // Handle unverified email
  }
}
```

## Security Features

- 🔒 **Secure token storage** - OAuth tokens stored securely in database
- 🛡️ **Rate limiting** - Built-in rate limiting for auth endpoints
- 🔐 **Password validation** - Strong password requirements
- 📧 **Email verification** - Required email verification for new accounts
- 🚫 **Route protection** - Comprehensive route protection utilities
- 🔄 **Token refresh** - Automatic token refresh for OAuth providers

## Contributing

This package is part of the TheSet monorepo. See the main README for contribution guidelines.

## License

Private - TheSet Project
