import { getUser } from "@repo/auth/server";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Headphones, Music, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createPageMetadata } from "~/lib/seo-metadata";

export const metadata: Metadata = createPageMetadata({
  title: "My Playlists | TheSet",
  description:
    "Manage your saved setlists and create custom playlists from your favorite concerts.",
});

const PlaylistsPage = async () => {
  const user = await getUser();

  if (!user) {
    redirect("/auth/sign-in?redirect=/playlists");
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-3xl">My Playlists</h1>
            <p className="text-muted-foreground">
              Save and organize your favorite setlists
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Playlist
          </Button>
        </div>

        {/* Empty State */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Headphones className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 font-semibold text-lg">No playlists yet</h3>
            <p className="mb-6 max-w-md text-center text-muted-foreground">
              Start building your music collection by saving setlists from your
              favorite shows
            </p>
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/shows">
                  <Music className="mr-2 h-4 w-4" />
                  Browse Shows
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/artists">
                  <Music className="mr-2 h-4 w-4" />
                  Find Artists
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon Features */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Saved Setlists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Coming soon: Save setlists from concerts you've attended or want
                to attend
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5" />
                Custom Playlists
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Coming soon: Create custom playlists from songs across multiple
                setlists
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PlaylistsPage;
