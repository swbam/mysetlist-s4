export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: {
    total: number;
  };
  images: { url: string }[];
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
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

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: 'album' | 'single' | 'compilation';
  album_group: 'album' | 'single' | 'compilation' | 'appears_on';
  artists: Array<{
    id: string;
    name: string;
    external_urls: {
      spotify: string;
    };
  }>;
  images: Array<{
    url: string;
    height?: number;
    width?: number;
  }>;
  release_date: string;
  release_date_precision: 'year' | 'month' | 'day';
  total_tracks: number;
  external_urls: {
    spotify: string;
  };
  uri: string;
  available_markets?: string[];
}

export interface SpotifySearchResult {
  artists: {
    items: SpotifyArtist[];
  };
}
