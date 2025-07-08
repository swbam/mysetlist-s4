import { pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { shows } from './shows';
import { users } from './users';

export const attendanceStatusEnum = pgEnum('attendance_status', [
  'going',
  'interested',
  'not_going',
]);

export const userShowAttendance = pgTable('user_show_attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  showId: uuid('show_id')
    .references(() => shows.id, { onDelete: 'cascade' })
    .notNull(),
  status: attendanceStatusEnum('status').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
