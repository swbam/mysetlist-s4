'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/design-system/components/ui/tabs';
import { FollowButton } from '~/components/auth/follow-button';
import { InteractionChecklist } from '~/components/dev/interaction-checklist';
import { MobileVoteButton } from '~/components/mobile/mobile-vote-button';
import { SetlistManager } from '~/components/setlist/setlist-manager';
import { RealtimeVoteButton } from '~/components/voting/realtime-vote-button';

export default function InteractionsDevPage() {
  return (
    <div className="container mx-auto space-y-8 py-8">
      <div>
        <h1 className="mb-2 font-bold text-3xl">User Interactions Test Page</h1>
        <p className="text-muted-foreground">
          Test and verify all user interactions work correctly
        </p>
      </div>

      <Tabs defaultValue="checklist" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="voting">Voting</TabsTrigger>
          <TabsTrigger value="following">Following</TabsTrigger>
          <TabsTrigger value="setlists">Setlists</TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="space-y-4">
          <InteractionChecklist />
        </TabsContent>

        <TabsContent value="voting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voting Components Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-3 font-medium">Desktop Voting</h3>
                <div className="flex gap-4">
                  <div>
                    <p className="mb-2 text-muted-foreground text-sm">
                      Default
                    </p>
                    {React.createElement(RealtimeVoteButton as any, {
                      setlistSongId: "test-song-1",
                      showId: "test-show-1",
                      userId: "test-user",
                    })}
                  </div>
                  <div>
                    <p className="mb-2 text-muted-foreground text-sm">
                      Compact
                    </p>
                    {React.createElement(RealtimeVoteButton as any, {
                      setlistSongId: "test-song-2",
                      showId: "test-show-1",
                      userId: "test-user",
                      variant: "compact",
                    })}
                  </div>
                  <div>
                    <p className="mb-2 text-muted-foreground text-sm">
                      Minimal
                    </p>
                    {React.createElement(RealtimeVoteButton as any, {
                      setlistSongId: "test-song-3",
                      showId: "test-show-1",
                      userId: "test-user",
                      variant: "minimal",
                    })}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-medium">Mobile Voting</h3>
                <div className="flex gap-4">
                  <div>
                    <p className="mb-2 text-muted-foreground text-sm">Normal</p>
                    <MobileVoteButton
                      songId="test-song-4"
                      onVote={async () => {}}
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-muted-foreground text-sm">
                      Compact
                    </p>
                    <MobileVoteButton
                      songId="test-song-5"
                      onVote={async () => {}}
                      compact={true}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-medium">States</h3>
                <div className="flex gap-4">
                  <div>
                    <p className="mb-2 text-muted-foreground text-sm">
                      Disabled
                    </p>
                    {React.createElement(RealtimeVoteButton as any, {
                      setlistSongId: "test-song-6",
                      showId: "test-show-1",
                      userId: "test-user",
                      disabled: true,
                    })}
                  </div>
                  <div>
                    <p className="mb-2 text-muted-foreground text-sm">
                      No Auth
                    </p>
                    {React.createElement(RealtimeVoteButton as any, {
                      setlistSongId: "test-song-7",
                      showId: "test-show-1",
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="following" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Follow Button Components Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="mb-3 font-medium">Variants</h3>
                <div className="flex gap-4">
                  <FollowButton
                    artistId="test-artist-1"
                    artistName="Taylor Swift"
                    isFollowing={false}
                  />
                  <FollowButton
                    artistId="test-artist-2"
                    artistName="Ed Sheeran"
                    isFollowing={true}
                  />
                  <FollowButton
                    artistId="test-artist-3"
                    artistName="Coldplay"
                    isFollowing={false}
                    variant="outline"
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-medium">With Count</h3>
                <div className="space-y-2">
                  <FollowButton artistId="test-artist-4" artistName="BTS" />
                  <FollowButton
                    artistId="test-artist-5"
                    artistName="Indie Artist"
                    isFollowing={true}
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-medium">Sizes</h3>
                <div className="flex items-center gap-4">
                  <FollowButton
                    artistId="test-artist-6"
                    artistName="Small"
                    size="sm"
                  />
                  <FollowButton
                    artistId="test-artist-7"
                    artistName="Default"
                    size="default"
                  />
                  <FollowButton
                    artistId="test-artist-8"
                    artistName="Large"
                    size="lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setlists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Setlist Interaction Components</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="mb-3 font-medium">Test Show</h3>
                <SetlistManager
                  showId="test-show-1"
                  show={{
                    id: 'test-show-1',
                    name: 'Test Concert 2024',
                    date: '2024-12-25',
                    status: 'upcoming',
                    headliner_artist: {
                      id: 'test-artist',
                      name: 'Test Artist',
                    },
                  }}
                  currentUser={{
                    id: 'test-user',
                    role: 'user',
                  }}
                  initialSetlists={[]}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Component States Reference</CardTitle>
        </CardHeader>
        <CardContent className="prose dark:prose-invert">
          <h3>Interactive States</h3>
          <ul>
            <li>✅ Hover effects on all clickable elements</li>
            <li>✅ Active/pressed states with visual feedback</li>
            <li>✅ Loading states during async operations</li>
            <li>✅ Disabled states when actions unavailable</li>
            <li>✅ Focus states for keyboard navigation</li>
          </ul>

          <h3>Feedback Mechanisms</h3>
          <ul>
            <li>✅ Toast notifications for actions</li>
            <li>✅ Optimistic updates for instant feedback</li>
            <li>✅ Error states with recovery options</li>
            <li>✅ Success animations and confirmations</li>
            <li>✅ Progress indicators for long operations</li>
          </ul>

          <h3>Mobile Optimizations</h3>
          <ul>
            <li>✅ Touch-friendly tap targets (min 44x44px)</li>
            <li>✅ Haptic feedback on interactions</li>
            <li>✅ Swipe gestures where appropriate</li>
            <li>✅ Responsive layouts and modals</li>
            <li>✅ Mobile-specific components</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
