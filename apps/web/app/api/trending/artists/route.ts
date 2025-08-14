import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";
import { rateLimitMiddleware } from "~/middleware/rate-limit";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

async function getTrendingArtistsFromDB(limit: number) {
	const supabase = createServiceClient();

	const { data: artists, error } = await supabase
		.from("artists")
		.select(
			`
			id,
			name,
			slug,
			image_url,
			popularity,
			followers,
			follower_count,
			trending_score,
			genres,
			total_shows,
			upcoming_shows,
			previous_followers,
			previous_popularity,
			created_at,
			updated_at
		`
		)
		.gt("trending_score", 0)
		.order("trending_score", { ascending: false })
		.limit(limit);

	if (error || !artists) {
		return [];
	}

	return artists.map((artist: any) => {
		let genres: string[] = [];
		try {
			genres = typeof artist.genres === "string" ? JSON.parse(artist.genres) : artist.genres || [];
		} catch {
			genres = [];
		}

		const currentFollowers = artist.followers ?? artist.follower_count ?? 0;
		const previousFollowers = artist.previous_followers ?? currentFollowers;
		const weeklyGrowth = previousFollowers > 0
			? ((currentFollowers - previousFollowers) / previousFollowers) * 100
			: 0;

		return {
			id: artist.id,
			name: artist.name,
			slug: artist.slug,
			image_url: artist.image_url,
			popularity: artist.popularity ?? 0,
			followers: artist.followers ?? 0,
			follower_count: artist.follower_count ?? 0,
			trending_score: artist.trending_score ?? 0,
			genres,
			recent_shows: artist.upcoming_shows ?? 0,
			weekly_growth: Number(weeklyGrowth.toFixed(1)),
		};
	});
}

export async function GET(request: NextRequest) {
	// Apply rate limiting
	const rateLimitResult = await rateLimitMiddleware(request);
	if (rateLimitResult) {
		return rateLimitResult;
	}

	try {
		const searchParams = request.nextUrl.searchParams;
		const limit = Number.parseInt(searchParams.get("limit") || "20");

		const artists = await getTrendingArtistsFromDB(limit);

		const jsonResponse = NextResponse.json({
			artists,
			timestamp: new Date().toISOString(),
		});

		// Add cache headers
		jsonResponse.headers.set(
			"Cache-Control",
			"public, s-maxage=300, stale-while-revalidate=600",
		);

		return jsonResponse;
	} catch (error) {
		return NextResponse.json(
			{ error: "Failed to fetch trending artists" },
			{ status: 500 },
		);
	}
}
