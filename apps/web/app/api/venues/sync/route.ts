import { db, venues } from "@repo/database";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const venueSchema = z.object({
  ticketmasterId: z.string().optional(),
  name: z.string(),
  city: z.string(),
  state: z.string().optional(),
  country: z.string(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  timezone: z.string(),
  capacity: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check for service role key
    const serviceRole = request.headers.get("x-supabase-service-role");
    if (!serviceRole || serviceRole !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = venueSchema.parse(body);

    // Create slug from name
    const slug = validatedData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if venue exists by name and city
    let [venue] = await db
      .select()
      .from(venues)
      .where(eq(venues.name, validatedData.name))
      .limit(1);

    if (venue) {
      // Update existing venue
      await db
        .update(venues)
        .set({
          name: validatedData.name,
          city: validatedData.city,
          state: validatedData.state ?? null,
          country: validatedData.country,
          latitude: validatedData.latitude ?? null,
          longitude: validatedData.longitude ?? null,
          timezone: validatedData.timezone,
          capacity: validatedData.capacity ?? null,
          slug,
          updatedAt: new Date(),
        })
        .where(eq(venues.id, venue.id));
    } else {
      // Create new venue
      [venue] = await db
        .insert(venues)
        .values({
          name: validatedData.name,
          city: validatedData.city,
          state: validatedData.state ?? null,
          country: validatedData.country,
          latitude: validatedData.latitude ?? null,
          longitude: validatedData.longitude ?? null,
          timezone: validatedData.timezone,
          capacity: validatedData.capacity ?? null,
          slug,
        })
        .returning();
    }

    return NextResponse.json({ success: true, venue });
  } catch (error) {
    console.error("Venue sync error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid venue data", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to sync venue" },
      { status: 500 },
    );
  }
}
