import { notFound } from 'next/navigation';
import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { getShowDetails } from './actions';
import { ShowPageContent } from './components/show-page-content';

type ShowPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: ShowPageProps): Promise<Metadata> => {
  const { slug } = await params;
  const show = await getShowDetails(slug);
  
  if (!show) {
    return createMetadata({
      title: 'Show Not Found - TheSet',
      description: 'The show you are looking for could not be found.',
    });
  }
  
  const showDate = format(new Date(show.date), 'MMMM d, yyyy');
  
  return createMetadata({
    title: `${show.headliner_artist.name} at ${show.venue?.name || 'TBA'} - ${showDate} | TheSet`,
    description: `Get tickets and setlist for ${show.headliner_artist.name} performing at ${show.venue?.name || 'TBA'} on ${showDate}. View attendance, venue details, and more.`,
    openGraph: {
      images: [
        {
          url: show.headliner_artist.image_url || '',
          width: 1200,
          height: 630,
          alt: show.headliner_artist.name,
        },
      ],
    },
  });
};

const ShowPage = async ({ params }: ShowPageProps) => {
  const { slug } = await params;
  const show = await getShowDetails(slug);
  
  if (!show) {
    notFound();
  }
  
  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto">
        <ShowPageContent show={show} />
      </div>
    </div>
  );
};

export default ShowPage;