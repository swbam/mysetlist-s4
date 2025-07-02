// Types (excluding AuthProvider to avoid conflict)
export type { AuthUser, AuthSession, AuthState, AuthEventType } from './types/auth';
export type { UserProfile, UserPreferences } from './types/user';
export type { SessionData, SessionOptions } from './types/session';

// Configuration
export * from './config/supabase';
export * from './config/spotify';

// Providers
export * from './providers';

// Hooks (this includes AuthProvider from use-auth)
export * from './hooks';

// Components
export * from './components';

// Utilities
export * from './utils';

// Re-export Supabase types that might be needed
export type { Session, User } from '@supabase/supabase-js';