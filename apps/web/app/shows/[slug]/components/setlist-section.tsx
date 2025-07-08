'use client';

import { LiveIndicator } from '@/components/live-indicator';
import { RealtimeSetlistViewer } from '@/components/setlist/realtime-setlist-viewer';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/design-system/components/ui/tabs';
import { Music, Plus, Vote } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CreateSetlistDialog } from './create-setlist-dialog';
import { EmptyState } from './empty-state';
import { SetlistViewer } from './setlist-viewer';
import { SongDropdown } from './song-dropdown';

type SetlistSectionProps = {
  show: any;
  actualSetlists: any[];
  predictedSetlists: any[];
  currentUser: any;
};

export function SetlistSection({
  show,
  actualSetlists,
  predictedSetlists,
  currentUser,
}: SetlistSectionProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [setlistType, setSetlistType] = useState<'predicted' | 'actual'>(
    'predicted'
  );

  const canCreateSetlist = currentUser && show.status !== 'cancelled';
  const hasActualSetlists = actualSetlists.length > 0;
  const hasPredictedSetlists = predictedSetlists.length > 0;
  const hasAnySetlists = hasActualSetlists || hasPredictedSetlists;

  const showDate = new Date(show.date);
  const isPastShow = showDate < new Date();
  const isLive = show.status === 'ongoing';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-bold text-2xl">
          <Music className="h-6 w-6" />
          Setlists
          {isLive && <LiveIndicator size="sm" />}
        </h2>

        <div className="flex gap-2">
          {/* Core requirement: Add songs dropdown on show page */}
          {hasPredictedSetlists && currentUser && (
            <SongDropdown
              show={show}
              setlists={predictedSetlists}
              onSongAdded={() => window.location.reload()}
            />
          )}
          {hasAnySetlists && (
            <Link href={`/setlists/${show.id}`}>
              <Button variant="outline" className="gap-2">
                <Vote className="h-4 w-4" />
                Vote on Songs
              </Button>
            </Link>
          )}
          {canCreateSetlist && (
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Setlist
            </Button>
          )}
        </div>
      </div>

      {/* Live Setlist for ongoing shows */}
      {isLive && (
        <div className="mb-6">
          <RealtimeSetlistViewer
            showId={show.id}
            isLive={true}
            showVotes={true}
          />
        </div>
      )}

      {hasAnySetlists ? (
        <Tabs
          defaultValue={hasActualSetlists ? 'actual' : 'predicted'}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="actual" disabled={!hasActualSetlists}>
              Actual {hasActualSetlists && `(${actualSetlists.length})`}
            </TabsTrigger>
            <TabsTrigger value="predicted" disabled={!hasPredictedSetlists}>
              Predicted{' '}
              {hasPredictedSetlists && `(${predictedSetlists.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="actual" className="mt-6 space-y-4">
            {actualSetlists.map((setlist) => (
              <SetlistViewer
                key={setlist.id}
                setlist={setlist}
                show={show}
                currentUser={currentUser}
                type="actual"
              />
            ))}
          </TabsContent>

          <TabsContent value="predicted" className="mt-6 space-y-4">
            {predictedSetlists.map((setlist) => (
              <SetlistViewer
                key={setlist.id}
                setlist={setlist}
                show={show}
                currentUser={currentUser}
                type="predicted"
              />
            ))}
          </TabsContent>
        </Tabs>
      ) : (
        <EmptyState
          icon={Music}
          title="No setlists yet"
          description={
            isPastShow
              ? 'Be the first to add the actual setlist from this show'
              : 'Be the first to predict what songs will be played'
          }
          action={
            canCreateSetlist && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Create {isPastShow ? 'Actual' : 'Predicted'} Setlist
              </Button>
            )
          }
        />
      )}

      {/* Create Setlist Dialog */}
      {showCreateDialog && (
        <CreateSetlistDialog
          show={show}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          defaultType={isPastShow ? 'actual' : 'predicted'}
        />
      )}
    </div>
  );
}
