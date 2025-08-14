import { ShowSyncService } from "./packages/external-apis/src/services/show-sync";
import { VenueSyncService } from "./packages/external-apis/src/services/venue-sync";
import { TicketmasterClient } from "./packages/external-apis/src/clients/ticketmaster";
import { db } from "./packages/database/src/index";

async function testShowSync() {
  console.log("Testing show synchronization...");

  try {
    // Test environment variables
    const apiKey = process.env.TICKETMASTER_API_KEY;
    console.log("Ticketmaster API Key present:", !!apiKey);
    console.log("Spotify Client ID present:", !!process.env.SPOTIFY_CLIENT_ID);
    console.log("Spotify Client Secret present:", !!process.env.SPOTIFY_CLIENT_SECRET);

    if (!apiKey) {
      console.error("TICKETMASTER_API_KEY environment variable is missing!");
      return;
    }

    // Test database connection
    console.log("Testing database connection...");
    const dbTest = await db.execute("SELECT 1 as test");
    console.log("Database connection successful:", dbTest);

    // Initialize clients
    const ticketmasterClient = new TicketmasterClient({ apiKey });
    const showSyncService = new ShowSyncService();
    const venueSyncService = new VenueSyncService();

    // Test Ticketmaster API authentication
    console.log("Testing Ticketmaster API...");
    const searchResult = await ticketmasterClient.searchEvents({
      keyword: "Taylor Swift",
      size: 5,
      classificationName: "music"
    });
    
    console.log("Ticketmaster API working:", !!searchResult);
    console.log("Events found:", searchResult._embedded?.events?.length || 0);

    if (searchResult._embedded?.events?.length > 0) {
      const sampleEvent = searchResult._embedded.events[0];
      console.log("Sample event:", {
        id: sampleEvent.id,
        name: sampleEvent.name,
        date: sampleEvent.dates.start.localDate,
        venue: sampleEvent._embedded?.venues?.[0]?.name,
        attraction: sampleEvent._embedded?.attractions?.[0]?.name
      });

      // Test syncing a single show
      console.log("Testing show sync for sample event...");
      await showSyncService.syncShowFromTicketmaster(sampleEvent);
      console.log("Show sync completed for sample event");
    }

    console.log("Test completed successfully!");

  } catch (error) {
    console.error("Test failed:", error);
    console.error("Stack trace:", error.stack);
  }
}

testShowSync().catch(console.error);