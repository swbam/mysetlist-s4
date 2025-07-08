import { absoluteUrl } from '@/lib/absolute-url';
import TopArtistsSlider from './top-artists-slider';

interface TrendingArtist {
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

export default async function TopArtistsWrapper() {
  try {
    const res = await fetch(
      absoluteUrl(`/api/trending/artists?timeframe=week&limit=12`),
      { next: { revalidate: 60 } }
    );

    if (!res.ok) {
      console.warn('Failed to fetch trending artists:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    const { artists } = data as { artists: TrendingArtist[] };
    
    if (!artists || artists.length === 0) {
      console.info('No trending artists found');
      return null;
    }

    return <TopArtistsSlider artists={artists} />;
  } catch (error) {
    console.error('Error fetching trending artists:', error);
    // Return null instead of throwing to prevent homepage crash
    return null;
  }
}
