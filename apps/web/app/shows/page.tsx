import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/design-system/components/ui/tabs';
import { createMetadata } from '@repo/seo/metadata';
import { List } from 'lucide-react';
import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import { ErrorBoundaryWrapper } from '~/components/error-boundary-wrapper';
import { ShowListSkeleton } from '~/components/loading-states';
import { ShowsFilter } from './components/shows-filter';
import { ShowsList } from './components/shows-list';

// Force dynamic rendering to ensure data is fresh
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const generateMetadata = (): Metadata => {
  return createMetadata({
    title: 'Shows - MySetlist',
    description:
      'Find upcoming concerts and shows near you. Get tickets and plan your next live music experience.',
  });
};

const ShowsPage = () => {
  return React.createElement(ErrorBoundaryWrapper as any, {}, (
    <div className="flex flex-col gap-8 py-8 md:py-16">
        <div className="container mx-auto">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <h1 className="font-regular text-4xl tracking-tighter md:text-6xl">
                Upcoming Shows
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Discover live music happening near you and around the world
              </p>
            </div>

            {React.createElement(Suspense as any, { fallback: React.createElement('div', { className: "h-12" }) },
              React.createElement(ShowsFilter)
            )}

            <Tabs defaultValue="list" className="w-full">
              <TabsList className="w-full max-w-[200px]">
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  List View
                </TabsTrigger>
              </TabsList>
              <TabsContent value="list" className="mt-6">
                {React.createElement(Suspense as any, { 
                  fallback: React.createElement(ShowListSkeleton, { count: 5 }) 
                },
                  React.createElement(ShowsList)
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
  ));
};

export default ShowsPage;
