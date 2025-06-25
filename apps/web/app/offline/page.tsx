import { Metadata } from 'next';
import { WifiOff, RefreshCw, Home, Music, ArrowLeft } from 'lucide-react';
import { Button } from '@repo/design-system/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Offline - MySetlist',
  description: 'You are currently offline. Some features may be limited.',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Offline Icon */}
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
            <WifiOff className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">You're Offline</h1>
          <p className="text-muted-foreground mt-2">
            No internet connection detected. Some features may be limited.
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              MySetlist Offline Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Available offline:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Previously viewed shows and setlists</li>
                <li>• Cached artist profiles</li>
                <li>• Downloaded venue information</li>
                <li>• Your saved favorites</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Limited while offline:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Real-time setlist updates</li>
                <li>• New show announcements</li>
                <li>• Live voting and comments</li>
                <li>• Search functionality</li>
              </ul>
            </div>

            <div className="pt-2">
              <Badge variant="secondary" className="text-xs">
                Your votes and follows will sync when you're back online
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full"
            variant="default"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Link>
            </Button>
            
            <Button 
              onClick={() => window.history.back()} 
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>

        {/* Tips */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <h3 className="font-medium mb-2">Tips while offline:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Check your internet connection</li>
              <li>• Move to an area with better signal</li>
              <li>• Try switching between WiFi and mobile data</li>
              <li>• Your offline actions will sync automatically</li>
            </ul>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>MySetlist works offline thanks to modern web technologies.</p>
          <p className="mt-1">Your experience will resume when you're back online.</p>
        </div>
      </div>
    </div>
  );
}