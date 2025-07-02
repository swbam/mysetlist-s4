export interface AuthUser {
  id: string;
  email?: string;
  emailVerified: boolean;
  lastSignIn?: string;
  metadata?: Record<string, any>;
  appMetadata?: Record<string, any>;
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  user: AuthUser;
}

export interface AuthProvider {
  signIn(email: string, password: string): Promise<AuthUser>;
  signUp(email: string, password: string, metadata?: Record<string, any>): Promise<AuthUser>;
  signInWithOAuth(provider: 'spotify' | 'google'): Promise<any>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
  getUser(): Promise<AuthUser | null>;
}

export type AuthEventType = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED';

export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
}