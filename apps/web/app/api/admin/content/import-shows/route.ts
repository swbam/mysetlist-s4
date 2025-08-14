import { createClient } from "~/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
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

    // TODO: Implement actual Ticketmaster API integration here
    // For now, simulate importing shows
    let importedCount = 0;
    
    // Mock data - in real implementation, this would come from Ticketmaster API
    const mockShows = [
      {
        name: "Sample Concert",
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        status: "upcoming",
        ticketmaster_id: "mock_show_" + Date.now(),
      }
    ];

    for (const showData of mockShows) {
      try {
        const { error } = await supabase
          .from("shows")
          .insert({
            ...showData,
            created_at: new Date().toISOString(),
          });

        if (!error) {
          importedCount++;
        }
      } catch (insertError) {
        console.error("Error inserting show:", insertError);
      }
    }

    // Log the import action
    await supabase.from("moderation_logs").insert({
      moderator_id: user.id,
      action: "import_shows",
      target_type: "system",
      target_id: "bulk_import",
      reason: "Bulk show import initiated from admin panel",
      metadata: {
        shows_imported: importedCount,
        import_timestamp: new Date().toISOString()
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Shows import completed",
      count: importedCount
    });
  } catch (error) {
    console.error("Error importing shows:", error);
    return NextResponse.json(
      { error: "Failed to import shows" },
      { status: 500 }
    );
  }
}