import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { CheckCircle, ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';

// Force dynamic rendering due to searchParams usage
export const dynamic = 'force-dynamic';

interface UnsubscribeSuccessPageProps {
  searchParams: Promise<{
    type?: string;
  }>;
}

export default async function UnsubscribeSuccessPage({ searchParams }: UnsubscribeSuccessPageProps) {
  const { type } = await searchParams;

  const getEmailTypeDisplay = (emailType?: string) => {
    switch (emailType) {
      case 'show_reminders':
        return 'show reminders';
      case 'new_shows':
        return 'new show announcements';
      case 'setlist_updates':
        return 'setlist updates';
      case 'weekly_digest':
        return 'weekly digest emails';
      case 'marketing':
        return 'marketing emails';
      case 'all':
        return 'all emails';
      default:
        return 'emails';
    }
  };

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <CardTitle>Successfully Unsubscribed</CardTitle>
            <CardDescription>
              You have been unsubscribed from {getEmailTypeDisplay(type)} from MySetlist.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              {type === 'all' 
                ? 'You will no longer receive any email notifications from MySetlist, except for important security emails.'
                : `You will no longer receive ${getEmailTypeDisplay(type)} from MySetlist.`
              }
            </div>
            
            <div className="flex flex-col space-y-2">
              <Link href="/settings" className="w-full">
                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Email Preferences
                </Button>
              </Link>
              
              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
            
            <div className="text-xs text-muted-foreground text-center pt-4 border-t">
              Changed your mind? You can always re-enable these notifications in your settings.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}