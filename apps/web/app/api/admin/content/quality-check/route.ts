import { createClient } from "~/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
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

    let totalIssues = 0;
    const issues: Array<{
      type: string;
      count: number;
      description: string;
    }> = [];

    // Check for artists missing images
    const { count: artistsWithoutImages } = await supabase
      .from("artists")
      .select("*", { count: "exact", head: true })
      .is("image_url", null);

    if (artistsWithoutImages && artistsWithoutImages > 0) {
      totalIssues += artistsWithoutImages;
      issues.push({
        type: "missing_artist_images",
        count: artistsWithoutImages,
        description: "Artists missing profile images"
      });
    }

    // Check for shows without setlists
    const { count: showsWithoutSetlists } = await supabase
      .from("shows")
      .select("*", { count: "exact", head: true })
      .not("id", "in", 
        `(${(await supabase.from("setlists").select("show_id")).data?.map(s => s.show_id).join(",") || "null"})`
      );

    if (showsWithoutSetlists && showsWithoutSetlists > 0) {
      totalIssues += showsWithoutSetlists;
      issues.push({
        type: "missing_setlists",
        count: showsWithoutSetlists,
        description: "Shows without setlists"
      });
    }

    // Check for venues missing location data
    const { count: venuesWithoutLocation } = await supabase
      .from("venues")
      .select("*", { count: "exact", head: true })
      .or("latitude.is.null,longitude.is.null");

    if (venuesWithoutLocation && venuesWithoutLocation > 0) {
      totalIssues += venuesWithoutLocation;
      issues.push({
        type: "missing_venue_location",
        count: venuesWithoutLocation,
        description: "Venues missing location coordinates"
      });
    }

    // Check for venues missing capacity
    const { count: venuesWithoutCapacity } = await supabase
      .from("venues")
      .select("*", { count: "exact", head: true })
      .is("capacity", null);

    if (venuesWithoutCapacity && venuesWithoutCapacity > 0) {
      totalIssues += venuesWithoutCapacity;
      issues.push({
        type: "missing_venue_capacity",
        count: venuesWithoutCapacity,
        description: "Venues missing capacity information"
      });
    }

    // Log the quality check action
    await supabase.from("moderation_logs").insert({
      moderator_id: user.id,
      action: "quality_check",
      target_type: "system",
      target_id: "data_quality",
      reason: "Data quality check initiated from admin panel",
      metadata: {
        total_issues: totalIssues,
        issues_found: issues,
        check_timestamp: new Date().toISOString()
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Quality check completed",
      issues: totalIssues,
      details: issues
    });
  } catch (error) {
    console.error("Error running quality check:", error);
    return NextResponse.json(
      { error: "Failed to run quality check" },
      { status: 500 }
    );
  }
}