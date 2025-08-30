/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as achievements from "../achievements.js";
import type * as actualSetlists from "../actualSetlists.js";
import type * as admin from "../admin.js";
import type * as artistSongs from "../artistSongs.js";
import type * as artists from "../artists.js";
import type * as auth from "../auth.js";
import type * as cron from "../cron.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as leaderboard from "../leaderboard.js";
import type * as predictions from "../predictions.js";
import type * as router from "../router.js";
import type * as setlistfm from "../setlistfm.js";
import type * as setlists from "../setlists.js";
import type * as shows from "../shows.js";
import type * as songVotes from "../songVotes.js";
import type * as songs from "../songs.js";
import type * as spotify from "../spotify.js";
import type * as sync from "../sync.js";
import type * as syncJobs from "../syncJobs.js";
import type * as syncStatus from "../syncStatus.js";
import type * as ticketmaster from "../ticketmaster.js";
import type * as trending from "../trending.js";
import type * as users from "../users.js";
import type * as venues from "../venues.js";
import type * as votes from "../votes.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  achievements: typeof achievements;
  actualSetlists: typeof actualSetlists;
  admin: typeof admin;
  artistSongs: typeof artistSongs;
  artists: typeof artists;
  auth: typeof auth;
  cron: typeof cron;
  crons: typeof crons;
  dashboard: typeof dashboard;
  health: typeof health;
  http: typeof http;
  leaderboard: typeof leaderboard;
  predictions: typeof predictions;
  router: typeof router;
  setlistfm: typeof setlistfm;
  setlists: typeof setlists;
  shows: typeof shows;
  songVotes: typeof songVotes;
  songs: typeof songs;
  spotify: typeof spotify;
  sync: typeof sync;
  syncJobs: typeof syncJobs;
  syncStatus: typeof syncStatus;
  ticketmaster: typeof ticketmaster;
  trending: typeof trending;
  users: typeof users;
  venues: typeof venues;
  votes: typeof votes;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
