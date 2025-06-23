import 'server-only';
import axios from 'axios';
import { keys } from '../keys';

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
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

    return this.accessToken;
  }

  async searchArtists(query: string, limit = 10): Promise<SpotifyArtist[]> {
    const token = await this.getAccessToken();
    
    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data.artists.items;
  }

  async getArtist(artistId: string): Promise<SpotifyArtist> {
    const token = await this.getAccessToken();
    
    const response = await axios.get(
      `https://api.spotify.com/v1/artists/${artistId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }

  async getArtistTopTracks(artistId: string, market = 'US'): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();
    
    const response = await axios.get(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data.tracks;
  }

  async searchTracks(query: string, limit = 20): Promise<SpotifyTrack[]> {
    const token = await this.getAccessToken();
    
    const response = await axios.get(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data.tracks.items;
  }

  async getTrack(trackId: string): Promise<SpotifyTrack> {
    const token = await this.getAccessToken();
    
    const response = await axios.get(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
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
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    return response.data;
  }

  async getUserProfile(accessToken: string) {
    const response = await axios.get(
      'https://api.spotify.com/v1/me',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  }

  async getUserTopTracks(accessToken: string, timeRange = 'medium_term', limit = 20) {
    const response = await axios.get(
      `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.items;
  }

  async getUserTopArtists(accessToken: string, timeRange = 'medium_term', limit = 20) {
    const response = await axios.get(
      `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    return response.data.items;
  }
}

export const spotify = new SpotifyAPI();
export type { SpotifyArtist, SpotifyTrack, SpotifyAudioFeatures };