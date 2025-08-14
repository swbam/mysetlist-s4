import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { venues } from "./venues";

export const moderationStatusEnum = pgEnum("moderation_status", [
  "pending",
  "approved",
  "rejected",
  "flagged",
]);

export const venueReviews = pgTable("venue_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5 stars
  review: text("review").notNull(),
  acoustics: integer("acoustics"), // 1-5 rating
  accessibility: integer("accessibility"), // 1-5 rating
  sightlines: integer("sightlines"), // 1-5 rating
  parkingEase: integer("parking_ease"), // 1-5 rating
  concessions: integer("concessions"), // 1-5 rating
  visitedAt: timestamp("visited_at").notNull(),
  helpful: integer("helpful").default(0),
  moderationStatus: moderationStatusEnum("moderation_status").default("approved"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const venuePhotos = pgTable("venue_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  photoType: text("photo_type"), // interior, exterior, seating, stage, etc.
  moderationStatus: moderationStatusEnum("moderation_status").default("approved"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const venueInsiderTips = pgTable("venue_insider_tips", {
  id: uuid("id").primaryKey().defaultRandom(),
  venueId: uuid("venue_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tipCategory: text("tip_category").notNull(), // parking, food, seating, entrance, etc.
  tip: text("tip").notNull(),
  helpful: integer("helpful").default(0),
  moderationStatus: moderationStatusEnum("moderation_status").default("approved"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
