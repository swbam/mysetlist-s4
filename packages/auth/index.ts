// Client-side utilities
export { createClient as createBrowserClient } from "./client";
export type { Session, User } from "./client";

// Server-side utilities are exported from "@repo/auth/server" to avoid bundling in client builds
// import { createClient as createServerClient, createServiceClient, getUser, getUserFromRequest, getSession } from "./server";

// Main AuthProvider from use-auth hook (preferred)
export { AuthProvider, useAuth } from "./src/hooks/use-auth";
export * from "./middleware";
export * from "./keys";

// Types
export * from "./src/types/auth";

// Services
export { UnifiedAuthProvider } from "./src/providers/unified-auth";
export { SpotifyService } from "./src/services/spotify-service";
export { UserService } from "./src/services/user-service";
export { EmailService } from "./src/services/email-service";

// Hooks
export { useAuthState } from "./src/hooks/use-auth-state";

// Utils
export {
  ProtectedRoute,
  PublicOnlyRoute,
  ConditionalAuth,
} from "./src/utils/route-guards";

// Components
export { SignIn } from "./components/sign-in";
export { SignUp } from "./components/sign-up";
export { ProfileSettings } from "./components/profile-settings";
export { ResetPassword } from "./components/reset-password";
