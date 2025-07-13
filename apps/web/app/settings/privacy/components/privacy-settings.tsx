'use client';

import {
  Alert,
  AlertDescription,
} from '@repo/design-system/components/ui/alert';
import { Button } from '@repo/design-system/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/design-system/components/ui/card';
import { Label } from '@repo/design-system/components/ui/label';
import { Switch } from '@repo/design-system/components/ui/switch';
import { toast } from '@repo/design-system/components/ui/use-toast';
import { Download, Eye, Shield, UserX } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '~/lib/supabase/client';

interface PrivacySettingsProps {
  userId: string;
  email: string;
  currentSettings: any;
}

export function PrivacySettings({
  userId,
  email: _email,
  currentSettings,
}: PrivacySettingsProps) {
  const [settings, setSettings] = useState({
    profileVisibility: currentSettings?.profile_visibility || 'public',
    showAttendedShows: currentSettings?.show_attended_shows ?? true,
    showFollowedArtists: currentSettings?.show_followed_artists ?? true,
    showVotingHistory: currentSettings?.show_voting_history ?? false,
    allowAnalytics: currentSettings?.allow_analytics ?? true,
    allowMarketing: currentSettings?.allow_marketing ?? false,
    allowEmailNotifications: currentSettings?.allow_email_notifications ?? true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const updateSettings = async () => {
    setIsLoading(true);

    try {
      const { error } = await supabase.from('user_privacy_settings').upsert({
        user_id: userId,
        profile_visibility: settings.profileVisibility,
        show_attended_shows: settings.showAttendedShows,
        show_followed_artists: settings.showFollowedArtists,
        show_voting_history: settings.showVotingHistory,
        allow_analytics: settings.allowAnalytics,
        allow_marketing: settings.allowMarketing,
        allow_email_notifications: settings.allowEmailNotifications,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      // Update cookie consent if analytics settings changed
      if (settings.allowAnalytics !== currentSettings?.allow_analytics) {
        const consent = {
          necessary: true,
          analytics: settings.allowAnalytics,
          marketing: settings.allowMarketing,
        };
        document.cookie = `MySetlist-cookie-consent=${encodeURIComponent(
          JSON.stringify(consent)
        )}; max-age=${365 * 24 * 60 * 60}; path=/; SameSite=Strict`;

        window.dispatchEvent(
          new CustomEvent('cookieConsentUpdated', { detail: consent })
        );
      }

      toast({
        title: 'Privacy settings updated successfully',
        variant: 'success',
      });
    } catch (_error) {
      toast({
        title: 'Failed to update privacy settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async () => {
    setIsLoading(true);

    try {
      // Fetch all user data
      const [
        { data: profile },
        { data: shows },
        { data: artists },
        { data: votes },
        { data: reviews },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_shows').select('*, shows(*)').eq('user_id', userId),
        supabase
          .from('user_artists')
          .select('*, artists(*)')
          .eq('user_id', userId),
        supabase.from('song_votes').select('*, songs(*)').eq('user_id', userId),
        supabase.from('venue_reviews').select('*').eq('user_id', userId),
      ]);

      const userData = {
        profile,
        attended_shows: shows,
        followed_artists: artists,
        votes,
        venue_reviews: reviews,
        exported_at: new Date().toISOString(),
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(userData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MySetlist-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Your data has been exported successfully',
        variant: 'success',
      });
    } catch (_error) {
      toast({
        title: 'Failed to export data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (
      !confirm(
        'Are you sure you want to delete your account? This action cannot be undone.'
      )
    ) {
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.rpc('delete_user_account', {
        p_user_id: userId,
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Your account has been deleted',
        variant: 'success',
      });
      window.location.href = '/';
    } catch (_error) {
      toast({
        title: 'Failed to delete account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Visibility</CardTitle>
          <CardDescription>
            Control who can see your profile and activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="profile-visibility"
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Profile Visibility
              </Label>
              <select
                id="profile-visibility"
                value={settings.profileVisibility}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    profileVisibility: e.target.value,
                  })
                }
                className="rounded border px-3 py-1"
              >
                <option value="public">Public</option>
                <option value="friends">Friends Only</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-attended" className="flex flex-col">
                <span>Show Attended Shows</span>
                <span className="font-normal text-muted-foreground text-sm">
                  Display your concert history on your profile
                </span>
              </Label>
              <Switch
                id="show-attended"
                checked={settings.showAttendedShows}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, showAttendedShows: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-artists" className="flex flex-col">
                <span>Show Followed Artists</span>
                <span className="font-normal text-muted-foreground text-sm">
                  Display artists you follow on your profile
                </span>
              </Label>
              <Switch
                id="show-artists"
                checked={settings.showFollowedArtists}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, showFollowedArtists: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-votes" className="flex flex-col">
                <span>Show Voting History</span>
                <span className="font-normal text-muted-foreground text-sm">
                  Display your setlist votes publicly
                </span>
              </Label>
              <Switch
                id="show-votes"
                checked={settings.showVotingHistory}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, showVotingHistory: checked })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data & Analytics</CardTitle>
          <CardDescription>
            Manage how your data is collected and used
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="analytics" className="flex flex-col">
              <span>Analytics</span>
              <span className="font-normal text-muted-foreground text-sm">
                Help us improve MySetlist by sharing usage data
              </span>
            </Label>
            <Switch
              id="analytics"
              checked={settings.allowAnalytics}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allowAnalytics: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="marketing" className="flex flex-col">
              <span>Marketing Communications</span>
              <span className="font-normal text-muted-foreground text-sm">
                Receive updates about new features and events
              </span>
            </Label>
            <Switch
              id="marketing"
              checked={settings.allowMarketing}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allowMarketing: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications" className="flex flex-col">
              <span>Email Notifications</span>
              <span className="font-normal text-muted-foreground text-sm">
                Receive email updates about your followed artists
              </span>
            </Label>
            <Switch
              id="email-notifications"
              checked={settings.allowEmailNotifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, allowEmailNotifications: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Export or delete your personal data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You have the right to access, export, and delete your personal
              data at any time. We comply with GDPR and other privacy
              regulations.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              onClick={exportData}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export My Data
            </Button>

            <Button
              onClick={deleteAccount}
              disabled={isLoading}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <UserX className="h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={updateSettings} disabled={isLoading}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
