import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

interface ActivityItem {
  id: string;
  type: "vote" | "setlist_create";
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  target: {
    id: string;
    name: string;
    slug: string;
    type: "artist" | "show" | "venue" | "setlist";
  };
  createdAt: string;
  metadata?: {
    voteType?: "up" | "down";
    songCount?: number;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Number.parseInt(searchParams.get("limit") || "15");

  try {
    const supabase = await createClient();
    const activities: ActivityItem[] = [];

    // Fetch recent votes with related data
    const { data: recentVotes } = await supabase
      .from("votes")
      .select(
        `
        id,
        user_id,
        vote_type,
        created_at,
        users!votes_user_id_fkey(
          display_name,
          user_profiles!user_profiles_user_id_fkey(
            avatar_url
          )
        ),
        setlist_songs!votes_setlist_song_id_fkey(
          songs!setlist_songs_song_id_fkey(
            id,
            title,
            artist
          ),
          setlists!setlist_songs_setlist_id_fkey(
            id,
            shows!setlists_show_id_fkey(
              id,
              name,
              slug,
              headliner_artist:artists!shows_headliner_artist_id_fkey(
                name
              )
            )
          )
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(Math.ceil(limit / 3));

    if (recentVotes) {
      recentVotes.forEach((vote: any) => {
        const song = vote.setlist_songs?.songs;
        const show = vote.setlist_songs?.setlists?.shows;
        const user = vote.users;

        if (song && show && user) {
          activities.push({
            id: `vote-${vote.id}`,
            type: "vote",
            user: {
              id: vote.user_id,
              displayName: user.display_name || "Anonymous",
              ...(user.user_profiles?.avatar_url && {
                avatarUrl: user.user_profiles.avatar_url,
              }),
            },
            target: {
              id: show.id,
              name: `${song.title} at ${show.headliner_artist?.name || show.name}`,
              slug: show.slug,
              type: "show",
            },
            createdAt: vote.created_at,
            metadata: {
              voteType: vote.vote_type as "up" | "down",
            },
          });
        }
      });
    }

    // Fetch recent setlist creations
    const { data: recentSetlists } = await supabase
      .from("setlists")
      .select(
        `
        id,
        created_by,
        created_at,
        type,
        users!setlists_created_by_fkey(
          display_name,
          user_profiles!user_profiles_user_id_fkey(
            avatar_url
          )
        ),
        shows!setlists_show_id_fkey(
          id,
          name,
          slug,
          headliner_artist:artists!shows_headliner_artist_id_fkey(
            name
          )
        ),
        setlist_songs!setlist_songs_setlist_id_fkey(count)
      `,
      )
      .eq("type", "predicted")
      .order("created_at", { ascending: false })
      .limit(Math.floor(limit / 4));

    if (recentSetlists) {
      recentSetlists.forEach((setlist: any) => {
        const user = setlist.users;
        const show = setlist.shows;
        const songCount = setlist.setlist_songs?.[0]?.count || 0;

        if (setlist.created_by && user && show) {
          activities.push({
            id: `setlist-${setlist.id}`,
            type: "setlist_create",
            user: {
              id: setlist.created_by,
              displayName: user.display_name || "Anonymous",
              ...(user.user_profiles?.avatar_url && {
                avatarUrl: user.user_profiles.avatar_url,
              }),
            },
            target: {
              id: show.id,
              name: show.headliner_artist?.name || show.name,
              slug: show.slug,
              type: "show",
            },
            createdAt: setlist.created_at,
            metadata: {
              songCount: songCount,
            },
          });
        }
      });
    }

    // Sort all activities by createdAt descending
    activities.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Apply limit
    const limitedActivities = activities.slice(0, limit);

    const response = NextResponse.json(
      {
        activities: limitedActivities,
        total: limitedActivities.length,
        hasMore: activities.length > limit,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );

    return response;
  } catch (error) {
    console.error("Failed to fetch recent activity:", error);

    // Return empty state instead of fake data
    return NextResponse.json(
      {
        activities: [],
        total: 0,
        hasMore: false,
        generatedAt: new Date().toISOString(),
        error: "Failed to load recent activity",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  }
}
