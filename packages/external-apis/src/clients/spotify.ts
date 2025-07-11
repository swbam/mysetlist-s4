import { type APIClientConfig, BaseAPIClient } from './base';

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

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  explicit: boolean;
  is_playable: boolean;
  album: {
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
}

export interface SpotifySearchResult {
  artists: {
    items: SpotifyArtist[];
    total: number;
  };
}

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export class SpotifyClient extends BaseAPIClient {
  private accessToken?: string;

  constructor(config: Omit<APIClientConfig, 'baseURL'>) {
    super({
      ...config,
      baseURL: 'https://api.spotify.com/v1',
      rateLimit: { requests: 100, window: 60 }, // 100 requests per minute
      cache: { defaultTTL: 3600 }, // 1 hour default cache
    });
  }

  async authenticate(): Promise<void> {
    const clientId =
      process.env['SPOTIFY_CLIENT_ID'] ||
      process.env['NEXT_PUBLIC_SPOTIFY_CLIENT_ID'];
    const clientSecret = process.env['SPOTIFY_CLIENT_SECRET'];

    if (!clientId || !clientSecret) {
      throw new Error('Spotify credentials not configured');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Spotify authentication failed: ${response.status} ${errorText}`
      );
    }

    const data = (await response.json()) as SpotifyTokenResponse;
    this.accessToken = data.access_token;
  }

  protected getAuthHeaders(): Record<string, string> {
    if (!this.accessToken) {
      throw new Error('Spotify client not authenticated');
    }
    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  async searchArtists(query: string, limit = 20): Promise<SpotifySearchResult> {
    const params = new URLSearchParams({
      q: query,
      type: 'artist',
      limit: limit.toString(),
    });

    return this.makeRequest<SpotifySearchResult>(
      `/search?${params}`,
      {},
      `spotify:search:artists:${query}:${limit}`,
      1800 // 30 minutes cache
    );
  }

  async getArtist(artistId: string): Promise<SpotifyArtist> {
    return this.makeRequest<SpotifyArtist>(
      `/artists/${artistId}`,
      {},
      `spotify:artist:${artistId}`,
      3600 // 1 hour cache
    );
  }

  async getArtistTopTracks(
    artistId: string,
    market = 'US'
  ): Promise<{ tracks: SpotifyTrack[] }> {
    return this.makeRequest<{ tracks: SpotifyTrack[] }>(
      `/artists/${artistId}/top-tracks?market=${market}`,
      {},
      `spotify:artist:${artistId}:top-tracks:${market}`,
      1800 // 30 minutes cache
    );
  }

  async getArtistAlbums(
    artistId: string,
    options: {
      include_groups?: string;
      market?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<any> {
    const params = new URLSearchParams({
      include_groups: options.include_groups || 'album,single',
      market: options.market || 'US',
      limit: (options.limit || 20).toString(),
      offset: (options.offset || 0).toString(),
    });

    return this.makeRequest(
      `/artists/${artistId}/albums?${params}`,
      {},
      `spotify:artist:${artistId}:albums:${params.toString()}`,
      1800
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
        params.append(key, value.join(','));
      } else if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest<{ tracks: SpotifyTrack[] }>(
      `/recommendations?${params}`,
      {},
      `spotify:recommendations:${params.toString()}`,
      900 // 15 minutes cache for recommendations
    );
  }

  async getAudioFeatures(
    trackIds: string[]
  ): Promise<{ audio_features: any[] }> {
    const ids = trackIds.join(',');
    return this.makeRequest(
      `/audio-features?ids=${ids}`,
      {},
      `spotify:audio-features:${ids}`,
      3600
    );
  }

  async searchTracks(
    query: string,
    limit = 20
  ): Promise<{ tracks: { items: SpotifyTrack[]; total: number } }> {
    const params = new URLSearchParams({
      q: query,
      type: 'track',
      limit: limit.toString(),
    });

    return this.makeRequest<{
      tracks: { items: SpotifyTrack[]; total: number };
    }>(
      `/search?${params}`,
      {},
      `spotify:search:tracks:${query}:${limit}`,
      1800 // 30 minutes cache
    );
  }
}
