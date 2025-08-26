export declare class ArtistSyncService {
    private spotifyClient;
    private ticketmasterClient;
    private errorHandler;
    constructor();
    syncIdentifiers(params: {
        artistDbId?: string;
        artistName?: string;
        ticketmasterAttractionId?: string;
    }): Promise<{
        spotifyId?: string;
        tmAttractionId: string;
        mbid?: string;
    }>;
    syncArtist(artistId: string): Promise<void>;
    syncFullDiscography(artistSpotifyId: string): Promise<{
        totalSongs: number;
        totalAlbums: number;
        processedAlbums: number;
    }>;
    private syncArtistTracks;
    syncPopularArtists(limit?: number): Promise<number>;
    /**
     * Fetches full Spotify catalog excluding "live" tracks with deduplication
     */
    syncCatalog(artistId: string): Promise<{
        totalSongs: number;
        totalAlbums: number;
        processedAlbums: number;
    }>;
    private generateSlug;
    private isArtistNameMatch;
}
//# sourceMappingURL=artist-sync.d.ts.map