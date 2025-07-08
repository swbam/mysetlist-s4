import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    apis: {
      spotify: {
        clientId: !!process.env.SPOTIFY_CLIENT_ID,
        clientSecret: !!process.env.SPOTIFY_CLIENT_SECRET,
      },
      ticketmaster: {
        apiKey: !!process.env.TICKETMASTER_API_KEY,
      },
      setlistfm: {
        apiKey: !!process.env.SETLISTFM_API_KEY,
      }
    }
  });
}