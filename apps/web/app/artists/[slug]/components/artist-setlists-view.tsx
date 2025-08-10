"use client";

import { 
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@repo/design-system";
import { Calendar, ChevronDown, ChevronRight, ExternalLink, MapPin, Music2, ThumbsUp, Vote } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatDate } from "~/lib/utils";

interface Setlist {
  setlist: {
    id: string;
    name: string;
    artistId: string;
    showId: string;
    type: "predicted" | "actual";
    isLocked: boolean;
    createdAt: string;
  };
  show?: {
    id: string;
    name: string;
    slug: string;
    date: string;
  };
  venue?: {
    id: string;
    name: string;
    city: string;
    state?: string;
    country: string;
  };
  songCount: number;
  voteCount: number;
  songs?: {
    id: string;
    title: string;
    artist: string;
    position: number;
    upvotes: number;
    notes?: string | null;
    isPlayed?: boolean | null;
  }[];
}

interface ArtistSetlistsViewProps {
  setlists: Setlist[];
  artistName: string;
  artistId: string;
}

export function ArtistSetlistsView({
  setlists,
  artistName,
  artistId: _artistId,
}: ArtistSetlistsViewProps) {
  const [expandedSetlists, setExpandedSetlists] = useState<Set<string>>(new Set());

  const toggleSetlist = (setlistId: string) => {
    setExpandedSetlists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(setlistId)) {
        newSet.delete(setlistId);
      } else {
        newSet.add(setlistId);
      }
      return newSet;
    });
  };

  if (setlists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Artist Setlists</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Music2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-4 text-muted-foreground">
              No setlists found for {artistName}
            </p>
            <p className="text-sm text-muted-foreground">
              Setlists will appear here when fans create them for upcoming shows
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5" />
            Recent Setlists
          </CardTitle>
          <Badge variant="secondary">{setlists.length} setlists</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {setlists.map(({ setlist, show, venue, songCount, voteCount, songs }) => {
            const isExpanded = expandedSetlists.has(setlist.id);
            const showDate = show?.date ? new Date(show.date).toLocaleDateString() : formatDate(setlist.createdAt);

            return (
              <Collapsible key={setlist.id} open={isExpanded} onOpenChange={() => toggleSetlist(setlist.id)}>
                <div className="group rounded-lg border transition-colors hover:bg-muted/50">
                  <CollapsibleTrigger className="w-full p-4 text-left">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <div className="font-semibold">
                              {setlist.name || `${artistName} Setlist`}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-muted-foreground text-sm">
                              <Calendar className="h-3 w-3" />
                              <span>{showDate}</span>
                              {setlist.type === "actual" && (
                                <>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs">
                                    Performed
                                  </Badge>
                                </>
                              )}
                              {setlist.isLocked && (
                                <>
                                  <span>•</span>
                                  <Badge variant="outline" className="text-xs">
                                    Locked
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {venue && (
                          <div className="flex items-center gap-2 text-muted-foreground text-sm ml-6">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {venue.name}, {venue.city}
                              {venue.state && `, ${venue.state}`}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-muted-foreground text-sm ml-6">
                          {songCount > 0 && (
                            <div className="flex items-center gap-1">
                              <Music2 className="h-3 w-3" />
                              <span>{songCount} songs</span>
                            </div>
                          )}
                          {voteCount > 0 && (
                            <div className="flex items-center gap-1">
                              <Vote className="h-3 w-3" />
                              <span>{voteCount} votes</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link 
                            href={`/shows/${show?.slug || show?.id || setlist.showId}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View Show
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="px-4 pb-4">
                    {songs && songs.length > 0 ? (
                      <div className="ml-6 space-y-2 border-l-2 border-muted pl-4">
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">
                          Setlist ({songs.length} songs)
                        </h4>
                        <div className="space-y-1">
                          {songs
                            .sort((a, b) => a.position - b.position)
                            .map((song) => (
                              <div
                                key={`${setlist.id}-${song.id}`}
                                className="flex items-center justify-between gap-2 text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground font-mono text-xs w-6">
                                    {song.position}.
                                  </span>
                                  <span className="font-medium">{song.title}</span>
                                  {song.notes && (
                                    <Badge variant="outline" className="text-xs">
                                      {song.notes}
                                    </Badge>
                                  )}
                                  {song.isPlayed === false && setlist.type === "actual" && (
                                    <Badge variant="outline" className="text-xs text-muted-foreground">
                                      Not played
                                    </Badge>
                                  )}
                                </div>
                                {song.upvotes > 0 && (
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <ThumbsUp className="h-3 w-3" />
                                    <span className="text-xs">{song.upvotes}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="ml-6 text-sm text-muted-foreground border-l-2 border-muted pl-4">
                        No songs in this setlist yet
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>

        {setlists.length >= 5 && (
          <div className="mt-6 text-center">
            <Button variant="outline" asChild>
              <Link href={`/setlists?artist=${encodeURIComponent(artistName)}`}>
                View All Setlists
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
