import { createClient } from "../../client";
import { EmailService } from "../services/email-service";
import { SpotifyService } from "../services/spotify-service";
import { UserServiceClient } from "../services/user-service.client";
import type {
  AuthError,
  AuthSession,
  AuthUser,
  OAuthConfig,
  PasswordResetData,
  SignInData,
  SignUpData,
  SpotifyProfile,
  SpotifyTokens,
} from "../types/auth";

export class UnifiedAuthProvider {
  private supabase = createClient();
  private spotifyService = new SpotifyService();
  public userService = new UserServiceClient(); // Make public for access from provider
  private emailService = new EmailService();

  /**
   * Sign in with email and password
   */
  async signInWithEmail(data: SignInData): Promise<AuthSession> {
    try {
      const { data: authData, error } =
        await this.supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (error) {
        throw this.formatAuthError(error);
      }

      if (!authData.session || !authData.user) {
        throw new Error("Authentication failed");
      }

      // Enrich user data with profile and preferences
      const enrichedUser = await this.enrichUserData(authData.user);

      return {
        ...authData.session,
        user: enrichedUser,
      };
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign up with email and password
   */
  async signUpWithEmail(data: SignUpData): Promise<AuthUser> {
    try {
      const { data: authData, error } = await this.supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.displayName,
            ...data.metadata,
          },
        },
      });

      if (error) {
        throw this.formatAuthError(error);
      }

      if (!authData.user) {
        throw new Error("User creation failed");
      }

      // Create user profile and preferences
      const profileData = data.displayName
        ? { displayName: data.displayName }
        : {};
      await this.userService.createUserProfile(authData.user.id, profileData);

      await this.userService.createEmailPreferences(authData.user.id);

      // Send welcome email
      await this.emailService.sendWelcomeEmail(
        authData.user.email!,
        data.displayName,
      );

      return await this.enrichUserData(authData.user);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(config?: OAuthConfig): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            config?.redirectTo || `${window.location.origin}/auth/callback`,
          ...(config?.queryParams && { queryParams: config.queryParams }),
        },
      });

      if (error) {
        throw this.formatAuthError(error);
      }
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in with Spotify OAuth
   */
  async signInWithSpotify(config?: OAuthConfig): Promise<void> {
    try {
      const scopes =
        config?.scopes ||
        "user-read-email user-read-private user-top-read user-read-recently-played user-library-read playlist-read-private";

      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: "spotify",
        options: {
          scopes,
          redirectTo:
            config?.redirectTo || `${window.location.origin}/auth/callback`,
          ...(config?.queryParams && { queryParams: config.queryParams }),
        },
      });

      if (error) {
        throw this.formatAuthError(error);
      }
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Link Spotify account to existing user
   */
  async linkSpotify(userId: string): Promise<SpotifyTokens> {
    try {
      // This would typically be called after OAuth callback
      const session = await this.getCurrentSession();
      if (!session?.provider_token) {
        throw new Error("No Spotify token available");
      }

      const spotifyTokens: SpotifyTokens = {
        accessToken: session.provider_token,
        refreshToken: session.provider_refresh_token || "",
        expiresAt: Date.now() + 3600 * 1000, // 1 hour
        scope: session.provider_token
          ? ["user-read-email", "user-read-private", "user-top-read"]
          : [],
      };

      // Store Spotify tokens and profile
      await this.userService.updateSpotifyTokens(userId, spotifyTokens);

      const spotifyProfile = await this.spotifyService.getUserProfile(
        spotifyTokens.accessToken,
      );
      await this.userService.updateSpotifyProfile(userId, spotifyProfile);

      // Sync user's music preferences from Spotify
      await this.syncSpotifyMusicPreferences(userId, spotifyTokens.accessToken);

      return spotifyTokens;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sync user's music preferences from Spotify
   */
  async syncSpotifyMusicPreferences(
    userId: string,
    accessToken?: string,
  ): Promise<void> {
    try {
      let token = accessToken;

      // Get access token if not provided
      if (!token) {
        const spotifyTokens = await this.userService.getSpotifyTokens(userId);
        if (!spotifyTokens) {
          throw new Error("No Spotify tokens available");
        }

        // Check if token is expired and refresh if needed
        if (this.spotifyService.isTokenExpired(spotifyTokens)) {
          if (spotifyTokens.refreshToken) {
            const newTokens = await this.refreshSpotifyTokens(
              userId,
              spotifyTokens.refreshToken,
            );
            token = newTokens.accessToken;
          } else {
            throw new Error(
              "Spotify token expired and no refresh token available",
            );
          }
        } else {
          token = spotifyTokens.accessToken;
        }
      }

      // Fetch user's music data from Spotify
      const [topArtists, topTracks] = await Promise.all([
        this.spotifyService.getUserTopArtists(token, "medium_term", 50),
        this.spotifyService.getUserTopTracks(token, "medium_term", 50),
      ]);

      // Extract genres from top artists
      const genres = new Set<string>();
      topArtists.forEach((artist) => {
        if (artist.genres) {
          artist.genres.forEach((genre: string) => genres.add(genre));
        }
      });

      // Update user's music preferences
      await this.userService.updateMusicPreferences(userId, {
        topArtists: topArtists.slice(0, 20), // Store top 20 artists
        topTracks: topTracks.slice(0, 20), // Store top 20 tracks
        favoriteGenres: Array.from(genres).slice(0, 10), // Store top 10 genres
      });

      console.log(
        `Successfully synced Spotify music preferences for user ${userId}`,
      );
    } catch (error) {
      console.error("Error syncing Spotify music preferences:", error);
      // Don't throw error to prevent breaking the auth flow
    }
  }

  /**
   * Follow artist from Spotify data
   */
  async followArtistFromSpotify(
    userId: string,
    spotifyArtistId: string,
  ): Promise<void> {
    try {
      const spotifyTokens = await this.userService.getSpotifyTokens(userId);
      if (!spotifyTokens) {
        throw new Error("No Spotify connection available");
      }

      let token = spotifyTokens.accessToken;

      // Check if token is expired and refresh if needed
      if (this.spotifyService.isTokenExpired(spotifyTokens)) {
        if (spotifyTokens.refreshToken) {
          const newTokens = await this.refreshSpotifyTokens(
            userId,
            spotifyTokens.refreshToken,
          );
          token = newTokens.accessToken;
        } else {
          throw new Error(
            "Spotify token expired and no refresh token available",
          );
        }
      }

      // Get artist details from Spotify
      const artist = await this.spotifyService.getArtist(
        token,
        spotifyArtistId,
      );

      // Follow the artist
      await this.userService.followArtist(
        userId,
        artist.id,
        artist.name,
        artist.images?.[0]?.url,
      );
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Refresh Spotify tokens
   */
  async refreshSpotifyTokens(
    userId: string,
    refreshToken: string,
  ): Promise<SpotifyTokens> {
    try {
      const newTokens = await this.spotifyService.refreshTokens(refreshToken);
      await this.userService.updateSpotifyTokens(userId, newTokens);
      return newTokens;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(data: PasswordResetData): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        },
      );

      if (error) {
        throw this.formatAuthError(error);
      }

      // Send custom password reset email via Resend
      await this.emailService.sendPasswordResetEmail(data.email);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw this.formatAuthError(error);
      }
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        throw this.formatAuthError(error);
      }
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<AuthSession | null> {
    try {
      const {
        data: { session },
        error,
      } = await this.supabase.auth.getSession();

      if (error) {
        throw this.formatAuthError(error);
      }

      if (!session) {
        return null;
      }

      const enrichedUser = await this.enrichUserData(session.user);

      return {
        ...session,
        user: enrichedUser,
      };
    } catch (error) {
      console.error("Error getting current session:", error);
      return null;
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();

      if (error) {
        throw this.formatAuthError(error);
      }

      if (!user) {
        return null;
      }

      return await this.enrichUserData(user);
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string, email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.verifyOtp({
        token,
        type: "email",
        email,
      });

      if (error) {
        throw this.formatAuthError(error);
      }
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        throw this.formatAuthError(error);
      }
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Enrich user data with profile and preferences
   */
  private async enrichUserData(user: any): Promise<AuthUser> {
    try {
      const [profile, preferences, spotifyTokens] = await Promise.all([
        this.userService.getUserProfile(user.id),
        this.userService.getUserPreferences(user.id),
        this.userService.getSpotifyTokens(user.id),
      ]);

      let spotifyProfile: SpotifyProfile | undefined;
      if (spotifyTokens) {
        try {
          spotifyProfile = await this.spotifyService.getUserProfile(
            spotifyTokens.accessToken,
          );
        } catch (error) {
          // Spotify token might be expired, try to refresh
          if (spotifyTokens.refreshToken) {
            try {
              const newTokens = await this.refreshSpotifyTokens(
                user.id,
                spotifyTokens.refreshToken,
              );
              spotifyProfile = await this.spotifyService.getUserProfile(
                newTokens.accessToken,
              );
            } catch (refreshError) {
              console.error("Failed to refresh Spotify tokens:", refreshError);
            }
          }
        }
      }

      return {
        ...user,
        profile,
        preferences,
        spotifyProfile,
        spotifyTokens,
        emailVerified: !!user.email_confirmed_at,
        spotifyConnected: !!spotifyTokens,
      };
    } catch (error) {
      console.error("Error enriching user data:", error);
      return {
        ...user,
        emailVerified: !!user.email_confirmed_at,
        spotifyConnected: false,
      };
    }
  }

  /**
   * Format Supabase auth errors
   */
  private formatAuthError(error: any): AuthError {
    return {
      message: error.message || "Authentication error occurred",
      code: error.code,
      details: error,
    };
  }

  /**
   * Handle and format authentication errors
   */
  private handleAuthError(error: any): AuthError {
    if (error instanceof Error) {
      return {
        message: error.message,
        details: error,
      };
    }

    return {
      message: "An unexpected error occurred",
      details: error,
    };
  }
}
