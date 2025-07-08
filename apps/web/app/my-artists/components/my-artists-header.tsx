import { db, shows, userFollowsArtists } from '@repo/database';
import { Card, CardContent } from '@repo/design-system/components/ui/card';
import { and, eq, gte, sql } from 'drizzle-orm';
import { Calendar, Heart, TrendingUp } from 'lucide-react';

interface MyArtistsHeaderProps {
  userId: string;
}

export async function MyArtistsHeader({ userId }: MyArtistsHeaderProps) {
  // Get stats for the user
  const [followingCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userFollowsArtists)
    .where(eq(userFollowsArtists.userId, userId));

  const upcomingShowsCount = await db
    .select({ count: sql<number>`count(distinct s.id)` })
    .from(shows.as('s'))
    .innerJoin(
      userFollowsArtists.as('ufa'),
      eq(sql`s.artist_id`, sql`ufa.artist_id`)
    )
    .where(and(eq(sql`ufa.user_id`, userId), gte(sql`s.date`, new Date())));

  const stats = [
    {
      label: 'Following',
      value: followingCount?.count || 0,
      icon: Heart,
      color: 'text-pink-600',
    },
    {
      label: 'Upcoming Shows',
      value: upcomingShowsCount[0]?.count || 0,
      icon: Calendar,
      color: 'text-blue-600',
    },
    {
      label: 'This Month',
      value: 0, // Would calculate shows this month
      icon: TrendingUp,
      color: 'text-green-600',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-bold text-3xl">My Artists</h1>
        <p className="mt-2 text-muted-foreground">
          Track your favorite artists and never miss their shows
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`rounded-full bg-muted p-3 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-2xl">{stat.value}</p>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
