import { BaseAPIClient, APIClientConfig } from "./base";
import { SetlistFmSetlist } from "../types/setlistfm";

export class SetlistFmClient extends BaseAPIClient {
  constructor(config: Omit<APIClientConfig, "baseURL">) {
    super({
      ...config,
      baseURL: "https://api.setlist.fm/rest/1.0",
      rateLimit: { requests: 60, window: 60 }, // 1 request per second
      cache: { defaultTTL: 3600 }, // 1 hour cache
    });
  }

  protected getAuthHeaders(): Record<string, string> {
    return {
      "x-api-key": this.apiKey!,
      Accept: "application/json",
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
  }): Promise<{ setlist: SetlistFmSetlist[] }> {
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
      1800,
    );
  }

  async getSetlist(setlistId: string): Promise<SetlistFmSetlist> {
    return this.makeRequest<SetlistFmSetlist>(
      `/setlist/${setlistId}`,
      {},
      `setlistfm:setlist:${setlistId}`,
      3600,
    );
  }

  async getArtistSetlists(
    artistMbid: string,
    page = 1,
  ): Promise<{ setlist: SetlistFmSetlist[] }> {
    return this.makeRequest(
      `/artist/${artistMbid}/setlists?p=${page}`,
      {},
      `setlistfm:artist:${artistMbid}:setlists:${page}`,
      1800,
    );
  }

  async getVenueSetlists(
    venueId: string,
    page = 1,
  ): Promise<{ setlist: SetlistFmSetlist[] }> {
    return this.makeRequest(
      `/venue/${venueId}/setlists?p=${page}`,
      {},
      `setlistfm:venue:${venueId}:setlists:${page}`,
      1800,
    );
  }
}
