'use client';

import { ProtectedRoute } from '../components/protected-route';
import { useAuth } from '../providers/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Button } from '@repo/design-system/components/ui/button';
import { Calendar, Music, MapPin, BarChart3, Settings } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your TheSet profile and preferences</p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Link href="/profile/analytics">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-3 p-6">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Your Analytics</p>
                  <p className="text-sm text-muted-foreground">View your music stats</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/settings">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-3 p-6">
                <Settings className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Settings</p>
                  <p className="text-sm text-muted-foreground">Manage preferences</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/settings/privacy">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-3 p-6">
                <Settings className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Privacy</p>
                  <p className="text-sm text-muted-foreground">Control your data</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-lg">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Status</p>
                <Badge variant="default" className="mt-1">
                  {user?.email_confirmed_at ? 'Verified' : 'Unverified'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                <p className="text-lg">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Music Preferences</CardTitle>
              <CardDescription>Connect your music accounts and set preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  <span>Spotify</span>
                </div>
                <Badge variant="outline">Not Connected</Badge>
              </div>
              <Button className="w-full" variant="outline">
                Connect Spotify Account
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent setlist contributions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">No recent activity</p>
                    <p className="text-sm text-muted-foreground">
                      Start by browsing shows and contributing setlists!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location Settings</CardTitle>
              <CardDescription>Set your location for personalized recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">No location set</span>
                </div>
                <Button variant="outline" className="w-full">
                  Set Location
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}