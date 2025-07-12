import { SpotifyClient, TicketmasterClient } from '@repo/external-apis';

// Create singleton instances
export const spotify = new SpotifyClient({});
export const ticketmaster = new TicketmasterClient({});

// External API utilities
export const syncArtistData = async (artistName: string) => {
  try {
    await spotify.authenticate();
    const results = await spotify.searchArtists(artistName, 1);
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error };
  }
};

export const syncShowData = async (_showId: string) => {
  try {
    // In a real implementation, this would fetch show data from external APIs
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

export const syncVenueData = async (_venueId: string) => {
  try {
    // In a real implementation, this would fetch venue data from external APIs
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};
