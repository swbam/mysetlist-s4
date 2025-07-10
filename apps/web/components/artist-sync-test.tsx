'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useArtistSync } from '~/hooks/use-artist-sync';

export function ArtistSyncTest() {
  const [artistName, setArtistName] = useState('');
  const { syncArtist, isLoading, progress, error } = useArtistSync();

  const handleAutoImport = async () => {
    if (!artistName.trim()) {
      toast.error('Please enter an artist name');
      return;
    }

    try {
      // First, trigger auto-import
      const importResponse = await fetch('/api/artists/auto-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artistName: artistName.trim(),
        }),
      });

      if (!importResponse.ok) {
        const errorData = await importResponse.json();
        throw new Error(errorData.error || 'Auto-import failed');
      }

      const importData = await importResponse.json();

      if (importData.success) {
        toast.success(
          `Artist "${importData.artist.name}" imported successfully!`
        );

        if (importData.stats.syncTriggered) {
          toast.info('Background sync started for full catalog data');
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to import artist';
      toast.error(message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h2 className="mb-4 font-bold text-2xl">Artist Sync Test</h2>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="artistName"
            className="mb-2 block font-medium text-sm"
          >
            Artist Name
          </label>
          <input
            id="artistName"
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Enter artist name (e.g., Taylor Swift)"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleAutoImport}
            disabled={isLoading}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Importing...' : 'Auto Import Artist'}
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-red-700">Error: {error.message}</p>
          </div>
        )}

        {progress && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 font-semibold">Sync Progress</h3>
            <div className="space-y-2">
              <p className="text-sm">
                Status: <span className="font-medium">{progress.status}</span>
              </p>
              <p className="text-sm">
                Current Step: {progress.progress.currentStep}
              </p>
              <p className="text-sm">
                Progress: {progress.progress.completedSteps} /{' '}
                {progress.progress.totalSteps} steps
              </p>

              <div className="mt-3">
                <div className="space-y-1 text-sm">
                  <p>
                    Songs: {progress.progress.details.songs.synced} synced,{' '}
                    {progress.progress.details.songs.errors} errors
                  </p>
                  <p>
                    Shows: {progress.progress.details.shows.synced} synced,{' '}
                    {progress.progress.details.shows.errors} errors
                  </p>
                  <p>
                    Venues: {progress.progress.details.venues.synced} synced,{' '}
                    {progress.progress.details.venues.errors} errors
                  </p>
                  <p>
                    Setlists: {progress.progress.details.setlists.synced}{' '}
                    synced, {progress.progress.details.setlists.errors} errors
                  </p>
                </div>
              </div>

              <div className="mt-3 h-2.5 w-full rounded-full bg-gray-200">
                <div
                  className="h-2.5 rounded-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: `${(progress.progress.completedSteps / progress.progress.totalSteps) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
