import 'server-only';
import axios from 'axios';
import { keys } from '../keys';
import { CacheManager, cacheKeys } from './utils/cache';

const env = keys();

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: { url: string; height: number; width: number }[];
  popularity: number;
  followers: { total: number };
  external_urls: { spotify: string };
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; height: number; width: number }[];
    release_date: string;
  };
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  explicit: boolean;
  external_urls: { spotify: string };
}

interface SpotifyAudioFeatures {
  acousticness: number;
  danceability: number;
  energy: number;
  valence: number;
  speechiness: number;
  instrumentalness: number;
  liveness: number;
  loudness: number;
  mode: number;
  key: number;
  tempo: number;
  time_signature: number;
}

class SpotifyAPI {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private cache: CacheManager;

  constructor() {
    this.cache = new CacheManager({
      keyPrefix: 'spotify',
      defaultTTL: 3600, // 1 hour cache for most Spotify data
    });
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const credentials = Buffer.from(
      `${env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios.post<SpotifyTokenResponse>(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

    return this.accessToken;
  }

  async searchArtists(query: string, limit = 10): Promise<SpotifyArtist[]> {
    const cacheKey = cacheKeys.spotify.searchArtists(query, limit);
    
    // Try cache first
    const cached = await this.cache.get<SpotifyArtist[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const token = await this.getAccessToken();

    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const artists = response.data.artists.items;
    
    // Cache for 30 minutes (search results change frequently)
    await this.cache.set(cacheKey, artists, 1800);
    
    return artists;
  }

  async getArtist(artistId: string): Promise<SpotifyArtist> {
    const cacheKey = cacheKeys.spotify.artist(artistId);
    
    // Try cache first
    const cached = await this.cache.get<SpotifyArtist>(cacheKey);
    if (cached) {
      return cached;
    }

    const token = await this.getAccessToken();

    const response = await axios.get(
      `https://api.spotify.com/v1/artists/${artistId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const artist = response.data;
    
    // Cache for 2 hours (artist data doesn't change frequently)
    await this.cache.set(cacheKey, artist, 7200);
    
    return artist;
  }

  async getArtistTopTracks(
    artistId: string,
    market = 'US'
  ): Promise<SpotifyTrack[]> {
    const cacheKey = cacheKeys.spotify.artistTopTracks(artistId, market);
    
    // Try cache first
    const cached = await this.cache.get<SpotifyTrack[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const token = await this.getAccessToken();

    const response = await axios.get(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const tracks = response.data.tracks;
    
    // Cache for 6 hours (top tracks change slowly)
    await this.cache.set(cacheKey, tracks, 21600);
    
    return tracks;
  }

  async searchTracks(query: string, limit = 20): Promise<SpotifyTrack[]> {
    const cacheKey = cacheKeys.spotify.searchTracks(query, limit);
    
    // Try cache first
    const cached = await this.cache.get<SpotifyTrack[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const token = await this.getAccessToken();

    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const tracks = response.data.tracks.items;
    
    // Cache for 30 minutes (search results change frequently)
    await this.cache.set(cacheKey, tracks, 1800);
    
    return tracks;
  }

  async getTrack(trackId: string): Promise<SpotifyTrack> {
    const token = await this.getAccessToken();

    const response = await axios.get(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }

  async getAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures> {
    const token = await this.getAccessToken();

    const response = await axios.get(
      `https://api.spotify.com/v1/audio-features/${trackId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }

  async getUserProfile(accessToken: string) {
    const response = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }

  async getUserTopTracks(
    accessToken: string,
    timeRange = 'medium_term',
    limit = 20
  ) {
    const response = await axios.get(
      `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.items;
  }

  async getUserTopArtists(
    accessToken: string,
    timeRange = 'medium_term',
    limit = 20
  ) {
    const response = await axios.get(
      `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.items;
  }
}

export const spotify = new SpotifyAPI();
export type { SpotifyArtist, SpotifyTrack, SpotifyAudioFeatures };
