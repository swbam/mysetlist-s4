import { db, artists, shows, showVotes, sql } from "@repo/database";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("unauthorized", { status: 401 });

  await db.execute(sql`
    UPDATE ${artists} a SET trending_score = sub.score
    FROM (
      SELECT s.headliner_artist_id,
             COUNT(v.*) FILTER (WHERE v.created_at > now() - interval '30 days')
             + 0.1 * COUNT(v.*)                      AS score
      FROM ${shows} s
      LEFT JOIN ${showVotes} v ON v.show_id = s.id
      GROUP BY s.headliner_artist_id
    ) sub
    WHERE a.id = sub.headliner_artist_id;
  `);

  return NextResponse.json({ ok: true });
}

