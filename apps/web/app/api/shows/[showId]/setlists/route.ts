// NextResponse removed - unused import
import { db, setlists } from "@repo/database";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ showId: string }> },
) {
  try {
    const { showId } = await params;

    // Get setlists for this show
    const showSetlists = await db
      .select()
      .from(setlists)
      .where(eq(setlists.showId, showId));

    return NextResponse.json(showSetlists);
  } catch (error) {
    console.error("Error fetching setlists:", error);
    return NextResponse.json(
      { error: "Failed to fetch setlists", details: error.message },
      { status: 500 }
    );
  }
}
