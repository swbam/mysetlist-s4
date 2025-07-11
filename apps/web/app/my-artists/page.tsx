import { getUser } from '@repo/auth/server';
import { redirect } from 'next/navigation';
import React, { Suspense } from 'react';
import { FollowedArtistsGrid } from './components/followed-artists-grid';
import { MyArtistsHeader } from './components/my-artists-header';
import { RecommendedConcerts } from './components/recommended-concerts';
import { SpotifySync } from './components/spotify-sync';
import { UpcomingShowsTimeline } from './components/upcoming-shows-timeline';

export const metadata = {
  title: 'My Artists | MySetlist',
  description: 'View your followed artists and discover upcoming concerts',
};

export default async function MyArtistsPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <MyArtistsHeader userId={user.id} />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-bold text-2xl">My Artists</h2>
              <SpotifySync />
            </div>
            {React.createElement(Suspense as any, {
              fallback: React.createElement('div', { className: "animate-pulse" }, "Loading artists...")
            }, React.createElement(FollowedArtistsGrid, { userId: user.id }))}
          </section>

          <section>
            <h2 className="mb-6 font-bold text-2xl">Upcoming Shows</h2>
            {React.createElement(Suspense as any, {
              fallback: React.createElement('div', { className: "animate-pulse" }, "Loading shows...")
            }, React.createElement(UpcomingShowsTimeline, { userId: user.id }))}
          </section>
        </div>

        <div className="lg:col-span-1">
          <section>
            <h2 className="mb-4 font-bold text-xl">Recommended for You</h2>
            {React.createElement(Suspense as any, {
              fallback: React.createElement('div', { className: "animate-pulse" }, "Loading recommendations...")
            }, React.createElement(RecommendedConcerts, { userId: user.id }))}
          </section>
        </div>
      </div>
    </div>
  );
}
