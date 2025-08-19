import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { venues } from "./venues";

export const moderationStatusEnum = pgEnum("moderation_status", [
  "pending",
  "approved",
  "rejected",
  "flagged",
]);

// venue_reviews removed from product scope

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

// venue_insider_tips removed from product scope
