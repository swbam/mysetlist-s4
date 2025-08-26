"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotifyClient = void 0;
const base_1 = require("./base");
class SpotifyClient extends base_1.BaseAPIClient {
    accessToken;
    constructor(config) {
        super({
            ...config,
            baseURL: "https://api.spotify.com/v1",
            rateLimit: { requests: 100, window: 60 }, // 100 requests per minute
            cache: { defaultTTL: 3600 }, // 1 hour default cache
        });
    }
    async authenticate() {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${process.env["SPOTIFY_CLIENT_ID"]}:${process.env["SPOTIFY_CLIENT_SECRET"]}`).toString("base64")}`,
            },
            body: "grant_type=client_credentials",
        });
        if (!response.ok) {
            throw new Error("Spotify authentication failed");
        }
        const data = (await response.json());
        this.accessToken = data.access_token;
    }
    getAuthHeaders() {
        if (!this.accessToken) {
            throw new Error("Spotify client not authenticated");
        }
        return {
            Authorization: `Bearer ${this.accessToken}`,
        };
    }
    async searchArtists(query, limit = 20) {
        // Ensure authentication
        if (!this.accessToken) {
            await this.authenticate();
        }
        // Use direct fetch to bypass BaseAPIClient issues
        const params = new URLSearchParams({
            q: query,
            type: "artist",
            limit: limit.toString(),
        });
        const url = `https://api.spotify.com/v1/search?${params}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`Spotify search failed: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    async getArtist(artistId) {
        return this.makeRequest(`/artists/${artistId}`, {}, `spotify:artist:${artistId}`, 3600);
    }
    async getArtistTopTracks(artistId, market = "US") {
        return this.makeRequest(`/artists/${artistId}/top-tracks?market=${market}`, {}, `spotify:artist:${artistId}:top-tracks:${market}`, 1800);
    }
    async getTracksDetails(trackIds) {
        const ids = trackIds.join(",");
        return this.makeRequest(`/tracks?ids=${ids}`, {}, `spotify:tracks:${ids}`, 3600);
    }
    async getArtistAlbums(artistId, options = {}) {
        const params = new URLSearchParams({
            include_groups: options.include_groups || "album,single",
            market: options.market || "US",
            limit: (options.limit || 20).toString(),
            offset: (options.offset || 0).toString(),
        });
        return this.makeRequest(`/artists/${artistId}/albums?${params}`, {}, `spotify:artist:${artistId}:albums:${params.toString()}`, 1800);
    }
    async getAlbumTracks(albumId, options = {}) {
        const params = new URLSearchParams({
            market: options.market || 'US',
            limit: String(options.limit || 50),
            offset: String(options.offset || 0),
        });
        const res = await this.makeRequest(`/albums/${albumId}/tracks?${params}`, {}, `spotify:album:${albumId}:tracks:${params.toString()}`, 1800);
        return res.items || [];
    }
    async getRecommendations(options) {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                params.append(key, value.join(","));
            }
            else if (value !== undefined) {
                params.append(key, value.toString());
            }
        });
        return this.makeRequest(`/recommendations?${params}`, {}, `spotify:recommendations:${params.toString()}`, 900);
    }
    async getAudioFeatures(trackIds) {
        const ids = trackIds.join(",");
        return this.makeRequest(`/audio-features?ids=${ids}`, {}, `spotify:audio-features:${ids}`, 3600);
    }
}
exports.SpotifyClient = SpotifyClient;
