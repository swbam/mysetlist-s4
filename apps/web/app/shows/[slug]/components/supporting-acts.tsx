'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/design-system/components/ui/card';
import { Badge } from '@repo/design-system/components/ui/badge';

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
    .filter(a => !a.is_headliner)
    .sort((a, b) => a.order_index - b.order_index);
    
  if (supportingActs.length === 0) return null;
  
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
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              {/* Artist Image */}
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                {act.artist.image_url ? (
                  <Image
                    src={act.artist.image_url}
                    alt={act.artist.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {/* Artist Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium truncate">{act.artist.name}</h4>
                  {act.artist.verified && (
                    <Badge variant="secondary" className="text-xs">
                      Verified
                    </Badge>
                  )}
                </div>
                {act.set_length && (
                  <p className="text-sm text-muted-foreground">
                    {act.set_length} minute set
                  </p>
                )}
              </div>
              
              {/* Order Badge */}
              <Badge variant="outline">
                #{act.order_index}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}