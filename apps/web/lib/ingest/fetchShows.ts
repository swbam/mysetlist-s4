import { fetchAttractionEvents } from './ticketmaster';

export async function fetchShows(tmId: string) {
  try {
    const events = [];
    let page = 0;
    let totalPages = 1;
    
    // Fetch all pages of events (with a reasonable limit)
    while (page < totalPages && page < 5) { // Limit to 5 pages max
      const response = await fetchAttractionEvents(tmId, {
        page,
        size: 200, // Max allowed by Ticketmaster
        includePast: false, // Only upcoming shows
      });
      
      if (response._embedded?.events) {
        events.push(...response._embedded.events);
      }
      
      // Update pagination info
      if (response.page) {
        totalPages = response.page.totalPages;
      }
      
      page++;
    }
    
    // Format shows for database insertion
    return events.map((event: any) => ({
      tm_event_id: event.id,
      name: event.name,
      event_date: event.dates?.start?.dateTime || event.dates?.start?.localDate,
      status: event.dates?.status?.code || 'upcoming',
      venue: event._embedded?.venues?.[0] || null,
      priceRanges: event.priceRanges || [],
      ticketLimit: event.ticketLimit?.info || null,
      seatmap: event.seatmap?.staticUrl || null,
      pleaseNote: event.pleaseNote || null,
      info: event.info || null,
      accessibility: event.accessibility || null,
    }));
    
  } catch (error) {
    console.error('Failed to fetch shows from Ticketmaster:', error);
    return [];
  }
}