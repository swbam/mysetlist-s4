# MySetlist - Authentication & User Management with Next-Forge + Supabase

## Table of Contents
1. [Authentication Overview](#authentication-overview)
2. [Next-Forge Auth Package Modification](#next-forge-auth-package-modification)
3. [Supabase Authentication Setup](#supabase-authentication-setup)
4. [User Management System](#user-management-system)
5. [Spotify Integration](#spotify-integration)
6. [Session Management](#session-management)
7. [Security Implementation](#security-implementation)
8. [User Profile Features](#user-profile-features)

## Authentication Overview

MySetlist replaces Next-Forge's default authentication with Supabase Auth while maintaining the package structure and patterns. This provides seamless integration with Spotify OAuth for music data access and traditional email/password authentication.

### Authentication Flow
```
User Login Attempt
       ↓
Supabase Auth Check
       ↓
┌─────────────────┬─────────────────┐
│   First Time    │   Returning     │
│     User        │     User        │
└─────────────────┴─────────────────┘
       ↓                   ↓
Create User Record  Update Last Login
       ↓                   ↓
Session Creation    Session Creation
       ↓                   ↓
    Dashboard          Dashboard
```

### Authentication Methods
- **Email/Password**: Traditional authentication
- **Google OAuth**: Alternative social login
- **Magic Links**: Passwordless email authentication

## Next-Forge Auth Package Modification

### Package Structure
```
packages/auth/
├── src/
│   ├── config/
│   │   ├── supabase.ts      # Supabase client configuration
│   │   └── spotify.ts       # Spotify OAuth settings
│   ├── providers/
│   │   ├── supabase.ts      # Supabase auth provider
│   │   ├── spotify.ts       # Spotify OAuth provider
│   │   └── index.ts         # Provider exports
│   ├── hooks/
│   │   ├── use-auth.ts      # Authentication hook
│   │   ├── use-user.ts      # User data hook
│   │   └── use-session.ts   # Session management hook
│   ├── components/
│   │   ├── auth-forms/      # Login/signup forms
│   │   ├── auth-guard.tsx   # Route protection
│   │   └── spotify-connect.tsx # Spotify integration
│   ├── utils/
│   │   ├── auth-helpers.ts  # Authentication utilities
│   │   ├── session.ts       # Session management
│   │   └── validation.ts    # Auth validation schemas
│   ├── types/
│   │   ├── auth.ts          # Authentication types
│   │   ├── user.ts          # User types
│   │   └── session.ts       # Session types
│   └── index.ts             # Package exports
├── package.json
└── tsconfig.json
```

### Core Configuration
```typescript
// packages/auth/src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Server-side client for admin operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

## Supabase Authentication Setup

### Environment Variables
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Spotify OAuth
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Supabase Auth Configuration
```sql
-- Supabase Auth settings
UPDATE auth.config SET
  site_url = 'http://localhost:3000',
  additional_redirect_urls = '["http://localhost:3000/auth/callback"]';

-- Enable OAuth providers
INSERT INTO auth.providers (name, enabled) VALUES
  ('spotify', true),
  ('google', true);
```

### Authentication Provider Setup
```typescript
// packages/auth/src/providers/supabase.ts
import { AuthProvider, AuthUser, AuthSession } from '../types';
import { supabase } from '../config/supabase';

export class SupabaseAuthProvider implements AuthProvider {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);
    return this.mapUser(data.user);
  }

  async signUp(email: string, password: string, metadata?: Record<string, any>) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) throw new Error(error.message);
    return this.mapUser(data.user);
  }

  async signInWithOAuth(provider: 'spotify' | 'google') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        scopes: provider === 'spotify' 
          ? 'user-read-email user-read-private user-library-read user-top-read'
          : undefined,
      },
    });

    if (error) throw new Error(error.message);
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  async getSession(): Promise<AuthSession | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    
    return session ? this.mapSession(session) : null;
  }

  private mapUser(user: any): AuthUser {
    return {
      id: user.id,
      email: user.email,
      emailVerified: !!user.email_confirmed_at,
      lastSignIn: user.last_sign_in_at,
      metadata: user.user_metadata,
      appMetadata: user.app_metadata,
    };
  }

  private mapSession(session: any): AuthSession {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
      user: this.mapUser(session.user),
    };
  }
}
```

## User Management System

### Authentication Hook
```typescript
// packages/auth/src/hooks/use-auth.ts
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, AuthSession } from '../types';
import { SupabaseAuthProvider } from '../providers/supabase';

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<AuthUser>;
  signInWithSpotify: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  const authProvider = new SupabaseAuthProvider();

  useEffect(() => {
    // Get initial session
    authProvider.getSession().then((session) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const mappedSession = authProvider.mapSession(session);
          setSession(mappedSession);
          setUser(mappedSession.user);
        } else {
          setSession(null);
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      return await authProvider.signIn(email, password);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    setLoading(true);
    try {
      return await authProvider.signUp(email, password, metadata);
    } finally {
      setLoading(false);
    }
  };

  const signInWithSpotify = async () => {
    await authProvider.signInWithOAuth('spotify');
  };

  const signInWithGoogle = async () => {
    await authProvider.signInWithOAuth('google');
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authProvider.signOut();
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    const session = await authProvider.getSession();
    setSession(session);
    setUser(session?.user || null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        signUp,
        signInWithSpotify,
        signInWithGoogle,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Route Protection
```typescript
// packages/auth/src/components/auth-guard.tsx
'use client';

import { useAuth } from '../hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingSpinner } from '@repo/ui/components/loading-spinner';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireRole?: 'user' | 'moderator' | 'admin';
}

export function AuthGuard({ 
  children, 
  fallback, 
  redirectTo = '/auth/signin',
  requireRole 
}: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  if (loading) {
    return fallback || <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  // Role-based access control
  if (requireRole && !hasRole(user, requireRole)) {
    return <div>Access denied. Insufficient permissions.</div>;
  }

  return <>{children}</>;
}

function hasRole(user: AuthUser, requiredRole: string): boolean {
  const userRole = user.appMetadata?.role || 'user';
  const roleHierarchy = { user: 0, moderator: 1, admin: 2 };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
```


## Session Management

### Server-Side Session Handling
```typescript
// packages/auth/src/utils/session.ts
import { supabaseAdmin } from '../config/supabase';
import { cookies } from 'next/headers';

export async function getServerSession() {
  const cookieStore = cookies();
  const supabaseSession = cookieStore.get('sb-access-token');
  
  if (!supabaseSession?.value) {
    return null;
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(
    supabaseSession.value
  );

  if (error || !user) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      emailVerified: !!user.email_confirmed_at,
      metadata: user.user_metadata,
      appMetadata: user.app_metadata,
    },
  };
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}

export async function requireRole(requiredRole: 'user' | 'moderator' | 'admin') {
  const session = await requireAuth();
  const userRole = session.user.appMetadata?.role || 'user';
  
  const roleHierarchy = { user: 0, moderator: 1, admin: 2 };
  
  if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
    throw new Error('Insufficient permissions');
  }
  
  return session;
}
```

### Middleware for Route Protection
```typescript
// apps/web/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  // Protected routes
  const protectedPaths = ['/dashboard', '/admin'];
  const authPaths = ['/auth/signin', '/auth/signup'];
  
  const { pathname } = request.nextUrl;
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isAuthPath = authPaths.some(path => pathname.startsWith(path));

  const session = await supabase.auth.getSession();
  const isAuthenticated = !!session.data.session;

  // Redirect unauthenticated users from protected routes
  if (isProtectedPath && !isAuthenticated) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  // Redirect authenticated users from auth pages
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## Security Implementation

### Row Level Security Policies
```sql
-- Enable RLS on user-related tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### Input Validation
```typescript
// packages/auth/src/utils/validation.ts
import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
});

```

This authentication system provides a robust foundation for MySetlist using Next-Forge's package structure with Supabase integration. It supports multiple authentication methods and secure session management for basic user authentication.