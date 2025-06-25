import { notFound } from 'next/navigation';
import { createShowMetadata } from '@/lib/seo-metadata';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { BreadcrumbNavigation } from '@/components/breadcrumb-navigation';
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
    return createShowMetadata({
      headliner: 'Show Not Found',
      date: new Date(),
      slug: 'not-found',
    });
  }
  
  return createShowMetadata({
    headliner: show.headliner_artist.name,
    venue: show.venue?.name,
    city: show.venue?.city,
    date: new Date(show.date),
    slug: show.slug,
    image: show.headliner_artist.image_url,
  });
};

const ShowPage = async ({ params }: ShowPageProps) => {
  const { slug } = await params;
  const show = await getShowDetails(slug);
  
  if (!show) {
    notFound();
  }

  const breadcrumbItems = [
    { label: 'Shows', href: '/shows' },
    { 
      label: show.headliner_artist.name, 
      href: `/artists/${show.headliner_artist.slug}` 
    },
    { 
      label: format(new Date(show.date), 'MMM d, yyyy'), 
      isCurrentPage: true 
    },
  ];
  
  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto">
        <BreadcrumbNavigation items={breadcrumbItems} className="mb-6" />
        <ShowPageContent show={show} />
      </div>
    </div>
  );
};

export default ShowPage;