// Common type definitions to fix TypeScript issues across the codebase

// Database types
export interface DatabaseUser {
  id: string;
  email: string;
  name?: string | null;
  role?: "admin" | "moderator" | "user" | null;
  _creationTime?: string;
  updated_at?: string;
}

export interface DatabaseArtist {
  id: string;
  name: string;
  slug: string;
  spotify_id?: string | null;
  setlistfm_mbid?: string | null;
  imageUrl?: string | null;
  small_imageUrl?: string | null;
  genres?: string | null;
  popularity?: number | null;
  followers?: number | null;
  external_urls?: string | null;
  verified?: boolean;
  _creationTime?: string;
  updated_at?: string;
}

export interface DatabaseVenue {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  capacity?: number | null;
  website?: string | null;
  tm_venueId?: string | null;
  _creationTime?: string;
  updated_at?: string;
}

export interface DatabaseShow {
  id: string;
  title: string;
  date: string;
  time?: string | null;
  status: "upcoming" | "in_progress" | "completed" | "cancelled";
  artistId?: string | null;
  venueId?: string | null;
  tm_event_id?: string | null;
  ticket_url?: string | null;
  price_range_min?: number | null;
  price_range_max?: number | null;
  _creationTime?: string;
  updated_at?: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Admin types
export interface AdminStats {
  totalUsers: number;
  totalArtists: number;
  totalVenues: number;
  totalShows: number;
  recentActivity: number;
  userGrowth?: {
    value: number;
    isPositive: boolean;
  };
}

// Activity types
export interface ActivityItem {
  id: string;
  type: string;
  userId: string;
  target_type?: string | null;
  target_id?: string | null;
  metadata?: Record<string, unknown> | null;
  _creationTime: string;
  user?: DatabaseUser;
  target?: {
    id: string;
    name?: string;
    title?: string;
    type?: string;
  };
}

// Moderation types
export interface ModerationItem {
  id: string;
  type:
    | "setlist"
    | "review"
    | "photo"
    | "tip"
    | "user"
    | "venue"
    | "show"
    | "artist";
  status: "pending" | "approved" | "rejected";
  _creationTime: string;
  updated_at?: string;
  user?: DatabaseUser;
  content?: unknown;
}

// Report types
export interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: "pending" | "resolved" | "dismissed";
  _creationTime: string;
  updated_at?: string;
  reporter?: DatabaseUser;
  target?: {
    id: string;
    name?: string;
    title?: string;
    type?: string;
  };
}

// Search types
export interface SearchResult<T = unknown> {
  id: string;
  type: string;
  data: T;
  score?: number;
}

// Sync types
export interface SyncOperation {
  id: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  started_at: string;
  completed_at?: string | null;
  error?: string | null;
  results?: Record<string, unknown> | null;
}

// Environment variable helper
export function getEnvVar(key: string): string | undefined {
  return process.env[key];
}

// Type guards
export function isValidUser(user: unknown): user is DatabaseUser {
  return (
    typeof user === "object" &&
    user !== null &&
    "id" in user &&
    typeof (user as DatabaseUser).id === "string"
  );
}

export function isValidArtist(artist: unknown): artist is DatabaseArtist {
  return (
    typeof artist === "object" &&
    artist !== null &&
    "id" in artist &&
    "name" in artist &&
    typeof (artist as DatabaseArtist).id === "string" &&
    typeof (artist as DatabaseArtist).name === "string"
  );
}

// Error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Type-safe async handler
export type AsyncHandler<T = unknown> = (
  ...args: unknown[]
) => Promise<ApiResponse<T>>;

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type NullableOptional<T> = T | null | undefined;

// Stats card props fix
export interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?:
    | {
        value: number;
        isPositive: boolean;
      }
    | undefined;
  href: string;
}
