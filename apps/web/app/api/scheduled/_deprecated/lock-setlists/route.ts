import type { NextRequest } from "next/server";
import { createServiceClient } from "~/lib/api/supabase/server";

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env["CRON_SECRET"]}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabase = createServiceClient();
    const now = new Date();

    // Find shows that have started but haven't been locked yet
    const { data: showsToUpdate, error: showsError } = await supabase
      .from("shows")
      .select(
        `
        id,
        date,
        start_time,
        setlists!inner(
          id,
          type,
          is_locked
        )
      `,
      )
      .eq("status", "ongoing")
      .eq("setlists.is_locked", false)
      .eq("setlists.type", "predicted"); // Only lock predicted setlists

    if (showsError) {
      return Response.json({ error: "Failed to fetch shows" }, { status: 500 });
    }

    const lockedSetlists: any[] = [];

    for (const show of showsToUpdate || []) {
      // Lock all predicted setlists for this show
      const { data: updatedSetlists, error: lockError } = await supabase
        .from("setlists")
        .update({
          is_locked: true,
          locked_at: now.toISOString(),
        })
        .eq("show_id", show.id)
        .eq("type", "predicted")
        .eq("is_locked", false)
        .select("id, name");

      if (lockError) {
        continue;
      }

      lockedSetlists.push(...(updatedSetlists || []));
    }

    // Also lock setlists for shows that should have started based on start_time
    const { data: timeBasedShows, error: timeError } = await supabase
      .from("shows")
      .select(
        `
        id,
        date,
        start_time,
        setlists!inner(
          id,
          type,
          is_locked
        )
      `,
      )
      .eq("status", "upcoming")
      .eq("setlists.is_locked", false)
      .eq("setlists.type", "predicted")
      .not("start_time", "is", null);

    if (!timeError && timeBasedShows) {
      for (const show of timeBasedShows) {
        // Parse show date and start time
        const showDate = new Date(show.date);
        const [hours, minutes] = show.start_time.split(":").map(Number);
        const showStartTime = new Date(showDate);
        showStartTime.setHours(hours, minutes, 0, 0);

        // If show should have started (with 15 minute buffer), lock it
        const bufferTime = 15 * 60 * 1000; // 15 minutes in ms
        if (now.getTime() > showStartTime.getTime() + bufferTime) {
          const { data: lockedByTime, error: lockTimeError } = await supabase
            .from("setlists")
            .update({
              is_locked: true,
              locked_at: now.toISOString(),
            })
            .eq("show_id", show.id)
            .eq("type", "predicted")
            .eq("is_locked", false)
            .select("id, name");

          if (!lockTimeError && lockedByTime) {
            lockedSetlists.push(...lockedByTime);
          }
        }
      }
    }

    return Response.json({
      success: true,
      lockedCount: lockedSetlists.length,
      lockedSetlists: lockedSetlists.map((s) => ({ id: s.id, name: s.name })),
    });
  } catch (_error) {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
