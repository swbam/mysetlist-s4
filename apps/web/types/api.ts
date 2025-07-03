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
	state?: string;
	country: string;
	capacity?: number;
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
}

export interface TrendingShowsResponse {
	shows: TrendingShow[];
	timeframe: string;
	total: number;
	generatedAt: string;
}

export interface TrendingVenuesResponse {
	venues: TrendingVenue[];
	timeframe: string;
	total: number;
	generatedAt: string;
}
