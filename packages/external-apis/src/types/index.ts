// Base types used across all external APIs
export interface BaseEntity {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Artist-related types
export interface Artist extends BaseEntity {
  slug: string;
  spotifyId?: string;
  setlistfmMbid?: string;
  ticketmasterName?: string;
  imageUrl?: string;
  popularity?: number;
  genres?: string[];
  followers?: number;
  verified?: boolean;
  description?: string;
  socialLinks?: {
    spotify?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
    website?: string;
  };
}

// Song-related types
export interface Song extends BaseEntity {
  artistId: string;
  spotifyId?: string;
  duration?: number; // in milliseconds
  popularity?: number;
  explicit?: boolean;
  previewUrl?: string;
  albumName?: string;
  albumId?: string;
  trackNumber?: number;
  audioFeatures?: AudioFeatures;
}

export interface AudioFeatures {
  acousticness?: number;
  danceability?: number;
  energy?: number;
  instrumentalness?: number;
  liveness?: number;
  loudness?: number;
  speechiness?: number;
  tempo?: number;
  valence?: number;
  timeSignature?: number;
}

// Venue-related types
export interface Venue extends BaseEntity {
  slug: string;
  tmVenueId?: string;
  setlistfmId?: string;
  address?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  timezone?: string;
  capacity?: number;
  type?: string;
  imageUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

// Show-related types
export interface Show extends BaseEntity {
  artistId: string;
  venueId: string;
  tmEventId?: string;
  date: Date;
  doors?: Date;
  time?: string;
  status: ShowStatus;
  tour?: string;
  ticketUrl?: string;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  ageRestrictions?: string;
  salesInfo?: {
    onSaleStart?: Date;
    onSaleEnd?: Date;
    presaleStart?: Date;
    presaleEnd?: Date;
  };
}

export enum ShowStatus {
  ANNOUNCED = "announced",
  ON_SALE = "on_sale",
  SOLD_OUT = "sold_out",
  CANCELLED = "cancelled",
  POSTPONED = "postponed",
  COMPLETED = "completed",
}

// Setlist-related types
export interface Setlist extends BaseEntity {
  showId: string;
  setlistfmId?: string;
  songs: SetlistSong[];
  encore?: SetlistSong[];
  notes?: string;
  tour?: string;
  lastUpdated: Date;
}

export interface SetlistSong {
  songId: string;
  songName: string;
  position: number;
  isEncore?: boolean;
  tape?: boolean; // indicates if song was played from tape/backing track
  info?: string; // additional info about the performance
}

// External API response types
export namespace Spotify {
  export interface Artist {
    id: string;
    name: string;
    popularity: number;
    followers: {
      total: number;
    };
    genres: string[];
    images: Array<{
      url: string;
      height: number;
      width: number;
    }>;
    external_urls: {
      spotify: string;
    };
  }

  export interface Track {
    id: string;
    name: string;
    duration_ms: number;
    popularity: number;
    explicit: boolean;
    preview_url?: string;
    track_number: number;
    album: {
      id: string;
      name: string;
      images: Array<{
        url: string;
        height: number;
        width: number;
      }>;
    };
    artists: Array<{
      id: string;
      name: string;
    }>;
  }

  export interface AudioFeatures {
    id: string;
    acousticness: number;
    danceability: number;
    energy: number;
    instrumentalness: number;
    liveness: number;
    loudness: number;
    speechiness: number;
    tempo: number;
    valence: number;
    time_signature: number;
  }

  export interface SearchResponse<T> {
    artists?: {
      items: T[];
      total: number;
      limit: number;
      offset: number;
    };
    tracks?: {
      items: T[];
      total: number;
      limit: number;
      offset: number;
    };
  }

  export interface TopTracksResponse {
    tracks: Track[];
  }
}

export namespace Ticketmaster {
  export interface Event {
    id: string;
    name: string;
    type: string;
    url?: string;
    dates: {
      start: {
        localDate: string;
        localTime?: string;
        dateTime?: string;
      };
      status: {
        code: string;
      };
      timezone?: string;
    };
    sales?: {
      public?: {
        startDateTime?: string;
        endDateTime?: string;
      };
      presales?: Array<{
        startDateTime?: string;
        endDateTime?: string;
        name?: string;
      }>;
    };
    priceRanges?: Array<{
      type: string;
      currency: string;
      min: number;
      max: number;
    }>;
    ageRestrictions?: {
      legalAgeEnforced?: boolean;
    };
    _embedded?: {
      venues?: Venue[];
      attractions?: Array<{
        id: string;
        name: string;
        type: string;
        url?: string;
        images?: Array<{
          url: string;
          width: number;
          height: number;
        }>;
      }>;
    };
  }

  export interface Venue {
    id: string;
    name: string;
    type?: string;
    url?: string;
    address?: {
      line1?: string;
      line2?: string;
    };
    city?: {
      name: string;
    };
    state?: {
      name: string;
      stateCode: string;
    };
    country?: {
      name: string;
      countryCode: string;
    };
    postalCode?: string;
    timezone?: string;
    location?: {
      latitude: string;
      longitude: string;
    };
    capacity?: number;
    images?: Array<{
      url: string;
      width: number;
      height: number;
    }>;
  }

  export interface SearchResponse<T> {
    _embedded?: {
      events?: T[];
      venues?: T[];
    };
    page: {
      size: number;
      totalElements: number;
      totalPages: number;
      number: number;
    };
  }
}

export namespace SetlistFM {
  export interface Artist {
    mbid: string;
    tmid?: number;
    name: string;
    sortName: string;
    disambiguation?: string;
    url: string;
  }

  export interface Venue {
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

  export interface Song {
    name: string;
    with?: Artist;
    cover?: Artist;
    info?: string;
    tape?: boolean;
  }

  export interface Set {
    name?: string;
    encore?: boolean;
    song: Song[];
  }

  export interface Setlist {
    id: string;
    versionId: string;
    eventDate: string;
    lastUpdated: string;
    artist: Artist;
    venue: Venue;
    tour?: {
      name: string;
    };
    sets: {
      set: Set[];
    };
    info?: string;
    url: string;
  }

  export interface SearchResponse<T> {
    setlist?: T[];
    artist?: T[];
    venue?: T[];
    type: string;
    itemsPerPage: number;
    page: number;
    total: number;
  }
}

// Import/sync related types
export interface ImportJob {
  id: string;
  type: ImportJobType;
  status: ImportJobStatus;
  entityId: string;
  entityType: EntityType;
  progress: ImportProgress;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export enum ImportJobType {
  ARTIST_BASIC = "artist_basic",
  ARTIST_SONGS = "artist_songs",
  ARTIST_SHOWS = "artist_shows",
  VENUE_SYNC = "venue_sync",
  SETLIST_SYNC = "setlist_sync",
  FULL_SYNC = "full_sync",
}

export enum ImportJobStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum EntityType {
  ARTIST = "artist",
  VENUE = "venue",
  SHOW = "show",
  SONG = "song",
  SETLIST = "setlist",
}

export interface ImportProgress {
  phase: ImportPhase;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  percentage: number;
  estimatedTimeRemaining?: number; // in milliseconds
  details?: Record<string, any>;
}

export enum ImportPhase {
  INITIALIZING = "initializing",
  FETCHING_BASIC_DATA = "fetching_basic_data",
  FETCHING_SONGS = "fetching_songs",
  FETCHING_SHOWS = "fetching_shows",
  FETCHING_VENUES = "fetching_venues",
  PROCESSING_DATA = "processing_data",
  SAVING_TO_DATABASE = "saving_to_database",
  FINALIZING = "finalizing",
  COMPLETED = "completed",
}

// Cache-related types
export interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  memoryUsage?: number;
}

// Rate limiting types
export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  limit: number;
}

// Sync service configuration types
export interface SyncConfig {
  batchSize: number;
  concurrency: number;
  retryDelay: number;
  maxRetries: number;
  timeout: number;
}

// API client configuration aggregated
export interface ExternalAPIConfig {
  spotify?: {
    clientId: string;
    clientSecret: string;
    rateLimit?: {
      requests: number;
      window: number;
    };
  };
  ticketmaster?: {
    apiKey: string;
    rateLimit?: {
      requests: number;
      window: number;
    };
  };
  setlistfm?: {
    apiKey: string;
    rateLimit?: {
      requests: number;
      window: number;
    };
  };
  cache?: {
    defaultTTL: number;
    redisUrl?: string;
    redisToken?: string;
  };
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;
