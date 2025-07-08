'use client';

import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import { Label } from '@repo/design-system/components/ui/label';
import { Switch } from '@repo/design-system/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/design-system/components/ui/tabs';
import { BarChart3, Music2, Plus, Shuffle, Users, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { VoteSummary } from '../voting/vote-summary';
import { AddSongModal } from './add-song-modal';
import { RealtimeSetlistViewer } from './realtime-setlist-viewer';
import { SetlistEditor } from './setlist-editor';

interface SetlistManagerProps {
  showId: string;
  show: {
    id: string;
    name: string;
    date: string;
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
    headliner_artist: {
      id: string;
      name: string;
    };
  };
  currentUser?: {
    id: string;
    role?: string;
  };
  initialSetlists?: any[];
}

export function SetlistManager({
  showId,
  show,
  currentUser,
  initialSetlists = [],
}: SetlistManagerProps) {
  const [setlists, setSetlists] = useState(initialSetlists);
  const [activeTab, setActiveTab] = useState('predicted');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(
    show.status === 'ongoing'
  );
  const [showVotingStats, setShowVotingStats] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const actualSetlists = setlists.filter((s) => s.type === 'actual');
  const predictedSetlists = setlists.filter((s) => s.type === 'predicted');

  const canEdit =
    currentUser &&
    (currentUser.role === 'admin' ||
      currentUser.role === 'moderator' ||
      show.status !== 'completed');

  const canVote = currentUser && show.status !== 'cancelled';
  const isLive = show.status === 'ongoing';

  useEffect(() => {
    if (isRealtimeEnabled && isLive) {
      const interval = setInterval(() => {
        fetchSetlists();
      }, 10000); // Refresh every 10 seconds when live

      return () => clearInterval(interval);
    }
  }, [isRealtimeEnabled, isLive, showId]);

  const fetchSetlists = async () => {
    try {
      const response = await fetch(`/api/setlists/${showId}`);
      if (response.ok) {
        const data = await response.json();
        setSetlists(data.setlists || []);
      }
    } catch (error) {
      console.error('Failed to fetch setlists:', error);
    }
  };

  const createNewSetlist = async (type: 'predicted' | 'actual') => {
    try {
      const response = await fetch('/api/setlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          showId,
          artistId: show.headliner_artist.id,
          type,
          name: type === 'actual' ? 'Actual Setlist' : 'Predicted Setlist',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create setlist');
      }

      const newSetlist = await response.json();
      setSetlists([...setlists, newSetlist]);
      toast.success(
        `${type === 'actual' ? 'Actual' : 'Predicted'} setlist created`
      );

      return newSetlist;
    } catch (error) {
      console.error('Create setlist error:', error);
      toast.error('Failed to create setlist');
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    fetchSetlists();
  };

  const calculateVotingStats = () => {
    let totalVotes = 0;
    let totalUpvotes = 0;
    let totalDownvotes = 0;
    const topSongs: any[] = [];

    predictedSetlists.forEach((setlist) => {
      setlist.songs?.forEach((song: any) => {
        totalVotes += song.upvotes + song.downvotes;
        totalUpvotes += song.upvotes;
        totalDownvotes += song.downvotes;

        if (song.upvotes > 0 || song.downvotes > 0) {
          topSongs.push({
            id: song.id,
            title: song.song.title,
            artist: song.song.artist,
            netVotes: song.netVotes,
            upvotes: song.upvotes,
            downvotes: song.downvotes,
          });
        }
      });
    });

    return {
      totalVotes,
      totalUpvotes,
      totalDownvotes,
      topSongs: topSongs.sort((a, b) => b.netVotes - a.netVotes),
    };
  };

  const votingStats = calculateVotingStats();

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Music2 className="h-6 w-6" />
              Setlist Manager
              {isLive && <Badge variant="destructive">LIVE</Badge>}
            </CardTitle>

            <div className="flex items-center gap-4">
              {/* Real-time Toggle */}
              {isLive && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="realtime"
                    checked={isRealtimeEnabled}
                    onCheckedChange={setIsRealtimeEnabled}
                  />
                  <Label htmlFor="realtime" className="flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    Real-time
                  </Label>
                </div>
              )}

              {/* Voting Stats Toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="voting-stats"
                  checked={showVotingStats}
                  onCheckedChange={setShowVotingStats}
                />
                <Label
                  htmlFor="voting-stats"
                  className="flex items-center gap-1"
                >
                  <BarChart3 className="h-4 w-4" />
                  Stats
                </Label>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh}>
                  <Shuffle className="mr-2 h-4 w-4" />
                  Refresh
                </Button>

                {canEdit && (
                  <Button onClick={() => setShowAddModal(true)} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Songs
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {isRealtimeEnabled && isLive ? (
            /* Real-time View for Live Shows */
            <RealtimeSetlistViewer
              showId={showId}
              isLive={true}
              showVotes={canVote}
              refreshInterval={5000}
            />
          ) : (
            /* Standard Tabbed View */
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="predicted"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Predicted
                  {predictedSetlists.length > 0 && (
                    <Badge variant="secondary">
                      {predictedSetlists.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="actual" className="flex items-center gap-2">
                  <Music2 className="h-4 w-4" />
                  Actual
                  {actualSetlists.length > 0 && (
                    <Badge variant="secondary">{actualSetlists.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="predicted" className="mt-6 space-y-4">
                {predictedSetlists.length > 0 ? (
                  predictedSetlists.map((setlist) => (
                    <SetlistEditor
                      key={`${setlist.id}-${refreshKey}`}
                      setlist={setlist}
                      currentUser={currentUser}
                      artistId={show.headliner_artist.id}
                      onUpdate={fetchSetlists}
                      canEdit={canEdit && setlist.createdBy === currentUser?.id}
                      canVote={canVote && !setlist.isLocked}
                    />
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <h3 className="mb-2 font-medium text-lg">
                        No predicted setlists yet
                      </h3>
                      <p className="mb-4 text-muted-foreground">
                        Be the first to predict what songs will be played
                      </p>
                      {canEdit && (
                        <Button onClick={() => createNewSetlist('predicted')}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Predicted Setlist
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="actual" className="mt-6 space-y-4">
                {actualSetlists.length > 0 ? (
                  actualSetlists.map((setlist) => (
                    <SetlistEditor
                      key={`${setlist.id}-${refreshKey}`}
                      setlist={setlist}
                      currentUser={currentUser}
                      artistId={show.headliner_artist.id}
                      onUpdate={fetchSetlists}
                      canEdit={canEdit && setlist.createdBy === currentUser?.id}
                      canVote={false} // No voting on actual setlists
                    />
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Music2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
                      <h3 className="mb-2 font-medium text-lg">
                        No actual setlists yet
                      </h3>
                      <p className="mb-4 text-muted-foreground">
                        {show.status === 'completed'
                          ? 'Add the actual setlist from this show'
                          : 'Actual setlist will be added after the show'}
                      </p>
                      {canEdit && show.status !== 'upcoming' && (
                        <Button onClick={() => createNewSetlist('actual')}>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Actual Setlist
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Sidebar */}
        {showVotingStats && votingStats.totalVotes > 0 && (
          <div className="lg:col-span-1">
            <VoteSummary
              totalVotes={votingStats.totalVotes}
              totalUpvotes={votingStats.totalUpvotes}
              totalDownvotes={votingStats.totalDownvotes}
              topSongs={votingStats.topSongs}
            />
          </div>
        )}
      </div>

      {/* Add Song Modal */}
      <AddSongModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        setlistId={predictedSetlists[0]?.id || ''} // Default to first predicted setlist
        artistId={show.headliner_artist.id}
        onSongAdded={() => {
          fetchSetlists();
          toast.success('Song added to setlist');
        }}
      />
    </div>
  );
}
