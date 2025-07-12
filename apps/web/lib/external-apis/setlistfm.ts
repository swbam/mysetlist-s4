import { env } from '~/env';

interface SetlistFmArtist {
  mbid: string;
  name: string;
  sortName: string;
  disambiguation?: string;
  url: string;
}

interface SetlistFmVenue {
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
  url: string;
}

interface SetlistFmSong {
  name: string;
  info?: string;
  cover?: SetlistFmArtist;
  with?: SetlistFmArtist;
  tape?: boolean;
}

interface SetlistFmSet {
  name?: string;
  encore?: number;
  song: SetlistFmSong[];
}

interface SetlistFmSetlist {
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
  url: string;
  info?: string;
}

interface SetlistFmSearchResponse {
  type: string;
  itemsPerPage: number;
  page: number;
  total: number;
  setlist?: SetlistFmSetlist[];
  artist?: SetlistFmArtist[];
}

export class SetlistFmClient {
  private apiKey: string;
  private baseUrl = 'https://api.setlist.fm/rest/1.0';

  constructor() {
    if (!env.SETLISTFM_API_KEY) {
      throw new Error('SETLISTFM_API_KEY is not configured');
    }
    this.apiKey = env.SETLISTFM_API_KEY;
  }

  private async makeRequest<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': this.apiKey,
        Accept: 'application/json',
        'User-Agent': 'MySetlist/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Setlist.fm API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async searchArtists(
    artistName: string,
    page = 1
  ): Promise<SetlistFmSearchResponse> {
    return this.makeRequest<SetlistFmSearchResponse>('/search/artists', {
      artistName,
      p: page,
      sort: 'relevance',
    });
  }

  async getArtistSetlists(
    mbid: string,
    page = 1
  ): Promise<SetlistFmSearchResponse> {
    return this.makeRequest<SetlistFmSearchResponse>(
      `/artist/${mbid}/setlists`,
      {
        p: page,
      }
    );
  }

  async searchSetlists(params: {
    artistName?: string;
    artistMbid?: string;
    date?: string; // YYYY-MM-DD
    lastUpdated?: string; // timestamp
    p?: number;
  }): Promise<SetlistFmSearchResponse> {
    return this.makeRequest<SetlistFmSearchResponse>(
      '/search/setlists',
      params
    );
  }

  async getSetlist(setlistId: string): Promise<SetlistFmSetlist> {
    return this.makeRequest<SetlistFmSetlist>(`/setlist/${setlistId}`);
  }

  /**
   * Get recent setlists for an artist (last 30 days)
   */
  async getRecentSetlists(
    mbid: string,
    days = 30
  ): Promise<SetlistFmSetlist[]> {
    const results: SetlistFmSetlist[] = [];
    let page = 1;
    let hasMore = true;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    while (hasMore && page <= 5) {
      // Limit to 5 pages to avoid excessive API calls
      try {
        const response = await this.getArtistSetlists(mbid, page);

        if (!response.setlist || response.setlist.length === 0) {
          hasMore = false;
          break;
        }

        for (const setlist of response.setlist) {
          const eventDate = new Date(setlist.eventDate);

          if (eventDate < cutoffDate) {
            hasMore = false;
            break;
          }

          results.push(setlist);
        }

        page++;

        // Rate limiting - Setlist.fm allows 1 request per second
        await new Promise((resolve) => setTimeout(resolve, 1100));
      } catch (_error) {
        hasMore = false;
      }
    }

    return results;
  }

  /**
   * Search for an artist by name and get their MBID (MusicBrainz ID)
   */
  async findArtistMbid(artistName: string): Promise<string | null> {
    try {
      const response = await this.searchArtists(artistName);

      if (response.artist && response.artist.length > 0) {
        // Try to find exact match first
        const exactMatch = response.artist.find(
          (artist) => artist.name.toLowerCase() === artistName.toLowerCase()
        );

        if (exactMatch) {
          return exactMatch.mbid;
        }

        // Otherwise return the first (most relevant) result
        return response.artist[0]?.mbid ?? null;
      }
    } catch (_error) {}

    return null;
  }

  /**
   * Format a setlist for database storage
   */
  formatSetlistForDb(setlist: SetlistFmSetlist): {
    songs: Array<{ name: string; setName: string; position: number }>;
    totalSongs: number;
    venue: {
      name: string;
      city: string;
      state?: string;
      country: string;
      latitude?: number;
      longitude?: number;
    };
  } {
    const songs: Array<{ name: string; setName: string; position: number }> =
      [];
    let position = 0;

    if (setlist.sets?.set) {
      for (const set of setlist.sets.set) {
        const setName =
          set.name || (set.encore ? `Encore ${set.encore}` : 'Main Set');

        if (set.song) {
          for (const song of set.song) {
            songs.push({
              name: song.name,
              setName,
              position: position++,
            });
          }
        }
      }
    }

    return {
      songs,
      totalSongs: songs.length,
      venue: {
        name: setlist.venue.name,
        city: setlist.venue.city.name,
        ...(setlist.venue.city.state && { state: setlist.venue.city.state }),
        country: setlist.venue.city.country.name,
        ...(setlist.venue.city.coords?.lat && { latitude: setlist.venue.city.coords.lat }),
        ...(setlist.venue.city.coords?.long && { longitude: setlist.venue.city.coords.long }),
      },
    };
  }
}
