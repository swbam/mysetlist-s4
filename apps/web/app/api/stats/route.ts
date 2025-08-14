import { NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function GET() {
	const supabase = createServiceClient();

	const [artistsRes, votesRes, usersRes, showsRes] = await Promise.all([
		supabase.from("artists").select("*", { count: "exact", head: true }),
		supabase.from("votes").select("*", { count: "exact", head: true }),
		supabase.from("user_profiles").select("*", { count: "exact", head: true }),
		supabase.from("shows").select("*", { count: "exact", head: true }),
	]);

	const stats = {
		activeArtists: (artistsRes.count || 0).toLocaleString(),
		votesCast: (votesRes.count || 0).toLocaleString(),
		musicFans: (usersRes.count || 0).toLocaleString(),
		activeShows: (showsRes.count || 0).toLocaleString(),
	};

	const response = NextResponse.json({
		stats,
		timestamp: new Date().toISOString(),
	});

	response.headers.set(
		"Cache-Control",
		"public, s-maxage=300, stale-while-revalidate=600",
	);

	return response;
}
