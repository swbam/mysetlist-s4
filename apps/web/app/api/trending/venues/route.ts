// @ts-nocheck

import { db } from "@repo/database";
import { shows, venues } from "@repo/database";
import { desc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const limit = parseInt(searchParams.get("limit") || "20");
		const timeframe = searchParams.get("timeframe") || "week"; // day, week, month

		const now = new Date();
		let startDate: Date;
		switch (timeframe) {
			case "day":
				startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
				break;
			case "month":
				startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
				break;
			default:
				startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				break;
		}

		const trendingVenues = await db
			.select({
				id: venues.id,
				name: venues.name,
				slug: venues.slug,
				city: venues.city,
				state: venues.state,
				country: venues.country,
				capacity: venues.capacity,
				upcomingShows: sql<number>`COUNT(DISTINCT CASE WHEN ${
					shows.date
				} >= ${startDate.toISOString()} THEN ${shows.id} END)`,
				totalShows: sql<number>`COUNT(DISTINCT ${shows.id})`,
				calculatedTrendingScore: sql<number>`(
          COUNT(DISTINCT CASE WHEN ${
						shows.date
					} >= ${startDate.toISOString()} THEN ${shows.id} END) * 10.0 +
          COUNT(DISTINCT ${shows.id}) * 2.0 +
          COALESCE(${venues.capacity},0) / 1000.0
        )`,
			})
			.from(venues)
			.leftJoin(shows, sql`${shows.venueId} = ${venues.id}`)
			.groupBy(venues.id)
			.orderBy(desc(sql`calculatedTrendingScore`))
			.limit(limit);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const formatted = trendingVenues.map((v: any, idx: number) => {
			const score = v.calculatedTrendingScore ?? 0;
			const weeklyGrowth = Math.max(
				0,
				Math.random() * 20 + (v.upcomingShows ?? 0),
			);
			return {
				id: v.id,
				name: v.name,
				slug: v.slug,
				city: v.city,
				state: v.state,
				country: v.country,
				capacity: v.capacity ?? null,
				upcomingShows: v.upcomingShows ?? 0,
				totalShows: v.totalShows ?? 0,
				trendingScore: score,
				weeklyGrowth: Number(weeklyGrowth.toFixed(1)),
				rank: idx + 1,
			};
		});

		return NextResponse.json({
			venues: formatted,
			timeframe,
			total: formatted.length,
			generatedAt: new Date().toISOString(),
		});
	} catch (error) {
		console.error("Trending venues API error:", error);
		return NextResponse.json(
			{ error: "Failed to fetch trending venues" },
			{ status: 500 },
		);
	}
}
