"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetlistFmClient = void 0;
const base_1 = require("./base");
class SetlistFmClient extends base_1.BaseAPIClient {
    constructor(config) {
        super({
            ...config,
            baseURL: "https://api.setlist.fm/rest/1.0",
            rateLimit: { requests: 60, window: 60 }, // 1 request per second
            cache: { defaultTTL: 3600 }, // 1 hour cache
        });
    }
    getAuthHeaders() {
        return {
            "x-api-key": this.apiKey,
            Accept: "application/json",
        };
    }
    async searchSetlists(options) {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                params.append(key, value.toString());
            }
        });
        return this.makeRequest(`/search/setlists?${params}`, {}, `setlistfm:search:${params.toString()}`, 1800);
    }
    async getSetlist(setlistId) {
        return this.makeRequest(`/setlist/${setlistId}`, {}, `setlistfm:setlist:${setlistId}`, 3600);
    }
    async getArtistSetlists(artistMbid, page = 1) {
        return this.makeRequest(`/artist/${artistMbid}/setlists?p=${page}`, {}, `setlistfm:artist:${artistMbid}:setlists:${page}`, 1800);
    }
    async getVenueSetlists(venueId, page = 1) {
        return this.makeRequest(`/venue/${venueId}/setlists?p=${page}`, {}, `setlistfm:venue:${venueId}:setlists:${page}`, 1800);
    }
}
exports.SetlistFmClient = SetlistFmClient;
