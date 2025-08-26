import { BaseAPIClient, APIClientConfig } from "./base";
import type { SpotifyArtist, SpotifyTrack, SpotifySearchResult } from "../types/spotify";
export declare class SpotifyClient extends BaseAPIClient {
    accessToken?: string;
    constructor(config: Omit<APIClientConfig, "baseURL">);
    authenticate(): Promise<void>;
    protected getAuthHeaders(): Record<string, string>;
    searchArtists(query: string, limit?: number): Promise<SpotifySearchResult>;
    getArtist(artistId: string): Promise<SpotifyArtist>;
    getArtistTopTracks(artistId: string, market?: string): Promise<{
        tracks: SpotifyTrack[];
    }>;
    getTracksDetails(trackIds: string[]): Promise<{
        tracks: SpotifyTrack[];
    }>;
    getArtistAlbums(artistId: string, options?: {
        include_groups?: string;
        market?: string;
        limit?: number;
        offset?: number;
    }): Promise<any>;
    getAlbumTracks(albumId: string, options?: {
        market?: string;
        limit?: number;
        offset?: number;
    }): Promise<any[]>;
    getRecommendations(options: {
        seed_artists?: string[];
        seed_genres?: string[];
        limit?: number;
        market?: string;
        [key: string]: any;
    }): Promise<{
        tracks: SpotifyTrack[];
    }>;
    getAudioFeatures(trackIds: string[]): Promise<{
        audio_features: any[];
    }>;
}
//# sourceMappingURL=spotify.d.ts.map