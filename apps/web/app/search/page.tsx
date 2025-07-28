import { createMetadata } from "@repo/seo/metadata"
import type { Metadata } from "next"
import { Suspense } from "react"
import { EnhancedSearch } from "~/components/search/enhanced-search"

export const generateMetadata = (): Metadata => {
  return createMetadata({
    title: "Search - MySetlist",
    description:
      "Search for artists, shows, venues, and songs. Discover your next concert experience with advanced filtering options.",
  })
}

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tighter md:text-6xl">
            Search MySetlist
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Find artists, shows, venues, and songs with advanced filters
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
          <EnhancedSearch showFilters={true} />
        </Suspense>
      </div>
    </div>
  )
}
