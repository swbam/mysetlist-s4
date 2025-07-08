#!/usr/bin/env tsx

import { env } from '../apps/web/env';

async function syncPopularArtists() {
  console.log('🎵 Starting sync of popular artists...');

  try {
    const response = await fetch(
      `${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/artists/sync`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    console.log('✅ Sync completed successfully!');
    console.log(`📊 Results:`);
    console.log(
      `- Synced: ${result.syncedCount}/${result.totalAttempted} artists`
    );
    console.log(`- Errors: ${result.errors?.length || 0}`);

    if (result.errors?.length > 0) {
      console.log('\n❌ Errors encountered:');
      result.errors.forEach((error: string) => console.log(`  - ${error}`));
    }

    if (result.syncedArtists?.length > 0) {
      console.log('\n🎤 Successfully synced artists:');
      result.syncedArtists.forEach((artist: any) => {
        console.log(`  - ${artist.name} (${artist.followers} followers)`);
      });
    }
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  syncPopularArtists();
}

export { syncPopularArtists };
