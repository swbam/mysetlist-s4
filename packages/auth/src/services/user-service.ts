import { createServiceClient } from "../../server"
import type {
  EmailPreferences,
  PrivacySettings,
  SpotifyProfile,
  SpotifyTokens,
  UpdatePreferencesData,
  UpdateProfileData,
  UserPreferences,
  UserProfile,
} from "../types/auth"

export class UserService {
  private async getSupabase() {
    return await createServiceClient()
  }

  /**
   * Create user profile after signup
   */
  async createUserProfile(
    userId: string,
    data: { displayName?: string }
  ): Promise<UserProfile> {
    try {
      const supabase = await this.getSupabase()
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .insert({
          user_id: userId,
          bio: null,
          location: null,
          favorite_genres: null,
          instagram_url: null,
          twitter_url: null,
          spotify_url: null,
          is_public: true,
          show_attended_shows: true,
          show_voted_songs: true,
          shows_attended: 0,
          songs_voted: 0,
          artists_followed: 0,
          avatar_url: null,
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create user profile: ${error.message}`)
      }

      // Also update the display name in the users table
      if (data.displayName) {
        await supabase
          .from("users")
          .update({ display_name: data.displayName })
          .eq("id", userId)
      }

      return this.mapProfileFromDb(profile)
    } catch (error) {
      console.error("Error creating user profile:", error)
      throw error
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const supabase = await this.getSupabase()
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          // Profile doesn't exist, return null
          return null
        }
        throw new Error(`Failed to get user profile: ${error.message}`)
      }

      return this.mapProfileFromDb(profile)
    } catch (error) {
      console.error("Error getting user profile:", error)
      return null
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    data: UpdateProfileData
  ): Promise<UserProfile> {
    try {
      const updateData: any = {}

      if (data.bio !== undefined) updateData.bio = data.bio
      if (data.location !== undefined) updateData.location = data.location
      if (data.favoriteGenres !== undefined)
        updateData.favorite_genres = JSON.stringify(data.favoriteGenres)
      if (data.instagramUrl !== undefined)
        updateData.instagram_url = data.instagramUrl
      if (data.twitterUrl !== undefined)
        updateData.twitter_url = data.twitterUrl
      if (data.isPublic !== undefined) updateData.is_public = data.isPublic
      if (data.showAttendedShows !== undefined)
        updateData.show_attended_shows = data.showAttendedShows
      if (data.showVotedSongs !== undefined)
        updateData.show_voted_songs = data.showVotedSongs
      if (data.avatarUrl !== undefined) updateData.avatar_url = data.avatarUrl

      updateData.updated_at = new Date().toISOString()

      const supabase = await this.getSupabase()
      const { data: profile, error } = await supabase
        .from("user_profiles")
        .update(updateData)
        .eq("user_id", userId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update user profile: ${error.message}`)
      }

      // Also update display name in users table if provided
      if (data.displayName !== undefined) {
        await supabase
          .from("users")
          .update({ display_name: data.displayName })
          .eq("id", userId)
      }

      return this.mapProfileFromDb(profile)
    } catch (error) {
      console.error("Error updating user profile:", error)
      throw error
    }
  }

  /**
   * Create default email preferences for new user
   */
  async createEmailPreferences(userId: string): Promise<EmailPreferences> {
    try {
      const supabase = await this.getSupabase()
      const { data: preferences, error } = await supabase
        .from("email_preferences")
        .insert({
          user_id: userId,
          email_enabled: true,
          show_reminders: true,
          show_reminder_frequency: "daily",
          new_show_notifications: true,
          new_show_frequency: "immediately",
          setlist_updates: true,
          setlist_update_frequency: "immediately",
          weekly_digest: true,
          marketing_emails: false,
          security_emails: true,
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create email preferences: ${error.message}`)
      }

      return this.mapEmailPreferencesFromDb(preferences)
    } catch (error) {
      console.error("Error creating email preferences:", error)
      throw error
    }
  }

  /**
   * Get user preferences (email + privacy)
   */
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const supabase = await this.getSupabase()
      const { data: emailPrefs, error: emailError } = await supabase
        .from("email_preferences")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (emailError && emailError.code !== "PGRST116") {
        throw new Error(
          `Failed to get email preferences: ${emailError.message}`
        )
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("is_public, show_attended_shows, show_voted_songs")
        .eq("user_id", userId)
        .single()

      if (profileError && profileError.code !== "PGRST116") {
        throw new Error(
          `Failed to get profile preferences: ${profileError.message}`
        )
      }

      if (!emailPrefs && !profile) {
        return null
      }

      const emailPreferences = emailPrefs
        ? this.mapEmailPreferencesFromDb(emailPrefs)
        : this.getDefaultEmailPreferences(userId)
      const privacySettings: PrivacySettings = {
        showProfile: profile?.is_public ?? true,
        showVotingHistory: profile?.show_voted_songs ?? true,
        showAttendanceHistory: profile?.show_attended_shows ?? true,
        allowFollowing: true,
        showOnlineStatus: false,
      }

      return {
        emailPreferences,
        privacySettings,
        musicPreferences: {
          favoriteGenres: [],
          preferredVenues: [],
          notificationRadius: 50, // 50km default
        },
      }
    } catch (error) {
      console.error("Error getting user preferences:", error)
      return null
    }
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    data: UpdatePreferencesData
  ): Promise<UserPreferences> {
    try {
      let emailPreferences: EmailPreferences | undefined
      let privacySettings: PrivacySettings | undefined

      // Update email preferences if provided
      if (data.emailPreferences) {
        const updateData: any = {}
        const prefs = data.emailPreferences

        if (prefs.emailEnabled !== undefined)
          updateData.email_enabled = prefs.emailEnabled
        if (prefs.showReminders !== undefined)
          updateData.show_reminders = prefs.showReminders
        if (prefs.showReminderFrequency !== undefined)
          updateData.show_reminder_frequency = prefs.showReminderFrequency
        if (prefs.newShowNotifications !== undefined)
          updateData.new_show_notifications = prefs.newShowNotifications
        if (prefs.newShowFrequency !== undefined)
          updateData.new_show_frequency = prefs.newShowFrequency
        if (prefs.setlistUpdates !== undefined)
          updateData.setlist_updates = prefs.setlistUpdates
        if (prefs.setlistUpdateFrequency !== undefined)
          updateData.setlist_update_frequency = prefs.setlistUpdateFrequency
        if (prefs.weeklyDigest !== undefined)
          updateData.weekly_digest = prefs.weeklyDigest
        if (prefs.marketingEmails !== undefined)
          updateData.marketing_emails = prefs.marketingEmails

        updateData.updated_at = new Date().toISOString()

        const supabase = await this.getSupabase()
        const { data: updatedPrefs, error } = await supabase
          .from("email_preferences")
          .update(updateData)
          .eq("user_id", userId)
          .select()
          .single()

        if (error) {
          throw new Error(
            `Failed to update email preferences: ${error.message}`
          )
        }

        emailPreferences = this.mapEmailPreferencesFromDb(updatedPrefs)
      }

      // Update privacy settings if provided
      if (data.privacySettings) {
        const profileUpdateData: any = {}
        const privacy = data.privacySettings

        if (privacy.showProfile !== undefined)
          profileUpdateData.is_public = privacy.showProfile
        if (privacy.showAttendanceHistory !== undefined)
          profileUpdateData.show_attended_shows = privacy.showAttendanceHistory
        if (privacy.showVotingHistory !== undefined)
          profileUpdateData.show_voted_songs = privacy.showVotingHistory

        if (Object.keys(profileUpdateData).length > 0) {
          profileUpdateData.updated_at = new Date().toISOString()

          const supabase = await this.getSupabase()
          const { error } = await supabase
            .from("user_profiles")
            .update(profileUpdateData)
            .eq("user_id", userId)

          if (error) {
            throw new Error(
              `Failed to update privacy settings: ${error.message}`
            )
          }
        }

        privacySettings = data.privacySettings as PrivacySettings
      }

      // Get current preferences if not updated
      const currentPrefs = await this.getUserPreferences(userId)

      return {
        emailPreferences:
          emailPreferences ||
          currentPrefs?.emailPreferences ||
          this.getDefaultEmailPreferences(userId),
        privacySettings:
          privacySettings ||
          currentPrefs?.privacySettings ||
          this.getDefaultPrivacySettings(),
        musicPreferences: {
          favoriteGenres:
            data.musicPreferences?.favoriteGenres ||
            currentPrefs?.musicPreferences?.favoriteGenres ||
            [],
          preferredVenues:
            data.musicPreferences?.preferredVenues ||
            currentPrefs?.musicPreferences?.preferredVenues ||
            [],
          notificationRadius:
            data.musicPreferences?.notificationRadius ||
            currentPrefs?.musicPreferences?.notificationRadius ||
            50,
        },
      }
    } catch (error) {
      console.error("Error updating user preferences:", error)
      throw error
    }
  }

  /**
   * Store Spotify tokens
   */
  async updateSpotifyTokens(
    userId: string,
    tokens: SpotifyTokens
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      // First, check if tokens already exist
      const { data: existingTokens } = await supabase
        .from("user_auth_tokens")
        .select("id")
        .eq("user_id", userId)
        .eq("provider", "spotify")
        .eq("is_active", true)
        .single()

      const tokenData = {
        user_id: userId,
        provider: "spotify" as const,
        provider_id: "", // Will be updated when we get profile
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: "Bearer",
        scope: JSON.stringify(tokens.scope),
        expires_at: new Date(tokens.expiresAt).toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      }

      let error
      if (existingTokens) {
        // Update existing tokens
        ;({ error } = await supabase
          .from("user_auth_tokens")
          .update(tokenData)
          .eq("id", existingTokens.id))
      } else {
        // Insert new tokens
        ;({ error } = await supabase.from("user_auth_tokens").insert(tokenData))
      }

      if (error) {
        throw new Error(`Failed to update Spotify tokens: ${error.message}`)
      }
    } catch (error) {
      console.error("Error updating Spotify tokens:", error)
      throw error
    }
  }

  /**
   * Get Spotify tokens
   */
  async getSpotifyTokens(userId: string): Promise<SpotifyTokens | null> {
    try {
      const supabase = await this.getSupabase()
      const { data: tokenData, error } = await supabase
        .from("user_auth_tokens")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", "spotify")
        .eq("is_active", true)
        .single()

      if (error || !tokenData) {
        return null
      }

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || "",
        expiresAt: new Date(tokenData.expires_at).getTime(),
        scope: tokenData.scope ? JSON.parse(tokenData.scope) : [],
      }
    } catch (error) {
      console.error("Error getting Spotify tokens:", error)
      return null
    }
  }

  /**
   * Update Spotify profile information
   */
  async updateSpotifyProfile(
    userId: string,
    profile: SpotifyProfile
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      // Update the provider_id and profile data in user_auth_tokens
      const { error } = await supabase
        .from("user_auth_tokens")
        .update({
          provider_id: profile.id,
          provider_profile: JSON.stringify(profile),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("provider", "spotify")
        .eq("is_active", true)

      if (error) {
        throw new Error(`Failed to update Spotify profile: ${error.message}`)
      }
    } catch (error) {
      console.error("Error updating Spotify profile:", error)
      throw error
    }
  }

  /**
   * Map database profile to UserProfile type
   */
  private mapProfileFromDb(profile: any): UserProfile {
    return {
      id: profile.id,
      userId: profile.user_id,
      bio: profile.bio,
      location: profile.location,
      favoriteGenres: profile.favorite_genres
        ? JSON.parse(profile.favorite_genres)
        : [],
      instagramUrl: profile.instagram_url,
      twitterUrl: profile.twitter_url,
      spotifyUrl: profile.spotify_url,
      isPublic: profile.is_public,
      showAttendedShows: profile.show_attended_shows,
      showVotedSongs: profile.show_voted_songs,
      showsAttended: profile.shows_attended,
      songsVoted: profile.songs_voted,
      artistsFollowed: profile.artists_followed,
      avatarUrl: profile.avatar_url,
      createdAt: new Date(profile.created_at),
      updatedAt: new Date(profile.updated_at),
    }
  }

  /**
   * Map database email preferences to EmailPreferences type
   */
  private mapEmailPreferencesFromDb(prefs: any): EmailPreferences {
    return {
      id: prefs.id,
      userId: prefs.user_id,
      emailEnabled: prefs.email_enabled,
      showReminders: prefs.show_reminders,
      showReminderFrequency: prefs.show_reminder_frequency,
      newShowNotifications: prefs.new_show_notifications,
      newShowFrequency: prefs.new_show_frequency,
      setlistUpdates: prefs.setlist_updates,
      setlistUpdateFrequency: prefs.setlist_update_frequency,
      weeklyDigest: prefs.weekly_digest,
      marketingEmails: prefs.marketing_emails,
      securityEmails: prefs.security_emails,
      createdAt: new Date(prefs.created_at),
      updatedAt: new Date(prefs.updated_at),
    }
  }

  /**
   * Get default email preferences
   */
  private getDefaultEmailPreferences(userId: string): EmailPreferences {
    return {
      id: "",
      userId,
      emailEnabled: true,
      showReminders: true,
      showReminderFrequency: "daily",
      newShowNotifications: true,
      newShowFrequency: "immediately",
      setlistUpdates: true,
      setlistUpdateFrequency: "immediately",
      weeklyDigest: true,
      marketingEmails: false,
      securityEmails: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  /**
   * Follow an artist
   */
  async followArtist(
    userId: string,
    artistId: string,
    artistName: string,
    artistImage?: string
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      // Check if already following
      const { data: existing } = await supabase
        .from("user_followed_artists")
        .select("id, is_active")
        .eq("user_id", userId)
        .eq("artist_id", artistId)
        .single()

      if (existing) {
        if (!existing.is_active) {
          // Reactivate the follow
          const { error } = await supabase
            .from("user_followed_artists")
            .update({
              is_active: true,
              followed_at: new Date().toISOString(),
              unfollowed_at: null,
            })
            .eq("id", existing.id)

          if (error) {
            throw new Error(
              `Failed to reactivate artist follow: ${error.message}`
            )
          }
        }
        return // Already following
      }

      // Create new follow
      const { error } = await supabase.from("user_followed_artists").insert({
        user_id: userId,
        artist_id: artistId,
        artist_name: artistName,
        artist_image: artistImage,
        notify_new_shows: true,
        notify_setlist_updates: true,
        is_active: true,
      })

      if (error) {
        throw new Error(`Failed to follow artist: ${error.message}`)
      }

      // Update user profile artists_followed count
      await this.updateArtistsFollowedCount(userId)
    } catch (error) {
      console.error("Error following artist:", error)
      throw error
    }
  }

  /**
   * Unfollow an artist
   */
  async unfollowArtist(userId: string, artistId: string): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      const { error } = await supabase
        .from("user_followed_artists")
        .update({
          is_active: false,
          unfollowed_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("artist_id", artistId)
        .eq("is_active", true)

      if (error) {
        throw new Error(`Failed to unfollow artist: ${error.message}`)
      }

      // Update user profile artists_followed count
      await this.updateArtistsFollowedCount(userId)
    } catch (error) {
      console.error("Error unfollowing artist:", error)
      throw error
    }
  }

  /**
   * Get user's followed artists
   */
  async getFollowedArtists(userId: string): Promise<any[]> {
    try {
      const supabase = await this.getSupabase()

      const { data: followedArtists, error } = await supabase
        .from("user_followed_artists")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("followed_at", { ascending: false })

      if (error) {
        throw new Error(`Failed to get followed artists: ${error.message}`)
      }

      return followedArtists || []
    } catch (error) {
      console.error("Error getting followed artists:", error)
      return []
    }
  }

  /**
   * Check if user is following an artist
   */
  async isFollowingArtist(userId: string, artistId: string): Promise<boolean> {
    try {
      const supabase = await this.getSupabase()

      const { data, error } = await supabase
        .from("user_followed_artists")
        .select("id")
        .eq("user_id", userId)
        .eq("artist_id", artistId)
        .eq("is_active", true)
        .single()

      if (error && error.code !== "PGRST116") {
        throw new Error(
          `Failed to check artist follow status: ${error.message}`
        )
      }

      return !!data
    } catch (error) {
      console.error("Error checking artist follow status:", error)
      return false
    }
  }

  /**
   * Update user's music preferences from Spotify data
   */
  async updateMusicPreferences(
    userId: string,
    spotifyData: {
      topArtists?: any[]
      topTracks?: any[]
      favoriteGenres?: string[]
    }
  ): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      // Check if preferences exist
      const { data: existing } = await supabase
        .from("user_music_preferences")
        .select("id")
        .eq("user_id", userId)
        .single()

      const preferencesData = {
        user_id: userId,
        favorite_genres: spotifyData.favoriteGenres
          ? JSON.stringify(spotifyData.favoriteGenres)
          : null,
        top_artists: spotifyData.topArtists
          ? JSON.stringify(spotifyData.topArtists)
          : null,
        top_tracks: spotifyData.topTracks
          ? JSON.stringify(spotifyData.topTracks)
          : null,
        last_spotify_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      let error
      if (existing) {
        // Update existing preferences
        ;({ error } = await supabase
          .from("user_music_preferences")
          .update(preferencesData)
          .eq("id", existing.id))
      } else {
        // Insert new preferences
        ;({ error } = await supabase
          .from("user_music_preferences")
          .insert(preferencesData))
      }

      if (error) {
        throw new Error(`Failed to update music preferences: ${error.message}`)
      }
    } catch (error) {
      console.error("Error updating music preferences:", error)
      throw error
    }
  }

  /**
   * Get user's music preferences
   */
  async getMusicPreferences(userId: string): Promise<any> {
    try {
      const supabase = await this.getSupabase()

      const { data: preferences, error } = await supabase
        .from("user_music_preferences")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (error && error.code !== "PGRST116") {
        throw new Error(`Failed to get music preferences: ${error.message}`)
      }

      if (!preferences) {
        return {
          favoriteGenres: [],
          topArtists: [],
          topTracks: [],
          preferredVenues: [],
          notificationRadius: 50,
          enablePersonalizedRecommendations: true,
          includeSpotifyData: true,
          autoSyncSpotify: true,
        }
      }

      return {
        favoriteGenres: preferences.favorite_genres
          ? JSON.parse(preferences.favorite_genres)
          : [],
        topArtists: preferences.top_artists
          ? JSON.parse(preferences.top_artists)
          : [],
        topTracks: preferences.top_tracks
          ? JSON.parse(preferences.top_tracks)
          : [],
        preferredVenues: preferences.preferred_venues
          ? JSON.parse(preferences.preferred_venues)
          : [],
        notificationRadius: preferences.notification_radius || 50,
        enablePersonalizedRecommendations:
          preferences.enable_personalized_recommendations ?? true,
        includeSpotifyData: preferences.include_spotify_data ?? true,
        autoSyncSpotify: preferences.auto_sync_spotify ?? true,
        lastSpotifySync: preferences.last_spotify_sync
          ? new Date(preferences.last_spotify_sync)
          : null,
      }
    } catch (error) {
      console.error("Error getting music preferences:", error)
      return {
        favoriteGenres: [],
        topArtists: [],
        topTracks: [],
        preferredVenues: [],
        notificationRadius: 50,
        enablePersonalizedRecommendations: true,
        includeSpotifyData: true,
        autoSyncSpotify: true,
      }
    }
  }

  /**
   * Update the artists_followed count in user profile
   */
  private async updateArtistsFollowedCount(userId: string): Promise<void> {
    try {
      const supabase = await this.getSupabase()

      // Count active follows
      const { count, error: countError } = await supabase
        .from("user_followed_artists")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_active", true)

      if (countError) {
        throw new Error(
          `Failed to count followed artists: ${countError.message}`
        )
      }

      // Update profile
      const { error } = await supabase
        .from("user_profiles")
        .update({
          artists_followed: count || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)

      if (error) {
        throw new Error(
          `Failed to update artists followed count: ${error.message}`
        )
      }
    } catch (error) {
      console.error("Error updating artists followed count:", error)
      // Don't throw error as this is a secondary operation
    }
  }

  /**
   * Get default privacy settings
   */
  private getDefaultPrivacySettings(): PrivacySettings {
    return {
      showProfile: true,
      showVotingHistory: true,
      showAttendanceHistory: true,
      allowFollowing: true,
      showOnlineStatus: false,
    }
  }
}
