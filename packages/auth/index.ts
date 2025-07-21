export { createClient as createBrowserClient, type Session, type User } from './client';
export { createClient as createServerClient, createServiceClient, getUser, getUserFromRequest, getSession } from './server';
export { AuthProvider as SimpleAuthProvider } from './provider-simple';
export { AuthProvider as AdvancedAuthProvider } from './provider';
export * from './middleware';
export * from './keys';

// Types
export * from './src/types/auth';

// Services
export { UnifiedAuthProvider } from './src/providers/unified-auth';
export { SpotifyService } from './src/services/spotify-service';
export { UserService } from './src/services/user-service';
export { EmailService } from './src/services/email-service';

// Hooks
export { useAuthState } from './src/hooks/use-auth-state';

// Utils
export { ProtectedRoute, PublicOnlyRoute, ConditionalAuth } from './src/utils/route-guards';

// Components
export { SignIn } from './components/sign-in';
export { SignUp } from './components/sign-up';
export { ProfileSettings } from './components/profile-settings';
export { ResetPassword } from './components/reset-password';