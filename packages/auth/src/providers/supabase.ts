import type { Session, User } from '@supabase/supabase-js';
import {
  AUTH_CONFIG,
  createSupabaseAdmin,
  createSupabaseClient,
} from '../config/supabase';
import type { AuthProvider, AuthSession, AuthUser } from '../types';

export class SupabaseAuthProvider implements AuthProvider {
  private client = createSupabaseClient();
  private adminClient = createSupabaseAdmin();

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Authentication failed');
    }

    return this.mapUser(data.user);
  }

  async signUp(
    email: string,
    password: string,
    metadata?: Record<string, any>
  ): Promise<AuthUser> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: metadata || {},
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Sign up failed');
    }

    return this.mapUser(data.user);
  }

  async signInWithOAuth(provider: 'spotify' | 'google'): Promise<any> {
    const scopes =
      provider === 'spotify'
        ? AUTH_CONFIG.oauth.spotify.scopes
        : AUTH_CONFIG.oauth.google.scopes;

    const { data, error } = await this.client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}${AUTH_CONFIG.redirectUrls.callback}`,
        scopes,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async signInWithMagicLink(email: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${AUTH_CONFIG.redirectUrls.callback}`,
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  }

  async getSession(): Promise<AuthSession | null> {
    const {
      data: { session },
      error,
    } = await this.client.auth.getSession();

    if (error) {
      throw new Error(error.message);
    }

    return session ? this.mapSession(session) : null;
  }

  async getUser(): Promise<AuthUser | null> {
    const {
      data: { user },
      error,
    } = await this.client.auth.getUser();

    if (error) {
      throw new Error(error.message);
    }

    return user ? this.mapUser(user) : null;
  }

  async refreshSession(): Promise<AuthSession | null> {
    const {
      data: { session },
      error,
    } = await this.client.auth.refreshSession();

    if (error) {
      throw new Error(error.message);
    }

    return session ? this.mapSession(session) : null;
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateProfile(metadata: Record<string, any>): Promise<AuthUser> {
    const { data, error } = await this.client.auth.updateUser({
      data: metadata,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Profile update failed');
    }

    return this.mapUser(data.user);
  }

  // Admin functions (server-side only)
  async getUserById(userId: string): Promise<AuthUser | null> {
    const {
      data: { user },
      error,
    } = await this.adminClient.auth.admin.getUserById(userId);

    if (error) {
      throw new Error(error.message);
    }

    return user ? this.mapUser(user) : null;
  }

  async deleteUser(userId: string): Promise<void> {
    const { error } = await this.adminClient.auth.admin.deleteUser(userId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async updateUserRole(
    userId: string,
    role: 'user' | 'moderator' | 'admin'
  ): Promise<void> {
    const { error } = await this.adminClient.auth.admin.updateUserById(userId, {
      app_metadata: { role },
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  // Event listener for auth state changes
  onAuthStateChange(
    callback: (event: string, session: AuthSession | null) => void
  ) {
    return this.client.auth.onAuthStateChange((event, session) => {
      callback(event, session ? this.mapSession(session) : null);
    });
  }

  private mapUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      emailVerified: !!user.email_confirmed_at,
      lastSignIn: user.last_sign_in_at,
      metadata: user.user_metadata || {},
      appMetadata: user.app_metadata || {},
    };
  }

  private mapSession(session: Session): AuthSession {
    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at || 0,
      user: this.mapUser(session.user),
    };
  }
}
