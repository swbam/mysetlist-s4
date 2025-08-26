"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.userRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.userRoleEnum = (0, pg_core_1.pgEnum)("user_role", ["user", "moderator", "admin"]);
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    displayName: (0, pg_core_1.text)("display_name"),
    role: (0, exports.userRoleEnum)("role").default("user").notNull(),
    emailVerified: (0, pg_core_1.timestamp)("email_verified"),
    lastLoginAt: (0, pg_core_1.timestamp)("last_login_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
    deletedAt: (0, pg_core_1.timestamp)("deleted_at"),
});
