"use client";

import { useRouter } from "next/navigation";
import { ImportProgress } from "~/components/import/ImportProgress";

interface ArtistImportProgressProps {
  artistId: string;
  artistSlug: string;
  artistName: string;
}

export function ArtistImportProgress({ 
  artistId, 
  artistSlug, 
  artistName 
}: ArtistImportProgressProps) {
  const router = useRouter();

  const handleComplete = () => {
    // Redirect to artist page after successful completion
    router.push(`/artists/${artistSlug}`);
    router.refresh(); // Refresh to load the new artist data
  };

  const handleError = (error: string) => {
    console.error('[ArtistImportProgress] Import failed:', error);
    // Could show an error notification or redirect to error page
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Importing {artistName}</h1>
          <p className="text-muted-foreground mt-2">
            We're importing this artist from Ticketmaster. This usually takes 1-2 minutes.
          </p>
        </div>
        
        <ImportProgress
          artistId={artistId}
          onComplete={handleComplete}
          onError={handleError}
          showTitle={true}
          showEstimatedTime={true}
          autoRetry={true}
        />
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-900">What's happening?</h3>
          <ul className="mt-2 text-sm text-blue-800 space-y-1">
            <li>• Fetching artist information from Ticketmaster and Spotify</li>
            <li>• Importing upcoming shows and venues</li>
            <li>• Building studio-only song catalog (live versions excluded)</li>
            <li>• Creating initial predicted setlists</li>
          </ul>
        </div>
      </div>
    </div>
  );
}