import { BaseAPIClient, APIClientConfig } from './base';

export interface SetlistFmArtist {
  mbid: string;
  name: string;
  sortName: string;
  disambiguation?: string;
  url: string;
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
  url: string;
}

export interface SetlistFmSong {
  name: string;
  info?: string;
  cover?: SetlistFmArtist;
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

export class SetlistFmClient extends BaseAPIClient {
  constructor(config: Omit<APIClientConfig, 'baseURL'>) {
    super({
      ...config,
      baseURL: 'https://api.setlist.fm/rest/1.0',
      rateLimit: { requests: 60, window: 60 }, // 1 request per second
      cache: { defaultTTL: 3600 }, // 1 hour cache
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    const apiKey = process.env.SETLIST_FM_API_KEY;
    
    if (!apiKey) {
      throw new Error('Setlist.fm API key not configured');
    }
    
    return {
      'x-api-key': apiKey,
      'Accept': 'application/json',
    };
  }

  async searchSetlists(options: {
    artistName?: string;
    artistMbid?: string;
    venueName?: string;
    cityName?: string;
    date?: string;
    year?: number;
    p?: number; // page
  }): Promise<{ setlist: SetlistFmSetlist[]; total: number; page: number; itemsPerPage: number }> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest(
      `/search/setlists?${params}`,
      {},
      `setlistfm:search:${params.toString()}`,
      1800
    );
  }

  async getSetlist(setlistId: string): Promise<SetlistFmSetlist> {
    return this.makeRequest<SetlistFmSetlist>(
      `/setlist/${setlistId}`,
      {},
      `setlistfm:setlist:${setlistId}`,
      3600
    );
  }

  async getArtistSetlists(artistMbid: string, page = 1): Promise<{ setlist: SetlistFmSetlist[]; total: number; page: number; itemsPerPage: number }> {
    return this.makeRequest(
      `/artist/${artistMbid}/setlists?p=${page}`,
      {},
      `setlistfm:artist:${artistMbid}:setlists:${page}`,
      1800
    );
  }

  async getVenueSetlists(venueId: string, page = 1): Promise<{ setlist: SetlistFmSetlist[]; total: number; page: number; itemsPerPage: number }> {
    return this.makeRequest(
      `/venue/${venueId}/setlists?p=${page}`,
      {},
      `setlistfm:venue:${venueId}:setlists:${page}`,
      1800
    );
  }

  async searchArtists(artistName: string, page = 1): Promise<{ artist: SetlistFmArtist[]; total: number; page: number; itemsPerPage: number }> {
    const params = new URLSearchParams({
      artistName,
      p: page.toString(),
    });

    return this.makeRequest(
      `/search/artists?${params}`,
      {},
      `setlistfm:search:artists:${artistName}:${page}`,
      3600
    );
  }

  async searchVenues(options: {
    name?: string;
    cityName?: string;
    stateCode?: string;
    countryCode?: string;
    p?: number;
  }): Promise<{ venue: SetlistFmVenue[]; total: number; page: number; itemsPerPage: number }> {
    const params = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return this.makeRequest(
      `/search/venues?${params}`,
      {},
      `setlistfm:search:venues:${params.toString()}`,
      3600
    );
  }
} 