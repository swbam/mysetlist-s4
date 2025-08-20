import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "~/lib/supabase/server";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
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

    const { id: venueId } = await params;

    // Get venue details
    const { data: venue } = await supabase
      .from("venues")
      .select("name, verified")
      .eq("id", venueId)
      .single();

    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    if (venue.verified) {
      return NextResponse.json(
        { error: "Venue is already verified" },
        { status: 400 },
      );
    }

    // Mark venue as verified
    const { error } = await supabase
      .from("venues")
      .update({
        verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", venueId);

    if (error) {
      throw error;
    }

    // Log the action
    await supabase.from("moderation_logs").insert({
      moderator_id: user.id,
      action: "verify_venue",
      target_type: "venue",
      target_id: venueId,
      reason: "Manual verification by admin",
      metadata: {
        venue_name: venue.name,
        verified_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Venue verified successfully",
    });
  } catch (error) {
    console.error("Error verifying venue:", error);
    return NextResponse.json(
      { error: "Failed to verify venue" },
      { status: 500 },
    );
  }
}
