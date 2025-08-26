"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeys = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
exports.apiKeys = (0, pg_core_1.pgTable)("api_keys", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => users_1.users.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.text)("name").notNull(),
    keyHash: (0, pg_core_1.text)("key_hash").notNull().unique(),
    // Use an explicit Postgres default for text[] to avoid invalid SQL generation
    scopes: (0, pg_core_1.text)("scopes").array().notNull().default((0, drizzle_orm_1.sql) `'{}'::text[]`),
    rateLimit: (0, pg_core_1.jsonb)("rate_limit")
        .notNull()
        .default({ requests: 1000, window: 3600 }),
    lastUsedAt: (0, pg_core_1.timestamp)("last_used_at"),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
    revokedAt: (0, pg_core_1.timestamp)("revoked_at"),
    isActive: (0, pg_core_1.boolean)("is_active").notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
});
