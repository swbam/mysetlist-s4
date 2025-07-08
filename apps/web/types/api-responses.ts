// API Response Types
export interface ApiError {
  error: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

// Search Response Types
export interface SearchArtist {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  smallImageUrl: string | null;
  genres: string | null;
  followers: number | null;
  followerCount: number | null;
  popularity: number | null;
  verified: boolean;
  trendingScore: number | null;
}

export interface SearchShow {
  id: string;
  title: string;
  slug: string;
  date: string;
  venue: {
    name: string;
    city: string;
    state: string;
  };
  artist: {
    name: string;
    slug: string;
  };
  price?: {
    min: number;
    max: number;
    currency: string;
  };
}

export interface SearchVenue {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  capacity: number | null;
  imageUrl: string | null;
  showCount?: number;
}

export interface SearchResponse {
  artists: SearchArtist[];
  shows: SearchShow[];
  venues: SearchVenue[];
  totalResults: number;
}

// Sync Response Types
export interface SyncProgress {
  status: 'idle' | 'syncing' | 'completed' | 'error';
  progress: number;
  message: string;
  totalItems?: number;
  processedItems?: number;
}

export interface SyncResponse {
  success: boolean;
  artistId: string;
  progress?: SyncProgress;
  error?: string;
}

// Trending Response Types
export interface TrendingArtist {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  trendingScore: number;
  followerCount: number;
  showCount: number;
  genres: string[];
}

export interface TrendingShow {
  id: string;
  title: string;
  slug: string;
  date: string;
  venueName: string;
  artistName: string;
  trendingScore: number;
  attendeeCount: number;
}

export interface TrendingResponse {
  artists: TrendingArtist[];
  shows: TrendingShow[];
  lastUpdated: string;
}

// Error Response Type
export interface ErrorResponse {
  error: string;
  message?: string;
  statusCode: number;
  timestamp: string;
  path?: string;
}

// Type Guards
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as ApiError).error === 'string'
  );
}

export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    'statusCode' in response &&
    typeof (response as ErrorResponse).error === 'string' &&
    typeof (response as ErrorResponse).statusCode === 'number'
  );
}

// Error handling utility
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.error;
  }
  if (isErrorResponse(error)) {
    return error.message || error.error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
