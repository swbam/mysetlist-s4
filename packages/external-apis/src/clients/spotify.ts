import { BaseAPIClient, APIClientConfig } from "./base";
import type { SpotifyArtist, SpotifyTrack, SpotifySearchResult } from "../types/spotify";

export class SpotifyClient extends BaseAPIClient {
  public accessToken?: string;

  constructor(config: Omit<APIClientConfig, "baseURL">) {
    super({
      ...config,
      baseURL: "https://api.spotify.com/v1",
      rateLimit: { requests: 100, window: 60 }, // 100 requests per minute
      cache: { defaultTTL: 3600 }, // 1 hour default cache
    });
  }

  async authenticate(): Promise<void> {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env["SPOTIFY_CLIENT_ID"]}:${process.env["SPOTIFY_CLIENT_SECRET"]}`,
        ).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new Error("Spotify authentication failed");
    }

    const data = (await response.json()) as { access_token: string };
    this.accessToken = data.access_token;
  }

  protected getAuthHeaders(): Record<string, string> {
    if (!this.accessToken) {
      throw new Error("Spotify client not authenticated");
    }
    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  async searchArtists(query: string, limit = 20): Promise<SpotifySearchResult> {
    // Ensure authentication
    if (!this.accessToken) {
      await this.authenticate();
    }

    // Use direct fetch to bypass BaseAPIClient issues
    const params = new URLSearchParams({
      q: query,
      type: "artist",
      limit: limit.toString(),
    });

    const url = `https://api.spotify.com/v1/search?${params}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<SpotifySearchResult>;
  }

  async getArtist(artistId: string): Promise<SpotifyArtist> {
    return this.makeRequest<SpotifyArtist>(
      `/artists/${artistId}`,
      {},
      `spotify:artist:${artistId}`,
      3600, // 1 hour cache
    );
  }

  async getArtistTopTracks(
    artistId: string,
    market = "US",
  ): Promise<{ tracks: SpotifyTrack[] }> {
    return this.makeRequest<{ tracks: SpotifyTrack[] }>(
      `/artists/${artistId}/top-tracks?market=${market}`,
      {},
      `spotify:artist:${artistId}:top-tracks:${market}`,
      1800, // 30 minutes cache
    );
  }

  async getTracksDetails(
    trackIds: string[],
  ): Promise<{ tracks: SpotifyTrack[] }> {
    const ids = trackIds.join(",");
    return this.makeRequest(
      `/tracks?ids=${ids}`,
      {},
      `spotify:tracks:${ids}`,
      3600,
    );
  }

  async getArtistAlbums(
    artistId: string,
    options: {
      include_groups?: string;
      market?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<any> {
    const params = new URLSearchParams({
      include_groups: options.include_groups || "album,single",
      market: options.market || "US",
      limit: (options.limit || 20).toString(),
      offset: (options.offset || 0).toString(),
    });

    return this.makeRequest(
      `/artists/${artistId}/albums?${params}`,
      {},
      `spotify:artist:${artistId}:albums:${params.toString()}`,
      1800,
    );
  }

  async getRecommendations(options: {
    seed_artists?: string[];
    seed_genres?: string[];
    limit?: number;
    market?: string;
    [key: string]: any; // For audio features
  }): Promise<{ tracks: SpotifyTrack[] }> {
    const params = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        params.append(key, value.join(","));
      } else if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<{ tracks: SpotifyTrack[] }>(
      `/recommendations?${params}`,
      {},
      `spotify:recommendations:${params.toString()}`,
      900, // 15 minutes cache for recommendations
    );
  }

  async getAudioFeatures(
    trackIds: string[],
  ): Promise<{ audio_features: any[] }> {
    const ids = trackIds.join(",");
    return this.makeRequest(
      `/audio-features?ids=${ids}`,
      {},
      `spotify:audio-features:${ids}`,
      3600,
    );
  }
}
