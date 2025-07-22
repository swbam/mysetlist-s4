import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      DATABASE_URL: !!process.env.DATABASE_URL,
      TICKETMASTER_API_KEY: !!process.env.TICKETMASTER_API_KEY,
      SPOTIFY_CLIENT_ID: !!process.env.SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_SECRET: !!process.env.SPOTIFY_CLIENT_SECRET,
    },
    vercel: {
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
    }
  });
}