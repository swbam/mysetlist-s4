import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '~/components/ui-exports';
import { Download } from 'lucide-react';
import { createClient } from '~/lib/supabase/server';

// Force dynamic rendering due to user-specific data fetching
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();

  // Check if user is admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user?.id ?? '')
    .single();

  if (userData?.role !== 'admin') {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Admin access required to view settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-3xl">Platform Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Configure platform-wide settings and policies
        </p>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="data">Data & Export</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure general platform settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="platform-name">Platform Name</Label>
                <Input
                  id="platform-name"
                  defaultValue="MySetlist"
                  placeholder="Enter platform name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-email">Support Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  placeholder="support@example.com"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Maintenance Mode</Label>
                  <p className="text-muted-foreground text-sm">
                    Enable maintenance mode to prevent user access
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>New User Registration</Label>
                  <p className="text-muted-foreground text-sm">
                    Allow new users to register
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Moderation Settings */}
        <TabsContent value="moderation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Moderation Settings</CardTitle>
              <CardDescription>
                Configure content moderation policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Default Content Status</Label>
                <Select defaultValue="pending">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Review</SelectItem>
                    <SelectItem value="approved">Auto-Approved</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-sm">
                  Status for new user-generated content
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Approve Verified Users</Label>
                  <p className="text-muted-foreground text-sm">
                    Skip moderation for verified users
                  </p>
                </div>
                <Switch />
              </div>

              <div className="space-y-2">
                <Label htmlFor="warning-threshold">Warning Threshold</Label>
                <Input
                  id="warning-threshold"
                  type="number"
                  defaultValue="3"
                  min="1"
                  max="10"
                />
                <p className="text-muted-foreground text-sm">
                  Number of warnings before automatic suspension
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ban-duration">
                  Default Ban Duration (days)
                </Label>
                <Input
                  id="ban-duration"
                  type="number"
                  defaultValue="7"
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blocked-words">Blocked Words</Label>
                <Textarea
                  id="blocked-words"
                  placeholder="Enter blocked words, one per line"
                  rows={5}
                />
                <p className="text-muted-foreground text-sm">
                  Content containing these words will be auto-flagged
                </p>
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure admin notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>New Reports</Label>
                    <p className="text-muted-foreground text-sm">
                      Notify when new reports are submitted
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Content Moderation Queue</Label>
                    <p className="text-muted-foreground text-sm">
                      Notify when content needs moderation
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>User Milestones</Label>
                    <p className="text-muted-foreground text-sm">
                      Notify for significant user milestones
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>System Alerts</Label>
                    <p className="text-muted-foreground text-sm">
                      Critical system notifications
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notification Frequency</Label>
                <Select defaultValue="realtime">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly Digest</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data & Export Settings */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Export data and manage backups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Export User Data</h4>
                      <p className="mt-1 text-muted-foreground text-sm">
                        Export all user data for GDPR compliance
                      </p>
                    </div>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Export Content Data</h4>
                      <p className="mt-1 text-muted-foreground text-sm">
                        Export shows, setlists, and reviews
                      </p>
                    </div>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Export Analytics</h4>
                      <p className="mt-1 text-muted-foreground text-sm">
                        Export platform analytics and statistics
                      </p>
                    </div>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Auto Backup</Label>
                <Select defaultValue="weekly">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-sm">
                  Automatic database backup frequency
                </p>
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
