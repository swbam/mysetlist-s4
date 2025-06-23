import { getDictionary } from '@repo/internationalization';
import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import { ArtistGridServer } from './components/artist-grid-server';
import { ArtistSearch } from './components/artist-search';

type ArtistsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: ArtistsPageProps): Promise<Metadata> => {
  const { locale } = await params;
  
  return createMetadata({
    title: 'Artists - TheSet',
    description: 'Discover artists, explore their upcoming shows, and track your favorites',
  });
};

const ArtistsPage = async ({ params }: ArtistsPageProps) => {
  const { locale } = await params;
  const dictionary = await getDictionary(locale);

  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h1 className="font-regular text-4xl tracking-tighter md:text-6xl">
              Discover Artists
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Explore your favorite artists, find new ones, and never miss their shows
            </p>
          </div>
          
          <ArtistSearch />
          
          <ArtistGridServer />
        </div>
      </div>
    </div>
  );
};

export default ArtistsPage;