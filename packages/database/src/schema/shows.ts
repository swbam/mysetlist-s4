import {
  boolean,
  date,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { artists } from "./artists"
import { users } from "./users"
import { venues } from "./venues"

export const showStatusEnum = pgEnum("show_status", [
  "upcoming",
  "ongoing",
  "completed",
  "cancelled",
])

export const shows = pgTable("shows", {
  id: uuid("id").primaryKey().defaultRandom(),
  headlinerArtistId: uuid("headliner_artist_id")
    .references(() => artists.id, { onDelete: "cascade" })
    .notNull(),
  venueId: uuid("venue_id").references(() => venues.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  date: date("date").notNull(),
  startTime: time("start_time"),
  doorsTime: time("doors_time"),
  status: showStatusEnum("status").default("upcoming").notNull(),
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
  ticketmasterId: text("ticketmaster_id").unique(),
  setlistFmId: text("setlistfm_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const showArtists = pgTable("show_artists", {
  id: uuid("id").primaryKey().defaultRandom(),
  showId: uuid("show_id")
    .references(() => shows.id, { onDelete: "cascade" })
    .notNull(),
  artistId: uuid("artist_id")
    .references(() => artists.id, { onDelete: "cascade" })
    .notNull(),
  orderIndex: integer("order_index").notNull(), // 0 = headliner
  setLength: integer("set_length"), // minutes
  isHeadliner: boolean("is_headliner").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const showComments = pgTable("show_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  showId: uuid("show_id")
    .references(() => shows.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  parentId: uuid("parent_id").references((): any => showComments.id),
  isEdited: boolean("is_edited").default(false).notNull(),
  editedAt: timestamp("edited_at"),
  upvotes: integer("upvotes").default(0).notNull(),
  downvotes: integer("downvotes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
