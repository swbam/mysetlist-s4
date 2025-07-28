import { env } from "@repo/env"
import type { SpotifyProfile, SpotifyTokens } from "../types/auth"

export class SpotifyService {
  private readonly clientId = env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  private readonly clientSecret = env.SPOTIFY_CLIENT_SECRET
  private readonly baseUrl = "https://api.spotify.com/v1"
  private readonly tokenUrl = "https://accounts.spotify.com/api/token"

  /**
   * Get user profile from Spotify API
   */
  async getUserProfile(accessToken: string): Promise<SpotifyProfile> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(
          `Spotify API error: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()

      return {
        id: data.id,
        displayName: data.display_name || data.id,
        email: data.email,
        images: data.images || [],
        followers: data.followers || { total: 0 },
        country: data.country || "",
        product: data.product || "free",
      }
    } catch (error) {
      console.error("Error fetching Spotify user profile:", error)
      throw error
    }
  }

  /**
   * Refresh Spotify access tokens
   */
  async refreshTokens(refreshToken: string): Promise<SpotifyTokens> {
    try {
      if (!this.clientId || !this.clientSecret) {
        throw new Error("Spotify client credentials not configured")
      }

      const response = await fetch(this.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      })

      if (!response.ok) {
        throw new Error(
          `Token refresh failed: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Spotify may not return a new refresh token
        expiresAt: Date.now() + data.expires_in * 1000,
        scope: data.scope ? data.scope.split(" ") : [],
      }
    } catch (error) {
      console.error("Error refreshing Spotify tokens:", error)
      throw error
    }
  }

  /**
   * Get user's top artists from Spotify
   */
  async getUserTopArtists(
    accessToken: string,
    timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
    limit = 20
  ): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/me/top/artists?time_range=${timeRange}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error(
          `Spotify API error: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()
      return data.items || []
    } catch (error) {
      console.error("Error fetching user top artists:", error)
      throw error
    }
  }

  /**
   * Get user's top tracks from Spotify
   */
  async getUserTopTracks(
    accessToken: string,
    timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
    limit = 20
  ): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error(
          `Spotify API error: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()
      return data.items || []
    } catch (error) {
      console.error("Error fetching user top tracks:", error)
      throw error
    }
  }

  /**
   * Get user's recently played tracks from Spotify
   */
  async getUserRecentlyPlayed(accessToken: string, limit = 20): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/me/player/recently-played?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error(
          `Spotify API error: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()
      return data.items || []
    } catch (error) {
      console.error("Error fetching recently played tracks:", error)
      throw error
    }
  }

  /**
   * Search for artists on Spotify
   */
  async searchArtists(
    accessToken: string,
    query: string,
    limit = 20
  ): Promise<any[]> {
    try {
      const encodedQuery = encodeURIComponent(query)
      const response = await fetch(
        `${this.baseUrl}/search?q=${encodedQuery}&type=artist&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        throw new Error(
          `Spotify API error: ${response.status} ${response.statusText}`
        )
      }

      const data = await response.json()
      return data.artists?.items || []
    } catch (error) {
      console.error("Error searching artists:", error)
      throw error
    }
  }

  /**
   * Get artist details from Spotify
   */
  async getArtist(accessToken: string, artistId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/artists/${artistId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(
          `Spotify API error: ${response.status} ${response.statusText}`
        )
      }

      return await response.json()
    } catch (error) {
      console.error("Error fetching artist details:", error)
      throw error
    }
  }

  /**
   * Check if tokens are expired
   */
  isTokenExpired(tokens: SpotifyTokens): boolean {
    return Date.now() >= tokens.expiresAt
  }

  /**
   * Validate access token by making a test API call
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      return response.ok
    } catch (error) {
      return false
    }
  }
}
