import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { shows } from "./shows";
import { users } from "./users";

export const showVotes = pgTable(
  "show_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    showId: uuid("show_id").references(() => shows.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    showIdx: index("show_votes_show_id_idx").on(table.showId),
  }),
);

