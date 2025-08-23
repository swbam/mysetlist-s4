import { SetlistSyncService, SyncScheduler } from "@repo/external-apis";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import {
  createErrorResponse,
  createSuccessResponse,
  requireCronAuth,
} from "~/lib/api/auth-helpers";
import { createClient } from "~/lib/supabase/server";

// Force dynamic rendering for API route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Standardized authentication
    await requireCronAuth();

    const body = await request.json().catch(() => ({}));
    const { mode = "daily", orchestrate = true } = body;

    const supabase = await createClient();
    const setlistSync = new SetlistSyncService();
    const scheduler = new SyncScheduler();

    // If orchestrate is true, run the full sync pipeline first
    let orchestrationResult: any = null;
    if (orchestrate && mode === "daily") {
      try {
        console.log("Starting orchestrated sync pipeline...");
        orchestrationResult = await scheduler.runDailySync();
        console.log("Orchestrated sync completed:", orchestrationResult);

        // Wait a bit for data to propagate
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(
          "Orchestration failed, proceeding with setlist creation only:",
          error,
        );
        orchestrationResult = {
          error: error instanceof Error ? error.message : "Unknown error",
          status: "failed",
        };
      }
    }

    // Get shows that need setlist initialization
    const { data: showsWithoutSetlists, error: showsError } = await supabase
      .from("shows")
      .select(`
        id,
        name,
        artist_name,
        venue_name,
        date,
        artists (
          id,
          name,
          spotify_id
        )
      `)
      .is("setlist_id", null)
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true })
      .limit(mode === "daily" ? 50 : 100);

    if (showsError) {
      throw new Error(`Failed to fetch shows: ${showsError.message}`);
    }

    let processed = 0;
    let created = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    if (showsWithoutSetlists && showsWithoutSetlists.length > 0) {
      console.log(
        `Processing ${showsWithoutSetlists.length} shows for setlist initialization`,
      );

      for (const show of showsWithoutSetlists) {
        try {
          processed++;

          // Check if show already has setlist (race condition protection)
          const { data: existingSetlist } = await supabase
            .from("setlists")
            .select("id")
            .eq("show_id", show.id)
            .single();

          if (existingSetlist) {
            console.log(`Show ${show.id} already has setlist, skipping`);
            continue;
          }

          // Create initial empty setlist for the show
          const { data: newSetlist, error: setlistError } = await supabase
            .from("setlists")
            .insert({
              show_id: show.id,
              artist_name: show.artist_name,
              venue_name: show.venue_name,
              date: show.date,
              songs: [],
              total_votes: 0,
              is_finalized: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (setlistError) {
            console.error(
              `Failed to create setlist for show ${show.id}:`,
              setlistError,
            );
            errors++;
            errorDetails.push(`Show ${show.id}: ${setlistError.message}`);
            continue;
          }

          // Update show with setlist_id
          const { error: updateError } = await supabase
            .from("shows")
            .update({
              setlist_id: newSetlist.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", show.id);

          if (updateError) {
            console.error(
              `Failed to update show ${show.id} with setlist_id:`,
              updateError,
            );
            // Don't count as error since setlist was created
          }

          created++;
          console.log(
            `Created setlist ${newSetlist.id} for show ${show.id} (${show.artist_name})`,
          );

          // Add delay to prevent overwhelming the database
          if (processed % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Error processing show ${show.id}:`, error);
          errors++;
          errorDetails.push(
            `Show ${show.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      }
    }

    const result = {
      processed,
      created,
      errors,
      mode,
      orchestrate,
      orchestrationResult,
      timestamp: new Date().toISOString(),
      ...(errorDetails.length > 0 && {
        errorDetails: errorDetails.slice(0, 10),
      }), // Limit error details
    };

    // Log to Supabase cron_job_logs table
    await supabase.from("cron_job_logs").insert({
      job_name: "finish-mysetlist-sync",
      status: errors === 0 ? "completed" : "completed_with_errors",
      message: `${orchestrate ? "Orchestrated sync + " : ""}Processed ${processed} shows, created ${created} setlists, ${errors} errors`,
      details: result,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Finish TheSet sync failed:", error);

    // Log error to Supabase
    try {
      const supabase = await createClient();
      await supabase.from("cron_job_logs").insert({
        job_name: "finish-mysetlist-sync",
        status: "failed",
        message: error instanceof Error ? error.message : "Unknown error",
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return NextResponse.json(
      {
        success: false,
        error: "Finish TheSet sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check for authorization
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    const cronSecret = process.env['CRON_SECRET'];

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "daily";

    // Forward to POST method
    const response = await POST(request);
    return response;
  } catch (error) {
    console.error("Finish TheSet sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Finish TheSet sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
