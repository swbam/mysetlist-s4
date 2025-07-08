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

  console.log('Artist:', artist.name);
  console.log('Genres:', artist.genres);
  console.log('Popularity:', artist.popularity);

  // Get top tracks
  const topTracks = await spotify.getArtistTopTracks(artist.id);
  console.log(
    'Top tracks:',
    topTracks.tracks.map((t) => t.name)
  );
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
    events._embedded.events.forEach((event) => {
      console.log(`${event.name} - ${event.dates.start.localDate}`);
      console.log(`Venue: ${event._embedded?.venues?.[0]?.name}`);
      console.log(
        `Price: $${event.priceRanges?.[0]?.min} - $${event.priceRanges?.[0]?.max}`
      );
      console.log('---');
    });
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
    console.log(
      `${setlist.eventDate} - ${setlist.venue.name}, ${setlist.venue.city.name}`
    );
    setlist.sets.set.forEach((set, index) => {
      console.log(`Set ${index + 1}:`);
      set.song.forEach((song) => {
        console.log(`  - ${song.name}`);
      });
    });
    console.log('---');
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
    console.log('=== Spotify Example ===');
    await spotifyExample();

    console.log('\n=== Ticketmaster Example ===');
    await ticketmasterExample();

    console.log('\n=== Setlist.fm Example ===');
    await setlistfmExample();

    // Uncomment to run sync examples (will modify database)
    // console.log('\n=== Sync Examples ===');
    // await syncExample();
    // await schedulerExample();
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
