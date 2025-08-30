import { cronJobs } from "convex/server";
import { api, internal } from "./_generated/api";

const crons = cronJobs();

// Sync artists from Spotify every 6 hours
crons.cron(
  "sync-spotify-artists",
  "0 */6 * * *", // Every 6 hours
  api.sync.syncSpotifyArtists,
  {}
);

// Sync shows from Ticketmaster daily at 2 AM UTC
crons.daily(
  "sync-ticketmaster-shows",
  { hourUTC: 2, minuteUTC: 0 }, // 2 AM UTC daily
  api.sync.syncTicketmasterShows,
  {}
);

// Check for completed shows and sync their setlists every 6 hours
crons.cron(
  "check-completed-shows",
  "0 */6 * * *", // Every 6 hours
  internal.setlistfm.checkCompletedShows,
  {}
);

// Sync trending data from Ticketmaster daily at 02:00 UTC per PRD
crons.daily(
  "sync-trending-data",
  { hourUTC: 2, minuteUTC: 0 },
  api.sync.syncTrendingData,
  {}
);

// Update trending scores for leaderboard every 6 hours
crons.cron(
  "update-trending-scores",
  "0 */6 * * *", // Every 6 hours
  internal.leaderboard.updateTrendingScores,
  {}
);

export default crons;
