"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type SupportingActsProps = {
  artists: Array<{
    id: string;
    order_index: number;
    set_length?: number;
    is_headliner: boolean;
    artist: {
      id: string;
      name: string;
      slug: string;
      image_url?: string;
      verified?: boolean;
    };
  }>;
};

export function SupportingActs({ artists }: SupportingActsProps) {
  // Sort by order_index and filter out headliner
  const supportingActs = artists
    .filter((a) => !a.is_headliner)
    .sort((a, b) => a.order_index - b.order_index);

  if (supportingActs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Supporting Acts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {supportingActs.map((act) => (
            <Link
              key={act.id}
              href={`/artists/${act.artist.slug}`}
              className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
            >
              {/* Artist Image */}
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                {act.artist.image_url ? (
                  <Image
                    src={act.artist.image_url}
                    alt={act.artist.name}
                    fill
                    className="object-cover rounded-full"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Artist Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate font-medium">{act.artist.name}</h4>
                  {act.artist.verified && (
                    <Badge variant="secondary" className="text-xs">
                      Verified
                    </Badge>
                  )}
                </div>
                {act.set_length && (
                  <p className="text-muted-foreground text-sm">
                    {act.set_length} minute set
                  </p>
                )}
              </div>

              {/* Order Badge */}
              <Badge variant="outline">#{act.order_index}</Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
