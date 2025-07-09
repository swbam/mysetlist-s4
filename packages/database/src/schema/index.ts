export * from './users';
export * from './user-profiles';
export * from './artists';
export * from './venues';
export * from './venue-reviews';
export * from './shows';
export * from './setlists';
export * from './email-preferences';
export * from './user-follows-artists';
export * from './attendance';
export * from './relations';
export * from './admin';
export * from './search';

// Re-export artistSongs from artists file to avoid circular dependency
export { artistSongs } from './artists';
