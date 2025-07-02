import { createMetadata } from '@repo/seo/metadata';
import type { Metadata } from 'next';
import { ShowsFilter } from './components/shows-filter';
import { ShowsList } from './components/shows-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { List } from 'lucide-react';

// Force dynamic rendering due to useSearchParams in ShowsFilter component
export const dynamic = 'force-dynamic';

export const generateMetadata = async (): Promise<Metadata> => {
  return createMetadata({
    title: 'Shows - MySetlist',
    description: 'Find upcoming concerts and shows near you. Get tickets and plan your next live music experience.',
  });
};

const ShowsPage = async () => {
  return (
    <div className="flex flex-col gap-8 py-8 md:py-16">
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <h1 className="font-regular text-4xl tracking-tighter md:text-6xl">
              Upcoming Shows
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Discover live music happening near you and around the world
            </p>
          </div>
          
          <ShowsFilter />
          
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="w-full max-w-[200px]">
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List View
              </TabsTrigger>
            </TabsList>
            <TabsContent value="list" className="mt-6">
              <ShowsList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ShowsPage;