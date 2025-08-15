import { type APIClientConfig, BaseAPIClient } from "./base";

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: {
    total: number;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  release_date: string;
  release_date_precision: string;
  album_type: string;
  album_group?: string;
  total_tracks: number;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  artists: Array<{
    id: string;
    name: string;
  }>;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  explicit: boolean;
  is_playable?: boolean;
  track_number: number;
  disc_number: number;
  album?: {
    id: string;
    name: string;
    release_date: string;
    images: Array<{
      url: string;
      height: number;
      width: number;
    }>;
  };
  artists: Array<{
    id: string;
    name: string;
  }>;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  duration_ms: number;
  time_signature: number;
}

export interface SpotifySearchResult {
  artists: {
    items: SpotifyArtist[];
    total: number;
    limit: number;
    offset: number;
    next: string | null;
    previous: string | null;
  };
}

export interface SpotifyAlbumsResponse {
  items: SpotifyAlbum[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}

export interface SpotifyTracksResponse {
  items: SpotifyTrack[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class SpotifyClient extends BaseAPIClient {
  private accessToken?: string;

  constructor(config: Omit<APIClientConfig, "baseURL">) {
    super({
      ...config,
      baseURL: "https://api.spotify.com/v1",
      rateLimit: { requests: 180, window: 60 }, // 180 requests per minute (Spotify limit)
      cache: { defaultTTL: 3600 }, // 1 hour default cache
    });
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
    const params = new URLSearchParams({
      q: query,
      type: "artist",
      limit: limit.toString(),
    });

    return this.makeRequest<SpotifySearchResult>(
      `/search?${params.toString()}`,
      {},
      `spotify:search:artists:${query}:${limit}`,
      1800, // 30 minutes cache
    );
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

  async getArtistAlbums(
    artistId: string,
    options: {
      include_groups?: string;
      market?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<SpotifyAlbumsResponse> {
    const params = new URLSearchParams({
      include_groups: options.include_groups || "album,single",
      market: options.market || "US",
      limit: (options.limit || 20).toString(),
      offset: (options.offset || 0).toString(),
    });

    const response = await this.makeRequest<SpotifyAlbumsResponse>(
      `/artists/${artistId}/albums?${params}`,
      {},
      `spotify:artist:${artistId}:albums:${params.toString()}`,
      1800,
    );

    // Filter out live albums, compilations, and other non-studio releases
    response.items = response.items.filter((album) => this.isStudioAlbum(album));

    return response;
  }

  async getAlbumTracks(
    albumId: string,
    options: {
      market?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<SpotifyTracksResponse> {
    const params = new URLSearchParams({
      market: options.market || "US",
      limit: (options.limit || 50).toString(),
      offset: (options.offset || 0).toString(),
    });

    const response = await this.makeRequest<SpotifyTracksResponse>(
      `/albums/${albumId}/tracks?${params}`,
      {},
      `spotify:album:${albumId}:tracks:${params.toString()}`,
      3600, // 1 hour cache
    );

    // Filter out live tracks, acoustic versions, and remixes for studio catalog
    response.items = response.items.filter((track) => this.isStudioTrack(track));

    return response;
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
  ): Promise<{ audio_features: (SpotifyAudioFeatures | null)[] }> {
    if (trackIds.length === 0) {
      return { audio_features: [] };
    }

    // Spotify API supports up to 100 track IDs per request
    const batchSize = 100;
    const batches: string[][] = [];
    
    for (let i = 0; i < trackIds.length; i += batchSize) {
      batches.push(trackIds.slice(i, i + batchSize));
    }

    const allFeatures: (SpotifyAudioFeatures | null)[] = [];

    for (const batch of batches) {
      const ids = batch.join(",");
      const response = await this.makeRequest<{ audio_features: (SpotifyAudioFeatures | null)[] }>(
        `/audio-features?ids=${ids}`,
        {},
        `spotify:audio-features:${ids}`,
        3600,
      );
      allFeatures.push(...response.audio_features);
    }

    return { audio_features: allFeatures };
  }

  async searchTracks(
    query: string,
    limit = 20,
  ): Promise<{ tracks: { items: SpotifyTrack[]; total: number } }> {
    const params = new URLSearchParams({
      q: query,
      type: "track",
      limit: limit.toString(),
    });

    return this.makeRequest<{
      tracks: { items: SpotifyTrack[]; total: number };
    }>(
      `/search?${params}`,
      {},
      `spotify:search:tracks:${query}:${limit}`,
      1800, // 30 minutes cache
    );
  }

  /**
   * Smart filtering to identify studio albums vs live/compilation releases
   */
  private isStudioAlbum(album: SpotifyAlbum): boolean {
    const name = album.name.toLowerCase();
    const albumType = album.album_type.toLowerCase();
    
    // Exclude obvious live albums
    const livePatterns = [
      'live at',
      'live in',
      'live from',
      'concert',
      'unplugged',
      'acoustic',
      'sessions',
      'demos',
      'b-sides',
      'rarities',
      'anthology',
      'collection',
      'greatest hits',
      'best of',
      'the very best',
      'platinum collection',
      'gold',
      'ultimate'
    ];
    
    // Check if album name contains live/compilation indicators
    const hasLivePattern = livePatterns.some(pattern => name.includes(pattern));
    
    // Filter by album type: include albums and singles, exclude compilations
    const isValidType = albumType === 'album' || albumType === 'single';
    
    return isValidType && !hasLivePattern;
  }

  /**
   * Smart filtering to identify studio tracks vs live/acoustic/remix versions
   */
  private isStudioTrack(track: SpotifyTrack): boolean {
    const name = track.name.toLowerCase();
    
    // Exclude live tracks, acoustic versions, and remixes
    const excludePatterns = [
      '(live',
      '- live',
      'live)',
      'live version',
      '(acoustic',
      '- acoustic',
      'acoustic)',
      'acoustic version',
      '(remix',
      '- remix',
      'remix)',
      '(demo',
      '- demo',
      'demo)',
      '(instrumental',
      '- instrumental',
      'instrumental)',
      'radio edit',
      'radio version',
      'single version',
      'album version',
      'explicit version',
      'clean version',
      'karaoke',
      'backing track'
    ];
    
    // Check if track name contains excluded patterns
    const hasExcludePattern = excludePatterns.some(pattern => name.includes(pattern));
    
    return !hasExcludePattern;
  }

  /**
   * Retry mechanism for API calls with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof Error) {
          const isAuthError = error.message.includes('401') || error.message.includes('unauthorized');
          const isBadRequest = error.message.includes('400');
          
          if (isAuthError || isBadRequest) {
            throw error;
          }
        }
        
        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`Spotify API retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Enhanced authentication with retry logic
   */
  async authenticate(): Promise<void> {
    return this.withRetry(async () => {
      const clientId =
        process.env["SPOTIFY_CLIENT_ID"] ||
        process.env["NEXT_PUBLIC_SPOTIFY_CLIENT_ID"];
      const clientSecret = process.env["SPOTIFY_CLIENT_SECRET"];

      if (!clientId || !clientSecret) {
        throw new Error("Spotify credentials not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.");
      }

      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${clientId}:${clientSecret}`,
          ).toString("base64")}`,
        },
        body: "grant_type=client_credentials",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Spotify authentication failed: ${response.status} ${errorText}`,
        );
      }

      const data = (await response.json()) as SpotifyTokenResponse;
      this.accessToken = data.access_token;
    });
  }
}
