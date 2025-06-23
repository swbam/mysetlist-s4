import { getDictionary } from '@repo/internationalization';
import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import { SetlistViewer } from './components/setlist-viewer';
import { ShowInfo } from './components/show-info';
import { VoteStats } from './components/vote-stats';

type SetlistPageProps = {
  params: Promise<{
    locale: string;
    showId: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: SetlistPageProps): Promise<Metadata> => {
  const { locale, showId } = await params;
  
  // In real app, fetch show details
  return createMetadata({
    title: 'Taylor Swift - The Eras Tour - TheSet',
    description: 'Live setlist and voting for Taylor Swift at Madison Square Garden',
  });
};

const SetlistPage = async ({ params }: SetlistPageProps) => {
  const { locale, showId } = await params;
  const dictionary = await getDictionary(locale);

  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto">
        <ShowInfo showId={showId} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2">
            <SetlistViewer showId={showId} />
          </div>
          <div>
            <VoteStats showId={showId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetlistPage;