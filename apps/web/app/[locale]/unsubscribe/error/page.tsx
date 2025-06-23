import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Button } from '@repo/design-system/components/ui/button';
import { Alert, AlertDescription } from '@repo/design-system/components/ui/alert';
import { AlertCircle, ArrowLeft, Settings, Mail } from 'lucide-react';
import Link from 'next/link';

export default function UnsubscribeErrorPage() {
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
            <CardTitle>Unsubscribe Failed</CardTitle>
            <CardDescription>
              We couldn't process your unsubscribe request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The unsubscribe link may be invalid, expired, or already used. 
                You can manually manage your email preferences in your settings.
              </AlertDescription>
            </Alert>
            
            <div className="flex flex-col space-y-2">
              <Link href="/settings" className="w-full">
                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Email Preferences
                </Button>
              </Link>
              
              <Link href="/contact" className="w-full">
                <Button variant="outline" className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </Link>
              
              <Link href="/" className="w-full">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </div>
            
            <div className="text-xs text-muted-foreground text-center pt-4 border-t">
              If you continue to have issues, please contact our support team and we'll help you manage your email preferences.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}