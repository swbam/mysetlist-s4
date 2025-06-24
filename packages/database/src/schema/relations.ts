import { relations } from 'drizzle-orm';
import {
  users,
  userProfiles,
  userFollowsArtists,
  artists,
  artistStats,
  venues,
  venueReviews,
  venuePhotos,
  venueInsiderTips,
  shows,
  showArtists,
  setlists,
  songs,
  setlistSongs,
  votes,
  userShowAttendance,
  showComments,
} from './index';

export const usersRelations = relations(users, ({ many, one }) => ({
  votes: many(votes),
  createdSetlists: many(setlists),
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  followedArtists: many(userFollowsArtists),
  venueReviews: many(venueReviews),
  venuePhotos: many(venuePhotos),
  venueInsiderTips: many(venueInsiderTips),
  showAttendances: many(userShowAttendance),
  showComments: many(showComments),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const artistsRelations = relations(artists, ({ many, one }) => ({
  shows: many(shows),
  setlists: many(setlists),
  showAppearances: many(showArtists),
  stats: one(artistStats, {
    fields: [artists.id],
    references: [artistStats.artistId],
  }),
  followers: many(userFollowsArtists),
}));

export const artistStatsRelations = relations(artistStats, ({ one }) => ({
  artist: one(artists, {
    fields: [artistStats.artistId],
    references: [artists.id],
  }),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
  shows: many(shows),
  reviews: many(venueReviews),
  photos: many(venuePhotos),
  insiderTips: many(venueInsiderTips),
}));

export const showsRelations = relations(shows, ({ many, one }) => ({
  headlinerArtist: one(artists, {
    fields: [shows.headlinerArtistId],
    references: [artists.id],
  }),
  venue: one(venues, {
    fields: [shows.venueId],
    references: [venues.id],
  }),
  setlists: many(setlists),
  supportingArtists: many(showArtists),
  attendances: many(userShowAttendance),
  comments: many(showComments),
}));

export const showArtistsRelations = relations(showArtists, ({ one }) => ({
  show: one(shows, {
    fields: [showArtists.showId],
    references: [shows.id],
  }),
  artist: one(artists, {
    fields: [showArtists.artistId],
    references: [artists.id],
  }),
}));

export const setlistsRelations = relations(setlists, ({ many, one }) => ({
  show: one(shows, {
    fields: [setlists.showId],
    references: [shows.id],
  }),
  artist: one(artists, {
    fields: [setlists.artistId],
    references: [artists.id],
  }),
  creator: one(users, {
    fields: [setlists.createdBy],
    references: [users.id],
  }),
  songs: many(setlistSongs),
}));

export const setlistSongsRelations = relations(setlistSongs, ({ one, many }) => ({
  setlist: one(setlists, {
    fields: [setlistSongs.setlistId],
    references: [setlists.id],
  }),
  song: one(songs, {
    fields: [setlistSongs.songId],
    references: [songs.id],
  }),
  votes: many(votes),
}));

export const songsRelations = relations(songs, ({ many }) => ({
  setlistAppearances: many(setlistSongs),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
  setlistSong: one(setlistSongs, {
    fields: [votes.setlistSongId],
    references: [setlistSongs.id],
  }),
}));

export const userFollowsArtistsRelations = relations(userFollowsArtists, ({ one }) => ({
  user: one(users, {
    fields: [userFollowsArtists.userId],
    references: [users.id],
  }),
  artist: one(artists, {
    fields: [userFollowsArtists.artistId],
    references: [artists.id],
  }),
}));

export const venueReviewsRelations = relations(venueReviews, ({ one }) => ({
  venue: one(venues, {
    fields: [venueReviews.venueId],
    references: [venues.id],
  }),
  user: one(users, {
    fields: [venueReviews.userId],
    references: [users.id],
  }),
}));

export const venuePhotosRelations = relations(venuePhotos, ({ one }) => ({
  venue: one(venues, {
    fields: [venuePhotos.venueId],
    references: [venues.id],
  }),
  user: one(users, {
    fields: [venuePhotos.userId],
    references: [users.id],
  }),
}));

export const venueInsiderTipsRelations = relations(venueInsiderTips, ({ one }) => ({
  venue: one(venues, {
    fields: [venueInsiderTips.venueId],
    references: [venues.id],
  }),
  user: one(users, {
    fields: [venueInsiderTips.userId],
    references: [users.id],
  }),
}));

export const userShowAttendanceRelations = relations(userShowAttendance, ({ one }) => ({
  user: one(users, {
    fields: [userShowAttendance.userId],
    references: [users.id],
  }),
  show: one(shows, {
    fields: [userShowAttendance.showId],
    references: [shows.id],
  }),
}));

export const showCommentsRelations = relations(showComments, ({ one }) => ({
  user: one(users, {
    fields: [showComments.userId],
    references: [users.id],
  }),
  show: one(shows, {
    fields: [showComments.showId],
    references: [shows.id],
  }),
}));