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
import { Input } from '@repo/design-system/components/ui/input';
import { Label } from '@repo/design-system/components/ui/label';
import { Switch } from '@repo/design-system/components/ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/design-system/components/ui/tabs';
import { Shield, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ProtectedRoute } from '../components/protected-route';
import { useAuth } from '../providers/auth-provider';
import { DeleteAccountDialog } from './components/delete-account-dialog';
import { EmailNotificationSettings } from './components/email-notification-settings';

export default function SettingsPage() {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="font-bold text-3xl">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="account" className="space-y-4">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Email Address</CardTitle>
                <CardDescription>Update your email address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Current Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                  />
                </div>
                <Button variant="outline">Change Email</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delete Account</CardTitle>
                <CardDescription>
                  Permanently delete your account and all data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Trash2 className="h-4 w-4" />
                  <AlertDescription>
                    This action cannot be undone. All your data will be
                    permanently deleted.
                  </AlertDescription>
                </Alert>
                <DeleteAccountDialog />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <EmailNotificationSettings />
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Control your privacy and data sharing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-email">Show Email Publicly</Label>
                    <p className="text-muted-foreground text-sm">
                      Allow other users to see your email address
                    </p>
                  </div>
                  <Switch
                    id="show-email"
                    checked={showEmail}
                    onCheckedChange={setShowEmail}
                  />
                </div>

                <div className="pt-4">
                  <Button variant="outline" className="w-full">
                    Download My Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Update your password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button>Change Password</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Two-factor authentication is not enabled. Enable it to
                    secure your account.
                  </AlertDescription>
                </Alert>
                <Button className="mt-4" variant="outline">
                  Enable 2FA
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
