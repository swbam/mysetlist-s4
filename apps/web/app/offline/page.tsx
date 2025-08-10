"use client";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Music2, RefreshCw, WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <WifiOff className="h-16 w-16 text-muted-foreground" />
            </div>
            <CardTitle className="text-2xl">You're Offline</CardTitle>
            <CardDescription>
              No internet connection available. Some features may be limited.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Don't worry! You can still browse cached content and any offline
              actions will sync when you're back online.
            </p>

            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>

              <Link href="/" className="w-full">
                <Button variant="outline" className="w-full">
                  <Music2 className="mr-2 h-4 w-4" />
                  Browse Cached Content
                </Button>
              </Link>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>
                Cached content may be limited to recently viewed artists and
                shows.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
