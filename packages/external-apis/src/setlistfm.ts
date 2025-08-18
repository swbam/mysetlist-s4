import "server-only";
import axios from "axios";
import { keys } from "../keys";

const env = keys();

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

interface SetlistFmSearchResponse<T> {
  type: string;
  itemsPerPage: number;
  page: number;
  total: number;
  setlist?: T[];
  artist?: T[];
  venue?: T[];
}

class SetlistFmAPI {
  private baseURL = "https://api.setlist.fm/rest/1.0";

  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await axios.get(url, {
      headers: {
        "x-api-key": env.SETLISTFM_API_KEY,
        Accept: "application/json",
      },
      params,
    });

    return response.data;
  }

  async searchSetlists(params: {
    artistMbid?: string;
    artistName?: string;
    venueName?: string;
    venueId?: string;
    date?: string;
    year?: string;
    cityName?: string;
    countryCode?: string;
    stateCode?: string;
    p?: number;
  }): Promise<SetlistFmSearchResponse<SetlistFmSetlist>> {
    return this.makeRequest<SetlistFmSearchResponse<SetlistFmSetlist>>(
      "/search/setlists",
      params,
    );
  }

  async getSetlist(setlistId: string): Promise<SetlistFmSetlist> {
    return this.makeRequest<SetlistFmSetlist>(`/setlist/${setlistId}`);
  }

  async searchArtists(params: {
    artistName: string;
    p?: number;
    sort?: "sortName" | "relevance";
  }): Promise<SetlistFmSearchResponse<SetlistFmArtist>> {
    return this.makeRequest<SetlistFmSearchResponse<SetlistFmArtist>>(
      "/search/artists",
      params,
    );
  }

  async getArtist(mbid: string): Promise<SetlistFmArtist> {
    return this.makeRequest<SetlistFmArtist>(`/artist/${mbid}`);
  }

  async getArtistSetlists(
    mbid: string,
    params: {
      p?: number;
    } = {},
  ): Promise<SetlistFmSearchResponse<SetlistFmSetlist>> {
    return this.makeRequest<SetlistFmSearchResponse<SetlistFmSetlist>>(
      `/artist/${mbid}/setlists`,
      params,
    );
  }

  async searchVenues(params: {
    name?: string;
    cityName?: string;
    cityId?: string;
    stateCode?: string;
    countryCode?: string;
    p?: number;
  }): Promise<SetlistFmSearchResponse<SetlistFmVenue>> {
    return this.makeRequest<SetlistFmSearchResponse<SetlistFmVenue>>(
      "/search/venues",
      params,
    );
  }

  async getVenue(venueId: string): Promise<SetlistFmVenue> {
    return this.makeRequest<SetlistFmVenue>(`/venue/${venueId}`);
  }

  async getVenueSetlists(
    venueId: string,
    params: {
      p?: number;
    } = {},
  ): Promise<SetlistFmSearchResponse<SetlistFmSetlist>> {
    return this.makeRequest<SetlistFmSearchResponse<SetlistFmSetlist>>(
      `/venue/${venueId}/setlists`,
      params,
    );
  }

  async getRecentSetlists(
    artistName: string,
    limit = 10,
  ): Promise<SetlistFmSetlist[]> {
    const response = await this.searchSetlists({
      artistName,
      p: 1,
    });

    return response.setlist?.slice(0, limit) || [];
  }

  // Helper method to format setlist data for our database
  formatSetlistForDb(setlist: SetlistFmSetlist): {
    songs: string[];
    setNames: string[];
    totalSongs: number;
  } {
    const songs: string[] = [];
    const setNames: string[] = [];
    let totalSongs = 0;

    if (setlist.sets?.set) {
      setlist.sets.set.forEach((set) => {
        if (set.name) {
          setNames.push(set.name);
        } else if (set.encore) {
          setNames.push(`Encore ${set.encore}`);
        } else {
          setNames.push("Main Set");
        }

        if (set.song) {
          set.song.forEach((song) => {
            songs.push(song.name);
            totalSongs++;
          });
        }
      });
    }

    return {
      songs,
      setNames,
      totalSongs,
    };
  }
}

export const setlistfm = new SetlistFmAPI();
export type {
  SetlistFmSetlist,
  SetlistFmArtist,
  SetlistFmVenue,
  SetlistFmSong,
};
