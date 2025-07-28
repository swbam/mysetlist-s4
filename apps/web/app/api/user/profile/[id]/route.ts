import { getUser } from "@repo/auth/server";
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "~/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    const { id } = await params;

    // Only allow users to view their own profile for now
    if (!user || user.id !== id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Fetch user profile data
    const profile = {
      id: user.id,
      email: user.email,
      displayName: user.email?.split("@")[0] || "Music Fan",
      bio: "",
      avatarUrl: "",
      spotifyConnected: false,
      followingCount: 0,
      joinedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    // Fetch following count
    const { count: followingCount } = await supabase
      .from("user_following")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    profile.followingCount = followingCount || 0;

    // Fetch recent activity (simplified for now)
    const recentActivity = [
      {
        id: "1",
        type: "follow" as const,
        artist: "Sample Artist",
        timestamp: new Date().toISOString(),
        description: "Started following Sample Artist",
      },
    ];

    // Fetch followed artists
    const { data: followingData } = await supabase
      .from("user_following")
      .select(
        `
        artist_id,
        artists (
          id,
          name,
          image_url,
          genres
        )
      `,
      )
      .eq("user_id", user.id)
      .limit(10);

    const followedArtists = (followingData || []).map((item: any) => ({
      id: item.artists?.id || item.artist_id,
      name: item.artists?.name || "Unknown Artist",
      imageUrl: item.artists?.image_url || "",
      genres: item.artists?.genres || [],
      upcomingShows: 0, // TODO: Calculate real upcoming shows for this artist
    }));

    return NextResponse.json({
      profile,
      recentActivity,
      followedArtists,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}
