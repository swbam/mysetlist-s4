import type { Session, User } from "@supabase/supabase-js";
import {
  AUTH_CONFIG,
  createSupabaseAdmin,
  createSupabaseClient,
} from "../config/supabase";
import type {
  AuthSession,
  AuthUser,
  IAuthProvider,
  OAuthConfig,
} from "../types";

export class SupabaseAuthProvider implements IAuthProvider {
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
      throw new Error("Authentication failed");
    }

    return this.mapUser(data.user);
  }

  async signUp(
    email: string,
    password: string,
    metadata?: Record<string, any>,
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
      throw new Error("Sign up failed");
    }

    return this.mapUser(data.user);
  }

  async signInWithOAuth(provider: "spotify" | "google"): Promise<any> {
    const scopes =
      provider === "spotify"
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

  async signInWithGoogle(config?: OAuthConfig): Promise<void> {
    const { error } = await this.client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          config?.redirectTo ||
          `${window.location.origin}${AUTH_CONFIG.redirectUrls.callback}`,
        scopes: config?.scopes || AUTH_CONFIG.oauth.google.scopes,
        ...(config?.queryParams && { queryParams: config.queryParams }),
      },
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  async signInWithSpotify(config?: OAuthConfig): Promise<void> {
    const { error } = await this.client.auth.signInWithOAuth({
      provider: "spotify",
      options: {
        redirectTo:
          config?.redirectTo ||
          `${window.location.origin}${AUTH_CONFIG.redirectUrls.callback}`,
        scopes: config?.scopes || AUTH_CONFIG.oauth.spotify.scopes,
        ...(config?.queryParams && { queryParams: config.queryParams }),
      },
    });

    if (error) {
      throw new Error(error.message);
    }
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
      throw new Error("Profile update failed");
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
    role: "user" | "moderator" | "admin",
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
    callback: (event: string, session: AuthSession | null) => void,
  ): () => void {
    const { data } = this.client.auth.onAuthStateChange((event, session) => {
      callback(event, session ? this.mapSession(session) : null);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }

  private mapUser(user: User): AuthUser {
    return {
      ...user,
      profile: {
        id: "",
        userId: user.id,
        displayName:
          user.user_metadata?.["displayName"] ||
          user.email?.split("@")[0] ||
          "",
        isPublic: true,
        showAttendedShows: true,
        showVotedSongs: true,
        showsAttended: 0,
        songsVoted: 0,
        artistsFollowed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      preferences: {
        emailPreferences: {
          id: "",
          userId: user.id,
          emailEnabled: true,
          showReminders: true,
          showReminderFrequency: "daily",
          newShowNotifications: true,
          newShowFrequency: "daily",
          setlistUpdates: true,
          setlistUpdateFrequency: "immediately",
          weeklyDigest: false,
          marketingEmails: false,
          securityEmails: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        privacySettings: {
          showProfile: true,
          showVotingHistory: true,
          showAttendanceHistory: true,
          allowFollowing: true,
          showOnlineStatus: false,
        },
        musicPreferences: {
          favoriteGenres: [],
          preferredVenues: [],
          notificationRadius: 50,
        },
      },
      emailVerified: !!user.email_confirmed_at,
      spotifyConnected: false,
    } as AuthUser;
  }

  private mapSession(session: Session): AuthSession {
    return {
      ...session,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at || 0,
      user: this.mapUser(session.user),
    } as AuthSession;
  }
}
