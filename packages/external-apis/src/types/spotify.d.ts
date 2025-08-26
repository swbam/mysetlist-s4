export interface SpotifyArtist {
    id: string;
    name: string;
    genres: string[];
    popularity: number;
    followers: {
        total: number;
    };
    images: {
        url: string;
    }[];
    external_urls: {
        spotify: string;
    };
}
export interface SpotifyTrack {
    id: string;
    name: string;
    artists: {
        name: string;
    }[];
    album: {
        name: string;
        images: {
            url: string;
        }[];
        release_date: string;
    };
    duration_ms: number;
    popularity: number;
    preview_url: string | null;
    explicit: boolean;
    is_playable: boolean;
    external_ids?: {
        isrc?: string;
    };
}
export interface SpotifySearchResult {
    artists: {
        items: SpotifyArtist[];
    };
}
//# sourceMappingURL=spotify.d.ts.map