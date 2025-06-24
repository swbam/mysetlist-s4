import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import { ArtistSearch } from './components/artist-search';

export const generateMetadata = async (): Promise<Metadata> => {
  return createMetadata({
    title: 'Artists - MySetlist',
    description: 'Discover artists, explore their upcoming shows, and track your favorites',
  });
};

const ArtistsPage = async () => {
  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h1 className="font-regular text-4xl tracking-tighter md:text-6xl">
              Discover Artists
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Search for your favorite artists to discover their upcoming shows and past setlists
            </p>
          </div>
          
          <ArtistSearch />
          
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="p-6 rounded-lg border">
                <div className="text-3xl mb-2">🔍</div>
                <h3 className="font-semibold mb-2">Search Artists</h3>
                <p className="text-muted-foreground text-sm">
                  Use the search above to find artists. We'll automatically sync their data from Ticketmaster.
                </p>
              </div>
              <div className="p-6 rounded-lg border">
                <div className="text-3xl mb-2">🎵</div>
                <h3 className="font-semibold mb-2">Discover Shows</h3>
                <p className="text-muted-foreground text-sm">
                  View upcoming concerts, venues, and ticket information for your favorite artists.
                </p>
              </div>
              <div className="p-6 rounded-lg border">
                <div className="text-3xl mb-2">📝</div>
                <h3 className="font-semibold mb-2">Vote on Setlists</h3>
                <p className="text-muted-foreground text-sm">
                  Help predict what songs artists will play at their upcoming shows.
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mt-6">
              Try searching for popular artists like "Dave Matthews Band", "Taylor Swift", or "The Rolling Stones"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistsPage;