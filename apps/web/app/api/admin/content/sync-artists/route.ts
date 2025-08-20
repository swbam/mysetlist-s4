import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all artists that need syncing (haven't been synced recently)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: artists, error } = await supabase
      .from("artists")
      .select("id, name, spotify_id")
      .or(`last_synced_at.is.null,last_synced_at.lt.${oneDayAgo}`)
      .limit(50);

    if (error) {
      throw error;
    }

    let syncedCount = 0;

    // TODO: Implement actual Spotify sync logic here
    // For now, just update the last_synced_at timestamp
    for (const artist of artists || []) {
      const { error: updateError } = await supabase
        .from("artists")
        .update({
          last_synced_at: new Date().toISOString(),
          // Add any synced fields here when implementing real sync
        })
        .eq("id", artist.id);

      if (!updateError) {
        syncedCount++;
      }
    }

    // Log the sync action
    await supabase.from("moderation_logs").insert({
      moderator_id: user.id,
      action: "sync_artists",
      target_type: "system",
      target_id: "bulk_sync",
      reason: "Bulk artist sync initiated from admin panel",
      metadata: {
        artists_synced: syncedCount,
        sync_timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Artists sync completed",
      count: syncedCount,
    });
  } catch (error) {
    console.error("Error syncing artists:", error);
    return NextResponse.json(
      { error: "Failed to sync artists" },
      { status: 500 },
    );
  }
}
