import { 
  pgTable, 
  uuid, 
  text, 
  timestamp, 
  pgEnum
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'user', 
  'moderator', 
  'admin'
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  role: userRoleEnum('role').default('user').notNull(),
  emailVerified: timestamp('email_verified'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

