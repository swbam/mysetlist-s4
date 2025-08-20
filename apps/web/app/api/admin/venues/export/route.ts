import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

export async function GET(request: NextRequest) {
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

    // Fetch all venues for export
    const { data: venues, error } = await supabase
      .from("venues")
      .select(`
        id,
        name,
        address,
        city,
        state,
        country,
        zip_code,
        latitude,
        longitude,
        capacity,
        verified,
        phone,
        email,
        website,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Convert to CSV
    const csvHeaders = [
      "ID",
      "Name",
      "Address",
      "City",
      "State",
      "Country",
      "Zip Code",
      "Latitude",
      "Longitude",
      "Capacity",
      "Verified",
      "Phone",
      "Email",
      "Website",
      "Created At",
    ].join(",");

    const csvRows =
      venues?.map((venue) =>
        [
          venue.id,
          venue.name,
          venue.address || "",
          venue.city,
          venue.state,
          venue.country,
          venue.zip_code || "",
          venue.latitude || "",
          venue.longitude || "",
          venue.capacity || "",
          venue.verified ? "Yes" : "No",
          venue.phone || "",
          venue.email || "",
          venue.website || "",
          venue.created_at,
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(","),
      ) || [];

    const csvContent = [csvHeaders, ...csvRows].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="venues-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting venues:", error);
    return NextResponse.json(
      { error: "Failed to export venues" },
      { status: 500 },
    );
  }
}
