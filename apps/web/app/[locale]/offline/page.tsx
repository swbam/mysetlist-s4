import { WifiOff } from 'lucide-react';
import { Button } from '@repo/design-system/components/ui/button';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center">
        <WifiOff className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold mb-2">You're offline</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          It looks like you've lost your internet connection. Some features may be unavailable until you're back online.
        </p>
        
        <div className="space-y-4">
          <Button
            onClick={() => window.location.reload()}
            variant="default"
            className="w-full sm:w-auto"
          >
            Try again
          </Button>
          
          <div className="text-sm text-muted-foreground">
            <p>While offline, you can still:</p>
            <ul className="mt-2 space-y-1">
              <li>• View previously loaded content</li>
              <li>• Browse cached shows and setlists</li>
              <li>• Queue actions for when you're back online</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}