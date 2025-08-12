import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EnhancedSearch } from "~/app/components/enhanced-search";

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
          <EnhancedSearch showFilters={false} />
        </Suspense>
      </div>
    </div>
  );
}
