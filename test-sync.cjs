#!/usr/bin/env node'use strict';'use strict';

// Real Data Sync Test - SUB-AGENT 2 Database Agent
// Testing complete sync pipeline with real external API data

const _https = require('node:https');
const _fs = require('node:fs');

// Configuration from .env.local
const config = {
  spotify: {
    clientId: '2946864dc822469b9c672292ead45f43',
    clientSecret: 'feaf0fc901124b839b11e02f97d18a8d',
  },
  ticketmaster: {
    apiKey: 'k8GrSAkbFaN0w7qDxGl7ohr8LwdAQm9b',
  },
  setlistfm: {
    apiKey: 'xkutflW-aRy_Df9rF4OkJyCsHBYN88V37EBL',
  },
  supabase: {
    url: 'https://yzwkimtdaabyjbpykquu.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6d2tpbXRkYWFieWpicHlrcXV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2OTIzMTYsImV4cCI6MjA2NjI2ODMxNn0.8pKUt_PL7q9XmNACDKVrkyqBfK8jmUDx6ARNybrmIVM',
  },
};

// Test 1: Spotify API Integration
async function testSpotify() {
  try {
    // Get access token
    const authResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${config.spotify.clientId}:${config.spotify.clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    const authData = await authResponse.json();

    if (!authData.access_token) {
      throw new Error('Failed to get Spotify access token');
    }

    // Test artist search
    const searchResponse = await fetch(
      'https://api.spotify.com/v1/search?q=Taylor%20Swift&type=artist&limit=1',
      {
        headers: {
          Authorization: `Bearer ${authData.access_token}`,
        },
      }
    );

    const searchData = await searchResponse.json();
    const artist = searchData.artists.items[0];

    // Test top tracks
    const tracksResponse = await fetch(
      `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=US`,
      {
        headers: {
          Authorization: `Bearer ${authData.access_token}`,
        },
      }
    );

    const tracksData = await tracksResponse.json();

    return {
      success: true,
      artist: artist,
      tracks: tracksData.tracks.slice(0, 3),
      token: authData.access_token,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test 2: Ticketmaster API Integration
async function testTicketmaster() {
  try {
    // Search for Taylor Swift events
    const eventsResponse = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${config.ticketmaster.apiKey}&keyword=Taylor%20Swift&size=5&classificationName=Music`
    );

    const eventsData = await eventsResponse.json();

    if (eventsData._embedded?.events?.length > 0) {
      const _event = eventsData._embedded.events[0];
    }

    // Test attraction search
    const attractionsResponse = await fetch(
      `https://app.ticketmaster.com/discovery/v2/attractions.json?apikey=${config.ticketmaster.apiKey}&keyword=Taylor%20Swift&size=3`
    );
    const attractionsData = await attractionsResponse.json();

    return {
      success: true,
      events: eventsData._embedded?.events || [],
      attractions: attractionsData._embedded?.attractions || [],
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test 3: Setlist.fm API Integration
async function testSetlistFm() {
  try {
    // Search for Taylor Swift
    const artistResponse = await fetch(
      'https://api.setlist.fm/rest/1.0/search/artists?artistName=Taylor%20Swift&p=1&sort=relevance',
      {
        headers: {
          'x-api-key': config.setlistfm.apiKey,
          Accept: 'application/json',
          'User-Agent': 'MySetlist/1.0',
        },
      }
    );

    const artistData = await artistResponse.json();

    if (artistData.artist?.length > 0) {
      const artist = artistData.artist[0];

      // Get recent setlists
      const setlistResponse = await fetch(
        `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${artist.mbid}&p=1`,
        {
          headers: {
            'x-api-key': config.setlistfm.apiKey,
            Accept: 'application/json',
            'User-Agent': 'MySetlist/1.0',
          },
        }
      );

      const setlistData = await setlistResponse.json();

      if (setlistData.setlist?.length > 0) {
        const setlist = setlistData.setlist[0];

        const _songCount =
          setlist.sets?.set?.reduce(
            (total, set) => total + (set.song?.length || 0),
            0
          ) || 0;
      }

      return {
        success: true,
        artist: artist,
        setlists: setlistData.setlist || [],
      };
    }

    return { success: true, artist: null, setlists: [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test 4: Database Connectivity
async function testDatabase() {
  try {
    // Test basic connectivity
    const response = await fetch(
      `${config.supabase.url}/rest/v1/artists?select=id,name,slug,spotify_id,followers&limit=3`,
      {
        headers: {
          Authorization: `Bearer ${config.supabase.anonKey}`,
          apikey: config.supabase.anonKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Database query failed: ${response.status} ${response.statusText}`
      );
    }

    const artists = await response.json();

    artists.forEach((_artist) => {});

    // Test shows table
    const showsResponse = await fetch(
      `${config.supabase.url}/rest/v1/shows?select=id,name,date,status&limit=3`,
      {
        headers: {
          Authorization: `Bearer ${config.supabase.anonKey}`,
          apikey: config.supabase.anonKey,
        },
      }
    );

    if (showsResponse.ok) {
      const _shows = await showsResponse.json();
    }

    // Test venues table
    const venuesResponse = await fetch(
      `${config.supabase.url}/rest/v1/venues?select=id,name,city,state&limit=3`,
      {
        headers: {
          Authorization: `Bearer ${config.supabase.anonKey}`,
          apikey: config.supabase.anonKey,
        },
      }
    );

    if (venuesResponse.ok) {
      const _venues = await venuesResponse.json();
    }

    return {
      success: true,
      artists: artists,
      tablesAccessible: true,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Main test execution
async function runTests() {
  const results = {
    spotify: await testSpotify(),
    ticketmaster: await testTicketmaster(),
    setlistfm: await testSetlistFm(),
    database: await testDatabase(),
  };

  const allPassed = Object.values(results).every((result) => result.success);
  if (allPassed) {
  } else {
    Object.entries(results).forEach(([_system, result]) => {
      if (!result.success) {
      }
    });
  }

  return allPassed;
}

// Execute tests
runTests().catch(console.error);
