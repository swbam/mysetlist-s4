// Following feature removed from MySetlist
// This component has been disabled as the app no longer supports following artists
// MySetlist is focused on setlist voting, not social following features

import { Card, CardContent } from '@repo/design-system';
import { Music } from 'lucide-react';
import Link from 'next/link';

export function FollowingList() {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Music className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 font-semibold text-lg">
          Following Feature Removed
        </h3>
        <p className="mb-4 text-muted-foreground">
          MySetlist now focuses on setlist voting instead of following artists. 
          Discover artists through trending and search features.
        </p>
        <Link href="/artists" className="text-primary hover:underline">
          Browse Artists
        </Link>
      </CardContent>
    </Card>
  );
}
