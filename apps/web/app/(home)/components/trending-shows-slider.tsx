import { TrendingShowsResponse } from "@/types/api";
import TrendingShowsCarousel from "./trending-shows-carousel";

export async function TrendingShowsSlider() {
	const res = await fetch(
		`${
			process.env.NEXT_PUBLIC_APP_URL ?? ""
		}/api/trending/shows?timeframe=week&limit=12`,
		{ next: { revalidate: 60 } },
	);

	if (!res.ok) return null;

	const { shows } = (await res.json()) as TrendingShowsResponse;
	if (!shows || shows.length === 0) return null;

	return <TrendingShowsCarousel shows={shows} />;
}
