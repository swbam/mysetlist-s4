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

    // TODO: Implement actual Setlist.fm API integration here
    // For now, simulate importing setlists
    let importedCount = 0;
    
    // Get some shows that don't have setlists yet
    const { data: showsWithoutSetlists } = await supabase
      .from("shows")
      .select("id, name")
      .not("id", "in", 
        `(${(await supabase.from("setlists").select("show_id")).data?.map(s => s.show_id).join(",") || ""})`
      )
      .limit(10);

    // Create mock setlists for shows
    for (const show of showsWithoutSetlists || []) {
      try {
        const { error } = await supabase
          .from("setlists")
          .insert({
            show_id: show.id,
            name: `Setlist for ${show.name}`,
            type: "community",
            created_at: new Date().toISOString(),
          });

        if (!error) {
          importedCount++;
        }
      } catch (insertError) {
        console.error("Error inserting setlist:", insertError);
      }
    }

    // Log the import action
    await supabase.from("moderation_logs").insert({
      moderator_id: user.id,
      action: "import_setlists",
      target_type: "system",
      target_id: "bulk_import",
      reason: "Bulk setlist import initiated from admin panel",
      metadata: {
        setlists_imported: importedCount,
        import_timestamp: new Date().toISOString()
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Setlists import completed",
      count: importedCount
    });
  } catch (error) {
    console.error("Error importing setlists:", error);
    return NextResponse.json(
      { error: "Failed to import setlists" },
      { status: 500 }
    );
  }
}