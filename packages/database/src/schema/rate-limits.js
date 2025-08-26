"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimits = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.rateLimits = (0, pg_core_1.pgTable)("rate_limits", {
    key: (0, pg_core_1.text)("key").primaryKey(),
    count: (0, pg_core_1.integer)("count").notNull().default(0),
    lastReset: (0, pg_core_1.timestamp)("last_reset", { withTimezone: true })
        .notNull()
        .defaultNow(),
    createdAt: (0, pg_core_1.timestamp)("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
