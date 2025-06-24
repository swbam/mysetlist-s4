// Analytics event types for MySetlist app

export const ANALYTICS_EVENTS = {
  // User Authentication Events
  USER_SIGN_UP: 'user_sign_up',
  USER_SIGN_IN: 'user_sign_in',
  USER_SIGN_OUT: 'user_sign_out',
  USER_PASSWORD_RESET: 'user_password_reset',
  
  // Artist Events
  ARTIST_FOLLOW: 'artist_follow',
  ARTIST_UNFOLLOW: 'artist_unfollow',
  ARTIST_PAGE_VIEW: 'artist_page_view',
  ARTIST_SEARCH: 'artist_search',
  ARTIST_SPOTIFY_SYNC: 'artist_spotify_sync',
  
  // Show Events
  SHOW_PAGE_VIEW: 'show_page_view',
  SHOW_ATTEND: 'show_attend',
  SHOW_UNATTEND: 'show_unattend',
  SHOW_SEARCH: 'show_search',
  SHOW_FILTER: 'show_filter',
  SHOW_SHARE: 'show_share',
  SHOW_COMMENT: 'show_comment',
  
  // Setlist Events
  SETLIST_VIEW: 'setlist_view',
  SETLIST_CREATE: 'setlist_create',
  SETLIST_EDIT: 'setlist_edit',
  SETLIST_VOTE: 'setlist_vote',
  SETLIST_SONG_ADD: 'setlist_song_add',
  SETLIST_SONG_REMOVE: 'setlist_song_remove',
  
  // Venue Events
  VENUE_PAGE_VIEW: 'venue_page_view',
  VENUE_SEARCH: 'venue_search',
  VENUE_REVIEW_ADD: 'venue_review_add',
  VENUE_PHOTO_ADD: 'venue_photo_add',
  VENUE_TIP_ADD: 'venue_tip_add',
  
  // User Profile Events
  PROFILE_UPDATE: 'profile_update',
  PROFILE_PHOTO_UPDATE: 'profile_photo_update',
  NOTIFICATION_SETTINGS_UPDATE: 'notification_settings_update',
  
  // PWA Events
  PWA_INSTALL_PROMPT: 'pwa_install_prompt',
  PWA_INSTALL_ACCEPTED: 'pwa_install_accepted',
  PWA_INSTALL_DISMISSED: 'pwa_install_dismissed',
  PWA_OFFLINE_PAGE_VIEW: 'pwa_offline_page_view',
  
  // Email Events
  EMAIL_NOTIFICATION_SENT: 'email_notification_sent',
  EMAIL_UNSUBSCRIBE: 'email_unsubscribe',
  EMAIL_DIGEST_SENT: 'email_digest_sent',
  
  // Error Events
  ERROR_BOUNDARY_TRIGGERED: 'error_boundary_triggered',
  API_ERROR: 'api_error',
  
  // Performance Events
  PAGE_LOAD_TIME: 'page_load_time',
  API_RESPONSE_TIME: 'api_response_time',
} as const;

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

// Event property types
export interface UserProperties {
  userId?: string;
  email?: string;
  signUpDate?: string;
  followedArtistsCount?: number;
  attendedShowsCount?: number;
  votesCount?: number;
}

export interface EventProperties {
  // Common properties
  timestamp?: string;
  sessionId?: string;
  referrer?: string;
  userAgent?: string;
  
  // Page view properties
  pageUrl?: string;
  pageTitle?: string;
  
  // Entity properties
  artistId?: string;
  artistName?: string;
  showId?: string;
  showName?: string;
  venueId?: string;
  venueName?: string;
  setlistId?: string;
  songId?: string;
  songName?: string;
  
  // Action properties
  action?: string;
  category?: string;
  label?: string;
  value?: number;
  
  // Search properties
  searchQuery?: string;
  searchResultsCount?: number;
  
  // Error properties
  errorMessage?: string;
  errorStack?: string;
  errorCode?: string;
  
  // Performance properties
  duration?: number;
  metric?: string;
  
  // Custom properties
  [key: string]: any;
}