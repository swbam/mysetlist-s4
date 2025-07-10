import { getUser } from '@repo/auth/server';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import { Bell, BellOff, Settings } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createPageMetadata } from '~/lib/seo-metadata';

export const metadata: Metadata = createPageMetadata({
  title: 'Notifications | MySetlist',
  description:
    'Stay updated on your favorite artists, shows, and venue announcements.',
});

const NotificationsPage = async () => {
  const user = await getUser();

  if (!user) {
    redirect('/auth/sign-in?redirect=/notifications');
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-3xl">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated on your favorite artists and shows
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <BellOff className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 font-semibold text-lg">No notifications yet</h3>
            <p className="mb-6 max-w-md text-center text-muted-foreground">
              You'll receive notifications when artists you follow announce new
              shows, when shows are updated, and more.
            </p>
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/artists">
                  <Bell className="mr-2 h-4 w-4" />
                  Follow Artists
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/settings">Configure Notifications</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Types */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Artist Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Get notified when artists you follow announce new shows, release
                new music, or update their tour dates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Show Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Receive updates about shows you're attending, setlist changes,
                and venue information updates.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
