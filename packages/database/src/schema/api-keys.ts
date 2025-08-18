import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  scopes: text("scopes").array().notNull().default([]),
  rateLimit: jsonb("rate_limit")
    .notNull()
    .default({ requests: 1000, window: 3600 }),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
