import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Home, Music2, Search } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[600px] items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Music2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Page not found</CardTitle>
          <CardDescription>
            Looks like this page hit a wrong note. Let's get you back on track!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center font-bold text-6xl text-muted-foreground">
            404
          </p>

          <div className="flex flex-col gap-3">
            <Button asChild variant="default" className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/artists">
                <Search className="mr-2 h-4 w-4" />
                Browse Artists
              </Link>
            </Button>
          </div>

          <div className="border-t pt-4">
            <p className="text-center text-muted-foreground text-sm">
              Popular pages:
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Link
                href="/shows"
                className="text-primary text-sm hover:underline"
              >
                Shows
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                href="/venues"
                className="text-primary text-sm hover:underline"
              >
                Venues
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                href="/trending"
                className="text-primary text-sm hover:underline"
              >
                Trending
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
