'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Switch } from '@repo/design-system/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/design-system/components/ui/select';
import { Label } from '@repo/design-system/components/ui/label';
import { Separator } from '@repo/design-system/components/ui/separator';
import { Alert, AlertDescription } from '@repo/design-system/components/ui/alert';
import { Bell, Clock, Mail, Users, Music, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@repo/design-system/components/ui/use-toast';
import { getUserEmailPreferences, updateEmailPreferences } from '../../actions/email-notifications';

type EmailPreferences = {
  emailEnabled: boolean;
  showReminders: boolean;
  showReminderFrequency: 'immediately' | 'daily' | 'weekly' | 'never';
  newShowNotifications: boolean;
  newShowFrequency: 'immediately' | 'daily' | 'weekly' | 'never';
  setlistUpdates: boolean;
  setlistUpdateFrequency: 'immediately' | 'daily' | 'weekly' | 'never';
  weeklyDigest: boolean;
  marketingEmails: boolean;
  securityEmails: boolean;
};

const frequencyOptions = [
  { value: 'immediately', label: 'Immediately' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
  { value: 'never', label: 'Never' },
];

export function EmailNotificationSettings() {
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await getUserEmailPreferences();
      setPreferences(prefs as EmailPreferences);
    } catch (error) {
      toast('Failed to load email preferences', { type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      await updateEmailPreferences(preferences);
      toast('Your email preferences have been updated', { type: 'success' });
    } catch (error) {
      toast('Failed to save preferences', { type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof EmailPreferences, value: any) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Loading your preferences...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Unable to load preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              There was an error loading your email preferences. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Master Email Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Control all email notifications from TheSet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-enabled" className="text-sm font-medium">
                Enable Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive all email notifications from TheSet
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={preferences.emailEnabled}
              onCheckedChange={(checked) => updatePreference('emailEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Show Reminders */}
      <Card className={!preferences.emailEnabled ? 'opacity-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Show Reminders
          </CardTitle>
          <CardDescription>
            Get notified about upcoming shows from artists you follow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-reminders" className="text-sm font-medium">
                Show Reminders
              </Label>
              <p className="text-sm text-muted-foreground">
                Remind me about upcoming shows
              </p>
            </div>
            <Switch
              id="show-reminders"
              checked={preferences.showReminders}
              disabled={!preferences.emailEnabled}
              onCheckedChange={(checked) => updatePreference('showReminders', checked)}
            />
          </div>
          
          {preferences.showReminders && preferences.emailEnabled && (
            <div className="space-y-2">
              <Label htmlFor="show-reminder-frequency" className="text-sm font-medium">
                Reminder Frequency
              </Label>
              <Select
                value={preferences.showReminderFrequency}
                onValueChange={(value) => updatePreference('showReminderFrequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Show Notifications */}
      <Card className={!preferences.emailEnabled ? 'opacity-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            New Show Announcements
          </CardTitle>
          <CardDescription>
            Be the first to know when artists you follow announce new shows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="new-show-notifications" className="text-sm font-medium">
                New Show Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Notify me when artists announce new shows
              </p>
            </div>
            <Switch
              id="new-show-notifications"
              checked={preferences.newShowNotifications}
              disabled={!preferences.emailEnabled}
              onCheckedChange={(checked) => updatePreference('newShowNotifications', checked)}
            />
          </div>
          
          {preferences.newShowNotifications && preferences.emailEnabled && (
            <div className="space-y-2">
              <Label htmlFor="new-show-frequency" className="text-sm font-medium">
                Notification Frequency
              </Label>
              <Select
                value={preferences.newShowFrequency}
                onValueChange={(value) => updatePreference('newShowFrequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setlist Updates */}
      <Card className={!preferences.emailEnabled ? 'opacity-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Setlist Updates
          </CardTitle>
          <CardDescription>
            Get notified when setlists are added or updated for shows
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="setlist-updates" className="text-sm font-medium">
                Setlist Updates
              </Label>
              <p className="text-sm text-muted-foreground">
                Notify me about new and updated setlists
              </p>
            </div>
            <Switch
              id="setlist-updates"
              checked={preferences.setlistUpdates}
              disabled={!preferences.emailEnabled}
              onCheckedChange={(checked) => updatePreference('setlistUpdates', checked)}
            />
          </div>
          
          {preferences.setlistUpdates && preferences.emailEnabled && (
            <div className="space-y-2">
              <Label htmlFor="setlist-update-frequency" className="text-sm font-medium">
                Update Frequency
              </Label>
              <Select
                value={preferences.setlistUpdateFrequency}
                onValueChange={(value) => updatePreference('setlistUpdateFrequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Digest */}
      <Card className={!preferences.emailEnabled ? 'opacity-50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Weekly Digest
          </CardTitle>
          <CardDescription>
            Get a weekly summary of activity from your followed artists
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weekly-digest" className="text-sm font-medium">
                Weekly Music Digest
              </Label>
              <p className="text-sm text-muted-foreground">
                Send me a weekly summary every Monday
              </p>
            </div>
            <Switch
              id="weekly-digest"
              checked={preferences.weeklyDigest}
              disabled={!preferences.emailEnabled}
              onCheckedChange={(checked) => updatePreference('weeklyDigest', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Marketing Emails */}
      <Card className={!preferences.emailEnabled ? 'opacity-50' : ''}>
        <CardHeader>
          <CardTitle>Marketing & Promotional Emails</CardTitle>
          <CardDescription>
            Receive occasional updates about new features and special offers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing-emails" className="text-sm font-medium">
                Marketing Emails
              </Label>
              <p className="text-sm text-muted-foreground">
                News, features, and special offers
              </p>
            </div>
            <Switch
              id="marketing-emails"
              checked={preferences.marketingEmails}
              disabled={!preferences.emailEnabled}
              onCheckedChange={(checked) => updatePreference('marketingEmails', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Emails */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Account Emails
          </CardTitle>
          <CardDescription>
            Important security and account-related notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Security emails cannot be disabled. These include password resets, 
              email verification, and important account security notifications.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Separator />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}