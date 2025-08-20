/**
 * Enhanced Spotify Web API Client
 * Extends BaseApiClient with Spotify-specific functionality and robust token management
 */

import { BaseApiClient, type ApiClientConfig, type ApiResponse } from './base-client';
import { env } from '../../env';

const SPOTIFY_ACCOUNTS_BASE_URL = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

// Re-export interfaces for backward compatibility
export interface SpotifyTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope?: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  external_urls: {
    spotify: string;
  };
  genres: string[];
  images: Array<{
    url: string;
    height?: number;
    width?: number;
  }>;
  popularity: number;
  followers: {
    total: number;
  };
  uri: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: 'album' | 'single' | 'compilation';
  album_group: 'album' | 'single' | 'compilation' | 'appears_on';
  artists: Array<{
    id: string;
    name: string;
    external_urls: {
      spotify: string;
    };
  }>;
  images: Array<{
    url: string;
    height?: number;
    width?: number;
  }>;
  release_date: string;
  release_date_precision: 'year' | 'month' | 'day';
  total_tracks: number;
  external_urls: {
    spotify: string;
  };
  uri: string;
  available_markets?: string[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
    external_urls: {
      spotify: string;
    };
  }>;
  album?: {
    id: string;
    name: string;
    images: Array<{
      url: string;
      height?: number;
      width?: number;
    }>;
    release_date: string;
  };
  duration_ms: number;
  explicit: boolean;
  external_ids: {
    isrc?: string;
    ean?: string;
    upc?: string;
  };
  external_urls: {
    spotify: string;
  };
  popularity: number;
  preview_url?: string;
  track_number: number;
  disc_number: number;
  uri: string;
  is_local: boolean;
  available_markets?: string[];
}

export interface SpotifyAudioFeatures {
  id: string;
  acousticness: number;
  danceability: number;
  energy: number;
  instrumentalness: number;
  liveness: number;
  loudness: number;
  speechiness: number;
  valence: number;
  tempo: number;
  time_signature: number;
  key: number;
  mode: number;
  duration_ms: number;
  uri: string;
  track_href: string;
  analysis_url: string;
}

export interface SpotifyPaginatedResponse<T> {
  items: T[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
  href: string;
}

// Token cache interface
interface TokenCache {
  token: string;
  expiresAt: number;
}

/**
 * Enhanced Spotify API Client with robust error handling and token management
 */
export class SpotifyApiClient extends BaseApiClient {
  private tokenCache: TokenCache | null = null;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(clientId?: string, clientSecret?: string) {
    const id = clientId || env.SPOTIFY_CLIENT_ID;
    const secret = clientSecret || env.SPOTIFY_CLIENT_SECRET;

    if (!id || !secret) {
      throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables are required');
    }

    const config: ApiClientConfig = {
      baseUrl: SPOTIFY_API_BASE_URL,
      rateLimitConfig: {
        requestsPerSecond: 10, // Conservative rate limiting
        burstSize: 20,
      },
      retryConfig: {
        tries: 3,
        baseDelay: 500,
        maxDelay: 10000,
        retryOn: (response) => response.status === 429 || response.status >= 500,
        timeout: 30000,
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringWindow: 300000,
      },
    };

    super(config);
    
    this.clientId = id;
    this.clientSecret = secret;
  }

  /**
   * Override request method to handle authentication
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit & { retryConfig?: any; skipCircuitBreaker?: boolean } = {}
  ): Promise<ApiResponse<T>> {
    // Ensure we have a valid token
    const token = await this.getValidToken();
    
    // Add authorization header
    const headers = {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    return super.request<T>(endpoint, { ...options, headers });
  }

  /**
   * Get or refresh access token
   */
  private async getValidToken(): Promise<string> {
    // Check if we have a valid cached token (with 5-minute buffer)
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 300000) {
      return this.tokenCache.token;
    }

    console.log('Spotify: Refreshing access token...');
    
    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE_URL}/api/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
      }

      const tokenData: SpotifyTokenResponse = await response.json();

      if (!tokenData.access_token) {
        throw new Error('No access token in Spotify response');
      }

      // Cache the token
      this.tokenCache = {
        token: tokenData.access_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
      };

      console.log('Spotify: Successfully obtained new access token');
      return tokenData.access_token;

    } catch (error: any) {
      console.error('Spotify token refresh failed:', error);
      throw new Error(`Failed to get Spotify access token: ${error.message}`);
    }
  }

  /**
   * Search for artists
   */
  async searchArtists(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      market?: string;
    } = {}
  ): Promise<ApiResponse<{ artists: SpotifyPaginatedResponse<SpotifyArtist> }>> {
    const params = {
      q: query,
      type: 'artist',
      limit: options.limit || 20,
      offset: options.offset || 0,
      market: options.market || 'US',
    };

    return this.get<{ artists: SpotifyPaginatedResponse<SpotifyArtist> }>('/search', params);
  }

  /**
   * Get artist by ID
   */
  async getArtist(artistId: string): Promise<ApiResponse<SpotifyArtist>> {
    return this.get<SpotifyArtist>(`/artists/${encodeURIComponent(artistId)}`);
  }

  /**
   * Get multiple artists by IDs (batch operation)
   */
  async getArtists(ids: string[]): Promise<ApiResponse<{ artists: SpotifyArtist[] }>> {
    if (ids.length === 0) {
      return { data: { artists: [] }, status: 200 };
    }

    const batchSize = 50; // Spotify API limit
    const allArtists: SpotifyArtist[] = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const response = await this.get<{ artists: SpotifyArtist[] }>('/artists', {
        ids: batch.join(',')
      });
      
      const validArtists = response.data.artists.filter(artist => artist !== null);
      allArtists.push(...validArtists);

      // Rate limiting between batches
      if (i + batchSize < ids.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      data: { artists: allArtists },
      status: 200,
    };
  }

  /**
   * Get artist's albums
   */
  async getArtistAlbums(
    artistId: string,
    options: {
      includeGroups?: ('album' | 'single' | 'appears_on' | 'compilation')[];
      market?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ApiResponse<SpotifyPaginatedResponse<SpotifyAlbum>>> {
    const params = {
      include_groups: (options.includeGroups || ['album', 'single']).join(','),
      market: options.market || 'US',
      limit: options.limit || 50,
      offset: options.offset || 0,
    };

    return this.get<SpotifyPaginatedResponse<SpotifyAlbum>>(
      `/artists/${encodeURIComponent(artistId)}/albums`,
      params
    );
  }

  /**
   * Get all albums for an artist with pagination
   */
  async *iterateArtistAlbums(
    artistId: string,
    options: {
      includeGroups?: ('album' | 'single' | 'appears_on' | 'compilation')[];
      market?: string;
    } = {}
  ): AsyncGenerator<SpotifyAlbum[], void, unknown> {
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const response = await this.getArtistAlbums(artistId, {
        ...options,
        limit,
        offset,
      });

      const albums = response.data.items;
      
      console.log(
        `Spotify: Retrieved ${albums.length} albums for artist ${artistId} ` +
        `(offset: ${offset}, total: ${response.data.total})`
      );

      yield albums;

      hasMore = albums.length === limit && offset + limit < response.data.total;
      offset += limit;

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  /**
   * Get album tracks
   */
  async getAlbumTracks(
    albumId: string,
    options: {
      market?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ApiResponse<SpotifyPaginatedResponse<SpotifyTrack>>> {
    const params = {
      market: options.market || 'US',
      limit: options.limit || 50,
      offset: options.offset || 0,
    };

    return this.get<SpotifyPaginatedResponse<SpotifyTrack>>(
      `/albums/${encodeURIComponent(albumId)}/tracks`,
      params
    );
  }

  /**
   * Get track details in batches
   */
  async getTracks(ids: string[], market: string = 'US'): Promise<ApiResponse<{ tracks: SpotifyTrack[] }>> {
    if (ids.length === 0) {
      return { data: { tracks: [] }, status: 200 };
    }

    const batchSize = 50; // Spotify API limit
    const allTracks: SpotifyTrack[] = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      
      const response = await this.get<{ tracks: SpotifyTrack[] }>('/tracks', {
        ids: batch.join(','),
        market,
      });
      
      const validTracks = response.data.tracks.filter(track => track !== null);
      allTracks.push(...validTracks);

      console.log(
        `Spotify: Retrieved batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ids.length / batchSize)} ` +
        `with ${validTracks.length}/${batch.length} valid tracks`
      );

      if (i + batchSize < ids.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      data: { tracks: allTracks },
      status: 200,
    };
  }

  /**
   * Get audio features in batches
   */
  async getAudioFeatures(ids: string[]): Promise<ApiResponse<{ audio_features: SpotifyAudioFeatures[] }>> {
    if (ids.length === 0) {
      return { data: { audio_features: [] }, status: 200 };
    }

    const batchSize = 100; // Spotify API limit
    const allFeatures: SpotifyAudioFeatures[] = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      
      try {
        const response = await this.get<{ audio_features: (SpotifyAudioFeatures | null)[] }>('/audio-features', {
          ids: batch.join(','),
        });
        
        const validFeatures = response.data.audio_features.filter(feature => feature !== null);
        allFeatures.push(...validFeatures);

        console.log(
          `Spotify: Retrieved audio features batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ids.length / batchSize)} ` +
          `with ${validFeatures.length}/${batch.length} valid features`
        );

      } catch (error: any) {
        // Handle 403 errors gracefully (Client Credentials may not have access)
        if (error.status === 403) {
          console.warn(
            `Spotify: Audio features not accessible with current credentials (403), ` +
            `skipping batch ${Math.floor(i / batchSize) + 1}`
          );
          continue;
        }
        throw error;
      }

      if (i + batchSize < ids.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      data: { audio_features: allFeatures },
      status: 200,
    };
  }

  /**
   * Get artist's top tracks
   */
  async getArtistTopTracks(
    artistId: string,
    market: string = 'US'
  ): Promise<ApiResponse<{ tracks: SpotifyTrack[] }>> {
    return this.get<{ tracks: SpotifyTrack[] }>(
      `/artists/${encodeURIComponent(artistId)}/top-tracks`,
      { market }
    );
  }

  /**
   * Get related artists
   */
  async getRelatedArtists(artistId: string): Promise<ApiResponse<{ artists: SpotifyArtist[] }>> {
    return this.get<{ artists: SpotifyArtist[] }>(
      `/artists/${encodeURIComponent(artistId)}/related-artists`
    );
  }

  /**
   * Search tracks
   */
  async searchTracks(
    query: string,
    options: {
      limit?: number;
      offset?: number;
      market?: string;
    } = {}
  ): Promise<ApiResponse<{ tracks: SpotifyPaginatedResponse<SpotifyTrack> }>> {
    const params = {
      q: query,
      type: 'track',
      limit: options.limit || 20,
      offset: options.offset || 0,
      market: options.market || 'US',
    };

    return this.get<{ tracks: SpotifyPaginatedResponse<SpotifyTrack> }>('/search', params);
  }

  /**
   * Get album by ID
   */
  async getAlbum(albumId: string, market: string = 'US'): Promise<ApiResponse<SpotifyAlbum>> {
    return this.get<SpotifyAlbum>(`/albums/${encodeURIComponent(albumId)}`, { market });
  }

  /**
   * Clear token cache (useful for testing)
   */
  public clearTokenCache(): void {
    this.tokenCache = null;
    console.log('Spotify: Token cache cleared');
  }

  /**
   * Get token cache status
   */
  public getTokenCacheStatus(): {
    hasToken: boolean;
    expiresAt?: number;
    expiresInMinutes?: number;
  } {
    if (!this.tokenCache) {
      return { hasToken: false };
    }
    
    const now = Date.now();
    const expiresInMinutes = Math.max(0, Math.floor((this.tokenCache.expiresAt - now) / 60000));
    
    return {
      hasToken: true,
      expiresAt: this.tokenCache.expiresAt,
      expiresInMinutes,
    };
  }

  /**
   * Test API connectivity and authentication
   */
  async testConnection(): Promise<{
    success: boolean;
    authenticated: boolean;
    tokenValid: boolean;
    error?: string;
  }> {
    try {
      // Test with a simple search request
      const response = await this.searchArtists('test', { limit: 1 });
      
      return {
        success: true,
        authenticated: true,
        tokenValid: true,
      };
    } catch (error: any) {
      return {
        success: false,
        authenticated: error.status !== 401,
        tokenValid: error.status !== 401,
        error: error.message,
      };
    }
  }
}