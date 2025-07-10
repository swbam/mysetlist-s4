import {
  ArtistSyncService,
  ShowSyncService,
  SyncScheduler,
  VenueSyncService,
  setlistfm,
  spotify,
  ticketmaster,
} from '../index';

// Example 1: Using Spotify client directly
async function spotifyExample() {
  // Authenticate first
  await spotify.authenticate();

  // Search for an artist
  const searchResult = await spotify.searchArtists('Taylor Swift', 1);
  const artist = searchResult.artists.items[0];

  // Get top tracks
  const _topTracks = await spotify.getArtistTopTracks(artist.id);
}

// Example 2: Using Ticketmaster client
async function ticketmasterExample() {
  // Search for events in New York
  const events = await ticketmaster.searchEvents({
    city: 'New York',
    stateCode: 'NY',
    classificationName: 'Music',
    size: 10,
  });

  if (events._embedded?.events) {
    events._embedded.events.forEach((_event) => {});
  }
}

// Example 3: Using Setlist.fm client
async function setlistfmExample() {
  // Search for setlists
  const setlists = await setlistfm.searchSetlists({
    artistName: 'Radiohead',
    year: 2023,
  });

  setlists.setlist.forEach((setlist) => {
    setlist.sets.set.forEach((set, _index) => {
      set.song.forEach((_song) => {});
    });
  });
}

// Example 4: Using sync services
async function syncExample() {
  // Sync a specific artist
  const artistSync = new ArtistSyncService();
  await artistSync.syncPopularArtists();

  // Sync venues in a city
  const venueSync = new VenueSyncService();
  await venueSync.syncVenuesByCity('Austin', 'TX');

  // Sync upcoming shows
  const showSync = new ShowSyncService();
  await showSync.syncUpcomingShows({
    city: 'Seattle',
    stateCode: 'WA',
    classificationName: 'Music',
  });
}

// Example 5: Using the sync scheduler
async function schedulerExample() {
  const scheduler = new SyncScheduler();

  // Run initial sync (be careful, this syncs a lot of data!)
  // await scheduler.runInitialSync();

  // Sync data for a specific location
  await scheduler.syncByLocation('San Francisco', 'CA');

  // Sync data for a specific artist
  await scheduler.syncArtistData('The Beatles');

  // Custom sync
  await scheduler.syncCustom({
    artists: true,
    venues: true,
    shows: true,
    city: 'Portland',
    stateCode: 'OR',
  });
}

// Run examples
async function main() {
  try {
    await spotifyExample();
    await ticketmasterExample();
    await setlistfmExample();

    // Uncomment to run sync examples (will modify database)
    // console.log('\n=== Sync Examples ===');
    // await syncExample();
    // await schedulerExample();
  } catch (_error) {}
}

// Run if called directly
if (require.main === module) {
  main();
}
