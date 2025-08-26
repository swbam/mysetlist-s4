"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailLogsRelations = exports.emailQueueRelations = exports.emailUnsubscribesRelations = exports.emailPreferencesRelations = exports.userProfilesRelations = exports.artistSongsRelations = exports.votesRelations = exports.songsRelations = exports.setlistSongsRelations = exports.setlistsRelations = exports.showArtistsRelations = exports.showsRelations = exports.venuesRelations = exports.artistStatsRelations = exports.artistsRelations = exports.usersRelations = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const artists_1 = require("./artists");
const email_preferences_1 = require("./email-preferences");
const setlists_1 = require("./setlists");
const shows_1 = require("./shows");
const user_profiles_1 = require("./user-profiles");
const users_1 = require("./users");
const venues_1 = require("./venues");
exports.usersRelations = (0, drizzle_orm_1.relations)(users_1.users, ({ many, one }) => ({
    profile: one(user_profiles_1.userProfiles, {
        fields: [users_1.users.id],
        references: [user_profiles_1.userProfiles.userId],
    }),
    votes: many(setlists_1.votes),
    createdSetlists: many(setlists_1.setlists),
    emailPreferences: one(email_preferences_1.emailPreferences, {
        fields: [users_1.users.id],
        references: [email_preferences_1.emailPreferences.userId],
    }),
    emailUnsubscribes: many(email_preferences_1.emailUnsubscribes),
    emailQueue: many(email_preferences_1.emailQueue),
    emailLogs: many(email_preferences_1.emailLogs),
}));
exports.artistsRelations = (0, drizzle_orm_1.relations)(artists_1.artists, ({ many, one }) => ({
    shows: many(shows_1.shows),
    setlists: many(setlists_1.setlists),
    showAppearances: many(shows_1.showArtists),
    songs: many(artists_1.artistSongs),
    stats: one(artists_1.artistStats, {
        fields: [artists_1.artists.id],
        references: [artists_1.artistStats.artistId],
    }),
    // followers: many(userFollowsArtists), // Table removed
}));
exports.artistStatsRelations = (0, drizzle_orm_1.relations)(artists_1.artistStats, ({ one }) => ({
    artist: one(artists_1.artists, {
        fields: [artists_1.artistStats.artistId],
        references: [artists_1.artists.id],
    }),
}));
exports.venuesRelations = (0, drizzle_orm_1.relations)(venues_1.venues, ({ many }) => ({
    shows: many(shows_1.shows),
}));
exports.showsRelations = (0, drizzle_orm_1.relations)(shows_1.shows, ({ many, one }) => ({
    headlinerArtist: one(artists_1.artists, {
        fields: [shows_1.shows.headlinerArtistId],
        references: [artists_1.artists.id],
    }),
    venue: one(venues_1.venues, {
        fields: [shows_1.shows.venueId],
        references: [venues_1.venues.id],
    }),
    setlists: many(setlists_1.setlists),
    supportingArtists: many(shows_1.showArtists),
}));
exports.showArtistsRelations = (0, drizzle_orm_1.relations)(shows_1.showArtists, ({ one }) => ({
    show: one(shows_1.shows, {
        fields: [shows_1.showArtists.showId],
        references: [shows_1.shows.id],
    }),
    artist: one(artists_1.artists, {
        fields: [shows_1.showArtists.artistId],
        references: [artists_1.artists.id],
    }),
}));
exports.setlistsRelations = (0, drizzle_orm_1.relations)(setlists_1.setlists, ({ many, one }) => ({
    show: one(shows_1.shows, {
        fields: [setlists_1.setlists.showId],
        references: [shows_1.shows.id],
    }),
    artist: one(artists_1.artists, {
        fields: [setlists_1.setlists.artistId],
        references: [artists_1.artists.id],
    }),
    creator: one(users_1.users, {
        fields: [setlists_1.setlists.createdBy],
        references: [users_1.users.id],
    }),
    songs: many(setlists_1.setlistSongs),
}));
exports.setlistSongsRelations = (0, drizzle_orm_1.relations)(setlists_1.setlistSongs, ({ one, many }) => ({
    setlist: one(setlists_1.setlists, {
        fields: [setlists_1.setlistSongs.setlistId],
        references: [setlists_1.setlists.id],
    }),
    song: one(setlists_1.songs, {
        fields: [setlists_1.setlistSongs.songId],
        references: [setlists_1.songs.id],
    }),
    votes: many(setlists_1.votes),
}));
exports.songsRelations = (0, drizzle_orm_1.relations)(setlists_1.songs, ({ many }) => ({
    setlistAppearances: many(setlists_1.setlistSongs),
    artists: many(artists_1.artistSongs),
}));
exports.votesRelations = (0, drizzle_orm_1.relations)(setlists_1.votes, ({ one }) => ({
    user: one(users_1.users, {
        fields: [setlists_1.votes.userId],
        references: [users_1.users.id],
    }),
    setlistSong: one(setlists_1.setlistSongs, {
        fields: [setlists_1.votes.setlistSongId],
        references: [setlists_1.setlistSongs.id],
    }),
}));
// Removed venue reviews, photos, insider tips, and show comments relations
// These features are not part of the core MVP requirements per theset-docs
exports.artistSongsRelations = (0, drizzle_orm_1.relations)(artists_1.artistSongs, ({ one }) => ({
    artist: one(artists_1.artists, {
        fields: [artists_1.artistSongs.artistId],
        references: [artists_1.artists.id],
    }),
    song: one(setlists_1.songs, {
        fields: [artists_1.artistSongs.songId],
        references: [setlists_1.songs.id],
    }),
}));
exports.userProfilesRelations = (0, drizzle_orm_1.relations)(user_profiles_1.userProfiles, ({ one }) => ({
    user: one(users_1.users, {
        fields: [user_profiles_1.userProfiles.userId],
        references: [users_1.users.id],
    }),
}));
// Removed show comments and venue tips relations - not in core MVP
exports.emailPreferencesRelations = (0, drizzle_orm_1.relations)(email_preferences_1.emailPreferences, ({ one }) => ({
    user: one(users_1.users, {
        fields: [email_preferences_1.emailPreferences.userId],
        references: [users_1.users.id],
    }),
}));
exports.emailUnsubscribesRelations = (0, drizzle_orm_1.relations)(email_preferences_1.emailUnsubscribes, ({ one }) => ({
    user: one(users_1.users, {
        fields: [email_preferences_1.emailUnsubscribes.userId],
        references: [users_1.users.id],
    }),
}));
exports.emailQueueRelations = (0, drizzle_orm_1.relations)(email_preferences_1.emailQueue, ({ one }) => ({
    user: one(users_1.users, {
        fields: [email_preferences_1.emailQueue.userId],
        references: [users_1.users.id],
    }),
}));
exports.emailLogsRelations = (0, drizzle_orm_1.relations)(email_preferences_1.emailLogs, ({ one }) => ({
    user: one(users_1.users, {
        fields: [email_preferences_1.emailLogs.userId],
        references: [users_1.users.id],
    }),
}));
