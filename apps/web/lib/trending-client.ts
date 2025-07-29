// Client-side version of trending functions

export interface TrendingItem {
  id: string;
  type: "show" | "artist";
  name: string;
  score: number;
  votes: number;
  attendees: number;
  recent_activity: number;
  image_url?: string;
  slug?: string;
  artist_name?: string;
  venue_name?: string;
  show_date?: string;
}

// Client-side function to fetch trending data from API
export async function getWeeklyTrending(limit = 20): Promise<TrendingItem[]> {
  try {
    const response = await fetch('/api/trending/weekly');
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    return data.trending.slice(0, limit);
  } catch (error) {
    console.error("Error fetching trending data:", error);
    return [];
  }
}