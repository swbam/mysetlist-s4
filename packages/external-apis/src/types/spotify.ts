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

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
  release_date: string;
  total_tracks: number;
  album_type: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string }[];
    release_date: string;
  };
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  explicit: boolean;
  is_playable: boolean;
  track_number?: number;
  disc_number?: number;
  external_ids?: {
    isrc?: string;
  };
  external_urls?: {
    spotify: string;
  };
}

export interface SpotifySearchResult {
  artists: {
    items: SpotifyArtist[];
  };
}
