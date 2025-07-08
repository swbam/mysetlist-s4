import { SpotifyClient, TicketmasterClient } from '@repo/external-apis';

// Create singleton instances
export const spotify = new SpotifyClient();
export const ticketmaster = new TicketmasterClient();

// External API utilities
export const syncArtistData = async (artistName: string) => {
  console.log('Syncing artist data for:', artistName);

  try {
    await spotify.authenticate();
    const results = await spotify.searchArtists(artistName, 1);
    return { success: true, data: results };
  } catch (error) {
    console.error('Artist sync failed:', error);
    return { success: false, error };
  }
};

export const syncShowData = async (showId: string) => {
  console.log('Syncing show data for:', showId);

  try {
    // In a real implementation, this would fetch show data from external APIs
    return { success: true };
  } catch (error) {
    console.error('Show sync failed:', error);
    return { success: false, error };
  }
};

export const syncVenueData = async (venueId: string) => {
  console.log('Syncing venue data for:', venueId);

  try {
    // In a real implementation, this would fetch venue data from external APIs
    return { success: true };
  } catch (error) {
    console.error('Venue sync failed:', error);
    return { success: false, error };
  }
};
