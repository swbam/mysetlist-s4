// Production configuration
export const productionConfig = {
  // Production URLs
  urls: {
    app: 'https://mysetlist-sonnet.vercel.app',
    web: 'https://mysetlist-sonnet.vercel.app',
    api: 'https://mysetlist-sonnet.vercel.app/api',
    docs: 'https://docs.mysetlist-sonnet.vercel.app',
  },
  
  // Vercel configuration
  vercel: {
    projectName: 'mysetlist-sonnet',
    productionUrl: 'mysetlist-sonnet.vercel.app',
  },
  
  // External services
  services: {
    supabase: {
      projectRef: process.env.SUPABASE_PROJECT_REF || 'yzwkimtdaabyjbpykquu',
    },
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID,
      redirectUri: 'https://mysetlist-sonnet.vercel.app/auth/callback/spotify',
    },
  },
  
  // Cron job configuration
  cron: {
    // All cron jobs should call these endpoints
    endpoints: {
      masterSync: 'https://mysetlist-sonnet.vercel.app/api/cron/master-sync',
      calculateTrending: 'https://mysetlist-sonnet.vercel.app/api/cron/calculate-trending',
      syncArtists: 'https://mysetlist-sonnet.vercel.app/api/cron/sync/artists',
    },
    // Cron schedules (in cron format)
    schedules: {
      hourlySync: '0 * * * *', // Every hour
      dailySync: '0 3 * * *', // 3 AM UTC daily
      trendingCalc: '0 */6 * * *', // Every 6 hours
    },
  },
  
  // Feature flags
  features: {
    enableSpotifySync: true,
    enableTicketmasterSync: true,
    enableSetlistFmSync: true,
    enableRealtime: true,
    enableAnalytics: true,
  },
};

// Helper to get the correct app URL
export function getAppUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    // In production, always use the configured production URL
    return productionConfig.urls.app;
  }
  
  // In development or preview, use environment variables or fallback
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
}
