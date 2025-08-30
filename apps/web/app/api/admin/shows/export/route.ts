import { createClient } from "~/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
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

    // Fetch all shows for export
    const { data: shows, error } = await supabase
      api.shows
      .select(`
        id,
        title,
        date,
        time,
        status,
        ticket_url,
        _creationTime,
        updated_at,
        venue:venues(name, city, state),
        artist:artists(name)
      `)
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    // Convert to CSV
    const csvHeaders = [
      "ID",
      "Title", 
      "Artist",
      "Venue",
      "City",
      "State",
      "Date",
      "Time",
      "Status",
      "Ticket URL",
      "Created At"
    ].join(",");

    const csvRows = shows?.map(show => [
      show.id,
      show.title,
      show.artist?.[0]?.name || "",
      show.venue?.[0]?.name || "",
      show.venue?.[0]?.city || "",
      show.venue?.[0]?.state || "",
      show.date,
      show.time || "",
      show.status,
      show.ticket_url || "",
      show._creationTime
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(",")) || [];

    const csvContent = [csvHeaders, ...csvRows].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="shows-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting shows:", error);
    return NextResponse.json(
      { error: "Failed to export shows" },
      { status: 500 }
    );
  }
}