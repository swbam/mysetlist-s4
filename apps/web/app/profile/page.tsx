'use client';

import { useAuth } from '../providers/auth-provider';
import { ProtectedRoute } from '../components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@repo/design-system/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/design-system/components/ui/tabs';
import { User, Calendar, Heart, Activity, Settings, Edit3, Music } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

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
      day: 'numeric'
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
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="h-64 bg-muted rounded-lg"></div>
              <div className="h-64 bg-muted rounded-lg"></div>
              <div className="h-64 bg-muted rounded-lg"></div>
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
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 md:h-24 md:w-24">
                  <AvatarImage src={profile?.avatarUrl} alt={profile?.displayName || user?.email} />
                  <AvatarFallback className="text-xl">
                    <User className="h-10 w-10" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">
                    {profile?.displayName || user?.email?.split('@')[0] || 'Music Fan'}
                  </h1>
                  <p className="text-muted-foreground">{user?.email}</p>
                  {profile?.bio && (
                    <p className="mt-2 text-sm text-muted-foreground max-w-md">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 md:ml-auto">
                <Button variant="outline" asChild>
                  <Link href="/profile/edit">
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              </div>
            </div>

            {/* Profile Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold">{profile?.followingCount || 0}</div>
                <div className="text-sm text-muted-foreground">Following</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{recentActivity.length}</div>
                <div className="text-sm text-muted-foreground">Activities</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {followedArtists.reduce((sum, artist) => sum + artist.upcomingShows, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Upcoming Shows</div>
              </div>
              <div className="text-center">
                <Badge variant={profile?.spotifyConnected ? "default" : "outline"}>
                  {profile?.spotifyConnected ? "Spotify Connected" : "Connect Spotify"}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {recentActivity.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No recent activity
                      </p>
                    )}
                    {recentActivity.length > 5 && (
                      <Button variant="outline" size="sm" asChild className="w-full">
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
                          <AvatarImage src={artist.imageUrl} alt={artist.name} />
                          <AvatarFallback>
                            <Music className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{artist.name}</p>
                          <p className="text-xs text-muted-foreground">
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
                      <p className="text-sm text-muted-foreground text-center py-4">
                        You're not following any artists yet
                      </p>
                    )}
                    {followedArtists.length > 5 && (
                      <Button variant="outline" size="sm" asChild className="w-full">
                        <Link href="/profile/following">View All Following</Link>
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
                <CardDescription>Artists you follow for updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {followedArtists.map((artist) => (
                    <Card key={artist.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={artist.imageUrl} alt={artist.name} />
                          <AvatarFallback>
                            <Music className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{artist.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {artist.genres.slice(0, 2).join(', ')}
                          </p>
                        </div>
                      </div>
                      {artist.upcomingShows > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <Badge variant="secondary" className="text-xs">
                            {artist.upcomingShows} upcoming shows
                          </Badge>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
                {followedArtists.length === 0 && (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No artists followed yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start following artists to get updates on their shows and setlists
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
                <CardDescription>Your complete activity on MySetlist</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg border">
                      <div className="mt-1 text-muted-foreground">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                      <p className="text-muted-foreground">
                        Start exploring shows and following artists to see your activity here
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
                <CardDescription>Shows you've attended or are planning to attend</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No shows tracked yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Mark shows as attended or planning to attend to track them here
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