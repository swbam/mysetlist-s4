import { getTrendingShows } from "@/lib/trending";
import TrendingShowsCarousel from "./trending-shows-carousel";

export async function TrendingShowsSlider() {
	const shows = (await getTrendingShows()).slice(0, 12);
	if (shows.length === 0) return null;
	return <TrendingShowsCarousel shows={shows} />;
}
