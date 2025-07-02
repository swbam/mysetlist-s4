import { getTrendingArtists } from "@/lib/trending";
import TopArtistsCarousel from "./top-artists-carousel";

export async function TopArtistsSlider() {
	// Fetch trending artists (default config), then take the top 12
	const artists = (await getTrendingArtists()).slice(0, 12);

	if (artists.length === 0) {
		return null;
	}

	return <TopArtistsCarousel artists={artists} />;
}
