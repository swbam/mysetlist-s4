// Test Ticketmaster API directly without database dependencies
import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

async function testTicketmasterAPI() {
  console.log("Testing Ticketmaster API directly...");

  const apiKey = process.env.TICKETMASTER_API_KEY;
  console.log("API Key present:", !!apiKey);

  if (!apiKey) {
    console.error("TICKETMASTER_API_KEY environment variable is missing!");
    return;
  }

  try {
    // Test basic API connectivity
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?keyword=Taylor%20Swift&size=5&classificationName=music&apikey=${apiKey}`;
    
    console.log("Making API request to Ticketmaster...");
    const response = await fetch(url);
    
    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", errorText);
      return;
    }

    const data = await response.json();
    console.log("API Response successful!");
    console.log("Events found:", data._embedded?.events?.length || 0);
    
    if (data._embedded?.events?.length > 0) {
      const event = data._embedded.events[0];
      console.log("Sample event structure:");
      console.log({
        id: event.id,
        name: event.name,
        url: event.url,
        date: event.dates?.start?.localDate,
        venue: event._embedded?.venues?.[0]?.name,
        attraction: event._embedded?.attractions?.[0]?.name,
        hasVenues: !!event._embedded?.venues?.length,
        hasAttractions: !!event._embedded?.attractions?.length,
        priceRanges: event.priceRanges?.length || 0,
        status: event.dates?.status?.code
      });
    }

    // Test specific attraction search
    console.log("\nTesting attraction search...");
    const attractionUrl = `https://app.ticketmaster.com/discovery/v2/attractions.json?keyword=Taylor%20Swift&size=5&apikey=${apiKey}`;
    const attractionResponse = await fetch(attractionUrl);
    
    if (attractionResponse.ok) {
      const attractionData = await attractionResponse.json();
      console.log("Attractions found:", attractionData._embedded?.attractions?.length || 0);
      
      if (attractionData._embedded?.attractions?.length > 0) {
        const attraction = attractionData._embedded.attractions[0];
        console.log("Sample attraction:");
        console.log({
          id: attraction.id,
          name: attraction.name,
          upcomingEvents: attraction.upcomingEvents?._total || 0
        });
        
        // Test events by attraction ID
        if (attraction.id) {
          console.log("\nTesting events by attraction ID...");
          const attractionEventsUrl = `https://app.ticketmaster.com/discovery/v2/events.json?attractionId=${attraction.id}&size=10&apikey=${apiKey}`;
          const attractionEventsResponse = await fetch(attractionEventsUrl);
          
          if (attractionEventsResponse.ok) {
            const attractionEventsData = await attractionEventsResponse.json();
            console.log("Events for attraction:", attractionEventsData._embedded?.events?.length || 0);
          }
        }
      }
    }

  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

testTicketmasterAPI();