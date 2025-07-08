'use client';

import { useArtistSync } from '@/hooks/use-artist-sync';
import { useState } from 'react';
import { toast } from 'sonner';

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
        toast.success(`Artist "${importData.artist.name}" imported successfully!`);
        
        if (importData.stats.syncTriggered) {
          toast.info('Background sync started for full catalog data');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import artist';
      toast.error(message);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Artist Sync Test</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="artistName" className="block text-sm font-medium mb-2">
            Artist Name
          </label>
          <input
            id="artistName"
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Enter artist name (e.g., Taylor Swift)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleAutoImport}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Importing...' : 'Auto Import Artist'}
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">Error: {error.message}</p>
          </div>
        )}

        {progress && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold mb-2">Sync Progress</h3>
            <div className="space-y-2">
              <p className="text-sm">Status: <span className="font-medium">{progress.status}</span></p>
              <p className="text-sm">Current Step: {progress.progress.currentStep}</p>
              <p className="text-sm">
                Progress: {progress.progress.completedSteps} / {progress.progress.totalSteps} steps
              </p>
              
              <div className="mt-3">
                <div className="text-sm space-y-1">
                  <p>Songs: {progress.progress.details.songs.synced} synced, {progress.progress.details.songs.errors} errors</p>
                  <p>Shows: {progress.progress.details.shows.synced} synced, {progress.progress.details.shows.errors} errors</p>
                  <p>Venues: {progress.progress.details.venues.synced} synced, {progress.progress.details.venues.errors} errors</p>
                  <p>Setlists: {progress.progress.details.setlists.synced} synced, {progress.progress.details.setlists.errors} errors</p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(progress.progress.completedSteps / progress.progress.totalSteps) * 100}%` 
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