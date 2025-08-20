/**
 * Setlist.fm API Client
 * Implements comprehensive setlist and artist data retrieval with rate limiting
 */

import { BaseApiClient, type ApiClientConfig, type ApiResponse } from './base-client';
import { env } from '../../env';

const SETLISTFM_BASE_URL = 'https://api.setlist.fm/rest/1.0';

// Setlist.fm API Interfaces
export interface SetlistFmArtist {
  mbid: string;
  name: string;
  sortName: string;
  disambiguation?: string;
  url?: string;
}

export interface SetlistFmVenue {
  id: string;
  name: string;
  city: {
    id: string;
    name: string;
    state?: string;
    stateCode?: string;
    coords: {
      lat: number;
      long: number;
    };
    country: {
      code: string;
      name: string;
    };
  };
  url?: string;
}

export interface SetlistFmSong {
  name: string;
  with?: SetlistFmArtist;
  cover?: SetlistFmArtist;
  info?: string;
  tape?: boolean;
}

export interface SetlistFmSet {
  name?: string;
  encore?: number;
  song: SetlistFmSong[];
}

export interface SetlistFmSetlist {
  id: string;
  versionId: string;
  eventDate: string;
  lastUpdated: string;
  artist: SetlistFmArtist;
  venue: SetlistFmVenue;
  tour?: {
    name: string;
  };
  sets: {
    set: SetlistFmSet[];
  };
  info?: string;
  url: string;
}

export interface SetlistFmSearchResult<T> {
  type: string;
  itemsPerPage: number;
  page: number;
  total: number;
  [key: string]: T[] | number | string;
}

export interface SetlistFmCity {
  id: string;
  name: string;
  state?: string;
  stateCode?: string;
  coords: {
    lat: number;
    long: number;
  };
  country: {
    code: string;
    name: string;
  };
}

export interface SetlistFmUser {
  userId: string;
  fullname?: string;
  lastFm?: string;
  mySpace?: string;
  twitter?: string;
  flickr?: string;
  website?: string;
  about?: string;
  url: string;
}

/**
 * Setlist.fm API Client with comprehensive endpoint coverage
 */
export class SetlistFmClient extends BaseApiClient {
  constructor(apiKey?: string) {
    const key = apiKey || env.SETLISTFM_API_KEY;
    
    if (!key) {
      throw new Error('SETLISTFM_API_KEY environment variable is required');
    }

    const config: ApiClientConfig = {
      baseUrl: SETLISTFM_BASE_URL,
      apiKey: key,
      defaultHeaders: {
        'Accept': 'application/json',
        'x-api-key': key,
      },
      rateLimitConfig: {
        requestsPerSecond: 2, // Setlist.fm allows 2 requests per second
        burstSize: 10,
      },
      retryConfig: {
        tries: 3,
        baseDelay: 500,
        maxDelay: 10000,
        retryOn: (response) => response.status === 429 || response.status >= 500,
        timeout: 20000,
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 120000, // 2 minutes
        monitoringWindow: 300000, // 5 minutes
      },
    };

    super(config);
  }

  /**
   * Search for artists by name
   */
  async searchArtists(
    artistName: string,
    options: {
      page?: number;
      sort?: 'sortName' | 'relevance';
    } = {}
  ): Promise<ApiResponse<SetlistFmSearchResult<SetlistFmArtist>>> {
    const params = {
      artistName: artistName,
      p: options.page || 1,
      sort: options.sort || 'relevance',
    };

    return this.get<SetlistFmSearchResult<SetlistFmArtist>>('/search/artists', params);
  }

  /**
   * Get artist by MusicBrainz ID
   */
  async getArtist(mbid: string): Promise<ApiResponse<SetlistFmArtist>> {
    return this.get<SetlistFmArtist>(`/artist/${encodeURIComponent(mbid)}`);
  }

  /**
   * Get setlists for a specific artist
   */
  async getArtistSetlists(
    mbid: string,
    options: {
      page?: number;
    } = {}
  ): Promise<ApiResponse<SetlistFmSearchResult<SetlistFmSetlist>>> {
    const params = {
      p: options.page || 1,
    };

    return this.get<SetlistFmSearchResult<SetlistFmSetlist>>(
      `/artist/${encodeURIComponent(mbid)}/setlists`,
      params
    );
  }

  /**
   * Get all setlists for an artist with pagination
   */
  async *iterateArtistSetlists(
    mbid: string
  ): AsyncGenerator<SetlistFmSetlist[], void, unknown> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.getArtistSetlists(mbid, { page });
        const result = response.data;
        
        const setlists = result.setlist || [];
        
        console.log(
          `SetlistFM: Retrieved page ${page} with ${setlists.length} setlists ` +
          `for artist ${mbid} (total: ${result.total})`
        );

        yield setlists;

        // Check if we have more pages
        const totalPages = Math.ceil(result.total / result.itemsPerPage);
        hasMore = page < totalPages;
        page++;

        // Rate limiting delay
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error: any) {
        console.error(`SetlistFM API error on page ${page} for artist ${mbid}:`, error);
        
        // If 404, artist might not exist or have no setlists
        if (error.status === 404) {
          console.warn(`No setlists found for artist ${mbid}`);
          return;
        }
        
        throw error;
      }
    }
  }

  /**
   * Get specific setlist by ID
   */
  async getSetlist(setlistId: string): Promise<ApiResponse<SetlistFmSetlist>> {
    return this.get<SetlistFmSetlist>(`/setlist/${encodeURIComponent(setlistId)}`);
  }

  /**
   * Search setlists by multiple criteria
   */
  async searchSetlists(options: {
    artistMbid?: string;
    artistName?: string;
    cityId?: string;
    cityName?: string;
    countryCode?: string;
    date?: string; // Format: dd-MM-yyyy
    lastFm?: string;
    page?: number;
    state?: string;
    stateCode?: string;
    tourName?: string;
    venueId?: string;
    venueName?: string;
    year?: number;
  } = {}): Promise<ApiResponse<SetlistFmSearchResult<SetlistFmSetlist>>> {
    const params: Record<string, string | number> = {};

    // Map all possible search parameters
    if (options.artistMbid) params.artistMbid = options.artistMbid;
    if (options.artistName) params.artistName = options.artistName;
    if (options.cityId) params.cityId = options.cityId;
    if (options.cityName) params.cityName = options.cityName;
    if (options.countryCode) params.countryCode = options.countryCode;
    if (options.date) params.date = options.date;
    if (options.lastFm) params.lastFm = options.lastFm;
    if (options.state) params.state = options.state;
    if (options.stateCode) params.stateCode = options.stateCode;
    if (options.tourName) params.tourName = options.tourName;
    if (options.venueId) params.venueId = options.venueId;
    if (options.venueName) params.venueName = options.venueName;
    if (options.year) params.year = options.year;
    
    params.p = options.page || 1;

    return this.get<SetlistFmSearchResult<SetlistFmSetlist>>('/search/setlists', params);
  }

  /**
   * Get venue by ID
   */
  async getVenue(venueId: string): Promise<ApiResponse<SetlistFmVenue>> {
    return this.get<SetlistFmVenue>(`/venue/${encodeURIComponent(venueId)}`);
  }

  /**
   * Get setlists for a specific venue
   */
  async getVenueSetlists(
    venueId: string,
    options: {
      page?: number;
    } = {}
  ): Promise<ApiResponse<SetlistFmSearchResult<SetlistFmSetlist>>> {
    const params = {
      p: options.page || 1,
    };

    return this.get<SetlistFmSearchResult<SetlistFmSetlist>>(
      `/venue/${encodeURIComponent(venueId)}/setlists`,
      params
    );
  }

  /**
   * Search for venues by name
   */
  async searchVenues(
    name: string,
    options: {
      page?: number;
    } = {}
  ): Promise<ApiResponse<SetlistFmSearchResult<SetlistFmVenue>>> {
    const params = {
      name: name,
      p: options.page || 1,
    };

    return this.get<SetlistFmSearchResult<SetlistFmVenue>>('/search/venues', params);
  }

  /**
   * Get city by ID
   */
  async getCity(geoId: string): Promise<ApiResponse<SetlistFmCity>> {
    return this.get<SetlistFmCity>(`/city/${encodeURIComponent(geoId)}`);
  }

  /**
   * Search for cities
   */
  async searchCities(
    name: string,
    options: {
      country?: string;
      state?: string;
      page?: number;
    } = {}
  ): Promise<ApiResponse<SetlistFmSearchResult<SetlistFmCity>>> {
    const params: Record<string, string | number> = {
      name: name,
      p: options.page || 1,
    };

    if (options.country) params.country = options.country;
    if (options.state) params.state = options.state;

    return this.get<SetlistFmSearchResult<SetlistFmCity>>('/search/cities', params);
  }

  /**
   * Get user information
   */
  async getUser(userId: string): Promise<ApiResponse<SetlistFmUser>> {
    return this.get<SetlistFmUser>(`/user/${encodeURIComponent(userId)}`);
  }

  /**
   * Get setlists attended by a user
   */
  async getUserAttendedSetlists(
    userId: string,
    options: {
      page?: number;
    } = {}
  ): Promise<ApiResponse<SetlistFmSearchResult<SetlistFmSetlist>>> {
    const params = {
      p: options.page || 1,
    };

    return this.get<SetlistFmSearchResult<SetlistFmSetlist>>(
      `/user/${encodeURIComponent(userId)}/attended`,
      params
    );
  }

  /**
   * Get setlists edited by a user
   */
  async getUserEditedSetlists(
    userId: string,
    options: {
      page?: number;
    } = {}
  ): Promise<ApiResponse<SetlistFmSearchResult<SetlistFmSetlist>>> {
    const params = {
      p: options.page || 1,
    };

    return this.get<SetlistFmSearchResult<SetlistFmSetlist>>(
      `/user/${encodeURIComponent(userId)}/edited`,
      params
    );
  }

  /**
   * Get recent setlists with various filters
   */
  async getRecentSetlists(options: {
    page?: number;
  } = {}): Promise<ApiResponse<SetlistFmSearchResult<SetlistFmSetlist>>> {
    const params = {
      p: options.page || 1,
    };

    return this.get<SetlistFmSearchResult<SetlistFmSetlist>>('/search/setlists', params);
  }

  /**
   * Extract all songs from a setlist
   */
  extractSongsFromSetlist(setlist: SetlistFmSetlist): SetlistFmSong[] {
    const songs: SetlistFmSong[] = [];
    
    setlist.sets.set.forEach(set => {
      songs.push(...set.song);
    });

    return songs;
  }

  /**
   * Get unique song names from multiple setlists
   */
  getUniqueSongs(setlists: SetlistFmSetlist[]): string[] {
    const songNames = new Set<string>();
    
    setlists.forEach(setlist => {
      const songs = this.extractSongsFromSetlist(setlist);
      songs.forEach(song => {
        if (song.name && song.name.trim()) {
          songNames.add(song.name.trim());
        }
      });
    });

    return Array.from(songNames).sort();
  }

  /**
   * Get setlist statistics
   */
  getSetlistStats(setlists: SetlistFmSetlist[]) {
    const totalSetlists = setlists.length;
    const totalSongs = setlists.reduce((count, setlist) => {
      return count + this.extractSongsFromSetlist(setlist).length;
    }, 0);
    
    const uniqueSongs = this.getUniqueSongs(setlists);
    const venues = new Set(setlists.map(s => s.venue.name));
    const cities = new Set(setlists.map(s => s.venue.city.name));
    const countries = new Set(setlists.map(s => s.venue.city.country.name));

    // Find date range
    const dates = setlists.map(s => new Date(s.eventDate)).sort();
    const earliestDate = dates[0];
    const latestDate = dates[dates.length - 1];

    return {
      totalSetlists,
      totalSongs,
      uniqueSongs: uniqueSongs.length,
      averageSongsPerSetlist: totalSetlists > 0 ? Math.round(totalSongs / totalSetlists) : 0,
      venues: venues.size,
      cities: cities.size,
      countries: countries.size,
      dateRange: {
        earliest: earliestDate?.toISOString().split('T')[0],
        latest: latestDate?.toISOString().split('T')[0],
      },
      mostPlayedSongs: this.getMostPlayedSongs(setlists, 10),
    };
  }

  /**
   * Get most played songs from setlists
   */
  private getMostPlayedSongs(setlists: SetlistFmSetlist[], limit: number = 10) {
    const songCounts = new Map<string, number>();
    
    setlists.forEach(setlist => {
      const songs = this.extractSongsFromSetlist(setlist);
      songs.forEach(song => {
        if (song.name && song.name.trim()) {
          const songName = song.name.trim();
          songCounts.set(songName, (songCounts.get(songName) || 0) + 1);
        }
      });
    });

    return Array.from(songCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({ name, count }));
  }

  /**
   * Test API connectivity and authentication
   */
  async testConnection(): Promise<{
    success: boolean;
    authenticated: boolean;
    rateLimit?: {
      remaining: number;
      resetTime: number;
    };
    error?: string;
  }> {
    try {
      // Try a simple search to test connectivity and auth
      const response = await this.searchArtists('test', { page: 1 });
      
      return {
        success: true,
        authenticated: true,
        rateLimit: response.headers ? {
          remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
          resetTime: parseInt(response.headers['x-ratelimit-reset'] || '0'),
        } : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        authenticated: error.status !== 401 && error.status !== 403,
        error: error.message,
      };
    }
  }
}