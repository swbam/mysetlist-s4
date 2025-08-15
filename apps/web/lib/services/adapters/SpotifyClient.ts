/**
 * Spotify Web API Client
 * Implements GROK.md specifications for OAuth token management and batch API operations
 */

import { fetchJson } from '../util/http';
import { env } from '../../env';

const SPOTIFY_ACCOUNTS_BASE_URL = 'https://accounts.spotify.com';
const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

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

export interface SpotifyError {
  error: {
    status: number;
    message: string;
  };
}

// In-memory token cache with expiration
let tokenCache: {
  token: string;
  expiresAt: number;
} | null = null;

/**
 * Get Spotify client credentials from environment with validation
 */
function getClientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = env.SPOTIFY_CLIENT_ID;
  const clientSecret = env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables are required');
  }
  
  return { clientId, clientSecret };
}

/**
 * Get access token using Client Credentials flow
 * Implements caching to avoid unnecessary requests
 */
export async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token (with 5 minute buffer)
  if (tokenCache && Date.now() < tokenCache.expiresAt - 300000) {
    return tokenCache.token;
  }

  const { clientId, clientSecret } = getClientCredentials();
  
  // Create basic auth header
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    const response: SpotifyTokenResponse = await fetchJson(
      `${SPOTIFY_ACCOUNTS_BASE_URL}/api/token`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      },
      {
        tries: 3,
        baseDelay: 1000,
        retryOn: (response) => response.status === 429 || response.status >= 500,
        timeout: 15000,
      }
    );

    if (!response.access_token) {
      throw new Error('No access token in Spotify response');
    }

    // Cache the token with expiration
    tokenCache = {
      token: response.access_token,
      expiresAt: Date.now() + (response.expires_in * 1000),
    };

    console.log('Spotify: Successfully obtained access token');
    return response.access_token;

  } catch (error: any) {
    console.error('Spotify authentication failed:', error);
    throw new Error(`Failed to get Spotify access token: ${error.message}`);
  }
}

/**
 * Make authenticated request to Spotify API with automatic token refresh
 */
async function spotifyRequest<T>(
  endpoint: string,
  token?: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = token || await getAccessToken();
  
  try {
    return await fetchJson<T>(
      `${SPOTIFY_API_BASE_URL}${endpoint}`,
      {
        ...options,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          ...options.headers,
        },
      },
      {
        tries: 3,
        baseDelay: 500,
        retryOn: (response) => {
          // Retry on rate limits and server errors
          if (response.status === 429 || response.status >= 500) {
            return true;
          }
          // If token expired, clear cache and retry once
          if (response.status === 401 && tokenCache) {
            tokenCache = null;
            return true;
          }
          return false;
        },
        timeout: 30000,
      }
    );
  } catch (error: any) {
    // If we got a 401 and haven't already retried, try refreshing token
    if (error.status === 401 && token) {
      console.log('Spotify: Token expired, refreshing...');
      tokenCache = null;
      const newToken = await getAccessToken();
      return spotifyRequest<T>(endpoint, newToken, options);
    }
    throw error;
  }
}

/**
 * List all albums for an artist with pagination
 * Includes album and single groups as specified in GROK.md
 */
export async function listAllAlbums(
  artistId: string, 
  token?: string
): Promise<SpotifyAlbum[]> {
  const albums: SpotifyAlbum[] = [];
  let next: string | null = `/artists/${encodeURIComponent(artistId)}/albums?include_groups=album,single&limit=50&market=US`;
  
  while (next) {
    try {
      const response: SpotifyPaginatedResponse<SpotifyAlbum> = await spotifyRequest(next, token);
      
      albums.push(...response.items);
      
      // Update next URL (remove base URL if present since we add it in spotifyRequest)
      next = response.next ? response.next.replace(SPOTIFY_API_BASE_URL, '') : null;
      
      console.log(`Spotify: Retrieved ${response.items.length} albums (total: ${albums.length}/${response.total})`);
      
      // Small delay between requests to be respectful
      if (next) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
    } catch (error: any) {
      console.error(`Spotify album listing error for artist ${artistId}:`, error);
      throw new Error(`Failed to fetch albums: ${error.message}`);
    }
  }
  
  console.log(`Spotify: Retrieved total of ${albums.length} albums for artist ${artistId}`);
  return albums;
}

/**
 * List all tracks for an album with pagination
 */
export async function listAlbumTracks(
  albumId: string,
  token?: string
): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  let next: string | null = `/albums/${encodeURIComponent(albumId)}/tracks?limit=50&market=US`;
  
  while (next) {
    try {
      const response: SpotifyPaginatedResponse<SpotifyTrack> = await spotifyRequest(next, token);
      
      tracks.push(...response.items);
      
      next = response.next ? response.next.replace(SPOTIFY_API_BASE_URL, '') : null;
      
      if (next) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
    } catch (error: any) {
      console.error(`Spotify track listing error for album ${albumId}:`, error);
      throw new Error(`Failed to fetch album tracks: ${error.message}`);
    }
  }
  
  return tracks;
}

/**
 * Get track details in batches of 50 (Spotify API limit)
 * As specified in GROK.md
 */
export async function getTracksDetails(
  ids: string[],
  token?: string
): Promise<SpotifyTrack[]> {
  if (ids.length === 0) {
    return [];
  }

  const tracks: SpotifyTrack[] = [];
  const batchSize = 50; // Spotify API limit for track details
  
  console.log(`Spotify: Fetching details for ${ids.length} tracks in batches of ${batchSize}`);
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const idsParam = batch.join(',');
    
    try {
      const response: { tracks: SpotifyTrack[] } = await spotifyRequest(
        `/tracks?ids=${encodeURIComponent(idsParam)}&market=US`,
        token
      );
      
      // Filter out null tracks (deleted/unavailable tracks)
      const validTracks = response.tracks.filter(track => track !== null);
      tracks.push(...validTracks);
      
      console.log(`Spotify: Retrieved batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ids.length / batchSize)} with ${validTracks.length}/${batch.length} valid tracks`);
      
      // Rate limiting between batches
      if (i + batchSize < ids.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error: any) {
      console.error(`Spotify tracks details error for batch starting at ${i}:`, error);
      throw new Error(`Failed to fetch track details: ${error.message}`);
    }
  }
  
  console.log(`Spotify: Retrieved details for ${tracks.length}/${ids.length} tracks`);
  return tracks;
}

/**
 * Get audio features in batches of 100 (Spotify API limit)
 * As specified in GROK.md
 * Gracefully handles 403 errors when Client Credentials flow doesn't have access
 */
export async function getAudioFeatures(
  ids: string[],
  token?: string
): Promise<SpotifyAudioFeatures[]> {
  if (ids.length === 0) {
    return [];
  }

  const features: SpotifyAudioFeatures[] = [];
  const batchSize = 100; // Spotify API limit for audio features
  
  console.log(`Spotify: Fetching audio features for ${ids.length} tracks in batches of ${batchSize}`);
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const idsParam = batch.join(',');
    
    try {
      const response: { audio_features: (SpotifyAudioFeatures | null)[] } = await spotifyRequest(
        `/audio-features?ids=${encodeURIComponent(idsParam)}`,
        token
      );
      
      // Filter out null features (deleted/unavailable tracks)
      const validFeatures = response.audio_features.filter(feature => feature !== null);
      features.push(...validFeatures);
      
      console.log(`Spotify: Retrieved audio features batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ids.length / batchSize)} with ${validFeatures.length}/${batch.length} valid features`);
      
      // Rate limiting between batches
      if (i + batchSize < ids.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error: any) {
      // Handle 403 errors gracefully (Client Credentials may not have access to audio features)
      if (error.status === 403) {
        console.warn(`Spotify: Audio features not accessible with current credentials (403), continuing without audio features for batch ${Math.floor(i / batchSize) + 1}`);
        continue; // Skip this batch and continue
      }
      
      console.error(`Spotify audio features error for batch starting at ${i}:`, error);
      throw new Error(`Failed to fetch audio features: ${error.message}`);
    }
  }
  
  console.log(`Spotify: Retrieved audio features for ${features.length}/${ids.length} tracks (some may be unavailable due to permissions)`);
  return features;
}

/**
 * Search for artists by name
 */
export async function searchArtists(
  query: string,
  options: {
    token?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ artists: SpotifyArtist[]; total: number }> {
  const { token, limit = 20, offset = 0 } = options;
  
  try {
    const response: {
      artists: SpotifyPaginatedResponse<SpotifyArtist>;
    } = await spotifyRequest(
      `/search?q=${encodeURIComponent(query)}&type=artist&limit=${limit}&offset=${offset}&market=US`,
      token
    );
    
    return {
      artists: response.artists.items,
      total: response.artists.total,
    };
  } catch (error: any) {
    console.error('Spotify artist search error:', error);
    throw new Error(`Failed to search artists: ${error.message}`);
  }
}

/**
 * Get artist details by ID
 */
export async function getArtist(
  artistId: string,
  token?: string
): Promise<SpotifyArtist | null> {
  try {
    const artist: SpotifyArtist = await spotifyRequest(`/artists/${encodeURIComponent(artistId)}`, token);
    return artist;
  } catch (error: any) {
    if (error.status === 404) {
      console.warn(`Spotify artist ${artistId} not found`);
      return null;
    }
    
    console.error('Spotify artist fetch error:', error);
    throw new Error(`Failed to fetch artist: ${error.message}`);
  }
}

/**
 * Get multiple artists by IDs (batch operation)
 */
export async function getArtists(
  ids: string[],
  token?: string
): Promise<SpotifyArtist[]> {
  if (ids.length === 0) {
    return [];
  }

  const artists: SpotifyArtist[] = [];
  const batchSize = 50; // Spotify API limit for artists
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const idsParam = batch.join(',');
    
    try {
      const response: { artists: SpotifyArtist[] } = await spotifyRequest(
        `/artists?ids=${encodeURIComponent(idsParam)}`,
        token
      );
      
      const validArtists = response.artists.filter(artist => artist !== null);
      artists.push(...validArtists);
      
      if (i + batchSize < ids.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error: any) {
      console.error(`Spotify artists batch error for batch starting at ${i}:`, error);
      throw new Error(`Failed to fetch artists: ${error.message}`);
    }
  }
  
  return artists;
}

/**
 * Get artist's top tracks
 */
export async function getArtistTopTracks(
  artistId: string,
  token?: string,
  market: string = 'US'
): Promise<SpotifyTrack[]> {
  try {
    const response: { tracks: SpotifyTrack[] } = await spotifyRequest(
      `/artists/${encodeURIComponent(artistId)}/top-tracks?market=${market}`,
      token
    );
    
    return response.tracks;
  } catch (error: any) {
    console.error(`Spotify top tracks error for artist ${artistId}:`, error);
    throw new Error(`Failed to fetch top tracks: ${error.message}`);
  }
}

/**
 * Test API connectivity and token validity
 */
export async function testApiConnection(): Promise<{
  success: boolean;
  tokenValid: boolean;
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
  error?: string;
}> {
  try {
    const token = await getAccessToken();
    
    // Test with a simple search request (works with Client Credentials flow)
    await spotifyRequest('/search?q=test&type=artist&limit=1', token);
    
    return {
      success: true,
      tokenValid: true,
    };
  } catch (error: any) {
    return {
      success: false,
      tokenValid: false,
      error: error.message,
    };
  }
}

/**
 * Clear token cache (useful for testing or when token is known to be invalid)
 */
export function clearTokenCache(): void {
  tokenCache = null;
  console.log('Spotify: Token cache cleared');
}

/**
 * Get current token cache status
 */
export function getTokenCacheStatus(): {
  hasToken: boolean;
  expiresAt?: number;
  expiresInMinutes?: number;
} {
  if (!tokenCache) {
    return { hasToken: false };
  }
  
  const now = Date.now();
  const expiresInMinutes = Math.max(0, Math.floor((tokenCache.expiresAt - now) / 60000));
  
  return {
    hasToken: true,
    expiresAt: tokenCache.expiresAt,
    expiresInMinutes,
  };
}