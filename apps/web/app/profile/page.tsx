'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/design-system/components/ui/avatar';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/design-system/components/ui/tabs';
import {
  Activity,
  Calendar,
  Edit3,
  Heart,
  Music,
  Settings,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ProtectedRoute } from '../components/protected-route';
import { useAuth } from '../providers/auth-provider';

interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  spotifyConnected?: boolean;
  followingCount: number;
  joinedAt: string;
  lastActivity: string;
}

interface UserActivity {
  id: string;
  type: 'follow' | 'vote' | 'setlist_create' | 'show_attend';
  artist?: string;
  show?: string;
  timestamp: string;
  description: string;
}

interface FollowedArtist {
  id: string;
  name: string;
  imageUrl?: string;
  genres: string[];
  upcomingShows: number;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentActivity, setRecentActivity] = useState<UserActivity[]>([]);
  const [followedArtists, setFollowedArtists] = useState<FollowedArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`/api/user/profile/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setProfile(data.profile);
          setRecentActivity(data.recentActivity || []);
          setFollowedArtists(data.followedArtists || []);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <Heart className="h-4 w-4" />;
      case 'vote':
        return <Activity className="h-4 w-4" />;
      case 'setlist_create':
        return <Music className="h-4 w-4" />;
      case 'show_attend':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 rounded-lg bg-muted"></div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="h-64 rounded-lg bg-muted"></div>
              <div className="h-64 rounded-lg bg-muted"></div>
              <div className="h-64 rounded-lg bg-muted"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 md:h-24 md:w-24">
                  <AvatarImage
                    src={profile?.avatarUrl}
                    alt={profile?.displayName || user?.email}
                  />
                  <AvatarFallback className="text-xl">
                    <User className="h-10 w-10" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="font-bold text-2xl md:text-3xl">
                    {profile?.displayName ||
                      user?.email?.split('@')[0] ||
                      'Music Fan'}
                  </h1>
                  <p className="text-muted-foreground">{user?.email}</p>
                  {profile?.bio && (
                    <p className="mt-2 max-w-md text-muted-foreground text-sm">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row md:ml-auto">
                <Button variant="outline" asChild>
                  <Link href="/profile/edit">
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </Button>
              </div>
            </div>

            {/* Profile Stats */}
            <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-6 md:grid-cols-4">
              <div className="text-center">
                <div className="font-bold text-2xl">
                  {profile?.followingCount || 0}
                </div>
                <div className="text-muted-foreground text-sm">Following</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-2xl">
                  {recentActivity.length}
                </div>
                <div className="text-muted-foreground text-sm">Activities</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-2xl">
                  {followedArtists.reduce(
                    (sum, artist) => sum + artist.upcomingShows,
                    0
                  )}
                </div>
                <div className="text-muted-foreground text-sm">
                  Upcoming Shows
                </div>
              </div>
              <div className="text-center">
                <Badge
                  variant={profile?.spotifyConnected ? 'default' : 'outline'}
                >
                  {profile?.spotifyConnected
                    ? 'Spotify Connected'
                    : 'Connect Spotify'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="shows">Shows</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Your latest interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="mt-1 text-muted-foreground">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-muted-foreground text-xs">
                            {formatDate(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <p className="py-4 text-center text-muted-foreground text-sm">
                        No recent activity
                      </p>
                    )}
                    {recentActivity.length > 5 && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full"
                      >
                        <Link href="/profile/activity">View All Activity</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Following */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Artists You Follow
                  </CardTitle>
                  <CardDescription>Your favorite artists</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {followedArtists.slice(0, 5).map((artist) => (
                      <div key={artist.id} className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={artist.imageUrl}
                            alt={artist.name}
                          />
                          <AvatarFallback>
                            <Music className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{artist.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {artist.genres.slice(0, 2).join(', ')}
                          </p>
                        </div>
                        {artist.upcomingShows > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {artist.upcomingShows} shows
                          </Badge>
                        )}
                      </div>
                    ))}
                    {followedArtists.length === 0 && (
                      <p className="py-4 text-center text-muted-foreground text-sm">
                        You're not following any artists yet
                      </p>
                    )}
                    {followedArtists.length > 5 && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="w-full"
                      >
                        <Link href="/profile/following">
                          View All Following
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="following">
            <Card>
              <CardHeader>
                <CardTitle>Following ({followedArtists.length})</CardTitle>
                <CardDescription>
                  Artists you follow for updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {followedArtists.map((artist) => (
                    <Card key={artist.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage
                            src={artist.imageUrl}
                            alt={artist.name}
                          />
                          <AvatarFallback>
                            <Music className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold">
                            {artist.name}
                          </h3>
                          <p className="text-muted-foreground text-sm">
                            {artist.genres.slice(0, 2).join(', ')}
                          </p>
                        </div>
                      </div>
                      {artist.upcomingShows > 0 && (
                        <div className="mt-3 border-t pt-3">
                          <Badge variant="secondary" className="text-xs">
                            {artist.upcomingShows} upcoming shows
                          </Badge>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
                {followedArtists.length === 0 && (
                  <div className="py-8 text-center">
                    <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 font-semibold text-lg">
                      No artists followed yet
                    </h3>
                    <p className="mb-4 text-muted-foreground">
                      Start following artists to get updates on their shows and
                      setlists
                    </p>
                    <Button asChild>
                      <Link href="/artists">Browse Artists</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity History</CardTitle>
                <CardDescription>
                  Your complete activity on MySetlist
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 rounded-lg border p-4"
                    >
                      <div className="mt-1 text-muted-foreground">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="mt-1 text-muted-foreground text-xs">
                          {formatDate(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <div className="py-8 text-center">
                      <Activity className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <h3 className="mb-2 font-semibold text-lg">
                        No activity yet
                      </h3>
                      <p className="text-muted-foreground">
                        Start exploring shows and following artists to see your
                        activity here
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shows">
            <Card>
              <CardHeader>
                <CardTitle>Show History</CardTitle>
                <CardDescription>
                  Shows you've attended or are planning to attend
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-8 text-center">
                  <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 font-semibold text-lg">
                    No shows tracked yet
                  </h3>
                  <p className="mb-4 text-muted-foreground">
                    Mark shows as attended or planning to attend to track them
                    here
                  </p>
                  <Button asChild>
                    <Link href="/shows">Browse Shows</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
