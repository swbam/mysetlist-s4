"use client";

import {
  Alert,
  AlertDescription,
} from "@repo/design-system/components/ui/alert";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { AlertCircle, Loader2, Music, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "~/app/providers/auth-provider";

interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
  popularity: number;
  external_urls: {
    spotify: string;
  };
}

interface MyArtistsContentProps {
  userId: string;
}

export function MyArtistsContent({ userId: _userId }: MyArtistsContentProps) {
  const { signInWithSpotify } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [topArtists, setTopArtists] = useState<SpotifyArtist[]>([]);
  const [followedArtists, setFollowedArtists] = useState<SpotifyArtist[]>([]);

  useEffect(() => {
    fetchSpotifyData();
  }, []);

  const fetchSpotifyData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/auth/spotify/user-data");

      if (!response.ok) {
        if (response.status === 401) {
          setError(
            "Please sign in with Spotify to see your artists. You may need to reconnect your Spotify account.",
          );
          setNeedsReauth(true);
          return;
        }
        throw new Error("Failed to fetch Spotify data");
      }

      const data = await response.json();
      setTopArtists(data.topArtists || []);
      setFollowedArtists(data.followedArtists || []);
    } catch (_err) {
      setError("Failed to load your Spotify artists. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const syncArtist = async (artist: SpotifyArtist) => {
    try {
      setIsSyncing(true);

      const response = await fetch("/api/artists/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spotifyId: artist.id,
          name: artist.name,
          imageUrl: artist.images[0]?.url,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to sync artist");
      }

      // Redirect to artist page after sync
      const data = await response.json();
      window.location.href = `/artists/${data.slug}`;
    } catch (_err) {
      setError("Failed to sync artist. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReconnectSpotify = async () => {
    try {
      await signInWithSpotify();
    } catch (_err) {
      setError("Failed to reconnect to Spotify. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 font-bold text-3xl">My Spotify Artists</h1>
        <p className="text-muted-foreground">
          Your top artists and the artists you follow on Spotify
        </p>
      </div>

      {error && (
        <Alert
          variant={needsReauth ? "default" : "destructive"}
          className="mb-6"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            {needsReauth && (
              <Button
                onClick={handleReconnectSpotify}
                variant="outline"
                size="sm"
                className="ml-4"
              >
                <Music className="mr-2 h-4 w-4" />
                Reconnect Spotify
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {topArtists.length === 0 && followedArtists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Music className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-center text-muted-foreground">
              No artists found in your Spotify account
            </p>
            <Button onClick={fetchSpotifyData} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {topArtists.length > 0 && (
            <section>
              <h2 className="mb-4 font-semibold text-2xl">Your Top Artists</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {topArtists.map((artist) => (
                  <Card
                    key={artist.id}
                    className="overflow-hidden transition-shadow hover:shadow-lg"
                  >
                    <div className="relative aspect-square">
                      {artist.images[0]?.url ? (
                        <Image
                          src={artist.images[0].url}
                          alt={artist.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                          <Music className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{artist.name}</CardTitle>
                      {artist.genres.length > 0 && (
                        <CardDescription className="text-sm">
                          {artist.genres.slice(0, 2).join(", ")}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => syncArtist(artist)}
                        disabled={isSyncing}
                        className="w-full"
                        size="sm"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          "View Shows & Setlists"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {followedArtists.length > 0 && (
            <section>
              <h2 className="mb-4 font-semibold text-2xl">
                Artists You Follow
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {followedArtists.map((artist) => (
                  <Card
                    key={artist.id}
                    className="overflow-hidden transition-shadow hover:shadow-lg"
                  >
                    <div className="relative aspect-square">
                      {artist.images[0]?.url ? (
                        <Image
                          src={artist.images[0].url}
                          alt={artist.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted">
                          <Music className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{artist.name}</CardTitle>
                      {artist.genres.length > 0 && (
                        <CardDescription className="text-sm">
                          {artist.genres.slice(0, 2).join(", ")}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => syncArtist(artist)}
                        disabled={isSyncing}
                        className="w-full"
                        size="sm"
                      >
                        {isSyncing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          "View Shows & Setlists"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
