import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { createMetadata } from "@repo/seo/metadata";
import { Grid3X3, List } from "lucide-react";
import type { Metadata } from "next";
import React, { Suspense } from "react";
import { ErrorBoundaryWrapper } from "~/components/error-boundary-wrapper";
import { ShowListSkeleton } from "~/components/loading-states";
import { ShowsGrid } from "./components/shows-grid";
import { ShowsList } from "./components/shows-list";
import { ShowsSearch } from "./components/shows-search";

// Force dynamic rendering to ensure data is fresh
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const generateMetadata = (): Metadata => {
  return createMetadata({
    title: "Shows - TheSet",
    description:
      "Find upcoming concerts and shows near you. Get tickets and plan your next live music experience.",
  });
};

const ShowsPage = () => {
  return (
    <ErrorBoundaryWrapper>
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

            <ShowsSearch />


            <Tabs defaultValue="grid" className="w-full">
              <TabsList className="w-full max-w-[400px]">
                <TabsTrigger value="grid" className="gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  Grid View
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  List View
                </TabsTrigger>
              </TabsList>
              <TabsContent value="grid" className="mt-6">
                <Suspense fallback={<ShowListSkeleton count={8} />}>
                  <ShowsGrid />
                </Suspense>
              </TabsContent>
              <TabsContent value="list" className="mt-6">
                <Suspense fallback={<ShowListSkeleton count={5} />}>
                  <ShowsList />
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ErrorBoundaryWrapper>
  );
};

export default ShowsPage;
