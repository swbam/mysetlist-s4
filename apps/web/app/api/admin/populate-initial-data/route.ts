import { getUser } from "@repo/auth/server";
import { artists, db, shows, songs, venues } from "@repo/database";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (basic protection)
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if data already exists
    const [artistCount, showCount, venueCount, songCount] = await Promise.all([
      db
        .select()
        .from(artists)
        .then((r) => r.length),
      db
        .select()
        .from(shows)
        .then((r) => r.length),
      db
        .select()
        .from(venues)
        .then((r) => r.length),
      db
        .select()
        .from(songs)
        .then((r) => r.length),
    ]);

    if (artistCount > 0 || showCount > 0 || venueCount > 0 || songCount > 0) {
      return NextResponse.json({
        message: "Database already contains data",
        counts: {
          artists: artistCount,
          shows: showCount,
          venues: venueCount,
          songs: songCount,
        },
      });
    }

    // Trigger mock data seeding via edge function
    const seedResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/seed-trending`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "mock",
          count: 10,
        }),
      },
    );

    if (!seedResponse.ok) {
      throw new Error("Failed to seed data");
    }

    const seedResult = await seedResponse.json();

    // Trigger trending score calculation
    await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/calculate-trending`,
      {
        method: "POST",
      },
    );

    return NextResponse.json({
      success: true,
      message: "Initial data population triggered",
      result: seedResult,
    });
  } catch (error) {
    console.error("Population error:", error);
    return NextResponse.json(
      { error: "Failed to populate initial data" },
      { status: 500 },
    );
  }
}
