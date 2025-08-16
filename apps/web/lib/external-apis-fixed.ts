/**
 * External API clients with proper exports
 * These are function modules, not classes
 */

import * as SpotifyAPI from './services/adapters/SpotifyClient';
import * as TicketmasterAPI from './services/adapters/TicketmasterClient';

// Export the API modules directly
export const spotify = SpotifyAPI;
export const ticketmaster = TicketmasterAPI;

// For backward compatibility with code expecting classes
export class SpotifyClient {
  async getAccessToken() {
    return SpotifyAPI.getAccessToken();
  }
  
  async listAllAlbums(artistId: string, token?: string) {
    return SpotifyAPI.listAllAlbums(artistId, token);
  }
  
  async listAlbumTracks(albumId: string, token?: string) {
    return SpotifyAPI.listAlbumTracks(albumId, token);
  }
  
  async getTracksDetails(trackIds: string[], token?: string) {
    return SpotifyAPI.getTracksDetails(trackIds, token);
  }
  
  async getAudioFeatures(trackIds: string[], token?: string) {
    return SpotifyAPI.getAudioFeatures(trackIds, token);
  }
  
  async searchArtists(query: string, token?: string) {
    return SpotifyAPI.searchArtists(query, token);
  }
  
  async getArtist(artistId: string, token?: string) {
    return SpotifyAPI.getArtist(artistId, token);
  }
}

export class TicketmasterClient {
  private apiKey?: string;
  
  constructor(config?: { apiKey?: string }) {
    this.apiKey = config?.apiKey;
  }
  
  async *iterateEventsByAttraction(attractionId: string) {
    yield* TicketmasterAPI.iterateEventsByAttraction(attractionId, this.apiKey);
  }
  
  async searchAttractions(query: string, options?: any) {
    return TicketmasterAPI.searchAttractions(query, { ...options, apiKey: this.apiKey });
  }
  
  async getVenue(venueId: string) {
    return TicketmasterAPI.getVenue(venueId, this.apiKey);
  }
  
  async getEvent(eventId: string) {
    return TicketmasterAPI.getEvent(eventId, this.apiKey);
  }
}