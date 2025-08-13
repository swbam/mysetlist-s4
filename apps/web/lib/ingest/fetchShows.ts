import { TicketmasterClient } from "@repo/external-apis";

export async function fetchShows(tmId: string) {
  try {
    const ticketmasterClient = new TicketmasterClient({
      apiKey:
        process.env.TICKETMASTER_API_KEY || "k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b",
    });

    const events: any[] = [];
    let page = 0;
    let totalPages = 1;

    // Fetch all pages of events (with a reasonable limit)
    while (page < totalPages && page < 5) {
      // Limit to 5 pages max
      // Use makeRequest directly to include attractionId parameter
      const response = await (ticketmasterClient as any).makeRequest(
        `events.json?attractionId=${tmId}&page=${page}&size=200`,
        {},
        `ticketmaster:attraction-events:${tmId}:${page}`,
        900,
      );

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
      status: event.dates?.status?.code || "upcoming",
      venue: event._embedded?.venues?.[0] || null,
      priceRanges: event.priceRanges || [],
      ticketLimit: event.ticketLimit?.info || null,
      seatmap: event.seatmap?.staticUrl || null,
      pleaseNote: event.pleaseNote || null,
      info: event.info || null,
      accessibility: event.accessibility || null,
    }));
  } catch (error) {
    console.error("Failed to fetch shows from Ticketmaster:", error);
    return [];
  }
}
