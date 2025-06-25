import { ArtistSyncService } from './artist-sync';
import { VenueSyncService } from './venue-sync';
import { ShowSyncService } from './show-sync';
import { SetlistSyncService } from './setlist-sync';

export interface SyncOptions {
  artists?: boolean;
  venues?: boolean;
  shows?: boolean;
  setlists?: boolean;
  city?: string;
  stateCode?: string;
  artistName?: string;
  startDate?: string;
  endDate?: string;
}

export class SyncScheduler {
  private artistSync: ArtistSyncService;
  private venueSync: VenueSyncService;
  private showSync: ShowSyncService;
  private setlistSync: SetlistSyncService;

  constructor() {
    this.artistSync = new ArtistSyncService();
    this.venueSync = new VenueSyncService();
    this.showSync = new ShowSyncService();
    this.setlistSync = new SetlistSyncService();
  }

  async runInitialSync(): Promise<void> {
    console.log('Starting initial sync...');
    
    try {
      // 1. Sync popular artists
      console.log('Syncing popular artists...');
      await this.artistSync.syncPopularArtists();
      
      // 2. Sync major venues
      console.log('Syncing major venues...');
      await this.venueSync.syncMajorVenues();
      
      // 3. Sync upcoming shows in major cities
      console.log('Syncing upcoming shows...');
      const majorCities = [
        { city: 'New York', stateCode: 'NY' },
        { city: 'Los Angeles', stateCode: 'CA' },
        { city: 'Chicago', stateCode: 'IL' },
        { city: 'San Francisco', stateCode: 'CA' },
        { city: 'Austin', stateCode: 'TX' },
        { city: 'Seattle', stateCode: 'WA' },
        { city: 'Denver', stateCode: 'CO' },
        { city: 'Nashville', stateCode: 'TN' },
        { city: 'Portland', stateCode: 'OR' },
        { city: 'Atlanta', stateCode: 'GA' },
      ];

      for (const { city, stateCode } of majorCities) {
        await this.showSync.syncUpcomingShows({
          city,
          stateCode,
          classificationName: 'Music',
        });
        // Rate limit between cities
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('Initial sync completed!');
    } catch (error) {
      console.error('Initial sync failed:', error);
      throw error;
    }
  }

  async runDailySync(): Promise<void> {
    console.log('Starting daily sync...');
    
    try {
      // Sync upcoming shows for the next 30 days
      const startDateTime = new Date().toISOString();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      const endDateTime = endDate.toISOString();

      await this.showSync.syncUpcomingShows({
        classificationName: 'Music',
        startDateTime,
        endDateTime,
      });

      console.log('Daily sync completed!');
    } catch (error) {
      console.error('Daily sync failed:', error);
      throw error;
    }
  }

  async syncByLocation(city: string, stateCode?: string): Promise<void> {
    console.log(`Syncing data for ${city}${stateCode ? `, ${stateCode}` : ''}...`);
    
    try {
      // 1. Sync venues in the city
      await this.venueSync.syncVenuesByCity(city, stateCode);
      
      // 2. Sync upcoming shows in the city
      await this.showSync.syncUpcomingShows({
        city,
        stateCode,
        classificationName: 'Music',
      });

      console.log(`Location sync completed for ${city}!`);
    } catch (error) {
      console.error(`Location sync failed for ${city}:`, error);
      throw error;
    }
  }

  async syncArtistData(artistName: string): Promise<void> {
    console.log(`Syncing data for artist: ${artistName}...`);
    
    try {
      // 1. Sync artist from Spotify
      const spotifyClient = this.artistSync['spotifyClient'];
      await spotifyClient.authenticate();
      const searchResult = await spotifyClient.searchArtists(artistName, 1);
      
      if (searchResult.artists.items.length > 0) {
        const artist = searchResult.artists.items[0];
        await this.artistSync.syncArtist(artist.id);
        
        // 2. Sync historical setlists
        await this.showSync.syncHistoricalSetlists(artistName);
        
        // 3. Sync recent setlists with full data
        await this.setlistSync.syncRecentSetlists(artistName, 10);
      } else {
        console.warn(`Artist not found on Spotify: ${artistName}`);
      }

      console.log(`Artist sync completed for ${artistName}!`);
    } catch (error) {
      console.error(`Artist sync failed for ${artistName}:`, error);
      throw error;
    }
  }

  async syncCustom(options: SyncOptions): Promise<void> {
    console.log('Starting custom sync with options:', options);
    
    try {
      if (options.artists) {
        await this.artistSync.syncPopularArtists();
      }

      if (options.venues && options.city) {
        await this.venueSync.syncVenuesByCity(options.city, options.stateCode);
      } else if (options.venues) {
        await this.venueSync.syncMajorVenues();
      }

      if (options.shows) {
        await this.showSync.syncUpcomingShows({
          city: options.city,
          stateCode: options.stateCode,
          startDateTime: options.startDate,
          endDateTime: options.endDate,
          classificationName: 'Music',
        });
      }

      if (options.setlists && options.artistName) {
        await this.setlistSync.syncRecentSetlists(options.artistName);
      }

      console.log('Custom sync completed!');
    } catch (error) {
      console.error('Custom sync failed:', error);
      throw error;
    }
  }

  // Utility method to sync data for a specific show
  async syncShowDetails(showId: string): Promise<void> {
    console.log(`Syncing details for show: ${showId}...`);
    
    try {
      await this.setlistSync.syncSetlistByShowId(showId);
      console.log(`Show details sync completed for ${showId}!`);
    } catch (error) {
      console.error(`Show details sync failed for ${showId}:`, error);
      throw error;
    }
  }
}