"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketmasterClient = void 0;
const base_1 = require("./base");
class TicketmasterClient extends base_1.BaseAPIClient {
    constructor(config) {
        super({
            ...config,
            baseURL: "https://app.ticketmaster.com/discovery/v2",
            rateLimit: { requests: 5000, window: 24 * 3600 }, // 5000 requests per day
            cache: { defaultTTL: 1800 }, // 30 minutes default cache
        });
    }
    getAuthHeaders() {
        return {
            apikey: this.apiKey,
        };
    }
    async searchEvents(options) {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                params.append(key, value.toString());
            }
        });
        return this.makeRequest(`/events.json?${params}`, {}, `ticketmaster:events:${params.toString()}`, 900);
    }
    async getEvent(eventId) {
        return this.makeRequest(`/events/${eventId}.json`, {}, `ticketmaster:event:${eventId}`, 1800);
    }
    async searchVenues(options) {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                params.append(key, value.toString());
            }
        });
        return this.makeRequest(`/venues.json?${params}`, {}, `ticketmaster:venues:${params.toString()}`, 3600);
    }
    async getVenue(venueId) {
        return this.makeRequest(`/venues/${venueId}.json`, {}, `ticketmaster:venue:${venueId}`, 3600);
    }
    async searchAttractions(options) {
        const params = new URLSearchParams();
        Object.entries(options).forEach(([key, value]) => {
            if (value !== undefined) {
                params.append(key, value.toString());
            }
        });
        return this.makeRequest(`/attractions.json?${params}`, {}, `ticketmaster:attractions:${params.toString()}`, 3600);
    }
    async getAttraction(attractionId) {
        // Use direct fetch to bypass BaseAPIClient issues
        const apiKey = this.apiKey || process.env["TICKETMASTER_API_KEY"];
        if (!apiKey) {
            throw new Error("Ticketmaster API key not configured");
        }
        const url = `https://app.ticketmaster.com/discovery/v2/attractions/${attractionId}.json?apikey=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Attraction not found: ${attractionId}`);
            }
            throw new Error(`Ticketmaster API error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    }
}
exports.TicketmasterClient = TicketmasterClient;
