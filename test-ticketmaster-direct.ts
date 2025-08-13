#!/usr/bin/env tsx

import "dotenv/config";

async function testTicketmasterDirect() {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  console.log(`Testing with API key: ${apiKey?.substring(0, 8)}...`);

  const testUrl = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&countryCode=US&size=1`;

  try {
    const response = await fetch(testUrl);
    console.log(`Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log("Error response body:", errorText);
      return;
    }

    const data = await response.json();
    console.log("✅ Direct API call successful!");
    console.log(`Found ${data._embedded?.events?.length || 0} events`);

    if (data._embedded?.events?.[0]) {
      const event = data._embedded.events[0];
      console.log(
        `Sample event: ${event.name} at ${event._embedded?.venues?.[0]?.name || "Unknown venue"}`,
      );
    }
  } catch (error) {
    console.error("❌ Direct API test failed:", error);
  }
}

testTicketmasterDirect();
