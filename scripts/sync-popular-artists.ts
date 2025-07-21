#!/usr/bin/env tsx

import { env } from '../apps/web/env';

async function syncPopularArtists() {
  try {
    const response = await fetch(
      `${env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/artists/sync`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors?.length > 0) {
      result.errors.forEach((_error: string) => );
    }

    if (result.syncedArtists?.length > 0) {
      result.syncedArtists.forEach((_artist: any) => {});
    }
  } catch (_error) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  syncPopularArtists();
}

export { syncPopularArtists };
