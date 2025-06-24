import { pgTable, uuid, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';
import { shows } from './shows';

export const showComments = pgTable('show_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  showId: uuid('show_id').references(() => shows.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  parentId: uuid('parent_id'),
  isEdited: boolean('is_edited').default(false),
  editedAt: timestamp('edited_at'),
  upvotes: integer('upvotes').default(0),
  downvotes: integer('downvotes').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});