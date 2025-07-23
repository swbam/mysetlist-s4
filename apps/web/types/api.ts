export interface TrendingArtist {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  followers: number;
  popularity: number;
  trendingScore: number;
  genres: string[];
  recentShows: number;
  weeklyGrowth: number;
  rank: number;
}

export interface TrendingShow {
  id: string;
  name: string;
  slug: string;
  date: string;
  status: string;
  artist: { name: string; slug: string; imageUrl?: string | null };
  venue: { name: string | null; city: string | null; state?: string | null };
  voteCount: number;
  attendeeCount: number;
  trendingScore: number;
  weeklyGrowth: number;
  rank: number;
}

export interface TrendingVenue {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state?: string | null;
  country: string;
  capacity?: number | null;
  upcomingShows: number;
  totalShows: number;
  trendingScore: number;
  weeklyGrowth: number;
  rank: number;
}

export interface TrendingArtistsResponse {
  artists: TrendingArtist[];
  timeframe: string;
  total: number;
  generatedAt: string;
  fallback?: boolean;
  error?: string;
}

export interface TrendingShowsResponse {
  shows: TrendingShow[];
  timeframe: string;
  total: number;
  generatedAt: string;
  fallback?: boolean;
  error?: string;
}

export interface TrendingVenuesResponse {
  venues: TrendingVenue[];
  timeframe: string;
  total: number;
  generatedAt: string;
  fallback?: boolean;
  error?: string;
}

export interface RecentSetlist {
  id: string;
  name: string;
  type: 'predicted' | 'actual';
  totalVotes: number;
  voteCount: number;
  songCount: number;
  accuracyScore: number;
  isLocked: boolean;
  createdAt: string;
  rank: number;
  show: {
    id: string;
    name: string;
    slug: string;
    date: string | null;
    status: string;
  };
  artist: {
    id: string | null;
    name: string;
    slug: string | null;
    imageUrl: string | null;
  };
  venue: {
    name: string | null;
    city: string | null;
    state: string | null;
  };
  creator: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
}

export interface RecentSetlistsResponse {
  setlists: RecentSetlist[];
  timeframe: string;
  total: number;
  generatedAt: string;
  fallback?: boolean;
  error?: string;
}
