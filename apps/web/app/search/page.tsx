import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EnhancedSearch } from "~/app/components/enhanced-search";
import { TicketmasterArtistSearch } from "~/components/search/ticketmaster-artist-search";
import { ImportButton } from "~/components/import/ImportButton";

export const generateMetadata = (): Metadata => {
  return createMetadata({
    title: "Search Artists - TheSet",
    description:
      "Search for your favorite artists and discover their upcoming shows. Find concert setlists and vote on songs you want to hear.",
  });
};

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tighter md:text-6xl">
            Find Artists
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Discover your favorite artists and explore their upcoming shows
          </p>
        </div>

        {/* Enhanced Search Component */}
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          }
        >
          <div className="space-y-8">
            {/* Database Search */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Search Existing Artists</h2>
              <p className="text-sm text-muted-foreground">
                Search artists already in our database
              </p>
              <EnhancedSearch showFilters={false} />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* Ticketmaster Search & Import */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Import New Artist</h2>
                  <p className="text-sm text-muted-foreground">
                    Search Ticketmaster to import a new artist to the platform
                  </p>
                </div>
                <ImportButton />
              </div>
              <TicketmasterArtistSearch />
            </div>
          </div>
        </Suspense>
      </div>
    </div>
  );
}
