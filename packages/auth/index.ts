export * from './client';
export * from './server';
export * from './provider';
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