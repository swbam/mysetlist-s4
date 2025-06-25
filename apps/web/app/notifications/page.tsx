import { createPageMetadata } from '@/lib/seo-metadata';
import type { Metadata } from 'next';
import { getUser } from '@repo/auth/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Bell, BellOff, Settings } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = createPageMetadata({
  title: 'Notifications | MySetlist',
  description: 'Stay updated on your favorite artists, shows, and venue announcements.',
});

const NotificationsPage = async () => {
  const user = await getUser();

  if (!user) {
    redirect('/auth/sign-in?redirect=/notifications');
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              Stay updated on your favorite artists and shows
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BellOff className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              You'll receive notifications when artists you follow announce new shows, when shows are updated, and more.
            </p>
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/artists">
                  <Bell className="h-4 w-4 mr-2" />
                  Follow Artists
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/settings">
                  Configure Notifications
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Artist Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Get notified when artists you follow announce new shows, release new music, or update their tour dates.
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
                Receive updates about shows you're attending, setlist changes, and venue information updates.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;