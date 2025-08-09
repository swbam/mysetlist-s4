import { shows, db } from "@repo/database";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const showSchema = z.object({
  ticketmasterId: z.string().optional(),
  name: z.string(),
  date: z.string(),
  startTime: z.string(),
  headlinerArtistId: z.string(),
  venueId: z.string(),
  ticketUrl: z.string().optional(),
  status: z
    .enum(["upcoming", "ongoing", "completed", "cancelled"])
    .default("upcoming"),
});

export async function POST(request: NextRequest) {
  try {
    // Check for service role key
    const serviceRole = request.headers.get("x-supabase-service-role");
    if (
      !serviceRole ||
      serviceRole !== process.env["SUPABASE_SERVICE_ROLE_KEY"]
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = showSchema.parse(body);

    // Create slug from name and date
    const slug = `${validatedData.name}-${validatedData.date}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if show exists
    let show;
    if (validatedData.ticketmasterId) {
      [show] = await db
        .select()
        .from(shows)
        .where(eq(shows.ticketmasterId, validatedData.ticketmasterId))
        .limit(1);
    }

    if (show) {
      // Update existing show
      await db
        .update(shows)
        .set({
          name: validatedData.name,
          date: validatedData.date,
          startTime: validatedData.startTime,
          headlinerArtistId: validatedData.headlinerArtistId,
          venueId: validatedData.venueId,
          status: validatedData.status,
          ticketmasterId: validatedData.ticketmasterId ?? null,
          ticketUrl: validatedData.ticketUrl ?? null,
          slug,
          updatedAt: new Date(),
        })
        .where(eq(shows.id, show.id));
    } else {
      // Create new show
      [show] = await db
        .insert(shows)
        .values({
          name: validatedData.name,
          date: validatedData.date,
          startTime: validatedData.startTime,
          headlinerArtistId: validatedData.headlinerArtistId,
          venueId: validatedData.venueId,
          status: validatedData.status,
          ticketmasterId: validatedData.ticketmasterId ?? null,
          ticketUrl: validatedData.ticketUrl ?? null,
          slug,
        })
        .returning();
    }

    return NextResponse.json({ success: true, show });
  } catch (error) {
    console.error("Show sync error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid show data", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Failed to sync show" }, { status: 500 });
  }
}
