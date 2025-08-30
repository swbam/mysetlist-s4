import { query } from "./_generated/server";

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const [artists, shows, setlists, users] = await Promise.all([
      ctx.db.query("artists").collect(),
      ctx.db.query("shows").withIndex("by_status", (q) => q.eq("status", "upcoming")).collect(),
      ctx.db.query("setlists").collect(),
      ctx.db.query("users").collect(),
    ]);

    return {
      totalArtists: artists.length,
      totalShows: shows.length,
      totalSetlists: setlists.length,
      activeUsers: users.length,
    };
  },
});
