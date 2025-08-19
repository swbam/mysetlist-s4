import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { artists } from "./artists";
import { venues } from "./venues";

export const showStatusEnum = pgEnum("show_status", [
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
]);

export const shows = pgTable("shows", {
  id: uuid("id").primaryKey().defaultRandom(),
  headlinerArtistId: uuid("headliner_artist_id")
    .references(() => artists.id, { onDelete: "cascade" })
    ,
  venueId: uuid("venue_id").references(() => venues.id, {
    onDelete: "set null",
  }),
  name: text("name"),
  slug: text("slug").unique(),
  date: date("date"),
  startTime: time("start_time"),
  doorsTime: time("doors_time"),
  status: showStatusEnum("status").default("upcoming"),
  description: text("description"),
  ticketUrl: text("ticket_url"),
  minPrice: integer("min_price"),
  maxPrice: integer("max_price"),
  currency: text("currency").default("USD"),

  // Analytics fields
  viewCount: integer("view_count").default(0),
  attendeeCount: integer("attendee_count").default(0),
  setlistCount: integer("setlist_count").default(0),
  voteCount: integer("vote_count").default(0),
  trendingScore: doublePrecision("trending_score").default(0),

  // Historical tracking for real growth calculations
  previousViewCount: integer("previous_view_count"),
  previousAttendeeCount: integer("previous_attendee_count"),
  previousVoteCount: integer("previous_vote_count"),
  previousSetlistCount: integer("previous_setlist_count"),
  lastGrowthCalculated: timestamp("last_growth_calculated"),

  // Featured/promoted content
  isFeatured: boolean("is_featured").default(false),
  isVerified: boolean("is_verified").default(false),

  // External integrations
  tmEventId: text("tm_event_id").unique(), // Ticketmaster Event ID
  setlistFmId: text("setlist_fm_id"),
  setlistReady: boolean("setlist_ready").default(false),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  artistDateIdx: index("idx_show_artist_date").on(table.headlinerArtistId, table.date),
  tmEventIdIdx: index("idx_show_tm_event").on(table.tmEventId),
}));

export const showArtists = pgTable("show_artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  showId: uuid("show_id")
    .references(() => shows.id, { onDelete: "cascade" })
    ,
  artistId: uuid("artist_id")
    .references(() => artists.id, { onDelete: "cascade" })
    ,
  orderIndex: integer("order_index"), // 0 = headliner
  setLength: integer("set_length"), // minutes
  isHeadliner: boolean("is_headliner").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Removed showComments table - not part of core MVP requirements
