import {
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const venues = pgTable("venues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  address: text("address"),
  city: text("city").notNull(),
  state: text("state"),
  country: text("country").notNull(),
  postalCode: text("postal_code"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  timezone: text("timezone").notNull(),
  capacity: integer("capacity"),
  venueType: text("venue_type"), // arena, theater, club, etc.
  phoneNumber: text("phone_number"),
  website: text("website"),
  imageUrl: text("image_url"),
  description: text("description"),
  amenities: text("amenities"), // JSON array

  // Analytics fields
  totalShows: integer("total_shows").default(0),
  upcomingShows: integer("upcoming_shows").default(0),
  totalAttendance: integer("total_attendance").default(0),
  averageRating: doublePrecision("average_rating"),

  // Historical tracking for real growth calculations
  previousTotalShows: integer("previous_total_shows"),
  previousUpcomingShows: integer("previous_upcoming_shows"),
  previousTotalAttendance: integer("previous_total_attendance"),
  lastGrowthCalculated: timestamp("last_growth_calculated"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const venueTipCategoryEnum = pgEnum("venue_tip_category", [
  "parking",
  "food",
  "access",
  "sound",
  "view",
  "general",
]);

export const venueTips = pgTable("venue_tips", {
  id: uuid("id").primaryKey().defaultRandom(),
  venueId: uuid("venue_id")
    .references(() => venues.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  category: venueTipCategoryEnum("category").notNull(),
  upvotes: integer("upvotes").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
