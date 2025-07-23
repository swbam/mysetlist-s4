import { relations } from 'drizzle-orm';
import { artistSongs, artistStats, artists } from './artists';
import {
  emailLogs,
  emailPreferences,
  emailQueue,
  emailUnsubscribes,
} from './email-preferences';
import { setlistSongs, setlists, votes } from './setlists';
import { songs } from './songs';
import { showArtists, showComments, shows } from './shows';
import { userProfiles } from './user-profiles';
import { users } from './users';
import { venueInsiderTips, venuePhotos, venueReviews } from './venue-reviews';
import { venueTips, venues } from './venues';

export const usersRelations = relations(users, ({ many, one }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  votes: many(votes),
  createdSetlists: many(setlists),
  venueReviews: many(venueReviews),
  venuePhotos: many(venuePhotos),
  venueTips: many(venueTips),
  venueInsiderTips: many(venueInsiderTips),
  showComments: many(showComments),
  emailPreferences: one(emailPreferences, {
    fields: [users.id],
    references: [emailPreferences.userId],
  }),
  emailUnsubscribes: many(emailUnsubscribes),
  emailQueue: many(emailQueue),
  emailLogs: many(emailLogs),
}));

export const artistsRelations = relations(artists, ({ many, one }) => ({
  shows: many(shows),
  setlists: many(setlists),
  showAppearances: many(showArtists),
  songs: many(artistSongs),
  stats: one(artistStats, {
    fields: [artists.id],
    references: [artistStats.artistId],
  }),
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
  tips: many(venueTips),
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

export const setlistSongsRelations = relations(
  setlistSongs,
  ({ one, many }) => ({
    setlist: one(setlists, {
      fields: [setlistSongs.setlistId],
      references: [setlists.id],
    }),
    song: one(songs, {
      fields: [setlistSongs.songId],
      references: [songs.id],
    }),
    votes: many(votes),
  })
);

export const songsRelations = relations(songs, ({ many }) => ({
  setlistAppearances: many(setlistSongs),
  artists: many(artistSongs),
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

export const venueInsiderTipsRelations = relations(
  venueInsiderTips,
  ({ one }) => ({
    venue: one(venues, {
      fields: [venueInsiderTips.venueId],
      references: [venues.id],
    }),
    user: one(users, {
      fields: [venueInsiderTips.userId],
      references: [users.id],
    }),
  })
);

// userFollowsArtists table has been removed - relations removed as well

export const artistSongsRelations = relations(artistSongs, ({ one }) => ({
  artist: one(artists, {
    fields: [artistSongs.artistId],
    references: [artists.id],
  }),
  song: one(songs, {
    fields: [artistSongs.songId],
    references: [songs.id],
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const showCommentsRelations = relations(showComments, ({ one }) => ({
  show: one(shows, {
    fields: [showComments.showId],
    references: [shows.id],
  }),
  user: one(users, {
    fields: [showComments.userId],
    references: [users.id],
  }),
  parent: one(showComments, {
    fields: [showComments.parentId],
    references: [showComments.id],
  }),
}));

export const venueTipsRelations = relations(venueTips, ({ one }) => ({
  venue: one(venues, {
    fields: [venueTips.venueId],
    references: [venues.id],
  }),
  user: one(users, {
    fields: [venueTips.userId],
    references: [users.id],
  }),
}));

export const emailPreferencesRelations = relations(
  emailPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [emailPreferences.userId],
      references: [users.id],
    }),
  })
);

export const emailUnsubscribesRelations = relations(
  emailUnsubscribes,
  ({ one }) => ({
    user: one(users, {
      fields: [emailUnsubscribes.userId],
      references: [users.id],
    }),
  })
);

export const emailQueueRelations = relations(emailQueue, ({ one }) => ({
  user: one(users, {
    fields: [emailQueue.userId],
    references: [users.id],
  }),
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  user: one(users, {
    fields: [emailLogs.userId],
    references: [users.id],
  }),
}));
